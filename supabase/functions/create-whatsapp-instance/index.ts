import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL')!
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY')!

console.log('Create WhatsApp Instance function started')

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            },
        })
    }

    try {
        const { botId } = await req.json()

        if (!botId) {
            throw new Error('botId is required')
        }

        // Initialize Supabase
        const supabaseUrl = 'https://opwwyjkevpzocfolesqv.supabase.co'
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // 1. Fetch bot configuration
        const { data: bot, error: botError } = await supabase
            .from('bot_configurations')
            .select('*')
            .eq('id', botId)
            .single()

        if (botError) throw botError

        const instanceName = `bot-${botId}`
        // Use whatsapp_number from bot config to initialize phone_number
        const botPhoneNumber = bot.whatsapp_number || null

        console.log(`Processing bot ${botId}, instance ${instanceName}, phone ${botPhoneNumber}`)

        // 2. Check Database for existing instance
        const { data: existingInstance } = await supabase
            .from('whatsapp_instances')
            .select('*')
            .eq('instance_name', instanceName)
            .single()

        // If DB says connected, verify with API
        if (existingInstance && existingInstance.status === 'connected') {
            console.log('DB says instance is connected, checking API...')
            // We could verify with API here, but for now let's trust DB or if user re-requested, maybe they want to reconnect?
            // If the user explicitly called this, they might want to see the connection status or reconnect.
            // Let's proceed to check API status to be sure.
        }

        // 3. Robust Interaction with Evolution API
        let qrCodeBase64 = null
        let shouldCreate = false
        const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`

        // Step 3a: Check if instance exists in Evolution
        console.log(`Checking existence in Evolution: ${EVOLUTION_API_URL}/instance/fetchInstances?instanceName=${instanceName}`)
        const checkResponse = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances?instanceName=${instanceName}`, {
            headers: { 'apikey': EVOLUTION_API_KEY }
        })

        let instanceState = null
        if (checkResponse.ok) {
            const instances = await checkResponse.json()
            console.log('Fetch Instances Response:', JSON.stringify(instances))
            if (Array.isArray(instances) && instances.length > 0) {
                const found = instances.find((i: any) => i.instance && i.instance.instanceName === instanceName) || instances[0];
                if (found) {
                    console.log('Instance found in Evolution:', found.instance?.instanceName)
                    instanceState = found
                }
            }
        } else {
            console.log('Fetch Instances Failed:', checkResponse.status, await checkResponse.text())
        }

        // Logic to determine action
        if (!instanceState) {
            console.log('Instance not found in Evolution, will create.')
            shouldCreate = true
        } else {
            const connectionStatus = instanceState.instance?.state || instanceState.connectionStatus
            console.log(`Instance exists. Status: ${connectionStatus}`)

            if (connectionStatus === 'open') {
                console.log('Instance is already open/connected.')
                return new Response(JSON.stringify({
                    status: 'already_connected',
                    instanceName,
                    phoneNumber: instanceState.instance?.owner?.id?.replace('@s.whatsapp.net', '') || botPhoneNumber,
                    qrCode: null
                }), {
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                })
            } else {
                console.log('Instance exists but not connected. Will try to connect/fetch QR.')
                shouldCreate = false // Try to connect first
            }
        }

        // Helper function to create instance
        const createInstance = async () => {
            console.log('Creating new instance:', instanceName)
            const createRes = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
                body: JSON.stringify({
                    instanceName,
                    qrcode: false, // Disabled to prevent timeouts, we will fetch it via connect
                    integration: 'WHATSAPP-BAILEYS',
                    webhook: {
                        url: webhookUrl,
                        events: ['connection.update', 'qrcode.updated', 'messages.upsert']
                    }
                })
            })
            const createText = await createRes.text()
            console.log(`Create Response (${createRes.status}):`, createText)

            if (!createRes.ok) {
                // If fails with "already exists", we should try to connect instead of failing
                if (createText.includes('already exists')) {
                    console.log('Create failed because instance exists (race condition?), switching to connect.')
                    return { success: false, reason: 'exists' }
                }
                throw new Error(`Failed to create instance: ${createText}`)
            }

            try {
                return { success: true, data: JSON.parse(createText) }
            } catch (e) {
                return { success: true, data: {} }
            }
        }

        // Helper function to connect/fetch QR
        const connectInstance = async () => {
            console.log('Connecting to instance:', instanceName)
            const connectRes = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
                headers: { 'apikey': EVOLUTION_API_KEY }
            })
            const connectText = await connectRes.text()
            console.log(`Connect Response (${connectRes.status}):`, connectText)

            if (connectRes.ok) {
                try {
                    return { success: true, data: JSON.parse(connectText) }
                } catch (e) {
                    return { success: true, data: {} }
                }
            }
            return { success: false, reason: connectText }
        }

        // Helper to delete instance
        const deleteInstance = async () => {
            console.log('Deleting instance:', instanceName)
            const delRes = await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
                method: 'DELETE',
                headers: { 'apikey': EVOLUTION_API_KEY }
            })
            console.log(`Delete Response (${delRes.status}):`, await delRes.text())
            return delRes.ok
        }

        // --- Execution Flow ---

        if (shouldCreate) {
            const result = await createInstance()
            if (result.success) {
                console.log('Instance created successfully. Waiting before fetching QR...')
            } else if (result.reason === 'exists') {
                shouldCreate = false
            }
        }

        // Poll for QR Code (Patiently)
        // Give the API time to initialize the instance and generate the QR
        console.log('Starting Patient QR Polling Loop...')
        const maxAttempts = 10

        for (let i = 1; i <= maxAttempts; i++) {
            if (qrCodeBase64) break

            console.log(`QR Poll Attempt ${i}/${maxAttempts}`)
            const connectResult = await connectInstance()

            if (connectResult.success) {
                qrCodeBase64 = connectResult.data.base64 || connectResult.data.code || connectResult.data.qrcode?.base64
                if (qrCodeBase64) {
                    console.log('QR Code retrieved successfully!')
                    break
                }
            } else {
                console.log(`Poll ${i} failed or no QR:`, connectResult)
            }

            // Exponential-ish backoff: wait longer as we go
            const waitTime = i < 3 ? 1500 : 3000
            await new Promise(r => setTimeout(r, waitTime))
        }

        // FORCE RESET: Only if we truly timed out after all attempts
        if (!qrCodeBase64) {
            console.log('Failed to get QR code after maximum attempts. FORCE RESET: Deleting and Recreating.')
            await deleteInstance()

            // Wait for cleanup
            await new Promise(r => setTimeout(r, 5000))

            // Try create again (final attempt)
            console.log('Recreating instance after reset...')
            await createInstance()

            // One final quick check
            await new Promise(r => setTimeout(r, 2000))
            const finalConnect = await connectInstance()
            if (finalConnect.success) {
                qrCodeBase64 = finalConnect.data.base64 || finalConnect.data.code || finalConnect.data.qrcode?.base64
            }
        }

        console.log('Final QR Code present:', !!qrCodeBase64)

        // 5. Update Database
        const upsertData: any = {
            bot_configuration_id: botId,
            instance_name: instanceName,
            status: 'connecting',
            qr_code_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        }

        if (qrCodeBase64) {
            upsertData.qr_code = qrCodeBase64
        }

        // Always set phone_number if we have it from config
        if (botPhoneNumber) {
            upsertData.phone_number = botPhoneNumber
        }

        const { error: upsertError } = await supabase
            .from('whatsapp_instances')
            .upsert(upsertData, { onConflict: 'instance_name' })

        if (upsertError) {
            console.error('Supabase Upsert Error:', upsertError)
        }

        return new Response(JSON.stringify({
            qrCode: qrCodeBase64,
            instanceName,
            phoneNumber: botPhoneNumber, // Return immediate phone number to UI
            expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
        }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            status: 200
        })

    } catch (err: any) {
        console.error('Fatal Error:', err)
        return new Response(JSON.stringify({ error: err.message }), {
            status: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
        })
    }
})

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
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
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

        // 2. Check if instance already exists
        const { data: existingInstance } = await supabase
            .from('whatsapp_instances')
            .select('*')
            .eq('instance_name', instanceName)
            .single()

        // If exists and connected, return existing QR or status
        if (existingInstance && existingInstance.status === 'connected') {
            return new Response(JSON.stringify({
                status: 'already_connected',
                instanceName,
                phoneNumber: existingInstance.phone_number
            }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            })
        }

        // 3. Create instance in Evolution API
        console.log('Creating instance:', instanceName)
        const createResponse = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': EVOLUTION_API_KEY
            },
            body: JSON.stringify({
                instanceName,
                qrcode: true,
                integration: 'WHATSAPP-BAILEYS'
            })
        })

        if (!createResponse.ok) {
            const errorText = await createResponse.text()
            console.error('Evolution API error:', errorText)
            throw new Error(`Failed to create instance: ${errorText}`)
        }

        // Wait a bit for QR code generation
        await new Promise(resolve => setTimeout(resolve, 2000))

        // 4. Get QR Code
        console.log('Fetching QR code for:', instanceName)
        const qrResponse = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
            headers: { 'apikey': EVOLUTION_API_KEY }
        })

        if (!qrResponse.ok) {
            const errorText = await qrResponse.text()
            console.error('QR fetch error:', errorText)
            throw new Error(`Failed to get QR code: ${errorText}`)
        }

        const qrData = await qrResponse.json()
        const qrCodeBase64 = qrData.base64 || qrData.qrcode?.base64

        if (!qrCodeBase64) {
            throw new Error('QR code not available')
        }

        // 5. Save to database
        const { error: upsertError } = await supabase
            .from('whatsapp_instances')
            .upsert({
                bot_configuration_id: botId,
                instance_name: instanceName,
                qr_code: qrCodeBase64,
                qr_code_expires_at: new Date(Date.now() + 60000).toISOString(), // 1 minute
                status: 'connecting'
            }, {
                onConflict: 'instance_name'
            })

        if (upsertError) throw upsertError

        return new Response(JSON.stringify({
            qrCode: qrCodeBase64,
            instanceName,
            expiresAt: new Date(Date.now() + 60000).toISOString()
        }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            status: 200
        })

    } catch (err: any) {
        console.error('Error:', err)
        return new Response(JSON.stringify({ error: err.message }), {
            status: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
        })
    }
})

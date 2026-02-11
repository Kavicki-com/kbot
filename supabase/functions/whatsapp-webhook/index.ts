import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('WhatsApp Webhook function started')

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
        const payload = await req.json()
        console.log('Webhook received:', JSON.stringify(payload, null, 2))

        // Initialize Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseKey)

        const { event, instance, data } = payload

        // Handle different event types
        switch (event) {
            case 'connection.update':
                await handleConnectionUpdate(supabase, instance, data)
                break

            case 'qrcode.updated':
                await handleQRCodeUpdate(supabase, instance, data)
                break

            case 'messages.upsert':
                await handleMessageUpsert(supabase, instance, data)
                break

            default:
                console.log('Unhandled event type:', event)
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            status: 200
        })

    } catch (err: any) {
        console.error('Webhook error:', err)
        return new Response(JSON.stringify({ error: err.message }), {
            status: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
        })
    }
})

async function handleConnectionUpdate(supabase: any, instanceName: string, data: any) {
    console.log('Connection update:', instanceName, data)

    const { state, connectionStatus } = data
    // Some versions use 'state', others 'connectionStatus'
    const statusVal = state || connectionStatus
    const phoneNumber = data.phoneNumber || data.owner || (typeof data.id === 'string' ? data.id.split('@')[0] : null)

    let status = 'disconnected'

    if (statusVal === 'open' || statusVal === 'connecting') {
        status = statusVal === 'open' ? 'connected' : 'connecting'
    }

    const updateData: any = {
        status,
        last_seen: new Date().toISOString()
    }

    if (status === 'connected') {
        if (phoneNumber) updateData.phone_number = phoneNumber.replace('@s.whatsapp.net', '') // Clean ID if needed
        updateData.connected_at = new Date().toISOString()
        updateData.qr_code = null // Clear QR code when connected
        updateData.qr_code_expires_at = null
    }

    const { error } = await supabase
        .from('whatsapp_instances')
        .update(updateData)
        .eq('instance_name', instanceName)

    if (error) {
        console.error('Error updating connection status:', error)
    } else {
        console.log('Connection status updated:', instanceName, status)
    }
}

async function handleQRCodeUpdate(supabase: any, instanceName: string, data: any) {
    console.log('QR code update payload:', JSON.stringify(data))

    // Evolution API might return qrcode inside data, or as data.qrcode.base64
    // We need to extract the actual Base64 string
    let qrcodeBase64 = null;

    if (data.qrcode) {
        if (typeof data.qrcode === 'string') {
            qrcodeBase64 = data.qrcode;
        } else if (data.qrcode.base64) {
            qrcodeBase64 = data.qrcode.base64;
        }
    } else if (data.base64) {
        qrcodeBase64 = data.base64;
    }

    if (qrcodeBase64) {
        console.log('Saving QR Code length:', qrcodeBase64.length)
        const { error } = await supabase
            .from('whatsapp_instances')
            .update({
                qr_code: qrcodeBase64,
                qr_code_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
                status: 'connecting'
            })
            .eq('instance_name', instanceName)

        if (error) {
            console.error('Error updating QR code:', error)
        } else {
            console.log('QR code updated in DB:', instanceName)
        }
    } else {
        console.log('No valid QR code base64 found in payload')
    }
}

async function handleMessageUpsert(supabase: any, instanceName: string, data: any) {
    console.log('Message upsert:', instanceName) // Don't log full data for privacy/noise

    try {
        // Get the WhatsApp instance
        const { data: instance, error: instanceError } = await supabase
            .from('whatsapp_instances')
            .select('id, bot_configuration_id')
            .eq('instance_name', instanceName)
            .single()

        if (instanceError || !instance) {
            console.error('Instance not found for message:', instanceName)
            return
        }

        // Extract message data
        // Evolution API v2: data.data.messages or data.messages?
        // Assuming standard payload:
        const messages = Array.isArray(data) ? data : (data.messages || [data])

        for (const message of messages) {
            if (!message.key) continue;

            const { key, message: messageContent, pushName } = message

            const fromMe = key.fromMe
            const remoteJid = key.remoteJid
            const messageId = key.id

            if (!remoteJid) continue;

            // Extract phone number (remove @s.whatsapp.net)
            const customerPhone = remoteJid.replace('@s.whatsapp.net', '')

            // Get or create conversation
            const { data: existingConversation } = await supabase
                .from('whatsapp_conversations')
                .select('id')
                .eq('whatsapp_instance_id', instance.id)
                .eq('customer_phone', customerPhone)
                .single()

            let conversationId = existingConversation?.id

            if (!conversationId) {
                // Create new conversation
                const { data: newConversation, error: convError } = await supabase
                    .from('whatsapp_conversations')
                    .insert({
                        whatsapp_instance_id: instance.id,
                        bot_configuration_id: instance.bot_configuration_id,
                        customer_phone: customerPhone,
                        customer_name: pushName || null,
                        last_message_at: new Date().toISOString(),
                        status: 'active'
                    })
                    .select('id')
                    .single()

                if (convError) {
                    console.error('Error creating conversation:', convError)
                    continue
                }

                conversationId = newConversation.id
            } else {
                // Update last_message_at
                await supabase
                    .from('whatsapp_conversations')
                    .update({
                        last_message_at: new Date().toISOString(),
                        customer_name: pushName || null // Update name if provided
                    })
                    .eq('id', conversationId)
            }

            // Extract message content based on type
            let content = ''
            let mediaUrl = null
            let mediaType = null

            if (messageContent?.conversation) {
                content = messageContent.conversation
            } else if (messageContent?.extendedTextMessage?.text) {
                content = messageContent.extendedTextMessage.text
            } else if (messageContent?.imageMessage) {
                content = messageContent.imageMessage.caption || '[Imagem]'
                mediaType = 'image'
            } else if (messageContent?.audioMessage) {
                content = '[Áudio]'
                mediaType = 'audio'
            } else if (messageContent?.videoMessage) {
                content = messageContent.videoMessage.caption || '[Vídeo]'
                mediaType = 'video'
            } else if (messageContent?.documentMessage) {
                content = messageContent.documentMessage.fileName || '[Documento]'
                mediaType = 'document'
            } else if (messageContent?.stickerMessage) {
                content = '[Figurinha]'
                mediaType = 'sticker'
            }

            // Save message
            const { error: messageError } = await supabase
                .from('whatsapp_messages')
                .insert({
                    conversation_id: conversationId,
                    message_id: messageId,
                    direction: fromMe ? 'outgoing' : 'incoming',
                    content,
                    media_url: mediaUrl,
                    media_type: mediaType,
                    status: 'sent',
                    sent_at: new Date().toISOString()
                })

            if (messageError) {
                console.error('Error saving message:', messageError)
            } else {
                console.log('Message saved:', conversationId, fromMe ? 'outgoing' : 'incoming')
            }
        }

    } catch (err) {
        console.error('Error handling message:', err)
    }
}

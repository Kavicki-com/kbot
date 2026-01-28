import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("Hello from get-bot-config!")

serve(async (req) => {
    // 1. Handle CORS (Important for Typebot)
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            },
        })
    }

    try {
        // 2. Parse request
        // Read text first to debug
        const rawBody = await req.text()
        console.log("Raw Request Body:", rawBody)
        console.log("Request Headers:", JSON.stringify(Object.fromEntries(req.headers.entries())))

        let whatsapp_number;
        try {
            if (!rawBody) {
                throw new Error("Body is empty string")
            }
            const body = JSON.parse(rawBody)
            whatsapp_number = body.whatsapp_number
        } catch (e) {
            console.error("JSON Parse Error:", e)
            return new Response(JSON.stringify({
                error: 'Request body is empty or invalid JSON.',
                debug_received: rawBody
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            })
        }

        if (!whatsapp_number) {
            throw new Error('whatsapp_number is required')
        }

        // 3. Init Supabase
        // Note: Deno.env.get automatically works in Supabase Edge Functions
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        const supabase = createClient(supabaseUrl, supabaseKey)

        // 4. Query Database
        // We search for the active bot config linked to this number
        const { data: botConfig, error } = await supabase
            .from('bot_configurations')
            .select(`
        *,
        knowledge_base_documents (
           id,
           file_name,
           file_url,
           content
        )
      `)
            .eq('whatsapp_number', whatsapp_number)
            .eq('is_active', true)
            .single()

        if (error) {
            console.error('Supabase error:', error)
            return new Response(JSON.stringify({ error: 'Bot not found or error querying DB' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            })
        }

        // 5. Construct Dynamic System Prompt (Optional handling)
        // You can process the prompt here or just return the raw config
        // If RAG is enabled, we might want to append context here, but usually Typebot does that step.

        // Return success
        return new Response(JSON.stringify(botConfig), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            status: 200
        })

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
        })
    }
})

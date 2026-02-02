
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL')!
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const body = await req.json()
        console.log('Delete Request Body:', JSON.stringify(body))
        const { instanceName } = body

        if (!instanceName) {
            throw new Error('Instance name is required')
        }

        console.log(`Deleting instance: ${instanceName}`)

        // 1. Delete from Evolution API
        try {
            const deleteResponse = await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
                method: 'DELETE',
                headers: {
                    'apikey': EVOLUTION_API_KEY
                }
            })

            const deleteText = await deleteResponse.text()
            console.log('Evolution Delete Response:', deleteText)
        } catch (err) {
            console.error('Error deleting from Evolution API (proceeding anyway):', err)
        }

        // 2. Update Supabase
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        // Find the bot_id for this instance name just to be safe, or just update based on instance_name
        const { error: dbError } = await supabase
            .from('whatsapp_instances')
            .update({
                status: 'disconnected',
                qr_code: null,
                phone_number: null,
            })
            .eq('instance_name', instanceName)

        if (dbError) throw dbError

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error('Error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})

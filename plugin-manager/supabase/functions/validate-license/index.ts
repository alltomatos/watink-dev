import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const { instanceUuid } = await req.json()

    if (!instanceUuid) {
      return new Response(JSON.stringify({ error: 'instanceUuid is required' }), { status: 400 })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Buscar a instância
    const { data: instance, error: instError } = await supabaseAdmin
      .from('instances')
      .select('id, status')
      .eq('instance_uuid', instanceUuid)
      .single()

    if (instError || !instance) {
      return new Response(JSON.stringify({ active: [] }), { status: 200 })
    }

    if (instance.status !== 'active') {
      return new Response(JSON.stringify({ active: [], blocked: true }), { status: 200 })
    }

    // 2. Buscar licenças ativas
    const { data: licenses, error: licError } = await supabaseAdmin
      .from('licenses')
      .select('plugin_slug')
      .eq('instance_id', instance.id)
      .eq('status', 'active')

    if (licError) throw licError

    const activePlugins = licenses.map(l => l.plugin_slug)

    return new Response(JSON.stringify({ active: activePlugins }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})

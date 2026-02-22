import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const PLAN_LIMITS: Record<string, number> = {
  start: 4,
  bussines_1: 6,
  business_1: 6,
  pro: 6,
  saas: 0,
}

const isSubscriptionActive = (status: string | null | undefined): boolean => {
  const st = String(status || "").toLowerCase()
  return st === "active"
}

const normalizePlanKey = (name: string | null | undefined): string =>
  String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")

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

    const { data: instance, error: instError } = await supabaseAdmin
      .from('instances')
      .select('id, status')
      .eq('instance_uuid', instanceUuid)
      .single()

    if (instError || !instance) {
      return new Response(JSON.stringify({ active: [], entitlements: {} }), { status: 200 })
    }

    if (instance.status !== 'active') {
      return new Response(JSON.stringify({ active: [], blocked: true, entitlements: {} }), { status: 200 })
    }

    const { data: licenses, error: licError } = await supabaseAdmin
      .from('licenses')
      .select('plugin_slug')
      .eq('instance_id', instance.id)
      .eq('status', 'active')

    if (licError) throw licError

    const activePlugins = (licenses || []).map((l: { plugin_slug: string }) => l.plugin_slug)

    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('status, expires_at, plans(name, pluginQuota)')
      .eq('instance_id', instance.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (subError) throw subError

    const activeSub = (subscriptions || []).find((row: any) => isSubscriptionActive(row?.status))
    const plan = Array.isArray(activeSub?.plans) ? activeSub?.plans?.[0] : activeSub?.plans
    const planName = String(plan?.name || '')
    const normalizedPlan = normalizePlanKey(planName)

    const quotaFromPlan = Number(plan?.pluginQuota || 0)
    const premiumLimit = quotaFromPlan > 0 ? quotaFromPlan : (PLAN_LIMITS[normalizedPlan] || 0)
    const saasEnabled = activePlugins.includes('saas-plugin') || normalizedPlan === 'saas'

    const entitlements = {
      instance_status: instance.status,
      plan_name: planName || null,
      plan_key: normalizedPlan || null,
      premium_limit: premiumLimit,
      saas_enabled: saasEnabled,
      source: 'supabase-validate-license'
    }

    return new Response(JSON.stringify({ active: activePlugins, entitlements }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})

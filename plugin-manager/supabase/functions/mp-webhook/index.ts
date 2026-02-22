import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_PLUGINS: Record<string, string[]> = {
  Start: ["helpdesk", "clientes", "smtp", "webchat"],
  Pro: ["helpdesk", "clientes", "smtp", "webchat", "papi", "whatsmeow"],
  SaaS: ["saas-plugin"],
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!MP_ACCESS_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const payload = await req.json();
    console.log("MP Webhook received:", JSON.stringify(payload));

    const type = payload?.type ?? payload?.resource_type;
    const resourceId = payload?.data?.id ?? payload?.resource;

    if (type !== "payment" || !resourceId) {
      return new Response(JSON.stringify({ ignored: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    });

    const paymentData = await paymentResponse.json();

    if (!paymentResponse.ok) {
      throw new Error(`Mercado Pago payment fetch error: ${JSON.stringify(paymentData)}`);
    }

    if (paymentData.status !== "approved") {
      return new Response(JSON.stringify({ ignored: true, status: paymentData.status }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subscriptionId = paymentData.external_reference;
    if (!subscriptionId) {
      throw new Error("payment external_reference is missing");
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: sub, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .select("id, status, instance_id, plans(name)")
      .eq("id", subscriptionId)
      .single();

    if (subError || !sub) throw new Error(subError?.message ?? "Subscription not found");

    if (sub.status !== "active") {
      const { error: updateError } = await supabaseAdmin
        .from("subscriptions")
        .update({
          status: "active",
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscriptionId);

      if (updateError) throw new Error(updateError.message);
    }

    const planName = Array.isArray(sub.plans) ? sub.plans[0]?.name : sub.plans?.name;
    const pluginsToEnable = PLAN_PLUGINS[planName] ?? [];

    if (!sub.instance_id) {
      throw new Error("Subscription missing instance_id");
    }

    for (const slug of pluginsToEnable) {
      const { error: licenseError } = await supabaseAdmin.from("licenses").upsert(
        {
          instance_id: sub.instance_id,
          plugin_slug: slug,
          status: "active",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "instance_id,plugin_slug" },
      );

      if (licenseError) throw new Error(licenseError.message);
    }

    console.log(`Subscription ${subscriptionId} activated (${planName})`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

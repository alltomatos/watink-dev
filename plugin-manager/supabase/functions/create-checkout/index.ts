import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_PRICES: Record<string, number> = {
  Start: 49.99,
  Pro: 99.99,
  SaaS: 199.99,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const APP_BASE_URL = Deno.env.get("APP_BASE_URL") ?? "https://place.watink.com";
    const WEBHOOK_URL = Deno.env.get("MP_WEBHOOK_URL") ?? `${SUPABASE_URL}/functions/v1/mp-webhook`;

    if (!MP_ACCESS_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const { plan, instanceId, email, name } = await req.json();

    if (!plan || !PLAN_PRICES[plan]) throw new Error("Plano inválido");
    if (!instanceId) throw new Error("instanceId é obrigatório");
    if (!email) throw new Error("email é obrigatório");

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: planRow, error: planError } = await supabaseAdmin
      .from("plans")
      .select("id, name")
      .eq("name", plan)
      .single();

    if (planError || !planRow) throw new Error("Plano não encontrado no banco");

    const { data: customer, error: customerError } = await supabaseAdmin
      .from("customers")
      .upsert({ email, name: name ?? null }, { onConflict: "email" })
      .select("id")
      .single();

    if (customerError || !customer) throw new Error(customerError?.message ?? "Falha ao garantir cliente");

    const { data: subscription, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .insert({
        customer_id: customer.id,
        plan_id: planRow.id,
        instance_id: instanceId,
        status: "pending",
      })
      .select("id")
      .single();

    if (subError || !subscription) throw new Error(subError?.message ?? "Falha ao criar assinatura");

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            title: `Watink Marketplace - Plano ${plan}`,
            quantity: 1,
            unit_price: PLAN_PRICES[plan],
            currency_id: "BRL",
          },
        ],
        external_reference: subscription.id,
        notification_url: WEBHOOK_URL,
        back_urls: {
          success: `${APP_BASE_URL}/success`,
          failure: `${APP_BASE_URL}/failure`,
          pending: `${APP_BASE_URL}/pending`,
        },
        auto_return: "approved",
        payer: {
          email,
          name: name ?? undefined,
        },
      }),
    });

    const preference = await mpResponse.json();

    if (!mpResponse.ok) {
      throw new Error(`Mercado Pago error: ${JSON.stringify(preference)}`);
    }

    return new Response(
      JSON.stringify({
        checkoutUrl: preference.init_point,
        checkoutSandboxUrl: preference.sandbox_init_point,
        preferenceId: preference.id,
        subscriptionId: subscription.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

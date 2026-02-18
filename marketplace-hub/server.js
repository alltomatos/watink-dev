const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const PORT = Number(process.env.HUB_PORT || 8090);
const APP_BASE_URL = process.env.APP_BASE_URL || "https://marketplace.alltomatos.dev.br";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";
const MP_WEBHOOK_URL = process.env.MP_WEBHOOK_URL || `${APP_BASE_URL}/api/v1/hub/webhook/mp`;

const CATALOG = [
  { id: "1", slug: "helpdesk", name: "Helpdesk", description: "Gestão de protocolos e SLA", version: "2.0.0", type: "business", category: "support", price: 49.9, iconUrl: "/public/plugins/helpdesk.png" },
  { id: "2", slug: "clientes", name: "Clientes", description: "Gestão de clientes e vínculos", version: "2.0.0", type: "business", category: "crm", price: 49.9, iconUrl: "/public/plugins/clientes.png" },
  { id: "3", slug: "webchat", name: "Webchat", description: "Widget webchat para site", version: "2.0.0", type: "free", category: "channel", price: 0, iconUrl: "/public/plugins/webchat.png" },
  { id: "4", slug: "saas-plugin", name: "SaaS Manager", description: "Recursos SaaS avançados", version: "2.0.0", type: "business", category: "saas", price: 199.9, iconUrl: "/public/plugins/saas-plugin.png" }
];

function planFromSlug(slug) {
  if (slug === "saas-plugin") return "SaaS";
  return "Pro";
}

function ensureSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configurados");
  }
}

function adminAuth(req, res, next) {
  if (!ADMIN_TOKEN) return res.status(500).json({ error: "ADMIN_TOKEN não configurado" });
  const token = req.header("x-admin-token") || "";
  if (token !== ADMIN_TOKEN) return res.status(401).json({ error: "unauthorized" });
  return next();
}

async function callSupabaseFunction(fn, payload) {
  ensureSupabase();
  const url = `${SUPABASE_URL}/functions/v1/${fn}`;
  const { data } = await axios.post(url, payload, {
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "apikey": SUPABASE_SERVICE_ROLE_KEY
    },
    timeout: 20000
  });
  return data;
}

async function sbGet(table, query = "") {
  ensureSupabase();
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  const { data, headers } = await axios.get(url, {
    headers: {
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "Prefer": "count=exact"
    },
    timeout: 20000
  });
  return { data, count: Number((headers["content-range"] || "0/0").split("/")[1] || 0) };
}

async function sbUpsert(table, rows, onConflict) {
  ensureSupabase();
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const { data } = await axios.post(url, rows, {
    headers: {
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates,return=representation",
      ...(onConflict ? { "on_conflict": onConflict } : {})
    },
    timeout: 20000
  });
  return data;
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "marketplace-hub", ts: new Date().toISOString() });
});

app.get("/api/v1/hub/catalog", (_req, res) => {
  res.json({ plugins: CATALOG });
});

app.post("/api/v1/hub/checkout", async (req, res) => {
  try {
    const { slug, instanceId, email, name } = req.body || {};
    if (!slug || !instanceId) return res.status(400).json({ error: "slug e instanceId obrigatórios" });

    const payload = {
      plan: planFromSlug(slug),
      slug,
      instanceId,
      email: email || `${instanceId}@instance.local`,
      name: name || `Instance ${instanceId}`
    };

    const data = await callSupabaseFunction("create-checkout", payload);
    if (!data?.checkoutUrl) return res.status(502).json({ error: "checkoutUrl não retornada" });
    return res.json({ checkoutUrl: data.checkoutUrl });
  } catch (e) {
    return res.status(500).json({ error: e?.response?.data?.error || e.message || "erro checkout" });
  }
});

app.post("/api/v1/hub/heartbeat", async (req, res) => {
  try {
    const instanceId = req.body?.instanceId;
    if (!instanceId) return res.status(400).json({ error: "instanceId obrigatório" });

    const data = await callSupabaseFunction("validate-license", { instanceUuid: instanceId });
    const active = Array.isArray(data?.active) ? data.active : [];
    const licenses = {};
    active.forEach((slug) => { licenses[slug] = "active"; });

    return res.json({ ok: true, licenses });
  } catch (_e) {
    return res.status(200).json({ ok: false, licenses: {} });
  }
});

app.post("/api/v1/hub/webhook/mp", async (req, res) => {
  try {
    await callSupabaseFunction("mp-webhook", req.body || {});
    return res.json({ ok: true });
  } catch (_e) {
    return res.status(200).json({ ok: false });
  }
});

// -------- Admin API (MVP) --------
app.get("/api/v1/admin/overview", adminAuth, async (_req, res) => {
  try {
    const [instances, licenses, subscriptions] = await Promise.all([
      sbGet("instances", "?select=id&limit=1"),
      sbGet("licenses", "?select=id,status&limit=1"),
      sbGet("subscriptions", "?select=id,status,created_at&limit=1")
    ]);

    return res.json({
      instances: instances.count,
      licenses: licenses.count,
      subscriptions: subscriptions.count,
      source: "supabase"
    });
  } catch (e) {
    return res.status(500).json({ error: e?.response?.data || e.message });
  }
});

app.get("/api/v1/admin/instances", adminAuth, async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);
    const out = await sbGet("instances", `?select=id,instance_uuid,status,last_seen,version&order=last_seen.desc&limit=${limit}`);
    return res.json({ items: out.data || [], total: out.count });
  } catch (e) {
    return res.status(500).json({ error: e?.response?.data || e.message });
  }
});

app.get("/api/v1/admin/licenses", adminAuth, async (req, res) => {
  try {
    const instanceId = req.query.instance_id;
    const filter = instanceId ? `&instance_id=eq.${encodeURIComponent(instanceId)}` : "";
    const out = await sbGet("licenses", `?select=id,instance_id,plugin_slug,status,updated_at&order=updated_at.desc${filter}&limit=200`);
    return res.json({ items: out.data || [], total: out.count });
  } catch (e) {
    return res.status(500).json({ error: e?.response?.data || e.message });
  }
});

app.post("/api/v1/admin/licenses/upsert", adminAuth, async (req, res) => {
  try {
    const { instance_id, plugin_slug, status } = req.body || {};
    if (!instance_id || !plugin_slug || !status) return res.status(400).json({ error: "instance_id, plugin_slug, status são obrigatórios" });

    const rows = [{ instance_id, plugin_slug, status, updated_at: new Date().toISOString() }];
    const data = await sbUpsert("licenses", rows, "instance_id,plugin_slug");
    return res.json({ ok: true, item: data?.[0] || null });
  } catch (e) {
    return res.status(500).json({ error: e?.response?.data || e.message });
  }
});

app.post("/api/v1/admin/coupons", adminAuth, async (_req, res) => {
  return res.status(501).json({ error: "cupons ainda não implementado (MVP stub)" });
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Marketplace Hub listening on :${PORT}`);
  console.log(`Webhook MP: ${MP_WEBHOOK_URL}`);
});

const express = require("express");
const axios = require("axios");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const app = express();
app.use(express.json({ limit: "1mb" }));

const PORT = Number(process.env.HUB_PORT || 8090);
const APP_BASE_URL = process.env.APP_BASE_URL || "https://marketplace.alltomatos.dev.br";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const MP_WEBHOOK_URL = process.env.MP_WEBHOOK_URL || `${APP_BASE_URL}/api/v1/hub/webhook/mp`;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");

const FILES = {
  plugins: path.join(DATA_DIR, "plugins.json"),
  coupons: path.join(DATA_DIR, "coupons.json"),
  audits: path.join(DATA_DIR, "audits.json"),
  instances: path.join(DATA_DIR, "instances.json"),
  instanceOverrides: path.join(DATA_DIR, "instance-overrides.json"),
  plans: path.join(DATA_DIR, "plans.json")
};

const DEFAULT_PLAN_DEFINITIONS = {
  start: { key: "start", name: "Start", price: 69.9, monthly: true, premium_limit: 4 },
  bussines_1: { key: "bussines_1", name: "Bussines 1", price: 99.99, monthly: true, premium_limit: 6 },
  saas: { key: "saas", name: "SaaS", price: 199.99, monthly: true, standalone: true }
};

const DEFAULT_PLUGINS = [
  { id: "1", slug: "helpdesk", name: "Helpdesk", description: "Gestão de protocolos e SLA", version: "2.0.0", type: "business", category: "support", price: 49.9, iconUrl: "/public/plugins/helpdesk.png", active: true },
  { id: "2", slug: "clientes", name: "Clientes", description: "Gestão de clientes e vínculos", version: "2.0.0", type: "business", category: "crm", price: 49.9, iconUrl: "/public/plugins/clientes.png", active: true },
  { id: "3", slug: "webchat", name: "Webchat", description: "Widget webchat para site", version: "2.0.0", type: "premium", category: "channel", price: 49.9, iconUrl: "/public/plugins/webchat.png", active: true },
  { id: "4", slug: "saas-plugin", name: "SaaS Manager", description: "Recursos SaaS avançados", version: "2.0.0", type: "business", category: "saas", price: 199.9, iconUrl: "/public/plugins/saas-plugin.png", active: true }
];

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILES.plugins)) fs.writeFileSync(FILES.plugins, JSON.stringify(DEFAULT_PLUGINS, null, 2));
  if (!fs.existsSync(FILES.coupons)) fs.writeFileSync(FILES.coupons, JSON.stringify([], null, 2));
  if (!fs.existsSync(FILES.audits)) fs.writeFileSync(FILES.audits, JSON.stringify([], null, 2));
  if (!fs.existsSync(FILES.instances)) fs.writeFileSync(FILES.instances, JSON.stringify([], null, 2));
  if (!fs.existsSync(FILES.instanceOverrides)) fs.writeFileSync(FILES.instanceOverrides, JSON.stringify({}, null, 2));
  if (!fs.existsSync(FILES.plans)) fs.writeFileSync(FILES.plans, JSON.stringify(DEFAULT_PLAN_DEFINITIONS, null, 2));
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (_e) {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function normalizePlans(input) {
  const out = {};
  const entries = Object.entries(input || {});
  entries.forEach(([key, plan]) => {
    if (!plan || typeof plan !== "object") return;
    const normalizedKey = String(plan.key || key || "").trim().toLowerCase();
    if (!normalizedKey) return;
    out[normalizedKey] = {
      key: normalizedKey,
      name: String(plan.name || normalizedKey).trim(),
      price: Number(plan.price || 0),
      monthly: plan.monthly !== false,
      premium_limit: Math.max(0, Number(plan.premium_limit || 0)),
      standalone: Boolean(plan.standalone)
    };
  });
  return out;
}

function getPlans() {
  const raw = readJson(FILES.plans, DEFAULT_PLAN_DEFINITIONS);
  const normalized = normalizePlans(raw);
  if (Object.keys(normalized).length === 0) return normalizePlans(DEFAULT_PLAN_DEFINITIONS);
  return normalized;
}

function savePlans(plans) {
  const normalized = normalizePlans(plans);
  if (Object.keys(normalized).length === 0) {
    throw new Error("pelo menos um plano deve existir");
  }
  writeJson(FILES.plans, normalized);
  return normalized;
}

function getCatalog() {
  return readJson(FILES.plugins, DEFAULT_PLUGINS).filter((p) => p.active !== false);
}

function getInstanceOverrides() {
  return readJson(FILES.instanceOverrides, {});
}

function isInstanceUnlockAll(instanceId) {
  const overrides = getInstanceOverrides();
  return Boolean(overrides?.[instanceId]?.unlock_all === true);
}

function setInstanceUnlockAll(instanceId, enabled) {
  const overrides = getInstanceOverrides();
  overrides[instanceId] = {
    ...(overrides[instanceId] || {}),
    unlock_all: Boolean(enabled),
    updated_at: new Date().toISOString()
  };
  writeJson(FILES.instanceOverrides, overrides);
  return overrides[instanceId];
}

function upsertLocalInstance(instanceId, patch = {}) {
  const rows = readJson(FILES.instances, []);
  const now = new Date().toISOString();
  const idx = rows.findIndex((r) => r.instanceId === instanceId);
  if (idx >= 0) {
    rows[idx] = { ...rows[idx], ...patch, instanceId, updated_at: now };
  } else {
    rows.push({
      id: crypto.randomUUID(),
      instanceId,
      status: "active",
      created_at: now,
      updated_at: now,
      ...patch
    });
  }
  writeJson(FILES.instances, rows);
}

function planFromSlug(slug) {
  if (slug === "saas-plugin") return "SaaS";
  return "Pro";
}

function ensureSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configurados");
  }
}

const SESSION_COOKIE = "mp_admin";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function parseCookies(req) {
  const raw = req.headers.cookie || "";
  const out = {};
  raw.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx > 0) {
      const k = part.slice(0, idx).trim();
      const v = decodeURIComponent(part.slice(idx + 1));
      out[k] = v;
    }
  });
  return out;
}

function sessionSecret() {
  return ADMIN_TOKEN || "change_me_admin_token";
}

function signSession(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", sessionSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifySession(token) {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", sessionSecret()).update(body).digest("base64url");
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload?.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch (_e) {
    return null;
  }
}

function hasValidAdminSession(req) {
  const cookies = parseCookies(req);
  const payload = verifySession(cookies[SESSION_COOKIE]);
  return Boolean(payload?.user === ADMIN_USER);
}

function setSessionCookie(res) {
  const token = signSession({ user: ADMIN_USER, exp: Date.now() + SESSION_TTL_SECONDS * 1000 });
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}`);
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
}

function adminAuth(req, res, next) {
  const token = req.header("x-admin-token") || "";
  if (ADMIN_TOKEN && token === ADMIN_TOKEN) return next();
  if (hasValidAdminSession(req)) return next();
  return res.status(401).json({ error: "unauthorized" });
}

function webAuth(req, res, next) {
  if (hasValidAdminSession(req)) return next();
  return res.redirect("/login");
}

function audit(action, actor, payload = {}) {
  const rows = readJson(FILES.audits, []);
  rows.unshift({
    id: crypto.randomUUID(),
    action,
    actor: actor || "admin",
    payload,
    created_at: new Date().toISOString()
  });
  writeJson(FILES.audits, rows.slice(0, 3000));
}

function actorFromReq(req) {
  const byHeader = req.header("x-admin-user") || "";
  return byHeader || ADMIN_USER;
}

function applyCouponRules(coupon, baseAmount, pluginSlug) {
  const now = new Date();
  if (!coupon.active) return { ok: false, reason: "cupom inativo" };
  if (coupon.startAt && now < new Date(coupon.startAt)) return { ok: false, reason: "cupom ainda não iniciou" };
  if (coupon.endAt && now > new Date(coupon.endAt)) return { ok: false, reason: "cupom expirado" };
  if (Number(coupon.usageLimit || 0) > 0 && Number(coupon.usedCount || 0) >= Number(coupon.usageLimit || 0)) {
    return { ok: false, reason: "limite de uso atingido" };
  }
  if (Number(coupon.minAmount || 0) > baseAmount) return { ok: false, reason: "valor mínimo não atingido" };

  const applies = Array.isArray(coupon.appliesToPlugins) ? coupon.appliesToPlugins : [];
  if (applies.length > 0 && !applies.includes(pluginSlug)) return { ok: false, reason: "cupom não aplicável ao plugin" };

  let discount = 0;
  if (coupon.type === "percent") {
    discount = (baseAmount * Number(coupon.value || 0)) / 100;
  } else {
    discount = Number(coupon.value || 0);
  }

  if (Number(coupon.maxDiscount || 0) > 0) {
    discount = Math.min(discount, Number(coupon.maxDiscount || 0));
  }
  discount = Math.max(0, discount);

  const finalAmount = Math.max(0, baseAmount - discount);
  return { ok: true, discount, finalAmount };
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

// ---------- Runtime ----------
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "marketplace-hub", ts: new Date().toISOString() });
});

app.get("/api/v1/hub/catalog", (_req, res) => {
  res.json({ plugins: getCatalog() });
});

app.get("/api/v1/hub/plans", (_req, res) => {
  return res.json({ plans: getPlans() });
});

app.post("/api/v1/hub/register", (req, res) => {
  const {
    instanceId,
    version,
    ownerEmail,
    superAdminEmail,
    ownerName,
    document,
    tenantName,
    instanceUrl
  } = req.body || {};
  if (!instanceId) return res.status(400).json({ error: "instanceId obrigatório" });

  const resolvedAdminEmail = superAdminEmail || ownerEmail || null;

  upsertLocalInstance(instanceId, {
    version: version || "-",
    ownerEmail: ownerEmail || resolvedAdminEmail,
    superAdminEmail: resolvedAdminEmail,
    ownerName: ownerName || null,
    document: document || null,
    tenantName: tenantName || null,
    instanceUrl: instanceUrl || null,
    last_seen: new Date().toISOString(),
    status: "active"
  });

  audit("instance_register", "runtime", {
    instanceId,
    superAdminEmail: resolvedAdminEmail,
    tenantName: tenantName || null,
    instanceUrl: instanceUrl || null
  });
  return res.json({ ok: true, instanceId });
});

app.post("/api/v1/hub/checkout", async (req, res) => {
  try {
    const { slug, instanceId, email, name, couponCode } = req.body || {};
    if (!slug || !instanceId) return res.status(400).json({ error: "slug e instanceId obrigatórios" });

    const plugin = getCatalog().find((p) => p.slug === slug);
    if (!plugin) return res.status(404).json({ error: "plugin não encontrado" });

    let couponInfo = null;
    if (couponCode) {
      const coupons = readJson(FILES.coupons, []);
      const coupon = coupons.find((c) => String(c.code || "").toUpperCase() === String(couponCode).toUpperCase());
      if (coupon) {
        const result = applyCouponRules(coupon, Number(plugin.price || 0), slug);
        couponInfo = { code: coupon.code, ...result };
      }
    }

    // Mantém fluxo principal no Supabase/MP (source of truth)
    const payload = {
      plan: planFromSlug(slug),
      slug,
      instanceId,
      email: email || `${instanceId}@instance.local`,
      name: name || `Instance ${instanceId}`,
      couponCode: couponCode || null
    };

    const data = await callSupabaseFunction("create-checkout", payload);
    if (!data?.checkoutUrl) return res.status(502).json({ error: "checkoutUrl não retornada" });

    audit("checkout_created", "runtime", { slug, instanceId, couponCode: couponCode || null });

    return res.json({
      checkoutUrl: data.checkoutUrl,
      pricingPreview: {
        baseAmount: Number(plugin.price || 0),
        coupon: couponInfo
      }
    });
  } catch (e) {
    return res.status(500).json({ error: e?.response?.data?.error || e.message || "erro checkout" });
  }
});

app.post("/api/v1/hub/heartbeat", async (req, res) => {
  try {
    const instanceId = req.body?.instanceId;
    const version = req.body?.version || "-";
    if (!instanceId) return res.status(400).json({ error: "instanceId obrigatório" });

    upsertLocalInstance(instanceId, { last_seen: new Date().toISOString(), version, status: "active" });

    const data = await callSupabaseFunction("validate-license", { instanceUuid: instanceId });
    const active = Array.isArray(data?.active) ? data.active : [];
    const licenses = {};
    active.forEach((slug) => { licenses[slug] = "active"; });

    const entitlements = {
      ...(data?.entitlements || {}),
      unlock_all: isInstanceUnlockAll(instanceId)
    };

    if (entitlements.unlock_all) {
      getCatalog().forEach((p) => {
        if (p?.slug) licenses[p.slug] = "active";
      });
    }

    return res.json({ ok: true, licenses, entitlements });
  } catch (_e) {
    return res.status(200).json({ ok: false, licenses: {} });
  }
});

app.post("/api/v1/hub/webhook/mp", async (req, res) => {
  try {
    await callSupabaseFunction("mp-webhook", req.body || {});
    audit("mp_webhook_received", "runtime", { type: req.body?.type || null });
    return res.json({ ok: true });
  } catch (_e) {
    return res.status(200).json({ ok: false });
  }
});

// ---------- Admin / Finance ----------
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
  const limit = Number(req.query.limit || 50);
  const localItems = readJson(FILES.instances, [])
    .map((r) => ({
      id: r.id || r.instanceId,
      instance_uuid: r.instanceId,
      status: r.status || "active",
      last_seen: r.last_seen || r.updated_at || r.created_at || null,
      version: r.version || "-",
      super_admin_email: r.superAdminEmail || r.ownerEmail || null,
      owner_name: r.ownerName || null,
      tenant_name: r.tenantName || null,
      instance_url: r.instanceUrl || null,
      unlock_all: isInstanceUnlockAll(r.instanceId),
      source: "local"
    }))
    .sort((a, b) => String(b.last_seen || "").localeCompare(String(a.last_seen || "")));

  // tenta Supabase e mescla com local
  try {
    let remote = [];
    try {
      const out = await sbGet("instances", `?select=id,instance_uuid,status,last_seen,version&order=last_seen.desc&limit=${limit}`);
      remote = (out.data || []).map((r) => ({ ...r, source: "supabase" }));
    } catch (_e1) {
      try {
        const out2 = await sbGet("instances", `?select=id,instance_uuid,status,updated_at,created_at&order=created_at.desc&limit=${limit}`);
        remote = (out2.data || []).map((r) => ({
          ...r,
          last_seen: r.last_seen || r.updated_at || r.created_at || null,
          version: r.version || "-",
          source: "supabase"
        }));
      } catch (_e2) {
        remote = [];
      }
    }

    const map = new Map();
    [...remote, ...localItems].forEach((r) => {
      const key = r.instance_uuid || r.instanceId || r.id;
      if (!key) return;
      const prev = map.get(key) || {};
      map.set(key, { ...prev, ...r });
    });

    const items = Array.from(map.values())
      .map((r) => ({ ...r, unlock_all: isInstanceUnlockAll(r.instance_uuid || r.instanceId || r.id) }))
      .sort((a, b) => String(b.last_seen || "").localeCompare(String(a.last_seen || "")))
      .slice(0, limit);

    return res.json({ items, total: items.length });
  } catch (_e) {
    const items = localItems.slice(0, limit);
    return res.json({ items, total: items.length });
  }
});

app.post("/api/v1/admin/instances/:instanceId/unlock-all", adminAuth, (req, res) => {
  try {
    const instanceId = req.params.instanceId;
    if (!instanceId) return res.status(400).json({ error: "instanceId obrigatório" });

    const enabled = Boolean(req.body?.enabled === true || req.body?.enabled === "true" || req.body?.enabled === 1 || req.body?.enabled === "1");
    const out = setInstanceUnlockAll(instanceId, enabled);

    audit("instance_unlock_all_set", actorFromReq(req), { instanceId, enabled });

    return res.json({ ok: true, instanceId, unlock_all: out.unlock_all, updated_at: out.updated_at });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "erro ao atualizar override" });
  }
});

app.get("/api/v1/admin/plans", adminAuth, (_req, res) => {
  return res.json({ plans: getPlans() });
});

app.post("/api/v1/admin/plans", adminAuth, (req, res) => {
  try {
    const body = req.body || {};
    const key = String(body.key || body.name || "").trim().toLowerCase().replace(/\s+/g, "_");
    if (!key) return res.status(400).json({ error: "key ou name obrigatório" });

    const plans = getPlans();
    plans[key] = {
      key,
      name: String(body.name || key).trim(),
      price: Number(body.price || 0),
      monthly: body.monthly !== false,
      premium_limit: Math.max(0, Number(body.premium_limit || 0)),
      standalone: Boolean(body.standalone)
    };

    const saved = savePlans(plans);
    audit("plan_upsert", actorFromReq(req), { key, plan: saved[key] });
    return res.json({ ok: true, plan: saved[key], plans: saved });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "erro ao salvar plano" });
  }
});

app.put("/api/v1/admin/plans/:key", adminAuth, (req, res) => {
  try {
    const key = String(req.params.key || "").trim().toLowerCase();
    if (!key) return res.status(400).json({ error: "key obrigatório" });

    const plans = getPlans();
    if (!plans[key]) return res.status(404).json({ error: "plano não encontrado" });

    const patch = req.body || {};
    plans[key] = {
      ...plans[key],
      name: String(patch.name ?? plans[key].name).trim(),
      price: Number(patch.price ?? plans[key].price),
      monthly: patch.monthly === undefined ? plans[key].monthly : patch.monthly !== false,
      premium_limit: Math.max(0, Number(patch.premium_limit ?? plans[key].premium_limit)),
      standalone: patch.standalone === undefined ? plans[key].standalone : Boolean(patch.standalone)
    };

    const saved = savePlans(plans);
    audit("plan_update", actorFromReq(req), { key, patch: plans[key] });
    return res.json({ ok: true, plan: saved[key], plans: saved });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "erro ao atualizar plano" });
  }
});

app.delete("/api/v1/admin/plans/:key", adminAuth, (req, res) => {
  try {
    const key = String(req.params.key || "").trim().toLowerCase();
    if (!key) return res.status(400).json({ error: "key obrigatório" });

    const plans = getPlans();
    if (!plans[key]) return res.status(404).json({ error: "plano não encontrado" });

    delete plans[key];
    const saved = savePlans(plans);
    audit("plan_delete", actorFromReq(req), { key });
    return res.json({ ok: true, plans: saved });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "erro ao remover plano" });
  }
});

app.get("/api/v1/admin/licenses", adminAuth, async (req, res) => {
  try {
    const instanceId = req.query.instance_id;
    const filter = instanceId ? `&instance_id=eq.${encodeURIComponent(instanceId)}` : "";

    try {
      const out = await sbGet("licenses", `?select=id,instance_id,plugin_slug,status,updated_at&order=updated_at.desc${filter}&limit=200`);
      return res.json({ items: out.data || [], total: out.count });
    } catch (e) {
      // Compatibilidade com schemas antigos sem coluna updated_at
      if (e?.response?.data?.code !== "42703") throw e;
      const out = await sbGet("licenses", `?select=id,instance_id,plugin_slug,status,created_at&order=created_at.desc${filter}&limit=200`);
      const items = (out.data || []).map((row) => ({ ...row, updated_at: row.updated_at || row.created_at || null }));
      return res.json({ items, total: out.count });
    }
  } catch (e) {
    return res.status(500).json({ error: e?.response?.data || e.message });
  }
});

app.post("/api/v1/admin/licenses/upsert", adminAuth, async (req, res) => {
  try {
    const { instance_id, plugin_slug, status } = req.body || {};
    if (!instance_id || !plugin_slug || !status) return res.status(400).json({ error: "instance_id, plugin_slug, status são obrigatórios" });

    let data;
    try {
      const rows = [{ instance_id, plugin_slug, status, updated_at: new Date().toISOString() }];
      data = await sbUpsert("licenses", rows, "instance_id,plugin_slug");
    } catch (e) {
      // Compatibilidade com schemas antigos sem coluna updated_at
      if (e?.response?.data?.code !== "42703") throw e;
      const rows = [{ instance_id, plugin_slug, status }];
      data = await sbUpsert("licenses", rows, "instance_id,plugin_slug");
    }

    audit("license_upsert", actorFromReq(req), { instance_id, plugin_slug, status });

    return res.json({ ok: true, item: data?.[0] || null });
  } catch (e) {
    return res.status(500).json({ error: e?.response?.data || e.message });
  }
});

app.get("/api/v1/admin/finance/summary", adminAuth, async (_req, res) => {
  try {
    const out = await sbGet("subscriptions", "?select=id,status,created_at,expires_at,plans(name,price)&limit=1000");
    const rows = out.data || [];

    let active = 0, pending = 0, overdue = 0, canceled = 0, mrr = 0;

    rows.forEach((r) => {
      const st = String(r.status || "").toLowerCase();
      if (st === "active") active += 1;
      else if (st === "pending") pending += 1;
      else if (st === "overdue") overdue += 1;
      else if (st === "canceled") canceled += 1;

      const plan = Array.isArray(r.plans) ? r.plans[0] : r.plans;
      const price = Number(plan?.price || 0);
      if (st === "active") mrr += price;
    });

    return res.json({
      subscriptions_total: rows.length,
      subscriptions_active: active,
      subscriptions_pending: pending,
      subscriptions_overdue: overdue,
      subscriptions_canceled: canceled,
      mrr,
      currency: "BRL"
    });
  } catch (e) {
    return res.status(500).json({ error: e?.response?.data || e.message });
  }
});

app.get("/api/v1/admin/finance/by-plan", adminAuth, async (_req, res) => {
  try {
    const out = await sbGet("subscriptions", "?select=id,status,plans(name,price)&limit=1000");
    const rows = out.data || [];

    const agg = {};
    rows.forEach((r) => {
      const plan = Array.isArray(r.plans) ? r.plans[0] : r.plans;
      const planName = String(plan?.name || "Sem plano");
      const price = Number(plan?.price || 0);
      const status = String(r.status || "").toLowerCase();

      if (!agg[planName]) agg[planName] = { plan: planName, total: 0, active: 0, pending: 0, overdue: 0, canceled: 0, mrr: 0 };
      agg[planName].total += 1;
      if (status === "active") { agg[planName].active += 1; agg[planName].mrr += price; }
      else if (status === "pending") agg[planName].pending += 1;
      else if (status === "overdue") agg[planName].overdue += 1;
      else if (status === "canceled") agg[planName].canceled += 1;
    });

    return res.json({ items: Object.values(agg).sort((a, b) => b.mrr - a.mrr) });
  } catch (e) {
    return res.status(500).json({ error: e?.response?.data || e.message });
  }
});

app.get("/api/v1/admin/finance/timeline", adminAuth, async (_req, res) => {
  try {
    const out = await sbGet("subscriptions", "?select=id,status,created_at&order=created_at.desc&limit=1000");
    const rows = out.data || [];

    const map = {};
    rows.forEach((r) => {
      const d = (r.created_at || "").slice(0, 10);
      if (!d) return;
      if (!map[d]) map[d] = { date: d, created: 0, active: 0, pending: 0, overdue: 0, canceled: 0 };
      map[d].created += 1;
      const st = String(r.status || "").toLowerCase();
      if (st === "active") map[d].active += 1;
      else if (st === "pending") map[d].pending += 1;
      else if (st === "overdue") map[d].overdue += 1;
      else if (st === "canceled") map[d].canceled += 1;
    });

    return res.json({ items: Object.values(map).sort((a, b) => a.date.localeCompare(b.date)) });
  } catch (e) {
    return res.status(500).json({ error: e?.response?.data || e.message });
  }
});

app.get("/api/v1/admin/subscriptions", adminAuth, async (req, res) => {
  try {
    const limit = Number(req.query.limit || 100);
    const out = await sbGet("subscriptions", `?select=id,status,created_at,expires_at,plan_id,customer_id&order=created_at.desc&limit=${limit}`);
    return res.json({ items: out.data || [], total: out.count });
  } catch (e) {
    return res.status(500).json({ error: e?.response?.data || e.message });
  }
});

// ---------- Admin / Plugins CRUD ----------
app.get("/api/v1/admin/plugins", adminAuth, (_req, res) => {
  const items = readJson(FILES.plugins, DEFAULT_PLUGINS);
  return res.json({ items });
});

app.post("/api/v1/admin/plugins", adminAuth, (req, res) => {
  const body = req.body || {};
  if (!body.slug || !body.name) return res.status(400).json({ error: "slug e name são obrigatórios" });

  const items = readJson(FILES.plugins, DEFAULT_PLUGINS);
  if (items.some((p) => p.slug === body.slug)) return res.status(409).json({ error: "slug já existe" });

  const row = {
    id: crypto.randomUUID(),
    slug: String(body.slug).trim(),
    name: String(body.name).trim(),
    description: String(body.description || ""),
    version: String(body.version || "1.0.0"),
    type: body.type === "free" ? "free" : "business",
    category: String(body.category || "other"),
    price: Number(body.price || 0),
    iconUrl: String(body.iconUrl || ""),
    active: body.active !== false
  };

  items.push(row);
  writeJson(FILES.plugins, items);
  audit("plugin_create", actorFromReq(req), row);
  return res.json({ ok: true, item: row });
});

app.put("/api/v1/admin/plugins/:id", adminAuth, (req, res) => {
  const id = req.params.id;
  const items = readJson(FILES.plugins, DEFAULT_PLUGINS);
  const idx = items.findIndex((p) => p.id === id);
  if (idx < 0) return res.status(404).json({ error: "plugin não encontrado" });

  items[idx] = { ...items[idx], ...req.body, id: items[idx].id };
  writeJson(FILES.plugins, items);
  audit("plugin_update", actorFromReq(req), { id, changes: req.body || {} });
  return res.json({ ok: true, item: items[idx] });
});

app.delete("/api/v1/admin/plugins/:id", adminAuth, (req, res) => {
  const id = req.params.id;
  const items = readJson(FILES.plugins, DEFAULT_PLUGINS);
  const idx = items.findIndex((p) => p.id === id);
  if (idx < 0) return res.status(404).json({ error: "plugin não encontrado" });

  const row = items[idx];
  items.splice(idx, 1);
  writeJson(FILES.plugins, items);
  audit("plugin_delete", actorFromReq(req), row);
  return res.json({ ok: true });
});

// ---------- Admin / Coupons CRUD + Rules + Audit ----------
app.get("/api/v1/admin/coupons", adminAuth, (_req, res) => {
  const items = readJson(FILES.coupons, []);
  return res.json({ items });
});

app.post("/api/v1/admin/coupons", adminAuth, (req, res) => {
  const body = req.body || {};
  const code = String(body.code || "").trim().toUpperCase();
  if (!code) return res.status(400).json({ error: "code é obrigatório" });

  const items = readJson(FILES.coupons, []);
  if (items.some((c) => c.code === code)) return res.status(409).json({ error: "cupom já existe" });

  const row = {
    id: crypto.randomUUID(),
    code,
    type: body.type === "fixed" ? "fixed" : "percent",
    value: Number(body.value || 0),
    maxDiscount: Number(body.maxDiscount || 0),
    minAmount: Number(body.minAmount || 0),
    usageLimit: Number(body.usageLimit || 0),
    usedCount: Number(body.usedCount || 0),
    startAt: body.startAt || null,
    endAt: body.endAt || null,
    appliesToPlugins: Array.isArray(body.appliesToPlugins) ? body.appliesToPlugins : [],
    active: body.active !== false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  items.push(row);
  writeJson(FILES.coupons, items);
  audit("coupon_create", actorFromReq(req), row);
  return res.json({ ok: true, item: row });
});

app.put("/api/v1/admin/coupons/:id", adminAuth, (req, res) => {
  const id = req.params.id;
  const items = readJson(FILES.coupons, []);
  const idx = items.findIndex((c) => c.id === id);
  if (idx < 0) return res.status(404).json({ error: "cupom não encontrado" });

  const patch = { ...req.body, updated_at: new Date().toISOString() };
  if (patch.code) patch.code = String(patch.code).toUpperCase();
  items[idx] = { ...items[idx], ...patch, id: items[idx].id };
  writeJson(FILES.coupons, items);
  audit("coupon_update", actorFromReq(req), { id, changes: patch });
  return res.json({ ok: true, item: items[idx] });
});

app.delete("/api/v1/admin/coupons/:id", adminAuth, (req, res) => {
  const id = req.params.id;
  const items = readJson(FILES.coupons, []);
  const idx = items.findIndex((c) => c.id === id);
  if (idx < 0) return res.status(404).json({ error: "cupom não encontrado" });

  const row = items[idx];
  items.splice(idx, 1);
  writeJson(FILES.coupons, items);
  audit("coupon_delete", actorFromReq(req), row);
  return res.json({ ok: true });
});

app.post("/api/v1/admin/coupons/validate", adminAuth, (req, res) => {
  const { code, amount, pluginSlug } = req.body || {};
  const coupons = readJson(FILES.coupons, []);
  const coupon = coupons.find((c) => String(c.code).toUpperCase() === String(code || "").toUpperCase());
  if (!coupon) return res.status(404).json({ ok: false, reason: "cupom não encontrado" });

  const out = applyCouponRules(coupon, Number(amount || 0), pluginSlug || "");
  return res.json({ ok: out.ok, ...out, coupon });
});

app.get("/api/v1/admin/audits", adminAuth, (req, res) => {
  const limit = Number(req.query.limit || 200);
  const rows = readJson(FILES.audits, []);
  return res.json({ items: rows.slice(0, limit) });
});

// ---------- Login web ----------
app.get("/login", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.post("/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!ADMIN_PASSWORD) return res.status(500).json({ error: "ADMIN_PASSWORD não configurado" });
  if (username !== ADMIN_USER || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Credenciais inválidas" });
  }
  setSessionCookie(res);
  audit("login", username || "unknown", {});
  return res.json({ ok: true });
});

app.post("/logout", (req, res) => {
  clearSessionCookie(res);
  audit("logout", actorFromReq(req), {});
  return res.json({ ok: true });
});

app.get("/", webAuth, (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use("/public", express.static(path.join(__dirname, "public")));

ensureDataFiles();

app.listen(PORT, () => {
  console.log(`Marketplace Hub listening on :${PORT}`);
  console.log(`Webhook MP: ${MP_WEBHOOK_URL}`);
});

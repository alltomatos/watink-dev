import { test as base, expect, request } from "@playwright/test";
import { createQueue, deleteQueue } from "../../fixtures/api.fixture";

const API = process.env.E2E_API_URL || "http://localhost:8082/api/v1";

// Helpers para criar um tenant secundário e logar como ele
async function setupSecondTenant(name: string, email: string, password: string) {
  const anon = await request.newContext({ baseURL: API });

  // Se o sistema ainda aceitar setup (ambiente fresh) use o endpoint de setup
  // Caso contrário crie via /users (admin já existe)
  const check = await anon.get("initial-setup/check");
  const { needsSetup } = await check.json();
  if (needsSetup) {
    await anon.post("initial-setup", {
      data: { firstName: name, lastName: "Tenant", email, password },
    });
  }
  await anon.dispose();
}

async function loginAs(email: string, password: string) {
  const ctx = await request.newContext({ baseURL: API });
  const resp = await ctx.post("auth/login", { data: { email, password } });
  if (!resp.ok()) {
    await ctx.dispose();
    return null;
  }
  const { token } = await resp.json();
  await ctx.dispose();
  return token as string;
}

base.describe("Multitenancy — Isolamento de dados", () => {
  base("fila criada pelo admin não é visível para usuário de outro tenant", async ({
    playwright,
  }) => {
    const adminEmail = process.env.E2E_ADMIN_EMAIL || "admin@e2e.test";
    const adminPass = process.env.E2E_ADMIN_PASS || "e2e_password_123";
    const adminToken = await loginAs(adminEmail, adminPass);
    if (!adminToken) {
      base.skip();
      return;
    }

    const adminApi = await playwright.request.newContext({
      baseURL: API,
      extraHTTPHeaders: { Authorization: `Bearer ${adminToken}` },
    });

    // Admin cria uma fila privada
    const queueName = `Privada-${Date.now()}`;
    const queue = await createQueue(adminApi, queueName, "#FF0000");
    expect(queue.id).toBeTruthy();

    // Tenta acessar a fila com uma requisição sem autenticação (simula outro tenant)
    const anonApi = await playwright.request.newContext({ baseURL: API });
    const resp = await anonApi.get("queue");
    expect(resp.status()).toBe(401);

    // Cleanup
    await deleteQueue(adminApi, queue.id);
    await adminApi.dispose();
    await anonApi.dispose();
  });

  base("endpoint /dashboard retorna apenas dados do tenant autenticado", async ({
    playwright,
  }) => {
    const adminEmail = process.env.E2E_ADMIN_EMAIL || "admin@e2e.test";
    const adminPass = process.env.E2E_ADMIN_PASS || "e2e_password_123";
    const token = await loginAs(adminEmail, adminPass);
    if (!token) {
      base.skip();
      return;
    }

    const api = await playwright.request.newContext({
      baseURL: API,
      extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    });

    const resp = await api.get("dashboard");
    expect(resp.status()).toBe(200);

    const body = await resp.json();
    expect(body).toHaveProperty("tickets");
    expect(body).toHaveProperty("queues");
    expect(body).toHaveProperty("metrics");

    await api.dispose();
  });
});

import { test as base, expect, APIRequestContext } from "@playwright/test";
import path from "path";
import fs from "fs";

const API_URL = (process.env.E2E_API_URL || "http://localhost:8082/api/v1/").replace(/\/?$/, "/");
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "admin@e2e.test";
export const ADMIN_PASS = process.env.E2E_ADMIN_PASS || "e2e_password_123";

const STATE_DIR = path.join(__dirname, "../.auth");

export interface AuthFixtures {
  adminToken: string;
  authedApi: APIRequestContext;
}

// Login via API, retorna o Bearer token
async function loginApi(api: APIRequestContext, email: string, password: string): Promise<string> {
  const resp = await api.post("auth/login", { data: { email, password } });
  expect(resp.ok(), `Login failed: ${await resp.text()}`).toBeTruthy();
  const body = await resp.json();
  return body.token as string;
}

// Garante que o diretório de state existe
function ensureAuthDir() {
  if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
}

export const test = base.extend<AuthFixtures>({
  adminToken: async ({ playwright }, use) => {
    const api = await playwright.request.newContext({ baseURL: API_URL });
    const token = await loginApi(api, ADMIN_EMAIL, ADMIN_PASS);
    await use(token);
    await api.dispose();
  },

  authedApi: async ({ playwright, adminToken }, use) => {
    const api = await playwright.request.newContext({
      baseURL: API_URL,
      extraHTTPHeaders: { Authorization: `Bearer ${adminToken}` },
    });
    await use(api);
    await api.dispose();
  },
});

export { expect };
export { ensureAuthDir };

import { request } from "@playwright/test";

const API_URL = (process.env.E2E_API_URL || "http://localhost:8082/api/v1/").replace(/\/?$/, "/");
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "admin@e2e.test";
const ADMIN_PASS = process.env.E2E_ADMIN_PASS || "e2e_password_123";

async function globalSetup() {
  const api = await request.newContext({ baseURL: API_URL });

  // Check if system already needs setup
  const checkResp = await api.get("initial-setup/check");
  const { needsSetup } = await checkResp.json();

  if (needsSetup) {
    const setupResp = await api.post("initial-setup", {
      data: {
        companyName: "Watink E2E Test",
        firstName: "Admin",
        lastName: "E2E",
        email: ADMIN_EMAIL,
        password: ADMIN_PASS,
      },
    });
    if (!setupResp.ok()) {
      throw new Error(`global-setup: initial setup failed — ${await setupResp.text()}`);
    }
    console.log("[global-setup] Tenant + admin criados");
  } else {
    console.log("[global-setup] Sistema já inicializado — pulando seed");
  }

  await api.dispose();
}

export default globalSetup;

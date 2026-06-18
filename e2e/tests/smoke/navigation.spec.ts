import { test, expect } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASS } from "../../fixtures/auth.fixture";

const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";

const PROTECTED_ROUTES = [
  "/tickets",
  "/connections",
  "/contacts",
  "/tags",
  "/settings",
  "/queues",
  "/users",
];

test.describe("Smoke — Navegação autenticada", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[name="email"], input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"], input[type="password"]', ADMIN_PASS);
    await page.click('button[type="submit"]');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
  });

  for (const route of PROTECTED_ROUTES) {
    test(`${route} carrega sem erros críticos`, async ({ page }) => {
      const errors: string[] = [];

      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
      });

      page.on("response", (res) => {
        const status = res.status();
        // Ignorar 404s de assets opcionais e 401s de chamadas de polling
        if (status >= 500) {
          errors.push(`HTTP ${status}: ${res.url()}`);
        }
      });

      await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);

      // Nenhum erro 5xx nem console.error crítico
      const criticalErrors = errors.filter(
        (e) => !e.includes("favicon") && !e.includes("socket.io")
      );
      expect(criticalErrors, `Erros em ${route}: ${criticalErrors.join("; ")}`).toHaveLength(0);
    });
  }
});

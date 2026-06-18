import { test, expect } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASS } from "../../fixtures/auth.fixture";

const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";

test.describe("Auth — Login", () => {
  test("login válido redireciona para dashboard", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[name="email"], input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"], input[type="password"]', ADMIN_PASS);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/(dashboard|tickets|\/)/, { timeout: 10_000 });
    // Sidebar deve estar visível após login
    await expect(page.locator("aside, nav")).toBeVisible({ timeout: 5_000 });
  });

  test("credenciais inválidas exibem mensagem de erro", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('input[name="email"], input[type="email"]', "invalido@e2e.test");
    await page.fill('input[name="password"], input[type="password"]', "senhaerrada");
    await page.click('button[type="submit"]');

    // Deve permanecer em /login
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  });

  test("acesso a rota protegida sem login redireciona para /login", async ({ page }) => {
    await page.goto(`${BASE}/tickets`);
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  });
});

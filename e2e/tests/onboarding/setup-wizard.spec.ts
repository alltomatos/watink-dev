import { test, expect } from "../../fixtures/auth.fixture";
import { request } from "@playwright/test";

/**
 * P3-4 — Setup Wizard (POST /initial-setup).
 *
 * POR QUE SÓ O 403 É TESTÁVEL AQUI:
 * O global-setup roda ANTES de qualquer spec e já executa o initial-setup
 * (cria Tenant + Administrador). A partir daí NeedsSetup() = false para todo
 * o ambiente compartilhado. Um teste do caminho feliz do wizard (criar tenant
 * do zero) exigiria um banco virgem por spec — não determinístico no harness
 * atual (workers=1, tenant compartilhado, sem reset entre specs).
 *
 * Portanto o comportamento verificável e determinístico é a IDEMPOTÊNCIA da
 * inicialização: re-init depois de já inicializado retorna 403
 * ("System already initialized"). Também validamos que /initial-setup/check
 * reporta needsSetup=false coerente com esse estado.
 *
 * Nota sobre validação de payload: no controller o guard de "já inicializado"
 * (403) é avaliado ANTES do bind/validação do corpo — logo, com o sistema já
 * inicializado, um payload inválido também retorna 403, não 400. Asserir 400
 * de validação aqui seria frágil/enganoso; deixamos essa cobertura para os
 * testes unitários Go do SetupController (setup_mock_test.go).
 */

const API = process.env.E2E_API_URL || "http://localhost:8082/api/v1/";

test.describe("API — Setup Wizard (idempotência pós-init)", () => {
  test("/initial-setup/check reporta needsSetup=false após o global-setup", async () => {
    const anon = await request.newContext({ baseURL: API });
    const resp = await anon.get("initial-setup/check");
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toHaveProperty("needsSetup");
    expect(body.needsSetup).toBe(false);
    await anon.dispose();
  });

  test("re-inicializar retorna 403 (System already initialized)", async () => {
    const anon = await request.newContext({ baseURL: API });
    const resp = await anon.post("initial-setup", {
      data: {
        companyName: "Tentativa de Re-Init",
        firstName: "Re",
        lastName: "Init",
        email: "reinit@test.com",
        password: "senha_segura_123",
      },
    });
    expect(resp.status(), `re-init deve ser 403: ${await resp.text()}`).toBe(403);
    await anon.dispose();
  });

  test("re-inicializar com payload inválido também é 403 (guard antes do bind)", async () => {
    // Documenta a ordem no controller: com o sistema já inicializado, o guard
    // 403 vence a validação do corpo — payload vazio NÃO vira 400 aqui.
    const anon = await request.newContext({ baseURL: API });
    const resp = await anon.post("initial-setup", { data: {} });
    expect(resp.status()).toBe(403);
    await anon.dispose();
  });

  test("check continua acessível sem autenticação", async ({ authedApi }) => {
    // Sanidade: o endpoint de check é público (não exige Bearer). authedApi só
    // garante que a fixture de admin resolve no ambiente (login válido).
    const resp = await authedApi.get("initial-setup/check");
    expect(resp.status()).toBe(200);
  });
});

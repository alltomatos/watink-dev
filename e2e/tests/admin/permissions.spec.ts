import { test, expect, ADMIN_EMAIL, ADMIN_PASS } from "../../fixtures/auth.fixture";

/**
 * P2-10 — Enforcement real de permissão (ADR 0022, RequirePermission).
 *
 * O admin criado no global-setup tem alcance=tenant, que BYPASSA todo
 * RequirePermission. Para exercitar o gate de verdade precisamos de um ator
 * de baixa permissão: um usuário com alcance=proprio e um Cargo "Atendente"
 * SEM as permissões users:* / setores:* / connections:*.
 *
 * Este spec cria (como admin) Setor + Cargo Atendente + usuário Atendente,
 * loga como o Atendente e assere 403 nas rotas gated, com GET /me (self-service
 * sem gate) como controle positivo (200). Tudo criado é limpo no teardown.
 */

const API = process.env.E2E_API_URL || "http://localhost:8082/api/v1/";

test.describe("API — RequirePermission (Atendente alcance=proprio)", () => {
  test("Atendente toma 403 em rotas gated e 200 em /me", async ({ authedApi, playwright }) => {
    const stamp = Date.now();
    const atendenteEmail = `e2e-atendente-${stamp}@test.com`;
    const atendentePass = "senha_segura_123";

    // IDs para teardown
    let cargoId: number | undefined;
    let setorId: number | undefined;
    let userId: number | undefined;

    try {
      // 1) Cargo "Atendente" — sem permissionIds (nenhuma permissão administrativa).
      const cargoResp = await authedApi.post("cargos", {
        data: { name: `Atendente E2E ${stamp}`, description: "cargo de teste sem permissões", permissionIds: [] },
      });
      expect(cargoResp.status(), `criar cargo: ${await cargoResp.text()}`).toBe(201);
      cargoId = (await cargoResp.json()).id;
      expect(cargoId).toBeTruthy();

      // 2) Setor (organiza o vínculo do usuário).
      const setorResp = await authedApi.post("setores", { data: { name: `Setor E2E ${stamp}` } });
      expect(setorResp.ok(), `criar setor: ${await setorResp.text()}`).toBeTruthy();
      setorId = (await setorResp.json()).id;
      expect(setorId).toBeTruthy();

      // 3) Usuário Atendente: alcance=proprio (NÃO bypassa gate), cargo sem permissões.
      const userResp = await authedApi.post("users", {
        data: {
          name: "Atendente E2E",
          email: atendenteEmail,
          password: atendentePass,
          alcance: "proprio",
          cargoId,
          setores: [{ setorId, ehGestor: false }],
        },
      });
      expect(userResp.ok(), `criar usuário: ${await userResp.text()}`).toBeTruthy();
      userId = (await userResp.json()).id;
      expect(userId).toBeTruthy();

      // 4) Loga como o Atendente.
      const anon = await playwright.request.newContext({ baseURL: API });
      const loginResp = await anon.post("auth/login", {
        data: { email: atendenteEmail, password: atendentePass },
      });
      expect(loginResp.ok(), `login atendente: ${await loginResp.text()}`).toBeTruthy();
      const { token } = await loginResp.json();
      await anon.dispose();
      expect(token).toBeTruthy();

      const atendenteApi = await playwright.request.newContext({
        baseURL: API,
        extraHTTPHeaders: { Authorization: `Bearer ${token}` },
      });

      try {
        // 403 nas rotas gated por RequirePermission.
        const listUsers = await atendenteApi.get("users");
        expect(listUsers.status(), "GET /users deve ser 403 para Atendente").toBe(403);

        const createSetor = await atendenteApi.post("setores", { data: { name: "não-autorizado" } });
        expect(createSetor.status(), "POST /setores deve ser 403 para Atendente").toBe(403);

        // PUT /whatsapp/:id é gated por connections:update ANTES do handler —
        // o 403 acontece sem sequer resolver o id (id 999999 é irrelevante).
        const putWhatsapp = await atendenteApi.put("whatsapp/999999", { data: { name: "x" } });
        expect(putWhatsapp.status(), "PUT /whatsapp/:id deve ser 403 para Atendente").toBe(403);

        // Controle positivo: self-service /me não tem gate → 200.
        const me = await atendenteApi.get("me");
        expect(me.status(), "GET /me deve ser 200 (self-service sem gate)").toBe(200);
        const meBody = await me.json();
        expect(meBody.email).toBe(atendenteEmail);
        expect(meBody.alcance).toBe("proprio");
      } finally {
        await atendenteApi.dispose();
      }
    } finally {
      // Teardown (ordem: usuário → setor → cargo). Cargo só deleta se nenhum
      // usuário o referencia, por isso o usuário sai primeiro.
      if (userId) await authedApi.delete(`users/${userId}`);
      if (setorId) await authedApi.delete(`setores/${setorId}`);
      if (cargoId) await authedApi.delete(`cargos/${cargoId}`);
    }
  });

  test("admin (alcance=tenant) NÃO toma 403 nas mesmas rotas", async ({ authedApi }) => {
    // Controle: o admin do setup bypassa RequirePermission — GET /users 200.
    const resp = await authedApi.get("users");
    expect(resp.status()).toBe(200);
    // login exercitado indiretamente pela fixture authedApi (ADMIN_EMAIL/PASS).
    expect(ADMIN_EMAIL).toBeTruthy();
    expect(ADMIN_PASS).toBeTruthy();
  });
});

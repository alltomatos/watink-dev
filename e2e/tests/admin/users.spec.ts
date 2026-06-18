import { test, expect } from "../../fixtures/auth.fixture";
import { createUser, deleteUser } from "../../fixtures/api.fixture";

test.describe("API — Users CRUD", () => {
  test("criar e remover usuário com sucesso", async ({ authedApi }) => {
    const email = `e2e-user-${Date.now()}@test.com`;
    const user = await createUser(authedApi, {
      name: "E2E User",
      email,
      password: "senha_segura_123",
    });

    expect(user.id).toBeTruthy();
    expect(user.email).toBe(email);

    // Deve aparecer na listagem
    const list = await authedApi.get("users");
    expect(list.status()).toBe(200);
    const body: { users: { id: number; email: string }[] } = await list.json();
    const users = Array.isArray(body) ? body : body.users ?? [];
    expect(users.some((u) => u.id === user.id)).toBe(true);

    // Cleanup
    await deleteUser(authedApi, user.id);
  });

  test("email duplicado retorna erro", async ({ authedApi }) => {
    const email = `e2e-dup-${Date.now()}@test.com`;
    const u1 = await createUser(authedApi, {
      name: "Dup1",
      email,
      password: "senha123",
    });

    const resp = await authedApi.post("users", {
      data: { name: "Dup2", email, password: "senha456", profile: "user" },
    });
    expect(resp.status()).toBeGreaterThanOrEqual(400);

    await deleteUser(authedApi, u1.id);
  });

  test("listar usuários requer autenticação", async ({ playwright }) => {
    const api = await playwright.request.newContext({
      baseURL: process.env.E2E_API_URL || "http://localhost:8082/api/v1/",
    });
    const resp = await api.get("users");
    expect(resp.status()).toBe(401);
    await api.dispose();
  });
});

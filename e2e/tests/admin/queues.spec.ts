import { test, expect } from "../../fixtures/auth.fixture";
import { createQueue, deleteQueue } from "../../fixtures/api.fixture";

test.describe("API — Queues CRUD", () => {
  test("criar e remover fila com sucesso", async ({ authedApi }) => {
    const name = `E2E-Queue-${Date.now()}`;
    const queue = await createQueue(authedApi, name);

    expect(queue.id).toBeTruthy();
    expect(queue.name).toBe(name);

    // Confirmar que aparece na listagem
    const list = await authedApi.get("/queue");
    expect(list.status()).toBe(200);
    const queues: { id: number; name: string }[] = await list.json();
    expect(queues.some((q) => q.id === queue.id)).toBe(true);

    // Cleanup
    await deleteQueue(authedApi, queue.id);

    // Confirmar remoção
    const afterDelete = await authedApi.get("/queue");
    const remaining: { id: number }[] = await afterDelete.json();
    expect(remaining.some((q) => q.id === queue.id)).toBe(false);
  });

  test("criar fila com nome duplicado retorna erro", async ({ authedApi }) => {
    const name = `E2E-Dup-${Date.now()}`;
    const q1 = await createQueue(authedApi, name, "#111111");

    const resp = await authedApi.post("/queue", {
      data: { name, color: "#222222" },
    });
    // UNIQUE constraint — deve retornar 4xx ou 5xx
    expect(resp.status()).toBeGreaterThanOrEqual(400);

    await deleteQueue(authedApi, q1.id);
  });

  test("listar filas requer autenticação", async ({ playwright }) => {
    const api = await playwright.request.newContext({
      baseURL: process.env.E2E_API_URL || "http://localhost:8082/api/v1",
    });
    const resp = await api.get("/queue");
    expect(resp.status()).toBe(401);
    await api.dispose();
  });
});

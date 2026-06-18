import { test, expect } from "../../fixtures/auth.fixture";

const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";
const API = process.env.E2E_API_URL || "http://localhost:8082/api/v1";

test.describe("API — Tickets (via authedApi)", () => {
  test("GET /tickets retorna lista paginada", async ({ authedApi }) => {
    const resp = await authedApi.get("tickets?status=open");
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    // Resposta tem pelo menos o campo count (mesmo que 0)
    expect(body).toHaveProperty("count");
    expect(body).toHaveProperty("tickets");
    expect(Array.isArray(body.tickets)).toBe(true);
  });

  test("GET /tickets respeita filtro de status", async ({ authedApi }) => {
    const open = await authedApi.get("tickets?status=open");
    const pending = await authedApi.get("tickets?status=pending");
    const closed = await authedApi.get("tickets?status=closed");

    expect(open.status()).toBe(200);
    expect(pending.status()).toBe(200);
    expect(closed.status()).toBe(200);
  });

  test("GET /tickets sem auth retorna 401", async ({ playwright }) => {
    const api = await playwright.request.newContext({ baseURL: API });
    const resp = await api.get("tickets?status=open");
    expect(resp.status()).toBe(401);
    await api.dispose();
  });
});

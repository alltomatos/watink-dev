import { APIRequestContext, expect } from "@playwright/test";

export interface QueueSeed {
  id: number;
  name: string;
}

export interface UserSeed {
  id: number;
  email: string;
  name: string;
}

export async function createQueue(
  api: APIRequestContext,
  name: string,
  color = "#3498DB"
): Promise<QueueSeed> {
  const resp = await api.post("/queue", { data: { name, color } });
  expect(resp.ok(), `createQueue failed: ${await resp.text()}`).toBeTruthy();
  return resp.json();
}

export async function deleteQueue(api: APIRequestContext, id: number): Promise<void> {
  await api.delete(`/queue/${id}`);
}

export async function createUser(
  api: APIRequestContext,
  opts: { name: string; email: string; password: string; profile?: string }
): Promise<UserSeed> {
  const resp = await api.post("/users", {
    data: {
      name: opts.name,
      email: opts.email,
      password: opts.password,
      profile: opts.profile ?? "user",
    },
  });
  expect(resp.ok(), `createUser failed: ${await resp.text()}`).toBeTruthy();
  return resp.json();
}

export async function deleteUser(api: APIRequestContext, id: number): Promise<void> {
  await api.delete(`/users/${id}`);
}

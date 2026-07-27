import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { ApiError, apiRequest, setUnauthorizedListener } from "./api";
import { getAccessToken, saveAccessToken } from "./session";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: storage } });

beforeEach(() => {
  storage.clear();
  saveAccessToken("expired-access-token");
  setUnauthorizedListener(null);
});

test("two signalled callers share one refresh and both retry successfully", async () => {
  const refresh = deferred<Response>();
  let refreshCalls = 0;
  let resourceCalls = 0;
  globalThis.fetch = async (input) => {
    const path = new URL(String(input)).pathname;
    if (path.endsWith("/auth/refresh")) { refreshCalls += 1; return refresh.promise; }
    resourceCalls += 1;
    return resourceCalls <= 2 ? response(401, {}) : response(200, { request: resourceCalls });
  };

  const first = apiRequest<{ request: number }>("/first", { signal: new AbortController().signal });
  const second = apiRequest<{ request: number }>("/second", { signal: new AbortController().signal });
  await waitUntil(() => refreshCalls === 1);
  refresh.resolve(refreshResponse());

  const results = await Promise.all([first, second]);
  assert.equal(refreshCalls, 1);
  assert.equal(resourceCalls, 4);
  assert.deepEqual(results.map((result) => result.request), [3, 4]);
  assert.equal(getAccessToken(), "fresh-access-token");
});

test("aborting one caller only cancels its wait for the shared refresh", async () => {
  const refresh = deferred<Response>();
  const firstController = new AbortController();
  const secondController = new AbortController();
  let refreshCalls = 0;
  let retries = 0;
  let unauthorizedCalls = 0;
  const cleanup = setUnauthorizedListener(() => { unauthorizedCalls += 1; });
  globalThis.fetch = async (input) => {
    const path = new URL(String(input)).pathname;
    if (path.endsWith("/auth/refresh")) { refreshCalls += 1; return refresh.promise; }
    if (getAccessToken() === "fresh-access-token") { retries += 1; return response(200, { ok: true }); }
    return response(401, {});
  };

  const first = apiRequest<{ ok: boolean }>("/first", { signal: firstController.signal });
  const second = apiRequest<{ ok: boolean }>("/second", { signal: secondController.signal });
  await waitUntil(() => refreshCalls === 1);
  firstController.abort();
  await assert.rejects(first, isApiError("request.aborted"));
  assert.equal(getAccessToken(), "expired-access-token");
  assert.equal(unauthorizedCalls, 0);

  refresh.resolve(refreshResponse());
  assert.deepEqual(await second, { ok: true });
  assert.equal(refreshCalls, 1);
  assert.equal(retries, 1);
  assert.equal(unauthorizedCalls, 0);
  cleanup();
});

test("a genuine shared refresh failure clears auth and notifies once", async () => {
  let refreshCalls = 0;
  let unauthorizedCalls = 0;
  const cleanup = setUnauthorizedListener(() => { unauthorizedCalls += 1; });
  globalThis.fetch = async (input) => {
    if (new URL(String(input)).pathname.endsWith("/auth/refresh")) {
      refreshCalls += 1;
      return response(401, { error: { code: "auth.invalid_token" } });
    }
    return response(401, {});
  };

  const first = apiRequest("/first", { signal: new AbortController().signal });
  const second = apiRequest("/second", { signal: new AbortController().signal });
  await Promise.all([
    assert.rejects(first, isApiError("auth.expired_token")),
    assert.rejects(second, isApiError("auth.expired_token"))
  ]);

  assert.equal(refreshCalls, 1);
  assert.equal(getAccessToken(), null);
  assert.equal(unauthorizedCalls, 1);
  cleanup();
});

function refreshResponse(): Response {
  return response(200, { tokens: { accessToken: "fresh-access-token", tokenType: "Bearer", expiresIn: 900 } });
}

function response(status: number, data: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => ({ data, ...(data as object) }) } as Response;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 20 && !predicate(); attempt += 1) await Promise.resolve();
  assert.equal(predicate(), true, "condition was not reached");
}

function isApiError(code: string) {
  return (error: unknown) => error instanceof ApiError && error.code === code;
}

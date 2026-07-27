import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import type { FamilyWithMembership } from "./api";
import { chooseActiveFamily, clearFamilyCache, forceFamilyBootstrapRestart, loadAvailableFamilies } from "./auth-family";
import { clearAuthSession, saveAccessToken } from "./session";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const storage = new MemoryStorage();

Object.defineProperty(globalThis, "window", {
  value: { localStorage: storage },
  configurable: true
});

beforeEach(() => {
  clearAuthSession();
  clearFamilyCache();
  storage.clear();
  saveAccessToken("test-token");
});

test("loadAvailableFamilies reuses a fresh bootstrap cache", async () => {
  let calls = 0;
  mockListFamilies(async () => {
    calls += 1;
    return [familyWithMembership("family-a")];
  });

  const first = await loadAvailableFamilies();
  const second = await loadAvailableFamilies();

  assert.equal(first.status, "ready");
  assert.equal(second.status, "ready");
  assert.equal(calls, 1);
});

test("loadAvailableFamilies deduplicates simultaneous bootstrap requests", async () => {
  let calls = 0;
  let resolveFamilies: (families: FamilyWithMembership[]) => void = () => undefined;
  const familiesPromise = new Promise<FamilyWithMembership[]>((resolve) => {
    resolveFamilies = resolve;
  });

  mockListFamilies(() => {
    calls += 1;
    return familiesPromise;
  });

  const firstPromise = loadAvailableFamilies();
  const secondPromise = loadAvailableFamilies();

  resolveFamilies([familyWithMembership("family-a")]);

  const [first, second] = await Promise.all([firstPromise, secondPromise]);

  assert.equal(first.status, "ready");
  assert.equal(second.status, "ready");
  assert.equal(calls, 1);
});

test("chooseActiveFamily clears the bootstrap cache", async () => {
  let calls = 0;
  mockListFamilies(async () => {
    calls += 1;
    return [familyWithMembership("family-a"), familyWithMembership("family-b")];
  });

  await loadAvailableFamilies();
  chooseActiveFamily("family-b");
  await loadAvailableFamilies();

  assert.equal(calls, 2);
});

test("a retry can abort the old family request and starts a fresh request", async () => {
  let calls = 0;
  let firstAborted = false;
  globalThis.fetch = (_input, init) => {
    calls += 1;
    if (calls === 2) return Promise.resolve(response([familyWithMembership("new-family")]));
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        firstAborted = true;
        reject(new DOMException("Aborted", "AbortError"));
      }, { once: true });
    });
  };

  const oldController = new AbortController();
  const oldRequest = loadAvailableFamilies(undefined, oldController.signal);
  oldController.abort();
  forceFamilyBootstrapRestart();
  const freshResult = await loadAvailableFamilies(undefined, new AbortController().signal);

  await assert.rejects(oldRequest, (error: unknown) => error instanceof Error && "code" in error && error.code === "request.aborted");
  assert.equal(firstAborted, true);
  assert.equal(calls, 2);
  assert.equal(freshResult.status, "ready");
  assert.equal(freshResult.activeFamilyId, "new-family");
});

function mockListFamilies(handler: () => Promise<FamilyWithMembership[]>): void {
  globalThis.fetch = async () => response(await handler());
}

function response(families: FamilyWithMembership[]): Response {
  return { ok: true, status: 200, json: async () => ({ data: families }) } as Response;
}

function familyWithMembership(familyId: string): FamilyWithMembership {
  return {
    family: {
      id: familyId,
      name: `Family ${familyId}`,
      code: `CODE-${familyId}`,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    },
    membership: {
      id: `member-${familyId}`,
      familyId,
      userId: "user-a",
      displayName: "User A",
      role: "guardian",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    }
  } as unknown as FamilyWithMembership;
}

import { strict as assert } from "node:assert";
import test from "node:test";
import { clearAuthSession, saveAuthSession } from "./session";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  clear(): void {
    this.values.clear();
  }

  get length(): number {
    return this.values.size;
  }
}

test("auth session helpers store only the access token locally", () => {
  const localStorage = new MemoryStorage();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage }
  });

  saveAuthSession({
    user: {
      id: "user-1",
      name: "Test User",
      firstName: "Test",
      middleName: null,
      lastName: "User",
      displayName: "Test User",
      avatarUrl: null,
      email: "test@example.com",
      phone: null,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString()
    },
    tokens: {
      accessToken: "access-token",
      tokenType: "Bearer",
      expiresIn: 900
    }
  });

  assert.equal(localStorage.getItem("familieappen.accessToken"), "access-token");
  assert.equal(localStorage.getItem("familieappen.refreshToken"), null);

  clearAuthSession();
  assert.equal(localStorage.getItem("familieappen.accessToken"), null);
  assert.equal(localStorage.getItem("familieappen.refreshToken"), null);
});

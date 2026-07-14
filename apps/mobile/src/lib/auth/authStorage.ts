import { secureStorage } from "../storage/secureStorage";

const ACCESS_TOKEN_KEY = "familieappen.mobile.accessToken";
const SESSION_META_KEY = "familieappen.mobile.sessionMeta";

export interface AuthSessionMetadata {
  tokenType: "Bearer";
  expiresAt: string;
  storedAt: string;
}

export interface StoredAuthSession {
  accessToken: string;
  metadata: AuthSessionMetadata;
}

export const authStorage = {
  async getSession(): Promise<StoredAuthSession | null> {
    const [accessToken, rawMetadata] = await Promise.all([secureStorage.getItem(ACCESS_TOKEN_KEY), secureStorage.getItem(SESSION_META_KEY)]);
    if (!accessToken || !rawMetadata) return null;
    try {
      const metadata = JSON.parse(rawMetadata) as AuthSessionMetadata;
      if (metadata.tokenType !== "Bearer" || !metadata.expiresAt) return null;
      return { accessToken, metadata };
    } catch {
      await this.clearSession();
      return null;
    }
  },
  async saveSession(input: { accessToken: string; tokenType: "Bearer"; expiresIn: number }): Promise<void> {
    const metadata: AuthSessionMetadata = { tokenType: input.tokenType, expiresAt: new Date(Date.now() + input.expiresIn * 1000).toISOString(), storedAt: new Date().toISOString() };
    await Promise.all([secureStorage.setItem(ACCESS_TOKEN_KEY, input.accessToken), secureStorage.setItem(SESSION_META_KEY, JSON.stringify(metadata))]);
  },
  async clearSession(): Promise<void> {
    await Promise.all([secureStorage.deleteItem(ACCESS_TOKEN_KEY), secureStorage.deleteItem(SESSION_META_KEY)]);
  }
} as const;

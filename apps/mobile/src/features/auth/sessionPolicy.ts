import { ApiError } from "../../lib/api/client";
import type { StoredAuthSession } from "../../lib/auth/authStorage";

export const RESTORE_NETWORK_MESSAGE = "Kunne ikke validere økten akkurat nå. Logg inn når du har nettverk igjen.";
export const POST_LOGIN_SESSION_ERROR_MESSAGE = "Innloggingen ble godkjent, men økten kunne ikke klargjøres på denne enheten. Prøv igjen.";

export function isStoredSessionExpired(session: StoredAuthSession, now = Date.now()): boolean {
  const expiresAt = Date.parse(session.metadata.expiresAt);
  return !Number.isFinite(expiresAt) || expiresAt <= now;
}

export function isUnauthorizedApiError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export function isNetworkApiError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 0;
}

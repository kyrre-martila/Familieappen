import { appConfig } from "../../config/env";

export type ApiErrorBody = { message?: string | string[]; error?: string; statusCode?: number };
export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly body: ApiErrorBody | null) { super(message); }
}

type RequestOptions = RequestInit & { accessToken?: string | null };

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (options.accessToken) headers.set("Authorization", `Bearer ${options.accessToken}`);
  const response = await fetch(`${appConfig.apiUrl}${path.startsWith("/") ? path : `/${path}`}`, { ...options, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as ApiErrorBody | null;
    const message = Array.isArray(body?.message) ? body.message.join("\n") : body?.message ?? body?.error ?? `API request failed (${response.status})`;
    throw new ApiError(message, response.status, body);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

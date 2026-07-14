import { appConfig } from "../../config/env";
import { buildApiUrl } from "./url";

export type ApiErrorPayload = { code?: string; message?: string };
export type ApiErrorBody = { error?: ApiErrorPayload; message?: string | string[]; statusCode?: number };
export type ApiEnvelope<T> = { data: T };

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string, readonly body?: ApiErrorBody | null) {
    super(message);
  }
}

type RequestOptions = Omit<RequestInit, "body"> & { accessToken?: string | null; body?: unknown };

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (options.body !== undefined && !isFormData && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (options.accessToken) headers.set("Authorization", `Bearer ${options.accessToken}`);

  let response: Response;
  try {
    response = await fetch(buildApiUrl(appConfig.apiUrl, path), {
      ...options,
      headers,
      body: options.body === undefined ? undefined : isFormData ? options.body as BodyInit : JSON.stringify(options.body)
    });
  } catch {
    throw new ApiError("Kunne ikke nå serveren. Sjekk tilkoblingen og prøv igjen.", 0, "network.unavailable");
  }

  if (!response.ok) throw await parseApiError(response);
  if (response.status === 204) return undefined as T;

  const envelope = await response.json().catch(() => null) as ApiEnvelope<T> | null;
  if (!envelope || !("data" in envelope)) throw new ApiError("Ugyldig svar fra serveren.", response.status, "server.invalid_response");
  return envelope.data;
}

export const apiFetch = apiRequest;

async function parseApiError(response: Response): Promise<ApiError> {
  const body = await response.json().catch(() => null) as ApiErrorBody | null;
  const code = body?.error?.code;
  const backendMessage = body?.error?.message ?? (Array.isArray(body?.message) ? body.message.join("\n") : body?.message);
  const message = response.status === 404 && isNestRouteNotFoundMessage(backendMessage)
    ? "Mobilappen er koblet til feil API-adresse."
    : backendMessage ?? defaultErrorMessage(code, response.status);
  return new ApiError(message, response.status, code, body);
}

function isNestRouteNotFoundMessage(message: string | undefined): boolean {
  return message ? /^Cannot (GET|POST|PUT|PATCH|DELETE) \/.+/.test(message) : false;
}

function defaultErrorMessage(code: string | undefined, status: number): string {
  if (code?.startsWith("auth.")) return "Økten er utløpt. Logg inn på nytt.";
  if (code?.startsWith("validation.")) return "Sjekk feltene og prøv igjen.";
  if (status === 0) return "Kunne ikke nå serveren.";
  return "Noe gikk galt. Prøv igjen.";
}

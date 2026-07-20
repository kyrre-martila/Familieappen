import { appConfig } from "../../config/env";

const absoluteUrlPattern = /^https?:\/\//i;

export function resolveApiAssetUrl(url: string | null | undefined, apiBaseUrl = appConfig.apiUrl): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  if (absoluteUrlPattern.test(trimmed)) return trimmed;

  const base = apiBaseUrl.trim();
  if (!base) return trimmed;

  const origin = new URL(base).origin.replace(/\/+$/, "");
  const path = trimmed.replace(/^\/+/, "");
  return `${origin}/${path}`;
}

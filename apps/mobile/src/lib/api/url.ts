export function buildApiUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.trim().replace(/\/+$/, "");
  const normalizedPath = path.trim().replace(/^\/+/, "");

  if (!normalizedBase) {
    throw new Error("API base URL is required.");
  }

  return normalizedPath ? `${normalizedBase}/${normalizedPath}` : normalizedBase;
}

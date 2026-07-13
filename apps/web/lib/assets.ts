const absoluteUrlPattern = /^[a-z][a-z\d+.-]*:/i;

function getApiOrigin(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return "";

  try {
    return new URL(apiUrl).origin;
  } catch {
    return "";
  }
}

export function resolveApiAssetUrl(url: string | null | undefined): string | null | undefined {
  if (!url) return url;

  if (absoluteUrlPattern.test(url)) {
    return url;
  }

  if (!url.startsWith("/uploads/")) {
    return url;
  }

  const apiOrigin = getApiOrigin();
  if (!apiOrigin) return url;

  return `${apiOrigin.replace(/\/+$/, "")}/${url.replace(/^\/+/, "")}`;
}

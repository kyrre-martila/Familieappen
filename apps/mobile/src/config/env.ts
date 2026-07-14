declare const process: { env: { EXPO_PUBLIC_API_URL?: string } };
const productionApiUrl = "https://api-familieappen.martila.no";

function normalizeApiUrl(value: string | undefined): string {
  const candidate = value?.trim() || productionApiUrl;
  try {
    const url = new URL(candidate);
    if (!/^https?:$/.test(url.protocol)) throw new Error("API URL must use http or https.");
    return url.toString().replace(/\/$/, "");
  } catch (error) {
    throw new Error(`Invalid EXPO_PUBLIC_API_URL: ${candidate}. ${error instanceof Error ? error.message : ""}`);
  }
}

export const appConfig = { apiUrl: normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL), productionApiUrl } as const;

import "server-only";

export type EmailProviderName = "resend";

export type EmailConfig = {
  provider?: EmailProviderName;
  fromName: string;
  fromAddress: string;
  appBaseUrl?: string;
  resendApiKey?: string;
  isDevelopment: boolean;
};

function parseProvider(value: string | undefined): EmailProviderName | undefined {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return undefined;
  }

  if (normalized === "resend") {
    return normalized;
  }

  throw new Error(`Unsupported EMAIL_PROVIDER "${value}".`);
}

export function getEmailConfig(): EmailConfig {
  return {
    provider: parseProvider(process.env.EMAIL_PROVIDER),
    fromName: process.env.EMAIL_FROM_NAME?.trim() || "FamilieAppen",
    fromAddress:
      process.env.EMAIL_FROM_ADDRESS?.trim() || "noreply@familieappen.no",
    appBaseUrl: process.env.APP_BASE_URL?.trim() || undefined,
    resendApiKey: process.env.RESEND_API_KEY?.trim() || undefined,
    isDevelopment: process.env.NODE_ENV !== "production",
  };
}

export function formatFromAddress(config: EmailConfig): string {
  return `${config.fromName} <${config.fromAddress}>`;
}

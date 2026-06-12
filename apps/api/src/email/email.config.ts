export type EmailProvider = "smtp" | "dev-log";

export type EmailConfig = {
  provider: EmailProvider;
  fromName: string;
  fromAddress: string;
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  };
};

function readOptional(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function parseBoolean(value: string | undefined): boolean {
  return ["1", "true", "yes"].includes((value || "").trim().toLowerCase());
}

function parsePort(value: string | undefined): number {
  const port = Number(value || "587");

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT must be an integer between 1 and 65535.");
  }

  return port;
}

export function getEmailConfig(): EmailConfig {
  const providerValue = readOptional("EMAIL_PROVIDER")?.toLowerCase();
  const fromName = readOptional("EMAIL_FROM_NAME") || "FamilieAppen";
  const fromAddress = readOptional("EMAIL_FROM_ADDRESS");

  if (!providerValue) {
    return { provider: "dev-log", fromName, fromAddress: fromAddress || "not-configured" };
  }

  if (providerValue !== "smtp") {
    throw new Error(`Unsupported EMAIL_PROVIDER "${providerValue}". Use "smtp" or leave it empty for dev-log.`);
  }

  const host = readOptional("SMTP_HOST");
  const user = readOptional("SMTP_USER");
  const pass = readOptional("SMTP_PASS");

  if (!fromAddress) {
    throw new Error("EMAIL_FROM_ADDRESS is required when EMAIL_PROVIDER=smtp.");
  }

  if (!host || !user || !pass) {
    throw new Error("SMTP_HOST, SMTP_USER, and SMTP_PASS are required when EMAIL_PROVIDER=smtp.");
  }

  return {
    provider: "smtp",
    fromName,
    fromAddress,
    smtp: {
      host,
      port: parsePort(readOptional("SMTP_PORT")),
      secure: parseBoolean(readOptional("SMTP_SECURE")),
      user,
      pass
    }
  };
}

export function getAppBaseUrl(): string {
  return (readOptional("APP_BASE_URL") || readOptional("APP_PUBLIC_URL") || "http://localhost:3000").replace(/\/$/, "");
}

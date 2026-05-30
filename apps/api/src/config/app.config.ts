import "dotenv/config";
export type AppEnvironment = "development" | "test" | "production" | string;

export interface AppConfig {
  nodeEnv: AppEnvironment;
  port: number;
  apiPrefix: string;
  corsOrigins: string[];
  databaseUrl?: string;
  authJwtSecret?: string;
}

const DEFAULT_PORT = 4000;
const DEFAULT_API_PREFIX = "api";
const DEFAULT_CORS_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000"
];

function parsePort(value: string | undefined): number {
  if (!value) {
    return DEFAULT_PORT;
  }

  const parsedPort = Number(value);

  if (!Number.isInteger(parsedPort) || parsedPort <= 0) {
    return DEFAULT_PORT;
  }

  return parsedPort;
}

function normalizeApiPrefix(value: string | undefined): string {
  const prefix = value?.trim() || DEFAULT_API_PREFIX;

  return prefix.replace(/^\/+|\/+$/g, "") || DEFAULT_API_PREFIX;
}

export function getAppConfig(): AppConfig {
  return {
    nodeEnv: process.env.NODE_ENV || "development",
    port: parsePort(process.env.PORT),
    apiPrefix: normalizeApiPrefix(process.env.API_PREFIX),
    corsOrigins: DEFAULT_CORS_ORIGINS,
    databaseUrl: process.env.DATABASE_URL,
    authJwtSecret: process.env.AUTH_JWT_SECRET
  };
}

import "dotenv/config";

export type AppEnvironment = "development" | "test" | "production" | string;

export interface AppConfig {
  nodeEnv: AppEnvironment;
  port: number;
  apiPrefix: string;
  corsOrigins: string[];
  databaseUrl: string;
  authJwtSecret: string;
  adminSessionSecret: string;
  adminSessionTtlSeconds: number;
}

type EnvironmentVariables = NodeJS.ProcessEnv;

const LOCAL_ENVIRONMENTS = new Set(["development", "test"]);
const DEFAULT_NODE_ENV = "development";
const DEFAULT_PORT = 4000;
const DEFAULT_API_PREFIX = "api";
const DEFAULT_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/familieappen?schema=public";
const DEFAULT_AUTH_JWT_SECRET = "familieappen-development-auth-secret-change-me";
const DEFAULT_ADMIN_SESSION_SECRET = "familieappen-development-admin-session-secret-change-me";
const DEFAULT_ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const DEFAULT_CORS_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];
const MIN_STRONG_SECRET_LENGTH = 32;
const UNSAFE_AUTH_JWT_SECRETS = new Set([
  "",
  "secret",
  "changeme",
  "change-me",
  "password",
  "replace-with-a-long-random-secret",
  DEFAULT_AUTH_JWT_SECRET,
  DEFAULT_ADMIN_SESSION_SECRET
]);

function isLocalEnvironment(nodeEnv: string): boolean {
  return LOCAL_ENVIRONMENTS.has(nodeEnv);
}

function readString(name: string, env: EnvironmentVariables): string | undefined {
  const value = env[name]?.trim();

  return value ? value : undefined;
}

function parsePort(value: string | undefined): number {
  if (!value) {
    return DEFAULT_PORT;
  }

  const parsedPort = Number(value);

  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  return parsedPort;
}

function parsePositiveInteger(name: string, value: string | undefined, defaultValue: number): number {
  if (!value) {
    return defaultValue;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsed;
}

function normalizeApiPrefix(value: string | undefined): string {
  const prefix = value?.trim() || DEFAULT_API_PREFIX;
  const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, "");

  if (!normalizedPrefix) {
    throw new Error("API_PREFIX must contain at least one non-slash character");
  }

  if (!/^[a-zA-Z0-9][a-zA-Z0-9/_-]*$/.test(normalizedPrefix)) {
    throw new Error("API_PREFIX may only contain letters, numbers, slashes, underscores, and hyphens");
  }

  return normalizedPrefix;
}

function parseCorsOrigins(value: string | undefined): string[] {
  if (!value) {
    return DEFAULT_CORS_ORIGINS;
  }

  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error("CORS_ORIGINS must include at least one origin when set");
  }

  for (const origin of origins) {
    validateCorsOrigin(origin);
  }

  return origins;
}

function validateCorsOrigin(origin: string): void {
  let parsedOrigin: URL;

  try {
    parsedOrigin = new URL(origin);
  } catch {
    throw new Error(`CORS_ORIGINS contains an invalid origin: ${origin}`);
  }

  if (parsedOrigin.origin !== origin || parsedOrigin.pathname !== "/" || parsedOrigin.search || parsedOrigin.hash) {
    throw new Error(`CORS_ORIGINS entries must be bare origins without paths: ${origin}`);
  }

  if (!["http:", "https:"].includes(parsedOrigin.protocol)) {
    throw new Error(`CORS_ORIGINS entries must use http or https: ${origin}`);
  }
}

function resolveDatabaseUrl(value: string | undefined, nodeEnv: string): string {
  if (!value) {
    if (isLocalEnvironment(nodeEnv)) {
      return DEFAULT_DATABASE_URL;
    }

    throw new Error("DATABASE_URL is required outside local development and test environments");
  }

  validateDatabaseUrl(value);

  return value;
}

function validateDatabaseUrl(databaseUrl: string): void {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL");
  }

  if (!["postgresql:", "postgres:"].includes(parsedUrl.protocol)) {
    throw new Error("DATABASE_URL must use the postgresql:// or postgres:// protocol");
  }
}

function resolveStrongSecret(name: string, value: string | undefined, nodeEnv: string, localDefault: string): string {
  if (!value) {
    if (isLocalEnvironment(nodeEnv)) {
      return localDefault;
    }

    throw new Error(`${name} is required outside local development and test environments`);
  }

  if (!isLocalEnvironment(nodeEnv)) {
    validateStrongSecret(name, value);
  }

  return value;
}

function resolveAuthJwtSecret(value: string | undefined, nodeEnv: string): string {
  return resolveStrongSecret("AUTH_JWT_SECRET", value, nodeEnv, DEFAULT_AUTH_JWT_SECRET);
}

function resolveAdminSessionSecret(value: string | undefined, nodeEnv: string): string {
  return resolveStrongSecret("ADMIN_SESSION_SECRET", value, nodeEnv, DEFAULT_ADMIN_SESSION_SECRET);
}

function validateStrongSecret(name: string, secret: string): void {
  if (secret.length < MIN_STRONG_SECRET_LENGTH) {
    throw new Error(`${name} must be at least ${MIN_STRONG_SECRET_LENGTH} characters outside local environments`);
  }

  if (UNSAFE_AUTH_JWT_SECRETS.has(secret.toLowerCase())) {
    throw new Error(`${name} must not use documented local defaults or placeholder values outside local environments`);
  }
}

export function getAppConfig(env: EnvironmentVariables = process.env): AppConfig {
  const nodeEnv = readString("NODE_ENV", env) || DEFAULT_NODE_ENV;

  return {
    nodeEnv,
    port: parsePort(readString("PORT", env)),
    apiPrefix: normalizeApiPrefix(readString("API_PREFIX", env)),
    corsOrigins: parseCorsOrigins(readString("CORS_ORIGINS", env)),
    databaseUrl: resolveDatabaseUrl(readString("DATABASE_URL", env), nodeEnv),
    authJwtSecret: resolveAuthJwtSecret(readString("AUTH_JWT_SECRET", env), nodeEnv),
    adminSessionSecret: resolveAdminSessionSecret(readString("ADMIN_SESSION_SECRET", env), nodeEnv),
    adminSessionTtlSeconds: parsePositiveInteger("ADMIN_SESSION_TTL", readString("ADMIN_SESSION_TTL", env), DEFAULT_ADMIN_SESSION_TTL_SECONDS)
  };
}

import { strict as assert } from "node:assert";
import { getAppConfig } from "../src/config/app.config";

function assertThrowsWithMessage(fn: () => unknown, message: string): void {
  assert.throws(fn, (error) => error instanceof Error && error.message.includes(message));
}

const localConfig = getAppConfig({});

assert.equal(localConfig.nodeEnv, "development");
assert.equal(localConfig.port, 4000);
assert.equal(localConfig.apiPrefix, "api");
assert.deepEqual(localConfig.corsOrigins, ["http://localhost:3000", "http://127.0.0.1:3000"]);
assert.equal(localConfig.databaseUrl, "postgresql://postgres:postgres@localhost:5432/familieappen?schema=public");
assert.equal(localConfig.authJwtSecret, "familieappen-development-auth-secret-change-me");
assert.equal(localConfig.adminSessionSecret, "familieappen-development-admin-session-secret-change-me");
assert.equal(localConfig.adminSessionTtlSeconds, 604800);

const productionConfig = getAppConfig({
  NODE_ENV: "production",
  PORT: "8080",
  API_PREFIX: "/v1/api/",
  CORS_ORIGINS: "https://app.example.com,https://admin.example.com",
  DATABASE_URL: "postgresql://postgres:postgres@example.com:5432/familieappen?schema=public",
  AUTH_JWT_SECRET: "a-production-secret-that-is-long-enough",
  ADMIN_SESSION_SECRET: "a-production-admin-secret-that-is-long-enough",
  ADMIN_SESSION_TTL: "3600"
});

assert.equal(productionConfig.port, 8080);
assert.equal(productionConfig.apiPrefix, "v1/api");
assert.deepEqual(productionConfig.corsOrigins, ["https://app.example.com", "https://admin.example.com"]);
assert.equal(productionConfig.authJwtSecret, "a-production-secret-that-is-long-enough");
assert.equal(productionConfig.adminSessionSecret, "a-production-admin-secret-that-is-long-enough");
assert.equal(productionConfig.adminSessionTtlSeconds, 3600);

assertThrowsWithMessage(
  () =>
    getAppConfig({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://postgres:postgres@example.com:5432/familieappen?schema=public"
    }),
  "AUTH_JWT_SECRET is required"
);

assertThrowsWithMessage(
  () =>
    getAppConfig({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://postgres:postgres@example.com:5432/familieappen?schema=public",
      AUTH_JWT_SECRET: "short-secret",
      ADMIN_SESSION_SECRET: "a-production-admin-secret-that-is-long-enough"
    }),
  "AUTH_JWT_SECRET must be at least"
);

assertThrowsWithMessage(
  () =>
    getAppConfig({
      NODE_ENV: "production",
      AUTH_JWT_SECRET: "a-production-secret-that-is-long-enough",
      ADMIN_SESSION_SECRET: "a-production-admin-secret-that-is-long-enough"
    }),
  "DATABASE_URL is required"
);

assertThrowsWithMessage(() => getAppConfig({ PORT: "70000" }), "PORT must be an integer");
assertThrowsWithMessage(() => getAppConfig({ API_PREFIX: "!!!" }), "API_PREFIX may only contain");
assertThrowsWithMessage(() => getAppConfig({ CORS_ORIGINS: "https://example.com/app" }), "bare origins");
assertThrowsWithMessage(() => getAppConfig({ ADMIN_SESSION_TTL: "0" }), "ADMIN_SESSION_TTL must be a positive integer");
assertThrowsWithMessage(
  () =>
    getAppConfig({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://postgres:postgres@example.com:5432/familieappen?schema=public",
      AUTH_JWT_SECRET: "a-production-secret-that-is-long-enough"
    }),
  "ADMIN_SESSION_SECRET is required"
);

console.log("app config validation tests passed");

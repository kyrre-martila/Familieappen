-- Create password reset token table for one-time, hashed reset links.
CREATE TABLE "password_reset_tokens" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "emailHash" TEXT NOT NULL,
  "requestIp" TEXT,
  "userAgent" TEXT,
  "usedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");
CREATE INDEX "password_reset_tokens_userId_usedAt_expiresAt_idx" ON "password_reset_tokens"("userId", "usedAt", "expiresAt");
CREATE INDEX "password_reset_tokens_emailHash_createdAt_idx" ON "password_reset_tokens"("emailHash", "createdAt");
CREATE INDEX "password_reset_tokens_requestIp_createdAt_idx" ON "password_reset_tokens"("requestIp", "createdAt");

ALTER TABLE "password_reset_tokens"
  ADD CONSTRAINT "password_reset_tokens_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

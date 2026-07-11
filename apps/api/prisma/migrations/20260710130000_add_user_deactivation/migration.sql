ALTER TABLE "users" ADD COLUMN "deactivatedAt" TIMESTAMP(3);
CREATE INDEX "users_deactivatedAt_idx" ON "users"("deactivatedAt");

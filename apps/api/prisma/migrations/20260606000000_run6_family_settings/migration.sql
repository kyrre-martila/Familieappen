-- CreateEnum
CREATE TYPE "FamilyInvitationStatus" AS ENUM ('pending', 'accepted', 'declined', 'revoked');

-- CreateTable
CREATE TABLE "family_invitations" (
    "id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "invited_email" TEXT NOT NULL,
    "invited_user_id" TEXT,
    "role" "FamilyMemberRole" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "status" "FamilyInvitationStatus" NOT NULL DEFAULT 'pending',
    "created_by_user_id" TEXT NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "declined_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "family_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "family_invitations_token_hash_key" ON "family_invitations"("token_hash");
CREATE INDEX "family_invitations_family_id_idx" ON "family_invitations"("family_id");
CREATE INDEX "family_invitations_invited_email_idx" ON "family_invitations"("invited_email");
CREATE INDEX "family_invitations_invited_user_id_idx" ON "family_invitations"("invited_user_id");
CREATE INDEX "family_invitations_status_idx" ON "family_invitations"("status");
CREATE UNIQUE INDEX "family_invitations_one_pending_per_family_email" ON "family_invitations"("family_id", lower("invited_email")) WHERE "status" = 'pending';

-- AddForeignKey
ALTER TABLE "family_invitations" ADD CONSTRAINT "family_invitations_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "family_invitations" ADD CONSTRAINT "family_invitations_invited_user_id_fkey" FOREIGN KEY ("invited_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "family_invitations" ADD CONSTRAINT "family_invitations_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

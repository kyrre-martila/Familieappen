CREATE TYPE "ShoppingListInvitationStatus" AS ENUM ('pending', 'accepted', 'declined', 'revoked');

ALTER TABLE "shopping_lists" DROP CONSTRAINT IF EXISTS "shopping_lists_familyId_key";
ALTER TABLE "shopping_lists" ADD COLUMN "is_default" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "shopping_lists" ADD COLUMN "owner_user_id" TEXT;
UPDATE "shopping_lists" SET "is_default" = true;
CREATE UNIQUE INDEX "shopping_lists_familyId_is_default_key" ON "shopping_lists"("familyId", "is_default") WHERE "is_default" = true;
CREATE INDEX "shopping_lists_owner_user_id_idx" ON "shopping_lists"("owner_user_id");
ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "shopping_list_access" (
  "id" TEXT NOT NULL,
  "shopping_list_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "shopping_list_access_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "shopping_list_access_shopping_list_id_user_id_key" ON "shopping_list_access"("shopping_list_id", "user_id");
CREATE INDEX "shopping_list_access_user_id_idx" ON "shopping_list_access"("user_id");
ALTER TABLE "shopping_list_access" ADD CONSTRAINT "shopping_list_access_shopping_list_id_fkey" FOREIGN KEY ("shopping_list_id") REFERENCES "shopping_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shopping_list_access" ADD CONSTRAINT "shopping_list_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "shopping_list_invitations" (
  "id" TEXT NOT NULL,
  "shopping_list_id" TEXT NOT NULL,
  "family_id" TEXT NOT NULL,
  "invited_email" TEXT NOT NULL,
  "invited_user_id" TEXT,
  "token_hash" TEXT NOT NULL,
  "status" "ShoppingListInvitationStatus" NOT NULL DEFAULT 'pending',
  "created_by_user_id" TEXT NOT NULL,
  "accepted_at" TIMESTAMP(3),
  "declined_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "shopping_list_invitations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "shopping_list_invitations_token_hash_key" ON "shopping_list_invitations"("token_hash");
CREATE INDEX "shopping_list_invitations_shopping_list_id_idx" ON "shopping_list_invitations"("shopping_list_id");
CREATE INDEX "shopping_list_invitations_family_id_idx" ON "shopping_list_invitations"("family_id");
CREATE INDEX "shopping_list_invitations_invited_email_idx" ON "shopping_list_invitations"("invited_email");
CREATE INDEX "shopping_list_invitations_invited_user_id_idx" ON "shopping_list_invitations"("invited_user_id");
CREATE INDEX "shopping_list_invitations_status_idx" ON "shopping_list_invitations"("status");
ALTER TABLE "shopping_list_invitations" ADD CONSTRAINT "shopping_list_invitations_shopping_list_id_fkey" FOREIGN KEY ("shopping_list_id") REFERENCES "shopping_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shopping_list_invitations" ADD CONSTRAINT "shopping_list_invitations_invited_user_id_fkey" FOREIGN KEY ("invited_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shopping_list_invitations" ADD CONSTRAINT "shopping_list_invitations_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

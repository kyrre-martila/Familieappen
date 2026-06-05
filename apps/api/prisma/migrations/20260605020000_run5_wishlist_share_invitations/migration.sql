-- CreateEnum
CREATE TYPE "WishlistShareInvitationStatus" AS ENUM ('pending', 'accepted', 'declined', 'removed', 'revoked');

-- CreateTable
CREATE TABLE "wishlist_share_invitations" (
    "id" TEXT NOT NULL,
    "wishlist_owner_user_id" TEXT NOT NULL,
    "wishlist_owner_family_member_id" TEXT,
    "family_id" TEXT NOT NULL,
    "invited_email" TEXT NOT NULL,
    "invited_user_id" TEXT,
    "token_hash" TEXT NOT NULL,
    "status" "WishlistShareInvitationStatus" NOT NULL DEFAULT 'pending',
    "created_by_user_id" TEXT NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "declined_at" TIMESTAMP(3),
    "removed_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wishlist_share_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_share_invitations_token_hash_key" ON "wishlist_share_invitations"("token_hash");
CREATE INDEX "wishlist_share_invitations_wishlist_owner_user_id_idx" ON "wishlist_share_invitations"("wishlist_owner_user_id");
CREATE INDEX "wishlist_share_invitations_wishlist_owner_family_member_id_idx" ON "wishlist_share_invitations"("wishlist_owner_family_member_id");
CREATE INDEX "wishlist_share_invitations_family_id_idx" ON "wishlist_share_invitations"("family_id");
CREATE INDEX "wishlist_share_invitations_invited_email_idx" ON "wishlist_share_invitations"("invited_email");
CREATE INDEX "wishlist_share_invitations_invited_user_id_idx" ON "wishlist_share_invitations"("invited_user_id");
CREATE INDEX "wishlist_share_invitations_status_idx" ON "wishlist_share_invitations"("status");
CREATE UNIQUE INDEX "wishlist_share_invitations_one_active_per_owner_email" ON "wishlist_share_invitations"("wishlist_owner_user_id", lower("invited_email")) WHERE "status" IN ('pending', 'accepted');

-- AddForeignKey
ALTER TABLE "wishlist_share_invitations" ADD CONSTRAINT "wishlist_share_invitations_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wishlist_share_invitations" ADD CONSTRAINT "wishlist_share_invitations_wishlist_owner_user_id_fkey" FOREIGN KEY ("wishlist_owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wishlist_share_invitations" ADD CONSTRAINT "wishlist_share_invitations_wishlist_owner_family_member_id_fkey" FOREIGN KEY ("wishlist_owner_family_member_id") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "wishlist_share_invitations" ADD CONSTRAINT "wishlist_share_invitations_invited_user_id_fkey" FOREIGN KEY ("invited_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "wishlist_share_invitations" ADD CONSTRAINT "wishlist_share_invitations_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

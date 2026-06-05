-- Run 5 prompt 7: private wishlist item reservations.

CREATE TABLE "wishlist_item_reservations" (
  "id" TEXT NOT NULL,
  "wishlist_item_id" TEXT NOT NULL,
  "reserved_by_user_id" TEXT NOT NULL,
  "reserved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "released_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "wishlist_item_reservations_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "wishlist_item_reservations"
  ADD CONSTRAINT "wishlist_item_reservations_wishlist_item_id_fkey"
  FOREIGN KEY ("wishlist_item_id") REFERENCES "wishlist_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "wishlist_item_reservations"
  ADD CONSTRAINT "wishlist_item_reservations_reserved_by_user_id_fkey"
  FOREIGN KEY ("reserved_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "wishlist_item_reservations_wishlist_item_id_idx" ON "wishlist_item_reservations"("wishlist_item_id");
CREATE INDEX "wishlist_item_reservations_reserved_by_user_id_idx" ON "wishlist_item_reservations"("reserved_by_user_id");
CREATE INDEX "wishlist_item_reservations_wishlist_item_released_at_idx" ON "wishlist_item_reservations"("wishlist_item_id", "released_at");
CREATE UNIQUE INDEX "wishlist_item_reservations_one_active_per_item_key"
  ON "wishlist_item_reservations"("wishlist_item_id") WHERE "released_at" IS NULL;

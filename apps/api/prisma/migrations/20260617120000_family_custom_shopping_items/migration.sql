CREATE TABLE "family_custom_shopping_items" (
  "id" TEXT NOT NULL,
  "family_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "normalized_name" TEXT NOT NULL,
  "default_unit" TEXT NOT NULL DEFAULT 'stk',
  "suggested_quantity" INTEGER NOT NULL DEFAULT 1,
  "category_slug" TEXT NOT NULL DEFAULT 'egne-varer',
  "icon_key" TEXT,
  "created_by_user_id" TEXT,
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "family_custom_shopping_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "family_custom_shopping_items_family_id_normalized_name_key" ON "family_custom_shopping_items"("family_id", "normalized_name");
CREATE INDEX "family_custom_shopping_items_family_id_category_slug_deleted_at_idx" ON "family_custom_shopping_items"("family_id", "category_slug", "deleted_at");
CREATE INDEX "family_custom_shopping_items_created_by_user_id_idx" ON "family_custom_shopping_items"("created_by_user_id");
ALTER TABLE "family_custom_shopping_items" ADD CONSTRAINT "family_custom_shopping_items_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "family_custom_shopping_items" ADD CONSTRAINT "family_custom_shopping_items_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

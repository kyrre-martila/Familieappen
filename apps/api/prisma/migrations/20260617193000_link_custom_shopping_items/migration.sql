ALTER TABLE "shopping_list_items" ADD COLUMN "family_custom_shopping_item_id" TEXT;
CREATE INDEX "shopping_list_items_family_custom_shopping_item_id_idx" ON "shopping_list_items"("family_custom_shopping_item_id");
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_family_custom_shopping_item_id_fkey" FOREIGN KEY ("family_custom_shopping_item_id") REFERENCES "family_custom_shopping_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

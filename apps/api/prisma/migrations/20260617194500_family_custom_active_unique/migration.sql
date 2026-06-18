DROP INDEX IF EXISTS "family_custom_shopping_items_family_id_normalized_name_key";

CREATE UNIQUE INDEX "family_custom_shopping_items_family_id_normalized_name_active_key"
ON "family_custom_shopping_items"("family_id", "normalized_name")
WHERE "deleted_at" IS NULL;

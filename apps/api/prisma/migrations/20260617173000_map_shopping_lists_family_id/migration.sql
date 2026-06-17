-- Keep the physical shopping_lists family column aligned with Prisma's snake_case mapping.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shopping_lists' AND column_name = 'familyId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shopping_lists' AND column_name = 'family_id'
  ) THEN
    ALTER TABLE "shopping_lists" RENAME COLUMN "familyId" TO "family_id";
  END IF;
END $$;

DROP INDEX IF EXISTS "shopping_lists_familyId_is_default_key";
CREATE UNIQUE INDEX IF NOT EXISTS "shopping_lists_family_id_is_default_key" ON "shopping_lists"("family_id", "is_default") WHERE "is_default" = true;

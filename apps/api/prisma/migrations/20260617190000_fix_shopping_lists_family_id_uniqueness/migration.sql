-- Allow multiple shopping lists per family by removing legacy unique constraints on family_id.
-- Keep uniqueness only for the default family shopping list.

ALTER TABLE "shopping_lists" DROP CONSTRAINT IF EXISTS "shopping_lists_familyId_key";
ALTER TABLE "shopping_lists" DROP CONSTRAINT IF EXISTS "shopping_lists_family_id_key";

DROP INDEX IF EXISTS "shopping_lists_familyId_key";
DROP INDEX IF EXISTS "shopping_lists_family_id_key";
DROP INDEX IF EXISTS "shopping_lists_familyId_is_default_key";
DROP INDEX IF EXISTS "shopping_lists_family_id_is_default_key";

-- Mark one existing list per family as the default if production data predates is_default.
WITH ranked_lists AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "family_id"
      ORDER BY "is_default" DESC, "createdAt" ASC, "id" ASC
    ) AS row_number
  FROM "shopping_lists"
)
UPDATE "shopping_lists" AS shopping_list
SET "is_default" = ranked_lists.row_number = 1
FROM ranked_lists
WHERE shopping_list."id" = ranked_lists."id";

-- Enforce only one default list per family while allowing any number of non-default lists.
CREATE UNIQUE INDEX "shopping_lists_family_id_default_unique"
  ON "shopping_lists"("family_id")
  WHERE "is_default" = true;

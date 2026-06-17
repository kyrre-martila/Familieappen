CREATE TABLE "shopping_catalog_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopping_catalog_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shopping_catalog_items" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "searchValues" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "defaultUnit" TEXT NOT NULL,
    "suggestedQuantity" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopping_catalog_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "shopping_catalog_categories_slug_key" ON "shopping_catalog_categories"("slug");
CREATE INDEX "shopping_catalog_categories_sortOrder_idx" ON "shopping_catalog_categories"("sortOrder");
CREATE UNIQUE INDEX "shopping_catalog_items_normalizedName_key" ON "shopping_catalog_items"("normalizedName");
CREATE INDEX "shopping_catalog_items_categoryId_sortOrder_idx" ON "shopping_catalog_items"("categoryId", "sortOrder");
CREATE INDEX "shopping_catalog_items_normalizedName_idx" ON "shopping_catalog_items"("normalizedName");
ALTER TABLE "shopping_catalog_items" ADD CONSTRAINT "shopping_catalog_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "shopping_catalog_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

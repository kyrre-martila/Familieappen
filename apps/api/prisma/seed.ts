import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import {
  SHOPPING_CATALOG,
  SHOPPING_CATEGORIES,
  normalizeShoppingSearchValue,
} from "@familieappen/shared";

config();

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to seed shopping catalog data");
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

  try {
    const categoryBySlug = new Map<string, { id: string }>();

    for (const category of SHOPPING_CATEGORIES) {
      const record = await prisma.shoppingCatalogCategory.upsert({
        where: { slug: category.slug },
        create: {
          name: category.name,
          slug: category.slug,
          sortOrder: category.sortOrder,
        },
        update: {
          name: category.name,
          sortOrder: category.sortOrder,
        },
        select: { id: true },
      });
      categoryBySlug.set(category.slug, record);
    }

    let itemSortOrder = 0;
    for (const item of SHOPPING_CATALOG) {
      const category = categoryBySlug.get(item.categorySlug);
      if (!category) {
        throw new Error(`Missing category ${item.categorySlug} for shopping catalog item ${item.name}`);
      }

      const normalizedName = normalizeShoppingSearchValue(item.name);
      const searchValues = Array.from(
        new Set([item.name, ...item.aliases].map(normalizeShoppingSearchValue).filter(Boolean)),
      );

      await prisma.shoppingCatalogItem.upsert({
        where: { normalizedName },
        create: {
          categoryId: category.id,
          name: item.name,
          normalizedName,
          aliases: [...item.aliases],
          searchValues,
          defaultUnit: item.defaultUnit,
          suggestedQuantity: item.suggestedQuantity,
          sortOrder: itemSortOrder,
        },
        update: {
          categoryId: category.id,
          name: item.name,
          aliases: [...item.aliases],
          searchValues,
          defaultUnit: item.defaultUnit,
          suggestedQuantity: item.suggestedQuantity,
          sortOrder: itemSortOrder,
        },
      });
      itemSortOrder += 1;
    }

    const [categoryCount, itemCount] = await Promise.all([
      prisma.shoppingCatalogCategory.count(),
      prisma.shoppingCatalogItem.count(),
    ]);

    console.log(
      `Shopping catalog seed imported ${SHOPPING_CATEGORIES.length} categories and ${SHOPPING_CATALOG.length} items. Database now has ${categoryCount} categories and ${itemCount} items.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Shopping catalog seed import failed", error);
  process.exitCode = 1;
});

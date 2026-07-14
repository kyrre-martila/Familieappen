declare const require: {
  (id: string): unknown;
  extensions: Record<string, (module: { exports: unknown }, filename: string) => void>;
};

for (const extension of [".png", ".webp", ".svg"]) {
  require.extensions[extension] = (module, filename) => { module.exports = filename; };
}

const { appAssets } = require("./assets") as typeof import("./assets");
const expectedAssetKeys = ["brandLogo", "brandIcon", "splashFamilyMobile", "familyHero", "familyFound", "familyInvite", "appPreview", "plants", "lightShadow"] as const;
for (const key of expectedAssetKeys) {
  if (!(key in appAssets)) throw new Error(`Missing asset registry key: ${key}`);
}
console.log(`Asset registry exports ${expectedAssetKeys.length} expected keys.`);

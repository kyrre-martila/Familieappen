import type { ImageSourcePropType } from "react-native";

export const imageAssets = {
  splashFamilyMobile: require("../../assets/onboarding/splash-family-mobile.webp") as ImageSourcePropType,
  familyHero: require("../../assets/illustrations/family-hero.png") as ImageSourcePropType,
  familyFound: require("../../assets/illustrations/family-found.png") as ImageSourcePropType,
  familyInvite: require("../../assets/illustrations/family-invite.png") as ImageSourcePropType,
  appPreview: require("../../assets/illustrations/app-preview.png") as ImageSourcePropType,
  plants: require("../../assets/illustrations/plants.png") as ImageSourcePropType,
  lightShadow: require("../../assets/illustrations/light-shadow.png") as ImageSourcePropType
} as const;

export const brandAssets = {
  brandLogo: require("../../assets/brand/familieappen-logo.svg") as ImageSourcePropType,
  brandIcon: require("../../assets/brand/familieappen-icon.svg") as ImageSourcePropType
} as const;

export const appAssets = { ...brandAssets, ...imageAssets } as const;
export type AppAssetName = keyof typeof appAssets;

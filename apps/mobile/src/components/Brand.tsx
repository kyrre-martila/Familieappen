import { Image } from "expo-image";
import { StyleSheet, View, type ImageStyle } from "react-native";
import { appAssets } from "../theme/assets";

export function BrandLogo({ style }: { style?: ImageStyle }) {
  return <Image accessibilityLabel="FamilieAppen" contentFit="contain" source={appAssets.brandLogo} style={[styles.logo, style]} />;
}

export function BrandIcon({ style }: { style?: ImageStyle }) {
  return <Image accessibilityLabel="FamilieAppen" contentFit="contain" source={appAssets.brandIcon} style={[styles.icon, style]} />;
}

export function BackgroundDecoration() {
  return (
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
      <Image contentFit="contain" source={appAssets.lightShadow} style={styles.light} />
      <Image contentFit="contain" source={appAssets.plants} style={styles.plants} />
    </View>
  );
}

const styles = StyleSheet.create({
  logo: { width: 216, height: 72, maxWidth: "72%" },
  icon: { width: 72, height: 72 },
  light: { position: "absolute", top: -90, right: -110, width: 360, height: 360, opacity: 0.54 },
  plants: { position: "absolute", bottom: -68, left: -72, width: 270, height: 270, opacity: 0.76 }
});

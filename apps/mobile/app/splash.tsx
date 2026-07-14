import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { AppText, BrandLogo, BrandIcon } from "../src/components";
import { appAssets } from "../src/theme/assets";
import { theme } from "../src/theme/tokens";
export default function BootstrapScreen() { return <View style={styles.root}><Image accessible={false} contentFit="cover" source={appAssets.splashFamilyMobile} style={StyleSheet.absoluteFill} /><View style={styles.scrim} /><View style={styles.brand}><BrandIcon /><BrandLogo /><AppText style={styles.tagline}>Familiehverdagen samlet</AppText></View><ActivityIndicator accessibilityLabel="Laster FamilieAppen" color={theme.colors.primaryStrong} style={styles.loader} /></View>; }
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: "#eee2cf", alignItems: "center" }, scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,250,243,0.34)" }, brand: { marginTop: 112, alignItems: "center", gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg }, tagline: { color: "#315f43", fontSize: 24, lineHeight: 32, fontWeight: "700", textAlign: "center" }, loader: { position: "absolute", bottom: 56 } });

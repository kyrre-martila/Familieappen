import { StyleSheet, View } from "react-native";
import { theme } from "../../../theme/tokens";
export function ReminderSkeleton() { return <View style={styles.list} accessibilityRole="progressbar" accessibilityLabel="Laster Husk"><View style={styles.card} /><View style={styles.card} /><View style={styles.card} /></View>; }
const styles = StyleSheet.create({ list: { gap: theme.spacing.md }, card: { height: 88, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surfaceWarm } });

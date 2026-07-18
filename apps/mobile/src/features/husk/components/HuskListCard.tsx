import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "../../../components/AppText";
import { theme } from "../../../theme/tokens";
import { huskListCardAccessibilityLabel, type HuskListViewModel } from "../models";

export function HuskListCard({ list, onPress }: { list: HuskListViewModel; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={huskListCardAccessibilityLabel(list)} accessibilityHint="Åpner listen." onPress={onPress} style={styles.card}>
    <View style={styles.icon}><Ionicons name="list-outline" size={24} color={theme.colors.primaryStrong} /></View>
    <View style={styles.copy}>
      <AppText variant="lead" style={styles.title}>{list.title}</AppText>
      <AppText style={styles.meta}>{list.progressLabel} · {list.audienceLabel}</AppText>
      <View style={styles.track} accessibilityElementsHidden><View style={[styles.fill, { width: `${list.progressPercent}%` }]} /></View>
    </View>
    <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
  </Pressable>;
}

const styles = StyleSheet.create({ card: { minHeight: 92, padding: theme.spacing.md, flexDirection: "row", gap: theme.spacing.md, alignItems: "center", borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, ...theme.shadow.card }, icon: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.surfaceWarm }, copy: { flex: 1, gap: 5 }, title: { fontWeight: "800" }, meta: { color: theme.colors.textMuted }, track: { height: 6, overflow: "hidden", borderRadius: 3, backgroundColor: theme.colors.primarySoft }, fill: { height: "100%", borderRadius: 3, backgroundColor: theme.colors.primary } });

import { StyleSheet, View } from "react-native";
import { AppText } from "../../../components/AppText";
import { EmptyState } from "../../../components/States";
import { theme } from "../../../theme/tokens";
import { groupHuskListItems, mapHuskListToViewModel } from "../models";
import type { HuskList } from "@familieappen/shared";

export function HuskListDetails({ list }: { list: HuskList }) {
  const progress = mapHuskListToViewModel(list);
  const { active, completed } = groupHuskListItems(list);
  return <View style={styles.content}>
    <View style={styles.progress}><AppText variant="heading">{list.title}</AppText><AppText style={styles.muted}>{progress.progressLabel}</AppText><View style={styles.track} accessibilityElementsHidden><View style={[styles.fill, { width: `${progress.progressPercent}%` }]} /></View></View>
    {list.items.length === 0 ? <EmptyState title="Denne listen er tom" description="Det er ingen elementer på listen ennå." /> : <>
      {active.length ? <Section title="Aktive" items={active} /> : completed.length ? <EmptyState title="Alt på listen er fullført" description="Alle elementene er fullført." /> : null}
      {completed.length ? <Section title="Fullført" items={completed} completed /> : null}
    </>}
  </View>;
}
function Section({ title, items, completed = false }: { title: string; items: ReturnType<typeof groupHuskListItems>["active"]; completed?: boolean }) {
  return <View style={styles.section}><AppText variant="heading">{title}</AppText>{items.map((item) => <View key={item.id} style={styles.item}><AppText style={[styles.itemTitle, completed && styles.completed]}>{item.title}</AppText>{item.description ? <AppText style={[styles.muted, completed && styles.completed]}>{item.description}</AppText> : null}</View>)}</View>;
}
const styles = StyleSheet.create({ content: { gap: theme.spacing.lg }, progress: { gap: theme.spacing.sm }, muted: { color: theme.colors.textMuted }, track: { height: 7, borderRadius: 4, overflow: "hidden", backgroundColor: theme.colors.primarySoft }, fill: { height: "100%", backgroundColor: theme.colors.primary }, section: { gap: theme.spacing.sm }, item: { padding: theme.spacing.md, gap: theme.spacing.xs, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }, itemTitle: { fontWeight: "700" }, completed: { color: theme.colors.textMuted, textDecorationLine: "line-through" } });

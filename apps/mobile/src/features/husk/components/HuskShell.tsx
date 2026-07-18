import { useState } from "react";
import { router } from "expo-router";
import { Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { Screen } from "../../../components/Screen";
import { AppText } from "../../../components/AppText";
import { EmptyState, ErrorState } from "../../../components/States";
import { theme } from "../../../theme/tokens";
import { useHusk, type HuskView } from "../hooks/useHusk";
import { useReminderCompletion } from "../hooks/useReminderMutations";
import { emptyReminderState, type ReminderFilter } from "../reminderHistory";
import { HuskSection } from "./HuskSection";
import { ReminderList } from "./ReminderList";
import { ReminderSkeleton } from "./ReminderSkeleton";
import { HuskListCard } from "./HuskListCard";
import { HuskViewSwitcher } from "./HuskViewSwitcher";
import { selectHuskView } from "../viewState";

export function HuskShell() {
  const [filter, setFilter] = useState<ReminderFilter>("active");
  const [view, setView] = useState<HuskView>("reminders");
  const husk = useHusk(filter, view);
  const completion = useReminderCompletion();
  const empty = emptyReminderState(filter);
  const action = filter === "active" ? "complete" : "undo";
  return <Screen bottomInset="tab" refreshControl={<RefreshControl refreshing={husk.refreshing} onRefresh={() => void husk.refresh()} tintColor={theme.colors.primary} />}>
    <View style={styles.header}><AppText variant="title">Husk</AppText><AppText style={styles.description}>Påminnelser og lister for familien.</AppText></View>
    <HuskViewSwitcher view={view} onChange={(nextView) => setView(selectHuskView({ view, reminderFilter: filter }, nextView).view)} />
    {view === "reminders" ? <><View style={styles.filter} accessibilityRole="tablist" accessibilityLabel="Filter påminnelser"><FilterButton selected={filter === "active"} title="Aktive" onPress={() => setFilter("active")} /><FilterButton selected={filter === "history"} title="Historikk" onPress={() => setFilter("history")} /></View>
      {husk.loading ? <ReminderSkeleton /> : husk.missingContext ? <ErrorState title="Mangler familietilgang" description="Vi finner ikke en aktiv familie for Husk akkurat nå." onRetry={() => void husk.refresh()} /> : husk.error ? <ErrorState description="Kunne ikke hente Husk akkurat nå." onRetry={() => void husk.refresh()} /> : <HuskSection title={filter === "active" ? "Aktive" : "Historikk"}>{husk.reminders.length ? <ReminderList reminders={husk.reminders} action={action} actionBusy={completion.saving ? "pending" : null} onAction={(id) => void (action === "complete" ? completion.complete(id) : completion.undo(id))} /> : <EmptyState {...empty} />}{completion.error ? <AppText style={styles.error}>{completion.error}</AppText> : null}</HuskSection>}</> :
      husk.loading ? <ReminderSkeleton /> : husk.missingContext ? <ErrorState title="Mangler familietilgang" description="Vi finner ikke en aktiv familie for Husk akkurat nå." onRetry={() => void husk.refresh()} /> : husk.error ? <ErrorState description="Kunne ikke hente listene akkurat nå." onRetry={() => void husk.refresh()} /> : <HuskSection title="Aktive lister">{husk.lists.length ? husk.lists.map((list) => <HuskListCard key={list.id} list={list} onPress={() => router.push(`/(app)/husk/lists/${list.id}`)} />) : <EmptyState title="Ingen lister ennå" description="Det er ingen aktive lister for familien." />}</HuskSection>}
  </Screen>;
}
function FilterButton({ title, selected, onPress }: { title: string; selected: boolean; onPress: () => void }) { return <Pressable onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected }} accessibilityLabel={`Vis ${title.toLowerCase()} påminnelser`} accessibilityHint="Bytter hvilken type påminnelser som vises." style={[styles.filterButton, selected && styles.filterButtonSelected]}><AppText style={[styles.filterText, selected && styles.filterTextSelected]}>{title}</AppText></Pressable>; }
const styles = StyleSheet.create({ header: { gap: theme.spacing.xs }, description: { color: theme.colors.textMuted }, filter: { flexDirection: "row", gap: theme.spacing.sm }, filterButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: theme.spacing.md, borderRadius: theme.radius.pill, backgroundColor: theme.colors.primarySoft }, filterButtonSelected: { backgroundColor: theme.colors.primaryStrong }, filterText: { color: theme.colors.primaryStrong, fontWeight: "800" }, filterTextSelected: { color: theme.colors.surface }, error: { color: theme.colors.error } });

import { useMemo, useState } from "react";
import { router } from "expo-router";
import { Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { Screen } from "../../../components/Screen";
import { AppText } from "../../../components/AppText";
import { Button } from "../../../components/Button";
import { EmptyState, ErrorState, LoadingState } from "../../../components/States";
import { theme } from "../../../theme/tokens";
import { buildMonthDates, formatMonthTitle, formatSelectedDate } from "../date";
import { buildCalendarEventDetailPath, getCalendarEventIdentity } from "../events";
import { useCalendar } from "../hooks/useCalendar";
import { CalendarWeekNav } from "./CalendarWeekNav";
import { CalendarEventCard } from "./CalendarEventCard";

type CalendarView = "day" | "month" | "list";

export function CalendarShell() {
  const [view, setView] = useState<CalendarView>("day");
  const calendar = useCalendar();
  const eventDates = new Set(calendar.events.map((event) => event.date));
  const monthDates = useMemo(() => buildMonthDates(calendar.selectedDate), [calendar.selectedDate]);
  const [sourceFilter, setSourceFilter] = useState<"all" | "manual" | "ics" | "school-week">("all");
  const filteredMonthEvents = useMemo(() => calendar.eventsForMonth.filter((event) => sourceFilter === "all" || event.source === sourceFilter), [calendar.eventsForMonth, sourceFilter]);
  const filteredSelectedEvents = useMemo(() => calendar.eventsForSelectedDate.filter((event) => sourceFilter === "all" || event.source === sourceFilter), [calendar.eventsForSelectedDate, sourceFilter]);
  const groupedMonthEvents = useMemo(() => monthDates.map((date) => ({ date, events: filteredMonthEvents.filter((event) => event.date === date) })).filter((group) => group.events.length), [filteredMonthEvents, monthDates]);
  return <Screen bottomInset="tab" refreshControl={<RefreshControl refreshing={calendar.refreshing} onRefresh={calendar.refresh} tintColor={theme.colors.primary} />}>
    <View style={styles.header}>
      <AppText variant="label">Kalender</AppText>
      <AppText variant="title">{formatMonthTitle(calendar.selectedDate)}</AppText>
      <AppText style={styles.description}>Familiehendelser fra samme kalender-API som web.</AppText>
      <View style={styles.headerActions}><Button title="Ny hendelse" onPress={() => router.push("/(app)/calendar/create")} accessibilityLabel="Opprett ny kalenderhendelse" /><Button title="Innstillinger" variant="secondary" onPress={() => router.push("/(app)/calendar/settings")} accessibilityLabel="Åpne kalenderinnstillinger" /></View>
    </View>
    <View style={styles.viewSwitcher} accessibilityRole="tablist" accessibilityLabel="Kalendervisning">
      <ViewButton title="Dag" selected={view === "day"} onPress={() => setView("day")} />
      <ViewButton title="Måned" selected={view === "month"} onPress={() => setView("month")} />
      <ViewButton title="Liste" selected={view === "list"} onPress={() => setView("list")} />
    </View>
    <View style={styles.viewSwitcher}><ViewButton title="Alle" selected={sourceFilter === "all"} onPress={() => setSourceFilter("all")} /><ViewButton title="Familie" selected={sourceFilter === "manual"} onPress={() => setSourceFilter("manual")} /><ViewButton title="Import" selected={sourceFilter === "ics"} onPress={() => setSourceFilter("ics")} /><ViewButton title="Skole" selected={sourceFilter === "school-week"} onPress={() => setSourceFilter("school-week")} /></View>
    {view === "day" ? <CalendarWeekNav selectedDate={calendar.selectedDate} onSelectDate={calendar.setSelectedDate} eventDates={eventDates} /> : null}
    {calendar.loading ? <LoadingState title="Laster kalender" description="Henter hendelser for familien." /> : calendar.error ? <ErrorState description="Kunne ikke hente kalenderen akkurat nå." onRetry={() => void calendar.refresh()} /> : calendar.missingContext ? <ErrorState description="Fant ingen godkjent familie for denne brukeren." onRetry={() => void calendar.refresh()} /> : view === "month" ? <View style={styles.monthGrid} accessibilityLabel="Månedsvisning">
      {monthDates.map((date) => <Pressable key={date} accessibilityRole="button" accessibilityLabel={`${formatSelectedDate(date)}${eventDates.has(date) ? ", har hendelser" : ""}`} onPress={() => { calendar.setSelectedDate(date); setView("day"); }} style={[styles.monthDay, date === calendar.selectedDate && styles.monthDaySelected, eventDates.has(date) && styles.monthDayHasEvent]}><AppText style={[styles.monthDayText, date === calendar.selectedDate && styles.monthDayTextSelected]}>{Number(date.slice(8, 10))}</AppText>{eventDates.has(date) ? <View style={styles.dot} /> : null}</Pressable>)}
    </View> : view === "list" ? <View style={styles.daySection}><AppText variant="heading">Hendelser denne måneden</AppText>{groupedMonthEvents.length === 0 ? <EmptyState title="Ingen hendelser" description="Det finnes ingen hendelser i valgt måned." /> : groupedMonthEvents.map((group) => <View key={group.date} style={styles.eventList}><AppText variant="label">{formatSelectedDate(group.date)}</AppText>{group.events.map((event) => <CalendarEventCard key={`${event.id}:${event.occurrenceDate ?? event.date}`} event={event} onPress={() => router.push(buildCalendarEventDetailPath(getCalendarEventIdentity(event)))} />)}</View>)}</View> : <View style={styles.daySection}>
      <AppText variant="heading">{formatSelectedDate(calendar.selectedDate)}</AppText>
      {filteredSelectedEvents.length === 0 ? <EmptyState title="Ingen hendelser" description="Denne dagen er rolig foreløpig. Nye hendelser fra web dukker opp her." /> : <View style={styles.eventList} accessibilityLabel="Hendelser for valgt dato">{filteredSelectedEvents.map((event) => <CalendarEventCard key={`${event.id}:${event.occurrenceDate ?? event.date}`} event={event} onPress={() => router.push(buildCalendarEventDetailPath(getCalendarEventIdentity(event)))} />)}</View>}
    </View>}
  </Screen>;
}
function ViewButton({ title, selected, onPress }: { title: string; selected: boolean; onPress: () => void }) { return <Pressable accessibilityRole="tab" accessibilityState={{ selected }} accessibilityLabel={`Vis ${title.toLowerCase()}`} onPress={onPress} style={[styles.viewButton, selected && styles.viewButtonSelected]}><AppText style={[styles.viewButtonText, selected && styles.viewButtonTextSelected]}>{title}</AppText></Pressable>; }
const styles = StyleSheet.create({ header: { gap: theme.spacing.xs }, headerActions: { gap: theme.spacing.sm }, description: { color: theme.colors.textMuted }, daySection: { gap: theme.spacing.md }, eventList: { gap: theme.spacing.md }, viewSwitcher: { flexDirection: "row", gap: theme.spacing.sm }, viewButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: theme.spacing.md, borderRadius: theme.radius.pill, backgroundColor: theme.colors.primarySoft }, viewButtonSelected: { backgroundColor: theme.colors.primaryStrong }, viewButtonText: { color: theme.colors.primaryStrong, fontWeight: "800" }, viewButtonTextSelected: { color: theme.colors.surface }, monthGrid: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.xs }, monthDay: { width: "13%", minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }, monthDaySelected: { backgroundColor: theme.colors.primaryStrong, borderColor: theme.colors.primaryStrong }, monthDayHasEvent: { borderColor: theme.colors.primary }, monthDayText: { fontWeight: "800" }, monthDayTextSelected: { color: theme.colors.surface }, dot: { width: 6, height: 6, borderRadius: 3, marginTop: 2, backgroundColor: theme.colors.primary } });

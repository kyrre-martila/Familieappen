import { useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Screen } from "../../../components/Screen";
import { AppText } from "../../../components/AppText";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../../components/States";
import { theme } from "../../../theme/tokens";
import {
  addDays,
  addMonthsClamped,
  buildMonthWeeks,
  formatDateString,
  formatMonthTitle,
  formatSelectedDate,
  parseDateString,
  weekDayLabels,
} from "../date";
import {
  buildCalendarEventDetailPath,
  getCalendarEventIdentity,
} from "../events";
import { useCalendar } from "../hooks/useCalendar";
import { CalendarDateStrip } from "./CalendarDateStrip";
import { CalendarEventCard } from "./CalendarEventCard";
import { getAgendaStartDate, shouldRunInitialAgendaScroll } from "../agendaStart";

type CalendarView = "day" | "month" | "list";

export function CalendarShell({
  topInset = "safe",
}: { topInset?: "safe" | "none" } = {}) {
  const [view, setView] = useState<CalendarView>("day");
  const calendar = useCalendar();
  const eventDates = useMemo(
    () => new Set(calendar.eventsForMonth.map((event) => event.date)),
    [calendar.eventsForMonth],
  );
  const monthWeeks = useMemo(
    () => buildMonthWeeks(calendar.selectedDate),
    [calendar.selectedDate],
  );
  const activeMonth = parseDateString(calendar.selectedDate).getMonth();
  const groupedAgendaEvents = useMemo(
    () =>
      calendar.eventsForAgenda
        .map((event) => event.date)
        .filter((date, index, dates) => dates.indexOf(date) === index)
        .sort()
        .map((date) => ({
          date,
          events: calendar.eventsForAgenda.filter(
            (event) => event.date === date,
          ),
        })),
    [calendar.eventsForAgenda],
  );
  const agendaStartDate = useMemo(() => getAgendaStartDate(calendar.eventsForAgenda, calendar.today), [calendar.eventsForAgenda, calendar.today]);
  const scrollRef = useRef<ScrollView>(null);
  const agendaLayouts = useRef<Record<string, number>>({});
  const [agendaLayoutVersion, setAgendaLayoutVersion] = useState(0);
  const didPositionAgenda = useRef(false);
  useEffect(() => {
    if (view !== "list") return;
    const y = agendaStartDate ? agendaLayouts.current[agendaStartDate] : undefined;
    if (!shouldRunInitialAgendaScroll({ view, targetDate: agendaStartDate, didScroll: didPositionAgenda.current, hasMeasuredTarget: typeof y === "number" })) return;
    didPositionAgenda.current = true;
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: Math.max(0, y ?? 0), animated: false }));
  }, [agendaStartDate, agendaLayoutVersion, view]);
  const navigateDateStrip = (direction: "back" | "forward", days = 1) =>
    calendar.setSelectedDate(
      formatDateString(
        addDays(
          parseDateString(calendar.selectedDate),
          direction === "forward" ? days : -days,
        ),
      ),
    );
  const navigateMonth = (direction: "previous" | "next") =>
    calendar.setSelectedDate(
      addMonthsClamped(calendar.selectedDate, direction === "next" ? 1 : -1),
    );

  return (
    <Screen
      bottomInset="tab"
      topInset={topInset}
      style={styles.screen}
      scrollRef={scrollRef}
      refreshControl={
        <RefreshControl
          refreshing={calendar.refreshing}
          onRefresh={calendar.refresh}
          tintColor={theme.colors.primary}
        />
      }
    >
      <View style={styles.toolbar} accessibilityLabel="Kalenderhandlinger">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Opprett ny kalenderhendelse"
          onPress={() => router.push("/(app)/calendar/create")}
          style={styles.newButton}
        >
          <Ionicons
            name="calendar-outline"
            size={18}
            color={theme.colors.primaryStrong}
          />
          <AppText style={styles.newButtonText}>Ny</AppText>
        </Pressable>
        <View
          style={styles.segment}
          accessibilityRole="tablist"
          accessibilityLabel="Kalendervisning"
        >
          <ViewButton
            title="Dag"
            selected={view === "day"}
            onPress={() => setView("day")}
          />
          <ViewButton
            title="Måned"
            selected={view === "month"}
            onPress={() => setView("month")}
          />
          <ViewButton
            title="Liste"
            selected={view === "list"}
            onPress={() => setView("list")}
          />
        </View>
      </View>
      {view === "day" ? (
        <>
          <CalendarDateStrip
            selectedDate={calendar.selectedDate}
            today={calendar.today}
            onSelectDate={calendar.setSelectedDate}
            onNavigate={navigateDateStrip}
            eventDates={eventDates}
          />
          <View style={styles.selectedDateBlock}>
            <AppText style={styles.selectedDate}>
              {formatSelectedDate(calendar.selectedDate).toLowerCase()}
            </AppText>
          </View>
        </>
      ) : null}
      {calendar.loading ? (
        <LoadingState
          title="Laster kalender"
          description="Henter hendelser for familien."
        />
      ) : calendar.error ? (
        <ErrorState
          description="Kunne ikke hente kalenderen akkurat nå."
          onRetry={() => void calendar.refresh()}
        />
      ) : calendar.missingContext ? (
        <ErrorState
          description="Fant ingen godkjent familie for denne brukeren."
          onRetry={() => void calendar.refresh()}
        />
      ) : view === "month" ? (
        <View style={styles.monthSection}>
          <MonthToolbar
            title={formatMonthTitle(calendar.selectedDate)}
            onNavigate={navigateMonth}
          />
          <View style={styles.monthGrid} accessibilityLabel="Månedsvisning">
            <View style={styles.monthWeekRow}>
              <AppText style={styles.weekHeading}>UKE</AppText>
              {weekDayLabels.map((label) => (
                <AppText key={label} style={styles.weekday}>
                  {label}
                </AppText>
              ))}
            </View>
            {monthWeeks.map((week, weekIndex) => (
              <View
                key={`${calendar.selectedDate}-${week.weekNumber}-${weekIndex}`}
                style={styles.monthWeekRow}
              >
                <AppText
                  accessibilityLabel={`Uke ${week.weekNumber}`}
                  style={styles.weekNumber}
                >
                  {week.weekNumber}
                </AppText>
                {week.days.map((date) => {
                  const outsideMonth =
                    parseDateString(date).getMonth() !== activeMonth;
                  const hasEvent = eventDates.has(date);
                  const isSelected = date === calendar.selectedDate;
                  const isToday = date === calendar.today;
                  return (
                    <Pressable
                      key={date}
                      accessibilityRole="button"
                      accessibilityLabel={`${formatSelectedDate(date)}${isSelected ? ", valgt" : ""}${isToday ? ", i dag" : ""}${hasEvent ? ", har hendelser" : ""}`}
                      onPress={() => { calendar.setSelectedDate(date); setView("day"); }}
                      style={[
                        styles.monthDay,
                        outsideMonth && styles.monthDayOutside,
                        isToday && styles.monthDayToday,
                        isSelected && styles.monthDaySelected,
                        hasEvent && styles.monthDayHasEvent,
                      ]}
                    >
                      <AppText
                        style={[
                          styles.monthDayText,
                          outsideMonth && styles.monthDayTextOutside,
                          isSelected && styles.monthDayTextSelected,
                        ]}
                      >
                        {Number(date.slice(8, 10))}
                      </AppText>
                      {hasEvent ? (
                        <View
                          style={[styles.dot, isSelected && styles.dotSelected]}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      ) : view === "list" ? (
        <View style={styles.daySection}>
          {groupedAgendaEvents.length === 0 ? (
            <EmptyState
              title="Ingen hendelser"
              description=""
            />
          ) : (
            groupedAgendaEvents.map((group) => (
              <View
                key={group.date}
                style={styles.eventList}
                onLayout={(layoutEvent) => {
                  const nextY = layoutEvent.nativeEvent.layout.y + 28;
                  if (agendaLayouts.current[group.date] !== nextY) {
                    agendaLayouts.current[group.date] = nextY;
                    setAgendaLayoutVersion((version) => version + 1);
                  }
                }}
              >
                <AppText variant="label">
                  {formatSelectedDate(group.date)}
                </AppText>
                {group.events.map((event) => (
                  <CalendarEventCard
                    key={`${event.id}:${event.occurrenceDate ?? event.date}`}
                    event={event}
                    onPress={() =>
                      router.push(
                        buildCalendarEventDetailPath(
                          getCalendarEventIdentity(event),
                        ),
                      )
                    }
                  />
                ))}
              </View>
            ))
          )}
        </View>
      ) : (
        <View style={styles.daySection}>
          {calendar.eventsForSelectedDate.length === 0 ? (
            <AppText style={styles.emptyText}>
              Ingen hendelser denne dagen
            </AppText>
          ) : (
            <View
              style={styles.eventList}
              accessibilityLabel="Hendelser for valgt dato"
            >
              {calendar.eventsForSelectedDate.map((event) => (
                <CalendarEventCard
                  key={`${event.id}:${event.occurrenceDate ?? event.date}`}
                  event={event}
                  onPress={() =>
                    router.push(
                      buildCalendarEventDetailPath(
                        getCalendarEventIdentity(event),
                      ),
                    )
                  }
                />
              ))}
            </View>
          )}
        </View>
      )}
    </Screen>
  );
}
function MonthToolbar({
  title,
  onNavigate,
}: {
  title: string;
  onNavigate: (direction: "previous" | "next") => void;
}) {
  return (
    <View style={styles.monthToolbar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Forrige måned"
        onPress={() => onNavigate("previous")}
        style={styles.monthNavButton}
      >
        <Ionicons
          name="chevron-back"
          size={24}
          color={theme.colors.primaryStrong}
        />
      </Pressable>
      <AppText style={styles.monthTitle}>{title}</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Neste måned"
        onPress={() => onNavigate("next")}
        style={styles.monthNavButton}
      >
        <Ionicons
          name="chevron-forward"
          size={24}
          color={theme.colors.primaryStrong}
        />
      </Pressable>
    </View>
  );
}
function ViewButton({
  title,
  selected,
  onPress,
}: {
  title: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={`Vis ${title.toLowerCase()}`}
      onPress={onPress}
      style={[styles.viewButton, selected && styles.viewButtonSelected]}
    >
      <AppText
        style={[
          styles.viewButtonText,
          selected && styles.viewButtonTextSelected,
        ]}
      >
        {title}
      </AppText>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  screen: { paddingTop: theme.spacing.sm, gap: theme.spacing.md },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  newButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySoft,
  },
  newButtonText: { color: theme.colors.primaryStrong, fontWeight: "900" },
  segment: {
    flex: 1,
    maxWidth: 250,
    alignSelf: "stretch",
    flexDirection: "row",
    padding: 3,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  viewButton: {
    flex: 1,
    minHeight: 36,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.radius.pill,
  },
  viewButtonSelected: { backgroundColor: theme.colors.primarySoft },
  viewButtonText: {
    color: theme.colors.textMuted,
    fontWeight: "800",
    fontSize: 13,
  },
  viewButtonTextSelected: { color: theme.colors.primaryStrong },
  selectedDateBlock: { alignItems: "center", marginTop: -theme.spacing.xs },
  selectedDate: {
    fontSize: 17,
    fontWeight: "900",
    color: theme.colors.heading,
  },
  daySection: { gap: theme.spacing.sm },
  monthToolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthNavButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: theme.colors.heading,
    textAlign: "center",
  },
  eventList: { gap: theme.spacing.sm },
  emptyText: {
    color: theme.colors.textMuted,
    textAlign: "center",
    paddingVertical: theme.spacing.md,
  },
  monthSection: { gap: theme.spacing.md },
  monthGrid: { gap: theme.spacing.xs },
  monthWeekRow: { flexDirection: "row", gap: theme.spacing.xs },
  weekHeading: {
    width: 34,
    textAlign: "center",
    color: theme.colors.textMuted,
    fontWeight: "900",
    fontSize: 11,
  },
  weekday: {
    flex: 1,
    textAlign: "center",
    color: theme.colors.textMuted,
    fontWeight: "900",
    fontSize: 11,
  },
  weekNumber: {
    width: 34,
    minHeight: 44,
    textAlign: "center",
    textAlignVertical: "center",
    color: theme.colors.textMuted,
    fontWeight: "900",
    fontSize: 12,
  },
  monthDay: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  monthDayOutside: { opacity: 0.45 },
  monthDayToday: { borderColor: theme.colors.primaryStrong, borderWidth: 2 },
  monthDaySelected: {
    backgroundColor: theme.colors.primaryStrong,
    borderColor: theme.colors.primaryStrong,
  },
  monthDayHasEvent: { borderColor: theme.colors.primary },
  monthDayText: { fontWeight: "800" },
  monthDayTextOutside: { color: theme.colors.textMuted },
  monthDayTextSelected: { color: theme.colors.surface },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
    backgroundColor: theme.colors.primary,
  },
  dotSelected: { backgroundColor: theme.colors.surface },
});

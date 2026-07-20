import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useRef } from "react";
import { PanResponder, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "../../../components/AppText";
import { theme } from "../../../theme/tokens";
import { addDays, formatDateString, formatSelectedDate, formatWeekday, parseDateString } from "../date";
import { getDateStripSwipeDirection, shouldActivateDateStripSwipe } from "../dateStripSwipe";

export function buildCompactDateStrip(selectedDate: string) {
  const selected = parseDateString(selectedDate);
  return Array.from({ length: 5 }, (_, index) => formatDateString(addDays(selected, index - 2)));
}

export function CalendarDateStrip({ selectedDate, today, onSelectDate, onNavigate, eventDates }: { selectedDate: string; today: string; onSelectDate: (date: string) => void; onNavigate: (direction: "back" | "forward") => void; eventDates: Set<string> }) {
  const dates = useMemo(() => buildCompactDateStrip(selectedDate), [selectedDate]);
  const locked = useRef(false);
  const releaseLock = () => { setTimeout(() => { locked.current = false; }, 180); };
  const navigate = useCallback((direction: "back" | "forward") => {
    if (locked.current) return;
    locked.current = true;
    onNavigate(direction);
    releaseLock();
  }, [onNavigate]);
  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => shouldActivateDateStripSwipe(gesture.dx, gesture.dy),
    onMoveShouldSetPanResponderCapture: (_, gesture) => shouldActivateDateStripSwipe(gesture.dx, gesture.dy),
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: (_, gesture) => {
      const direction = getDateStripSwipeDirection(gesture.dx, gesture.dy, gesture.vx);
      if (direction) navigate(direction);
    },
    onPanResponderTerminate: () => undefined,
  }), [navigate]);

  return <View style={styles.wrap} accessibilityLabel="Velg dato" {...panResponder.panHandlers}>
    <Arrow direction="back" onPress={() => navigate("back")} />
    <View style={styles.dates}>
      {dates.map((date) => {
        const selected = date === selectedDate;
        const isToday = date === today;
        const count = eventDates.has(date) ? 1 : 0;
        return <Pressable key={date} accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${formatSelectedDate(date).toLowerCase()}${selected ? ", valgt" : ""}${isToday ? ", i dag" : ""}${count ? ", har hendelser" : ", ingen hendelser"}`} onPress={() => onSelectDate(date)} style={styles.dateButton}>
          <AppText style={[styles.weekday, selected && styles.selectedText]}>{formatWeekday(date)}</AppText>
          <View style={[styles.dayCircle, selected && styles.dayCircleSelected, isToday && !selected && styles.dayCircleToday]}><AppText style={[styles.dayText, selected && styles.selectedText]}>{Number(date.slice(8, 10))}</AppText></View>
          <View style={[styles.dot, eventDates.has(date) && styles.dotActive]} />
        </Pressable>;
      })}
    </View>
    <Arrow direction="forward" onPress={() => navigate("forward")} />
  </View>;
}

function Arrow({ direction, onPress }: { direction: "back" | "forward"; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={direction === "back" ? "Gå fem dager tilbake" : "Gå fem dager frem"} onPress={onPress} style={styles.arrow}>
    <Ionicons name={direction === "back" ? "chevron-back" : "chevron-forward"} size={22} color={theme.colors.primaryStrong} />
  </Pressable>;
}

const styles = StyleSheet.create({
  wrap: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: theme.spacing.xs },
  arrow: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: theme.radius.pill, backgroundColor: theme.colors.surface },
  dates: { flex: 1, flexDirection: "row", justifyContent: "space-between" },
  dateButton: { minWidth: 42, minHeight: 54, alignItems: "center", justifyContent: "center", gap: 1 },
  weekday: { fontSize: 11, fontWeight: "800", color: theme.colors.textMuted },
  dayCircle: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  dayCircleSelected: { backgroundColor: theme.colors.primaryStrong },
  dayCircleToday: { borderWidth: 1, borderColor: theme.colors.primary },
  dayText: { fontSize: 15, fontWeight: "900", color: theme.colors.text },
  selectedText: { color: theme.colors.surface },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "transparent" },
  dotActive: { backgroundColor: theme.colors.primary },
});

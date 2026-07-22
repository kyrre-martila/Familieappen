import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { AppText } from "../../../components/AppText";
import { theme } from "../../../theme/tokens";
import { formatSelectedDate, formatWeekday } from "../date";
import { buildDateStripDates, getDateStripInitialIndex } from "../dateStripModel";

const STRIP_DAYS_BEFORE = 365;
const STRIP_DAYS_AFTER = 365;
const VISIBLE_DAYS = 5;

export function buildCompactDateStrip(selectedDate: string) {
  return buildDateStripDates(selectedDate, 2, 2);
}

export function CalendarDateStrip({ selectedDate, today, onSelectDate, onNavigate, eventDates }: { selectedDate: string; today: string; onSelectDate: (date: string) => void; onNavigate: (direction: "back" | "forward", days?: number) => void; eventDates: Set<string> }) {
  const dates = useMemo(() => buildDateStripDates(selectedDate, STRIP_DAYS_BEFORE, STRIP_DAYS_AFTER), [selectedDate]);
  const initialIndex = getDateStripInitialIndex(STRIP_DAYS_BEFORE);
  const listRef = useRef<FlatList<string>>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const itemWidth = viewportWidth > 0 ? viewportWidth / VISIBLE_DAYS : 0;
  useEffect(() => {
    if (itemWidth > 0) requestAnimationFrame(() => listRef.current?.scrollToIndex({ index: initialIndex, animated: false, viewPosition: 0.5 }));
  }, [initialIndex, itemWidth, selectedDate]);

  const settle = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (itemWidth <= 0) return;
    const centerIndex = Math.round(event.nativeEvent.contentOffset.x / itemWidth) + 2;
    const boundedIndex = Math.max(0, Math.min(dates.length - 1, centerIndex));
    const offset = boundedIndex - initialIndex;
    if (offset === 0) return;
    onNavigate(offset > 0 ? "forward" : "back", Math.abs(offset));
  }, [dates.length, initialIndex, itemWidth, onNavigate]);

  return <View style={styles.wrap} accessibilityLabel="Velg dato">
    <Arrow direction="back" onPress={() => onNavigate("back", 1)} />
    <View style={styles.viewport} onLayout={(event) => setViewportWidth(event.nativeEvent.layout.width)}>
      {itemWidth > 0 ? <FlatList
        ref={listRef}
        horizontal
        data={dates}
        keyExtractor={(date) => date}
        showsHorizontalScrollIndicator={false}
        snapToInterval={itemWidth}
        decelerationRate="fast"
        disableIntervalMomentum={false}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, index) => ({ length: itemWidth, offset: itemWidth * index, index })}
        onMomentumScrollEnd={settle}
        onScrollEndDrag={(event) => { if (Math.abs(event.nativeEvent.velocity?.x ?? 0) < 0.05) settle(event); }}
        renderItem={({ item }) => <DateItem date={item} selectedDate={selectedDate} today={today} onSelectDate={onSelectDate} eventDates={eventDates} width={itemWidth} />}
      /> : null}
    </View>
    <Arrow direction="forward" onPress={() => onNavigate("forward", 1)} />
  </View>;
}

function DateItem({ date, selectedDate, today, onSelectDate, eventDates, width }: { date: string; selectedDate: string; today: string; onSelectDate: (date: string) => void; eventDates: Set<string>; width: number }) {
  const selected = date === selectedDate; const isToday = date === today; const count = eventDates.has(date) ? 1 : 0;
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${formatSelectedDate(date).toLowerCase()}${selected ? ", valgt" : ""}${isToday ? ", i dag" : ""}${count ? ", har hendelser" : ", ingen hendelser"}`} onPress={() => onSelectDate(date)} style={[styles.dateButton, { width }]}>
    <AppText style={[styles.weekday, selected && styles.selectedText]}>{formatWeekday(date)}</AppText>
    <View style={[styles.dayCircle, selected && styles.dayCircleSelected, isToday && !selected && styles.dayCircleToday]}><AppText style={[styles.dayText, selected && styles.selectedText]}>{Number(date.slice(8, 10))}</AppText></View>
    <View style={[styles.dot, eventDates.has(date) && styles.dotActive]} />
  </Pressable>;
}
function Arrow({ direction, onPress }: { direction: "back" | "forward"; onPress: () => void }) { return <Pressable accessibilityRole="button" accessibilityLabel={direction === "back" ? "Gå én dag tilbake" : "Gå én dag frem"} onPress={onPress} style={styles.arrow}><Ionicons name={direction === "back" ? "chevron-back" : "chevron-forward"} size={22} color={theme.colors.primaryStrong} /></Pressable>; }
const styles = StyleSheet.create({ wrap: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }, arrow: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: theme.radius.pill, backgroundColor: theme.colors.surface }, viewport: { flex: 1, overflow: "hidden" }, dateButton: { minHeight: 54, alignItems: "center", justifyContent: "center", gap: 1 }, weekday: { fontSize: 11, fontWeight: "800", color: theme.colors.textMuted }, dayCircle: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" }, dayCircleSelected: { backgroundColor: theme.colors.primaryStrong }, dayCircleToday: { borderWidth: 1, borderColor: theme.colors.primary }, dayText: { fontSize: 15, fontWeight: "900", color: theme.colors.text }, selectedText: { color: theme.colors.surface }, dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "transparent" }, dotActive: { backgroundColor: theme.colors.primary } });

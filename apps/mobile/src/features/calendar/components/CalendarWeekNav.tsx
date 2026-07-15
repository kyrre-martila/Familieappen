import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "../../../components/AppText";
import { theme } from "../../../theme/tokens";
import { buildWeekDates, formatWeekday } from "../date";

export function CalendarWeekNav({ selectedDate, onSelectDate, eventDates }: { selectedDate: string; onSelectDate: (date: string) => void; eventDates: Set<string> }) {
  return <View style={styles.week} accessibilityRole="tablist">{buildWeekDates(selectedDate).map((date) => {
    const selected = date === selectedDate;
    return <Pressable key={date} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => onSelectDate(date)} style={[styles.day, selected && styles.daySelected]}>
      <AppText variant="small" style={[styles.weekday, selected && styles.selectedText]}>{formatWeekday(date)}</AppText>
      <AppText variant="heading" style={[styles.dayNumber, selected && styles.selectedText]}>{Number(date.slice(-2))}</AppText>
      {eventDates.has(date) ? <View style={[styles.dot, selected && styles.dotSelected]} /> : <View style={styles.dotSpacer} />}
    </Pressable>;
  })}</View>;
}
const styles = StyleSheet.create({ week: { flexDirection: "row", gap: theme.spacing.xs }, day: { flex: 1, minHeight: 82, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, alignItems: "center", justifyContent: "center", gap: 2 }, daySelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }, weekday: { color: theme.colors.textMuted, fontWeight: "800" }, dayNumber: { fontSize: 20, lineHeight: 26 }, selectedText: { color: theme.colors.surface }, dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.primary }, dotSelected: { backgroundColor: theme.colors.surface }, dotSpacer: { width: 6, height: 6 } });

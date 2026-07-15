import { Ionicons } from "@expo/vector-icons";
import type React from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "../../../components/AppText";
import { theme } from "../../../theme/tokens";
import type { CalendarEventViewModel } from "../events";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const iconByEventIcon: Record<string, IconName> = {
  birthday: "gift-outline",
  family: "people-outline",
  health: "medkit-outline",
  meal: "restaurant-outline",
  school: "school-outline",
  sport: "football-outline",
  travel: "airplane-outline",
};

export function CalendarEventCard({ event }: { event: CalendarEventViewModel }) {
  const participantLabel = event.participantNames.length ? event.participantNames.join(", ") : "Hele familien";
  const accessibilityLabel = `${event.title}. ${event.accessibilityTimeLabel}. ${event.location ? `Sted: ${event.location}.` : "Ingen lokasjon."} ${participantLabel}.`;
  return <View style={[styles.card, event.allDay ? styles.allDayCard : styles.timedCard]} accessible accessibilityRole="summary" accessibilityLabel={accessibilityLabel}>
    <View style={styles.timeColumn}>
      <AppText variant="small" style={[styles.time, event.allDay && styles.allDayTime]}>{event.timeLabel}</AppText>
      {event.isImported ? <View style={styles.badge}><Ionicons name="download-outline" size={13} color={theme.colors.primaryStrong} /><AppText variant="small" style={styles.badgeText}>Importert</AppText></View> : null}
    </View>
    <View style={styles.content}>
      <AppText variant="lead" style={styles.title}>{event.title}</AppText>
      {event.location ? <View style={styles.metaRow}><Ionicons name="location-outline" size={16} color={theme.colors.textMuted} /><AppText style={styles.metaText}>{event.location}</AppText></View> : null}
      <View style={styles.metaRow}><Ionicons name="people-outline" size={16} color={theme.colors.textMuted} /><AppText style={styles.metaText}>{participantLabel}</AppText></View>
    </View>
    <View style={styles.iconBubble} aria-hidden>
      <Ionicons name={iconByEventIcon[event.icon] ?? "calendar-outline"} size={24} color={theme.colors.primaryStrong} />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  card: { minHeight: 88, flexDirection: "row", gap: theme.spacing.md, padding: theme.spacing.md, borderRadius: theme.radius.lg, borderWidth: 1, backgroundColor: theme.colors.surface, borderColor: theme.colors.border, ...theme.shadow.card },
  allDayCard: { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primary },
  timedCard: { borderLeftWidth: 4, borderLeftColor: theme.colors.primary },
  timeColumn: { width: 86, gap: theme.spacing.sm, alignItems: "flex-start" },
  time: { color: theme.colors.primary, fontWeight: "800" },
  allDayTime: { color: theme.colors.primaryStrong },
  content: { flex: 1, gap: theme.spacing.xs, minWidth: 0 },
  title: { fontWeight: "800" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.xs },
  metaText: { flex: 1, color: theme.colors.textMuted },
  iconBubble: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surfaceWarm, alignItems: "center", justifyContent: "center" },
  badge: { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: theme.radius.pill, backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing.sm, paddingVertical: 2 },
  badgeText: { color: theme.colors.primaryStrong, fontWeight: "800" },
});

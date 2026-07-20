import { Ionicons } from "@expo/vector-icons";
import type React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "../../../components/AppText";
import { theme } from "../../../theme/tokens";
import type { CalendarEventViewModel } from "../events";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

function getInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("") || "?";
}

const iconByEventIcon: Record<string, IconName> = {
  birthday: "gift-outline",
  family: "people-outline",
  health: "medkit-outline",
  meal: "restaurant-outline",
  school: "school-outline",
  sport: "football-outline",
  travel: "airplane-outline",
};

export function CalendarEventCard({ event, onPress }: { event: CalendarEventViewModel; onPress?: () => void }) {
  const participantLabel = event.participantNames.length ? event.participantNames.join(", ") : "Hele familien";
  const visibleParticipants = event.participants.slice(0, 3);
  const remainingParticipants = Math.max(0, event.participants.length - visibleParticipants.length);
  const accessibilityLabel = `${event.title}. ${event.accessibilityTimeLabel}. ${event.location ? `Sted: ${event.location}.` : "Ingen lokasjon."} ${participantLabel}.`;
  return <Pressable style={({ pressed }) => [styles.card, event.allDay ? styles.allDayCard : styles.timedCard, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={`Åpne hendelse: ${accessibilityLabel}`} onPress={onPress}>
    <View style={styles.timeColumn}>
      <AppText variant="small" style={[styles.time, event.allDay && styles.allDayTime]}>{event.timeLabel}</AppText>
      {event.isImported ? <View style={styles.badge}><Ionicons name="download-outline" size={13} color={theme.colors.primaryStrong} /><AppText variant="small" style={styles.badgeText}>Importert</AppText></View> : null}
    </View>
    <View style={styles.content}>
      <AppText numberOfLines={2} style={styles.title}>{event.title}</AppText>
      <View style={styles.metaRow}><Ionicons name="location-outline" size={14} color={theme.colors.textMuted} /><AppText numberOfLines={1} style={styles.metaText}>{event.location ?? "Ingen lokasjon"}</AppText></View>
      <View style={styles.participantRow}>{visibleParticipants.map((participant) => <View key={participant.id} style={styles.avatar}><AppText style={styles.avatarText}>{getInitials(participant.displayName)}</AppText></View>)}{remainingParticipants ? <View style={styles.avatar}><AppText style={styles.avatarText}>+{remainingParticipants}</AppText></View> : null}<AppText numberOfLines={1} style={styles.metaText}>{participantLabel}</AppText></View>
    </View>
    <View style={styles.iconBubble}>
      <Ionicons name={iconByEventIcon[event.icon] ?? "calendar-outline"} size={20} color={theme.colors.primaryStrong} />
    </View>
  </Pressable>;
}

const styles = StyleSheet.create({
  card: { minHeight: 72, flexDirection: "row", gap: theme.spacing.sm, paddingVertical: theme.spacing.sm, paddingRight: theme.spacing.sm, paddingLeft: theme.spacing.md, borderRadius: theme.radius.md, borderWidth: 1, backgroundColor: theme.colors.surface, borderColor: theme.colors.border, ...theme.shadow.card },
  allDayCard: { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primary, borderLeftWidth: 4, borderLeftColor: theme.colors.primary },
  timedCard: { borderLeftWidth: 4, borderLeftColor: theme.colors.primary },
  timeColumn: { width: 58, gap: 2, alignItems: "flex-start", paddingTop: 2 },
  time: { color: theme.colors.primaryStrong, fontWeight: "900", fontSize: 12, lineHeight: 16 },
  allDayTime: { color: theme.colors.primaryStrong },
  content: { flex: 1, gap: 3, minWidth: 0 },
  title: { fontSize: 16, lineHeight: 20, color: theme.colors.text, fontWeight: "900" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  participantRow: { flexDirection: "row", alignItems: "center", gap: 4, minWidth: 0 },
  metaText: { flex: 1, color: theme.colors.textMuted, fontSize: 13 },
  avatar: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primarySoft, borderWidth: 1, borderColor: theme.colors.surface },
  avatarText: { fontSize: 9, fontWeight: "900", color: theme.colors.primaryStrong },
  iconBubble: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme.colors.surfaceWarm, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  pressed: { opacity: 0.86, transform: [{ scale: 0.995 }] },
  badge: { flexDirection: "row", alignItems: "center", gap: 2, borderRadius: theme.radius.pill, backgroundColor: theme.colors.surface, paddingHorizontal: 5, paddingVertical: 1 },
  badgeText: { color: theme.colors.primaryStrong, fontWeight: "800", fontSize: 10 },
});

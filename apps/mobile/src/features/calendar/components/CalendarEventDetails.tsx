import { Ionicons } from "@expo/vector-icons";
import type React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "../../../components/AppText";
import { Card } from "../../../components/Card";
import { theme } from "../../../theme/tokens";
import { buildCalendarEventEditPath, canEditCalendarEvent, getCalendarEventEditRestriction, getCalendarEventIdentity, type CalendarEventViewModel } from "../events";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

type Row = { icon: IconName; label: string; value: string | null | undefined; multiline?: boolean };

function DetailRow({ row }: { row: Row }) {
  if (!row.value) return null;
  return <View style={styles.row}><Ionicons name={row.icon} size={22} color={theme.colors.primaryStrong} /><View style={styles.rowText}><AppText variant="small" style={styles.rowLabel}>{row.label}</AppText><AppText style={[styles.rowValue, row.multiline && styles.multiline]}>{row.value}</AppText></View></View>;
}

export function CalendarEventDetails({ event, onEdit }: { event: CalendarEventViewModel; onEdit?: (path: ReturnType<typeof buildCalendarEventEditPath>) => void }) {
  const participantLabel = event.participantNames.length ? event.participantNames.join(", ") : "Hele familien";
  const rows: Row[] = [
    { icon: "calendar-outline", label: "Dato", value: event.detailDateLabel },
    { icon: "time-outline", label: "Tid", value: event.timeLabel },
    { icon: "location-outline", label: "Sted", value: event.location },
    { icon: "people-outline", label: "Deltakere", value: participantLabel },
    { icon: "repeat-outline", label: "Gjentakelse", value: event.recurrenceLabel },
    { icon: "notifications-outline", label: "Påminnelse", value: event.reminderLabel },
    { icon: "download-outline", label: "Kilde", value: event.sourceLabel },
    { icon: "document-text-outline", label: "Beskrivelse", value: event.description, multiline: true },
  ];
  const restriction = getCalendarEventEditRestriction(event);
  return <View style={styles.root} accessibilityLabel="Kalenderhendelse"><Card style={styles.hero}><AppText variant="small" style={styles.source}>{event.sourceLabel} • {event.detailDateLabel}</AppText><AppText variant="title" style={styles.title}>{event.title}</AppText>{canEditCalendarEvent(event) && onEdit ? <Pressable accessibilityRole="button" accessibilityLabel="Rediger kalenderhendelse" onPress={() => onEdit(buildCalendarEventEditPath(getCalendarEventIdentity(event)))} style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}><Ionicons name="create-outline" size={18} color={theme.colors.primaryStrong} /><AppText style={styles.editText}>Rediger</AppText></Pressable> : restriction ? <AppText variant="small" style={styles.muted}>{restriction}</AppText> : null}{event.isImported ? <View style={styles.badge}><Ionicons name="download-outline" size={14} color={theme.colors.primaryStrong} /><AppText variant="small" style={styles.badgeText}>Importert hendelse</AppText></View> : null}</Card><Card style={styles.details}>{rows.map((row) => <DetailRow key={row.label} row={row} />)}</Card></View>;
}

const styles = StyleSheet.create({
  root: { gap: theme.spacing.md },
  hero: { gap: theme.spacing.sm },
  source: { color: theme.colors.textMuted, fontWeight: "800" },
  title: { flexWrap: "wrap" },
  badge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, borderRadius: theme.radius.pill, backgroundColor: theme.colors.primarySoft, paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs },
  badgeText: { color: theme.colors.primaryStrong, fontWeight: "800" },
  editButton: { minHeight: 44, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: theme.spacing.xs, borderRadius: theme.radius.pill, backgroundColor: theme.colors.primarySoft, paddingHorizontal: theme.spacing.md },
  editText: { color: theme.colors.primaryStrong, fontWeight: "800" },
  muted: { color: theme.colors.textMuted },
  pressed: { opacity: 0.75 },
  details: { gap: theme.spacing.md },
  row: { minHeight: 44, flexDirection: "row", gap: theme.spacing.md, alignItems: "flex-start" },
  rowText: { flex: 1, gap: 2, minWidth: 0 },
  rowLabel: { color: theme.colors.textMuted, fontWeight: "800" },
  rowValue: { flexWrap: "wrap" },
  multiline: { lineHeight: 22 },
});

import { Ionicons } from "@expo/vector-icons";
import type React from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "../../../components/AppText";
import { Card } from "../../../components/Card";
import { theme } from "../../../theme/tokens";
import { buildCalendarEventEditPath, canEditCalendarEvent, getCalendarEventEditRestriction, getCalendarEventEditScopeDescription, getCalendarEventEditScopeLabel, getCalendarEventEditScopes, getCalendarEventIdentity, requiresCalendarEventEditScope, type CalendarEventEditScope, type CalendarEventViewModel } from "../events";
import { useState } from "react";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

type Row = { icon: IconName; label: string; value: string | null | undefined; multiline?: boolean };

function DetailRow({ row }: { row: Row }) {
  if (!row.value) return null;
  return <View style={styles.row}><Ionicons name={row.icon} size={22} color={theme.colors.primaryStrong} /><View style={styles.rowText}><AppText variant="small" style={styles.rowLabel}>{row.label}</AppText><AppText style={[styles.rowValue, row.multiline && styles.multiline]}>{row.value}</AppText></View></View>;
}

export function CalendarEventDetails({ event, onEdit }: { event: CalendarEventViewModel; onEdit?: (path: ReturnType<typeof buildCalendarEventEditPath>) => void }) {
  const [scopeOpen, setScopeOpen] = useState(false);
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
  const identity = getCalendarEventIdentity(event);
  function edit(scope?: CalendarEventEditScope) {
    if (!onEdit) return;
    onEdit(buildCalendarEventEditPath({ ...identity, scope, occurrenceDate: scope === "series" ? undefined : identity.occurrenceDate }));
  }
  function handleEdit() {
    if (requiresCalendarEventEditScope(event)) setScopeOpen(true);
    else edit();
  }
  return <View style={styles.root} accessibilityLabel="Kalenderhendelse"><Card style={styles.hero}><AppText variant="small" style={styles.source}>{event.sourceLabel} • {event.detailDateLabel}</AppText><AppText variant="title" style={styles.title}>{event.title}</AppText>{canEditCalendarEvent(event) && onEdit ? <Pressable accessibilityRole="button" accessibilityLabel="Rediger kalenderhendelse" onPress={handleEdit} style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}><Ionicons name="create-outline" size={18} color={theme.colors.primaryStrong} /><AppText style={styles.editText}>Rediger</AppText></Pressable> : restriction ? <AppText variant="small" style={styles.muted}>{restriction}</AppText> : null}{event.isImported ? <View style={styles.badge}><Ionicons name="download-outline" size={14} color={theme.colors.primaryStrong} /><AppText variant="small" style={styles.badgeText}>Importert hendelse</AppText></View> : null}</Card><Card style={styles.details}>{rows.map((row) => <DetailRow key={row.label} row={row} />)}</Card><Modal visible={scopeOpen} transparent animationType="fade" onRequestClose={() => setScopeOpen(false)}><View style={styles.modalBackdrop}><Card style={styles.scopeCard}><AppText variant="title">Hva vil du redigere?</AppText><AppText style={styles.muted}>Velg om endringen bare gjelder denne hendelsen eller hele serien.</AppText>{getCalendarEventEditScopes(event).map((scope) => <Pressable key={scope} accessibilityRole="button" accessibilityLabel={`${getCalendarEventEditScopeLabel(scope)}. ${getCalendarEventEditScopeDescription(scope)}`} onPress={() => { setScopeOpen(false); edit(scope); }} style={({ pressed }) => [styles.scopeButton, pressed && styles.scopePressed]}><AppText style={styles.scopeTitle}>{getCalendarEventEditScopeLabel(scope)}</AppText><AppText variant="small" style={styles.muted}>{getCalendarEventEditScopeDescription(scope)}</AppText></Pressable>)}<Pressable accessibilityRole="button" accessibilityLabel="Avbryt redigering" onPress={() => setScopeOpen(false)} style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}><AppText style={styles.cancelText}>Avbryt</AppText></Pressable></Card></View></Modal></View>;
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
  modalBackdrop: { flex: 1, justifyContent: "center", padding: theme.spacing.lg, backgroundColor: "rgba(15, 23, 42, 0.45)" },
  scopeCard: { gap: theme.spacing.md },
  scopeButton: { minHeight: 64, justifyContent: "center", gap: 2, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.lg, padding: theme.spacing.md, backgroundColor: theme.colors.surface },
  scopePressed: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySoft },
  scopeTitle: { fontWeight: "800" },
  cancelButton: { minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: theme.radius.pill, backgroundColor: theme.colors.background },
  cancelText: { fontWeight: "800", color: theme.colors.textMuted },
});

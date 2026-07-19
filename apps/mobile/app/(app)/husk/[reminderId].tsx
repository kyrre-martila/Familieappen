import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Modal, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText, Button, Card, Screen } from "../../../src/components";
import { EmptyState, ErrorState, LoadingState } from "../../../src/components/States";
import { useReminderDetails } from "../../../src/features/husk/hooks/useReminderDetails";
import { useDeleteReminder, useReminderCompletion } from "../../../src/features/husk/hooks/useReminderMutations";
import { formatReminderDate, formatReminderTime } from "../../../src/features/husk/models";
import { reminderActionFor } from "../../../src/features/husk/reminderHistory";
import { theme } from "../../../src/theme/tokens";

export default function ReminderDetails() {
  const { reminderId } = useLocalSearchParams<{ reminderId?: string }>();
  const id = typeof reminderId === "string" ? reminderId : null;
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const d = useReminderDetails(id);
  const completion = useReminderCompletion();
  const deletion = useDeleteReminder();
  if (d.loading) return <LoadingState title="Laster påminnelse" description="Henter detaljene." />;
  if (d.error) return <ErrorState description="Kunne ikke hente påminnelsen." onRetry={() => void d.refetch()} />;
  if (!d.reminder) return <EmptyState title="Påminnelsen finnes ikke" description="Den kan være slettet." />;
  const r = d.reminder;
  const audience = r.scope === "family" || !r.memberIds.length ? "Hele familien" : r.audienceMembers.map((x) => x.familyMember.displayName).join(", ");
  const action = reminderActionFor(r);
  const actionTitle = action === "complete" ? "Fullfør" : "Angre fullført";
  return <Screen bottomInset="screen" refreshControl={<RefreshControl refreshing={d.refreshing} onRefresh={() => void d.refetch()} />}>
    <View style={styles.top}><Button title="Tilbake" variant="secondary" accessibilityLabel="Tilbake til Husk" accessibilityHint="Går tilbake til oversikten over påminnelser." onPress={() => router.canGoBack() ? router.back() : router.replace("/(app)/(tabs)/tasks")} /><AppText variant="label">Husk</AppText></View>
    <Card style={styles.card}><View style={styles.heading}><Ionicons name="notifications-outline" size={28} color={theme.colors.primaryStrong} /><AppText variant="title">{r.title}</AppText></View>{r.note ? <Info label="Notat" value={r.note} /> : null}{r.date ? <Info label="Dato" value={formatReminderDate(r.date ?? undefined)} /> : null}{r.dueDate ? <Info label="Klokkeslett" value={formatReminderTime(r.dueDate) ?? ""} /> : null}<Info label="Ansvarlig" value={audience} /><Info label="Synlighet" value={r.isPrivate ? "Privat" : "Familie"} />
      <Button title={actionTitle} disabled={completion.saving || deletion.saving} accessibilityLabel={`${actionTitle} ${r.title}`} accessibilityHint={action === "complete" ? "Flytter påminnelsen til historikk." : "Flytter påminnelsen tilbake til aktive påminnelser."} onPress={() => void (action === "complete" ? completion.complete(r.id) : completion.undo(r.id))} />
      <Button title="Rediger" disabled={deletion.saving} onPress={() => router.push(`/(app)/husk/${r.id}/edit`)} />
      <Button title="Slett" variant="secondary" disabled={deletion.saving} accessibilityLabel={`Slett ${r.title}`} onPress={() => setConfirmDeleteOpen(true)} />
      {completion.error ? <AppText style={styles.error}>{completion.error}</AppText> : null}{deletion.error ? <AppText style={styles.error}>{deletion.error}</AppText> : null}</Card>
    <Modal visible={confirmDeleteOpen} transparent animationType="fade" onRequestClose={() => !deletion.saving && setConfirmDeleteOpen(false)}><View style={styles.modalBackdrop}><Card style={styles.card}><AppText variant="title">Slett påminnelse?</AppText><AppText style={styles.muted}>«{r.title}» fjernes fra Husk for familien.</AppText><View style={styles.actions}><Pressable disabled={deletion.saving} onPress={() => setConfirmDeleteOpen(false)} style={styles.cancel}><AppText style={styles.cancelText}>Avbryt</AppText></Pressable><Pressable disabled={deletion.saving} onPress={() => void deletion.remove(r.id)} style={styles.delete}><AppText style={styles.deleteText}>{deletion.saving ? "Sletter …" : "Slett"}</AppText></Pressable></View></Card></View></Modal>
  </Screen>;
}
function Info({ label, value }: { label: string; value: string }) { return <View style={styles.info}><AppText variant="label">{label}</AppText><AppText>{value}</AppText></View>; }
const styles = StyleSheet.create({ top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, card: { gap: theme.spacing.md }, heading: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }, info: { gap: theme.spacing.xs }, error: { color: theme.colors.error }, muted: { color: theme.colors.textMuted }, modalBackdrop: { flex: 1, justifyContent: "center", padding: theme.spacing.lg, backgroundColor: "rgba(15, 23, 42, 0.45)" }, actions: { flexDirection: "row", gap: theme.spacing.sm }, cancel: { minHeight: 44, flex: 1, alignItems: "center", justifyContent: "center", borderRadius: theme.radius.pill, backgroundColor: theme.colors.background }, cancelText: { color: theme.colors.textMuted, fontWeight: "800" }, delete: { minHeight: 44, flex: 1, alignItems: "center", justifyContent: "center", borderRadius: theme.radius.pill, backgroundColor: theme.colors.error }, deleteText: { color: theme.colors.surface, fontWeight: "800" } });

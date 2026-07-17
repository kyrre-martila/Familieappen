import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { AppText, Button, Screen } from "../../../../src/components";
import { EmptyState, ErrorState, LoadingState } from "../../../../src/components/States";
import { useCalendarFamilyMembers } from "../../../../src/features/calendar/hooks/useCalendarFamilyMembers";
import { ReminderForm } from "../../../../src/features/husk/components/ReminderForm";
import { resolveEditReminderScreenState } from "../../../../src/features/husk/editReminderState";
import { useReminderDetails } from "../../../../src/features/husk/hooks/useReminderDetails";
import { useUpdateReminder } from "../../../../src/features/husk/hooks/useReminderMutations";
import { reminderToForm, type ReminderForm as Form } from "../../../../src/features/husk/reminderForm";
import { theme } from "../../../../src/theme/tokens";

export default function EditReminder() {
  const { reminderId } = useLocalSearchParams<{ reminderId?: string }>();
  const id = typeof reminderId === "string" && reminderId.trim() ? reminderId : null;
  const details = useReminderDetails(id);
  const mutation = useUpdateReminder(id ?? "");
  const members = useCalendarFamilyMembers();
  const [form, setForm] = useState<Form | null>(null);
  useEffect(() => { if (details.reminder && !mutation.saving) setForm(reminderToForm(details.reminder)); }, [details.reminder, mutation.saving]);
  const state = resolveEditReminderScreenState({ reminderId: id, loading: details.loading, familiesLoading: mutation.familiesLoading, error: details.error, missingContext: details.missingContext || mutation.missingContext, reminder: details.reminder, formReady: Boolean(form) });
  if (state === "invalid") return <Screen bottomInset="screen"><ErrorState title="Ugyldig påminnelse" description="Mangler en gyldig id." onRetry={() => router.replace("/(app)/(tabs)/tasks")} /></Screen>;
  if (state === "loading" || state === "hydrating") return <Screen bottomInset="screen"><LoadingState title="Laster påminnelse" description="Henter påminnelsen før den redigeres." /></Screen>;
  if (state === "error") return <Screen bottomInset="screen"><ErrorState title="Kunne ikke hente påminnelse" description="Prøv igjen for å laste redigering." onRetry={() => void details.refetch()} /></Screen>;
  if (state === "missing-context") return <Screen bottomInset="screen"><ErrorState title="Mangler familietilgang" description="Vi finner ikke en aktiv familie akkurat nå." onRetry={() => router.replace("/(app)/(tabs)/tasks")} /></Screen>;
  if (state === "not-found" || !form) return <Screen bottomInset="screen"><EmptyState title="Påminnelsen finnes ikke" description="Den kan være slettet eller flyttet." /><Button title="Tilbake til Husk" onPress={() => router.replace("/(app)/(tabs)/tasks")} /></Screen>;
  const update = <K extends keyof Form>(key: K, value: Form[K]) => { mutation.resetError(); setForm((current) => current ? { ...current, [key]: value } : current); };
  return <View style={styles.root}><View style={styles.top}><Button title="Tilbake" variant="secondary" onPress={() => router.back()} disabled={mutation.saving} /><AppText variant="label">Husk</AppText></View><ReminderForm title="Rediger påminnelse" description="Oppdater påminnelsen." form={form} onChange={update} onSubmit={() => mutation.update(form)} onCancel={() => router.back()} submitting={mutation.saving} error={mutation.error} familyMembers={members.familyMembers} submitTitle="Lagre endringer" /></View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: theme.colors.background }, top: { padding: theme.spacing.lg, flexDirection: "row", justifyContent: "space-between", alignItems: "center" } });

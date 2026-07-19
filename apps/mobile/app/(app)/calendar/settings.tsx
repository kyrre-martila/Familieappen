import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pressable, StyleSheet, Switch, TextInput, View } from "react-native";
import { router } from "expo-router";
import { AppText } from "../../../src/components/AppText";
import { Screen } from "../../../src/components/Screen";
import { Button } from "../../../src/components/Button";
import { EmptyState, ErrorState, LoadingState } from "../../../src/components/States";
import { theme } from "../../../src/theme/tokens";
import { useActiveFamily } from "../../../src/features/family/useActiveFamily";
import { createCalendarIcsSource, deleteCalendarIcsSource, getCalendarExportFeedSettings, getCalendarIcsSources, regenerateCalendarExportFeed, updateCalendarExportFeedSettings, updateCalendarIcsSource } from "../../../src/features/calendar/api";

export default function CalendarSettingsScreen() {
  const { accessToken, familyId } = useActiveFamily();
  const client = useQueryClient();
  const importKey = ["calendar", "ics-sources", familyId];
  const exportKey = ["calendar", "feed-settings", familyId];
  const imports = useQuery({ queryKey: importKey, queryFn: () => getCalendarIcsSources(accessToken!, familyId!), enabled: Boolean(accessToken && familyId) });
  const exportFeed = useQuery({ queryKey: exportKey, queryFn: () => getCalendarExportFeedSettings(accessToken!, familyId!), enabled: Boolean(accessToken && familyId) });
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const invalidate = () => { void client.invalidateQueries({ queryKey: importKey }); void client.invalidateQueries({ queryKey: exportKey }); };
  const createImport = useMutation({ mutationFn: () => createCalendarIcsSource(accessToken!, familyId!, { name: name.trim(), url: url.trim(), active: true }), onSuccess: () => { setName(""); setUrl(""); invalidate(); } });
  const toggleImport = useMutation({ mutationFn: (input: { id: string; active: boolean }) => updateCalendarIcsSource(accessToken!, familyId!, input.id, { active: input.active }), onSuccess: invalidate });
  const deleteImport = useMutation({ mutationFn: (id: string) => deleteCalendarIcsSource(accessToken!, familyId!, id), onSuccess: invalidate });
  const updateExport = useMutation({ mutationFn: (enabled: boolean) => updateCalendarExportFeedSettings(accessToken!, familyId!, { enabled }), onSuccess: invalidate });
  const regenerate = useMutation({ mutationFn: () => regenerateCalendarExportFeed(accessToken!, familyId!), onSuccess: invalidate });
  const busy = createImport.isPending || toggleImport.isPending || deleteImport.isPending || updateExport.isPending || regenerate.isPending;
  const error = imports.error || exportFeed.error || createImport.error || toggleImport.error || deleteImport.error || updateExport.error || regenerate.error;
  return <Screen bottomInset="screen"><View style={styles.header}><Button title="Tilbake" variant="secondary" onPress={() => router.back()} /><AppText variant="title">Kalenderinnstillinger</AppText><AppText style={styles.description}>Importer eksterne kalendere og administrer kalenderabonnementet for familien.</AppText></View>{!familyId ? <ErrorState title="Mangler familietilgang" description="Vi finner ikke en aktiv familie for kalenderinnstillinger." /> : imports.isLoading || exportFeed.isLoading ? <LoadingState title="Laster innstillinger" description="Henter import og eksport." /> : error ? <ErrorState description="Kunne ikke hente kalenderinnstillingene akkurat nå." onRetry={() => { void imports.refetch(); void exportFeed.refetch(); }} /> : <><View style={styles.card}><AppText variant="heading">Eksporter kalender</AppText><View style={styles.row}><AppText>Aktivt abonnement</AppText><Switch value={exportFeed.data?.enabled ?? false} onValueChange={(enabled) => updateExport.mutate(enabled)} disabled={busy} /></View>{exportFeed.data?.privateUrl ? <AppText selectable style={styles.url}>{exportFeed.data.privateUrl}</AppText> : <AppText style={styles.description}>Slå på eksport for å lage en privat abonnementskobling.</AppText>}<Button title="Lag ny lenke" variant="secondary" onPress={() => regenerate.mutate()} disabled={busy} /></View><View style={styles.card}><AppText variant="heading">Importer kalender</AppText><TextInput value={name} onChangeText={setName} placeholder="Navn" placeholderTextColor={theme.colors.placeholder} style={styles.input} /><TextInput value={url} onChangeText={setUrl} placeholder="ICS-lenke" placeholderTextColor={theme.colors.placeholder} style={styles.input} autoCapitalize="none" /><Button title="Legg til import" onPress={() => createImport.mutate()} disabled={busy || !name.trim() || !url.trim()} />{imports.data?.length ? imports.data.map((source) => <View key={source.id} style={styles.importRow}><View style={styles.importText}><AppText style={styles.importTitle}>{source.name}</AppText><AppText style={styles.description}>{source.lastSyncStatus ?? "Ikke synkronisert"}</AppText></View><Switch value={source.active} onValueChange={(active) => toggleImport.mutate({ id: source.id, active })} disabled={busy} /><Pressable onPress={() => deleteImport.mutate(source.id)} disabled={busy} style={styles.delete}><AppText style={styles.deleteText}>Slett</AppText></Pressable></View>) : <EmptyState title="Ingen importer" description="Legg til en ICS-lenke for å vise eksterne hendelser i kalenderen." />}</View></>}</Screen>;
}
const styles = StyleSheet.create({ header: { gap: theme.spacing.sm }, description: { color: theme.colors.textMuted }, card: { gap: theme.spacing.md, padding: theme.spacing.md, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }, row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, input: { minHeight: 48, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md, color: theme.colors.text }, url: { color: theme.colors.primaryStrong }, importRow: { flexDirection: "row", gap: theme.spacing.sm, alignItems: "center", paddingVertical: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border }, importText: { flex: 1 }, importTitle: { fontWeight: "800" }, delete: { padding: theme.spacing.sm }, deleteText: { color: theme.colors.error, fontWeight: "800" } });

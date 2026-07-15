import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Switch, TextInput, View, type TextInput as TextInputType } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { AppText } from "../../../src/components/AppText";
import { Button } from "../../../src/components/Button";
import { Card } from "../../../src/components/Card";
import { Screen } from "../../../src/components/Screen";
import { ErrorState, LoadingState } from "../../../src/components/States";
import { formatDateString, formatSelectedDate, parseDateString } from "../../../src/features/calendar/date";
import { validateCreateCalendarEventForm, type CreateCalendarEventErrors, type CreateCalendarEventForm } from "../../../src/features/calendar/createEventForm";
import { useCreateCalendarEvent } from "../../../src/features/calendar/hooks/useCreateCalendarEvent";
import { getCalendarEventBackAction } from "../../../src/features/calendar/navigation";
import { theme } from "../../../src/theme/tokens";

const timeFormatter = new Intl.DateTimeFormat("nb-NO", { hour: "2-digit", minute: "2-digit" });

function backToCalendar() {
  if (getCalendarEventBackAction(router.canGoBack()) === "back") router.back();
  else router.replace("/(app)/(tabs)/calendar");
}

function timeDate(value: string) { const [h, m] = value.split(":").map(Number); const date = new Date(); date.setHours(h, m, 0, 0); return date; }
function timeString(date: Date) { return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`; }

export default function CreateCalendarEventScreen() {
  const [form, setForm] = useState<CreateCalendarEventForm>({ title: "", date: formatDateString(new Date()), allDay: true, startTime: "09:00", endTime: "10:00", location: "", description: "" });
  const [errors, setErrors] = useState<CreateCalendarEventErrors>({});
  const [picker, setPicker] = useState<"date" | "start" | "end" | null>(null);
  const titleRef = useRef<TextInputType>(null);
  const create = useCreateCalendarEvent();
  const update = <K extends keyof CreateCalendarEventForm>(key: K, value: CreateCalendarEventForm[K]) => { create.resetError(); setErrors((current) => ({ ...current, [key]: undefined, form: undefined })); setForm((current) => ({ ...current, [key]: value })); };
  async function submit() {
    const nextErrors = validateCreateCalendarEventForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { if (nextErrors.title) titleRef.current?.focus(); return; }
    try { await create.createEvent(form); } catch { setErrors((current) => ({ ...current, form: "Kunne ikke lagre hendelsen akkurat nå. Kontroller feltene og prøv igjen." })); }
  }
  if (create.familiesLoading) return <Screen bottomInset="screen"><LoadingState title="Klargjør kalender" description="Henter familien før hendelsen kan lagres." /></Screen>;
  if (create.missingContext) return <Screen bottomInset="screen"><ErrorState title="Mangler familietilgang" description="Vi finner ikke en aktiv familie for kalenderen akkurat nå." onRetry={() => router.replace("/(app)/(tabs)/calendar")} /></Screen>;
  return <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", android: undefined })} style={styles.root}><Screen bottomInset="screen" style={styles.screen}><View style={styles.topbar}><Button title="Tilbake" variant="secondary" onPress={backToCalendar} disabled={create.saving} /><AppText variant="label">Kalender</AppText></View><Card style={styles.card}><AppText variant="title">Ny hendelse</AppText><AppText style={styles.muted}>Opprett en kalenderhendelse for familien.</AppText><Field label="Tittel" error={errors.title}><TextInput ref={titleRef} value={form.title} onChangeText={(text) => update("title", text)} placeholder="Tittel på hendelse" placeholderTextColor={theme.colors.placeholder} style={styles.input} accessibilityLabel="Tittel" returnKeyType="next" editable={!create.saving} /></Field><Field label="Dato" error={errors.date}><PickerButton label={formatSelectedDate(form.date)} onPress={() => setPicker("date")} disabled={create.saving} accessibilityLabel="Velg dato" /></Field><View style={styles.switchRow}><View><AppText variant="label">Hele dagen</AppText><AppText variant="small" style={styles.muted}>Skjul klokkeslett for heldagshendelser.</AppText></View><Switch value={form.allDay} onValueChange={(value) => update("allDay", value)} disabled={create.saving} accessibilityLabel="Hele dagen" /></View>{!form.allDay ? <View style={styles.timeGrid}><Field label="Starttid" error={errors.startTime}><PickerButton label={form.startTime} onPress={() => setPicker("start")} disabled={create.saving} accessibilityLabel="Velg starttid" /></Field><Field label="Sluttid" error={errors.endTime}><PickerButton label={form.endTime} onPress={() => setPicker("end")} disabled={create.saving} accessibilityLabel="Velg sluttid" /></Field></View> : null}<Field label="Lokasjon" error={errors.location}><TextInput value={form.location} onChangeText={(text) => update("location", text)} placeholder="Sted (valgfritt)" placeholderTextColor={theme.colors.placeholder} style={styles.input} accessibilityLabel="Lokasjon" editable={!create.saving} /></Field><Field label="Beskrivelse" error={errors.description}><TextInput value={form.description} onChangeText={(text) => update("description", text)} placeholder="Beskrivelse (valgfritt)" placeholderTextColor={theme.colors.placeholder} style={[styles.input, styles.textArea]} multiline accessibilityLabel="Beskrivelse" editable={!create.saving} /></Field>{errors.form || create.error ? <AppText accessibilityRole="alert" style={styles.error}>{errors.form ?? create.error}</AppText> : null}<Button title={create.saving ? "Lagrer …" : "Lagre hendelse"} onPress={() => void submit()} disabled={create.saving} accessibilityLabel="Lagre hendelse" /><Button title="Avbryt" variant="ghost" onPress={backToCalendar} disabled={create.saving} /></Card><AppText variant="small" style={styles.muted}>Støttede backend-felter brukt nå: tittel, dato, heldag, starttid, sluttid, lokasjon og beskrivelse. Øvrige støttede felt sendes med standardverdier.</AppText></Screen>{picker ? <DateTimePicker value={picker === "date" ? parseDateString(form.date) : timeDate(picker === "start" ? form.startTime : form.endTime)} mode={picker === "date" ? "date" : "time"} locale="nb-NO" is24Hour display={Platform.OS === "ios" ? "spinner" : "default"} onChange={(event: DateTimePickerEvent, selected?: Date) => { if (Platform.OS !== "ios" || event.type === "dismissed") setPicker(null); if (!selected || event.type === "dismissed") return; if (picker === "date") update("date", formatDateString(selected)); else update(picker === "start" ? "startTime" : "endTime", timeFormatter.format(selected).replace(".", ":") || timeString(selected)); }} /> : null}</KeyboardAvoidingView>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <View style={styles.field}><AppText variant="label">{label}</AppText>{children}{error ? <AppText accessibilityRole="alert" style={styles.error}>{error}</AppText> : null}</View>; }
function PickerButton({ label, onPress, disabled, accessibilityLabel }: { label: string; onPress: () => void; disabled?: boolean; accessibilityLabel: string }) { return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled: Boolean(disabled) }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.input, styles.pickerButton, disabled && styles.disabled, pressed && !disabled && styles.pressed]}><AppText>{label}</AppText></Pressable>; }
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: theme.colors.background }, screen: { gap: theme.spacing.lg }, topbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.md }, card: { gap: theme.spacing.md }, muted: { color: theme.colors.textMuted }, field: { gap: theme.spacing.xs }, input: { minHeight: 48, borderWidth: 1, borderColor: theme.colors.inputBorder, borderRadius: theme.radius.md, backgroundColor: theme.colors.inputBackground, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, color: theme.colors.text, fontSize: theme.typography.body }, textArea: { minHeight: 112, textAlignVertical: "top" }, pickerButton: { justifyContent: "center" }, switchRow: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: theme.spacing.md }, timeGrid: { flexDirection: "row", gap: theme.spacing.md }, error: { color: theme.colors.error }, disabled: { opacity: 0.6 }, pressed: { opacity: 0.78 } });

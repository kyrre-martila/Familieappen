import { useCallback, useEffect, useMemo, useState } from "react";
import { Keyboard, Pressable, StyleSheet, View } from "react-native";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppText, AuthFormStack, AuthScreenShell, FormField, InlineMessage, PrimaryButton, SecondaryButton, TextButton } from "../../src/components";
import { inviteFamilyMember, listFamilies } from "../../src/features/auth/api";
import { useAuth } from "../../src/features/auth/AuthProvider";
import { parseInviteMembersTransition } from "../../src/features/auth/inviteTransition";
import { onboardingStorage } from "../../src/features/auth/onboardingStorage";
import { ApiError } from "../../src/lib/api/client";
import { theme } from "../../src/theme/tokens";

type InviteRole = "PARENT" | "CHILD" | "GUEST";
type InviteRow = { email: string; role: InviteRole };
type FormValues = { invitations: InviteRow[] };
type RowStatus = { state: "sent" | "error"; message: string };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLE_OPTIONS: { role: InviteRole; label: string; description: string }[] = [
  { role: "PARENT", label: "Foresatt", description: "Kan administrere familien og invitere andre." },
  { role: "CHILD", label: "Barn", description: "Barn i familien." },
  { role: "GUEST", label: "Gjest", description: "Begrenset tilgang for andre voksne." },
];

function rowKey(row: InviteRow) { return `${row.email.trim().toLowerCase()}|${row.role}`; }
function mapInviteError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 409) return error.message || "Denne invitasjonen finnes allerede eller personen er allerede medlem.";
    if (error.status === 400) return error.message || "Sjekk e-post og rolle.";
    if (error.status === 403) return "Du har ikke tilgang til å invitere til denne familien.";
    return error.message;
  }
  return "Kunne ikke sende invitasjonen akkurat nå.";
}

export default function InviteMembersScreen() {
  const { accessToken, user, refreshFamilyStatus, completeInviteMembersTransition } = useAuth();
  const params = useLocalSearchParams<{ familyId?: string }>();
  const [familyId, setFamilyId] = useState<string | null>(typeof params.familyId === "string" ? params.familyId : null);
  const [familyError, setFamilyError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, RowStatus>>({});
  const { control, handleSubmit, watch, setValue, formState: { errors, isSubmitting, isValid } } = useForm<FormValues>({ mode: "onChange", defaultValues: { invitations: [{ email: "", role: "PARENT" }] } });
  const { fields, append, remove } = useFieldArray({ control, name: "invitations" });
  const watchedInvitations = watch("invitations");
  const emails = watchedInvitations.map((i) => i.email.trim().toLowerCase()).filter(Boolean);
  const duplicateEmails = useMemo(() => new Set(emails.filter((email, index) => emails.indexOf(email) !== index)), [emails]);

  useEffect(() => {
    let cancelled = false;
    async function resolveFamilyId() {
      if (!accessToken) return;
      const families = await listFamilies(accessToken);
      if (cancelled) return;
      if (familyId) {
        if (!families.some((item) => item.family.id === familyId)) {
          setFamilyError("Fant ikke familien invitasjonene skulle sendes til. Fullfør onboarding og inviter senere fra familieinnstillinger.");
        }
        return;
      }
      const transition = parseInviteMembersTransition(await onboardingStorage.getInviteMembersTransitionRaw());
      if (transition && transition.userId === user?.id && families.some((item) => item.family.id === transition.familyId)) {
        setFamilyId(transition.familyId);
        return;
      }
      if (families.length === 1) setFamilyId(families[0].family.id);
      else setFamilyError("Fant ikke hvilken familie invitasjonene skal sendes til. Fullfør onboarding og inviter senere fra familieinnstillinger.");
    }
    void resolveFamilyId().catch(() => setFamilyError("Kunne ikke hente familien din akkurat nå. Fullfør onboarding og prøv senere."));
    return () => { cancelled = true; };
  }, [accessToken, familyId, user?.id]);

  const finish = useCallback(async () => {
    await completeInviteMembersTransition();
    await refreshFamilyStatus();
    router.replace("/(app)/(tabs)");
  }, [completeInviteMembersTransition, refreshFamilyStatus]);

  async function onSubmit(values: FormValues) {
    if (!accessToken) return;
    Keyboard.dismiss();
    setServerError(null);
    if (!familyId) {
      setServerError(familyError ?? "Fant ikke familien din. Hopp over og inviter senere.");
      return;
    }
    const rows = values.invitations.map((row) => ({ email: row.email.trim().toLowerCase(), role: row.role })).filter((row) => row.email);
    if (rows.length < 1) { setServerError("Legg til minst én e-postadresse, eller hopp over."); return; }
    if (rows.some((row) => row.email === user?.email.toLowerCase())) { setServerError("Du kan ikke invitere deg selv."); return; }
    if (new Set(rows.map((row) => row.email)).size !== rows.length) { setServerError("Samme e-postadresse er lagt inn flere ganger."); return; }

    let failed = 0;
    const nextStatuses = { ...statuses };
    for (const row of rows) {
      const key = rowKey(row);
      if (nextStatuses[key]?.state === "sent") continue;
      try {
        await inviteFamilyMember(accessToken, familyId, row);
        nextStatuses[key] = { state: "sent", message: "Sendt" };
        setStatuses({ ...nextStatuses });
      } catch (error) {
        failed += 1;
        nextStatuses[key] = { state: "error", message: mapInviteError(error) };
        setStatuses({ ...nextStatuses });
      }
    }
    if (failed > 0) {
      setServerError("Noen invitasjoner ble ikke sendt. Rett eller fjern radene og prøv igjen, eller hopp over for nå.");
      return;
    }
    await finish();
  }

  return <AuthScreenShell title="Inviter familiemedlemmer" lead="Send invitasjon på e-post, eller hopp over og gjør det senere.">
    <AuthFormStack accessibilityLabel="Inviter familiemedlemmer-skjema">
      {familyError ? <InlineMessage type="error">{familyError}</InlineMessage> : null}
      {fields.map((field, index) => {
        const row = watchedInvitations[index] ?? { email: "", role: "PARENT" as const };
        const status = statuses[rowKey({ email: row.email, role: row.role })];
        return <View key={field.id} style={styles.row}>
          <Controller control={control} name={`invitations.${index}.email`} rules={{ required: "Skriv inn e-postadresse.", pattern: { value: EMAIL, message: "Skriv inn en gyldig e-postadresse." }, validate: (value) => !duplicateEmails.has(value.trim().toLowerCase()) || "E-postadressen er lagt inn flere ganger." }} render={({ field: { onChange, onBlur, value } }) => <FormField label={`E-post ${index + 1}`} error={errors.invitations?.[index]?.email?.message} leadingIcon={<Ionicons name="mail-outline" size={22} color={theme.colors.textMuted} />} inputProps={{ accessibilityLabel: `E-post ${index + 1}`, autoCapitalize: "none", autoCorrect: false, keyboardType: "email-address", onBlur, onChangeText: (text) => { setServerError(null); onChange(text); }, placeholder: "navn@eksempel.no", returnKeyType: "next", value }} />} />
          <View style={styles.roleRow} accessibilityRole="radiogroup" accessibilityLabel={`Rolle for e-post ${index + 1}`}>
            {ROLE_OPTIONS.map((option) => {
              const selected = row.role === option.role;
              return <Pressable key={option.role} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => setValue(`invitations.${index}.role`, option.role, { shouldValidate: true })} style={[styles.roleButton, selected && styles.roleButtonSelected]}>
                <AppText style={[styles.roleTitle, selected && styles.roleTitleSelected]}>{option.label}</AppText>
                <AppText variant="small" style={styles.roleDescription}>{option.description}</AppText>
              </Pressable>;
            })}
          </View>
          {status ? <InlineMessage type={status.state === "sent" ? "success" : "error"}>{`Rad ${index + 1}: ${status.message}`}</InlineMessage> : null}
          {fields.length > 1 ? <TextButton title="Fjern" onPress={() => remove(index)} /> : null}
        </View>;
      })}
      {serverError ? <InlineMessage type="error">{serverError}</InlineMessage> : null}
      <SecondaryButton title="Legg til en til" onPress={() => append({ email: "", role: "PARENT" })} disabled={isSubmitting} />
      <PrimaryButton title={isSubmitting ? "Sender…" : "Send invitasjoner"} onPress={handleSubmit(onSubmit)} disabled={isSubmitting || !isValid || Boolean(familyError && !familyId)} />
      <TextButton title="Hopp over for nå" disabled={isSubmitting} onPress={finish} />
    </AuthFormStack>
  </AuthScreenShell>;
}
const styles = StyleSheet.create({
  row: { gap: theme.spacing.sm },
  roleRow: { gap: theme.spacing.xs },
  roleButton: { minHeight: 56, minWidth: 44, borderRadius: theme.radius.md, borderWidth: 1.5, borderColor: theme.colors.inputBorder, backgroundColor: theme.colors.inputBackground, padding: theme.spacing.md, gap: theme.spacing.xs },
  roleButtonSelected: { borderColor: theme.colors.primaryStrong, backgroundColor: theme.colors.primarySoft },
  roleTitle: { color: theme.colors.heading, fontWeight: "800" },
  roleTitleSelected: { color: theme.colors.primaryStrong },
  roleDescription: { color: theme.colors.textMuted },
});

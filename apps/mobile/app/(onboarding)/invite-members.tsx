import { useMemo, useState } from "react";
import { Keyboard, StyleSheet, View } from "react-native";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AuthFormStack, AuthScreenShell, FormField, InlineMessage, PrimaryButton, SecondaryButton, TextButton } from "../../src/components";
import { inviteFamilyMember } from "../../src/features/auth/api";
import { useAuth } from "../../src/features/auth/AuthProvider";
import { ApiError } from "../../src/lib/api/client";
import { theme } from "../../src/theme/tokens";

type InviteRow = { email: string; role: "PARENT" | "CHILD" | "GUEST" };
type FormValues = { invitations: InviteRow[] };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function InviteMembersScreen() {
  const { accessToken, user, refreshFamilyStatus } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { control, handleSubmit, watch, setValue, formState: { errors, isSubmitting, isValid } } = useForm<FormValues>({ mode: "onChange", defaultValues: { invitations: [{ email: "", role: "PARENT" }] } });
  const { fields, append, remove } = useFieldArray({ control, name: "invitations" });
  const emails = watch("invitations").map((i) => i.email.trim().toLowerCase()).filter(Boolean);
  const duplicateEmails = useMemo(() => new Set(emails.filter((email, index) => emails.indexOf(email) !== index)), [emails]);

  async function finish() {
    await refreshFamilyStatus();
    router.replace("/(app)/(tabs)");
  }

  async function onSubmit(values: FormValues) {
    if (!accessToken) return;
    Keyboard.dismiss();
    setServerError(null);
    setSuccess(null);
    const familyStatus = await import("../../src/features/auth/api").then((api) => api.listFamilies(accessToken));
    const familyId = familyStatus[0]?.family.id;
    if (!familyId) {
      await refreshFamilyStatus();
      setServerError("Fant ikke familien din. Prøv igjen.");
      return;
    }
    const rows = values.invitations.map((row) => ({ email: row.email.trim().toLowerCase(), role: row.role })).filter((row) => row.email);
    if (rows.length < 1) {
      setServerError("Legg til minst én e-postadresse, eller hopp over.");
      return;
    }
    if (rows.some((row) => row.email === user?.email.toLowerCase())) {
      setServerError("Du kan ikke invitere deg selv.");
      return;
    }
    if (new Set(rows.map((row) => row.email)).size !== rows.length) {
      setServerError("Samme e-postadresse er lagt inn flere ganger.");
      return;
    }
    try {
      for (const row of rows) await inviteFamilyMember(accessToken, familyId, row);
      setSuccess("Invitasjonene er sendt.");
      await finish();
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : "Kunne ikke sende invitasjoner akkurat nå. Prøv igjen.");
    }
  }

  return <AuthScreenShell title="Inviter familiemedlemmer" lead="Send invitasjon på e-post, eller hopp over og gjør det senere.">
    <AuthFormStack accessibilityLabel="Inviter familiemedlemmer-skjema">
      {fields.map((field, index) => <View key={field.id} style={styles.row}>
        <Controller control={control} name={`invitations.${index}.email`} rules={{ required: "Skriv inn e-postadresse.", pattern: { value: EMAIL, message: "Skriv inn en gyldig e-postadresse." }, validate: (value) => !duplicateEmails.has(value.trim().toLowerCase()) || "E-postadressen er lagt inn flere ganger." }} render={({ field: { onChange, onBlur, value } }) => <FormField label={`E-post ${index + 1}`} error={errors.invitations?.[index]?.email?.message} leadingIcon={<Ionicons name="mail-outline" size={22} color={theme.colors.textMuted} />} inputProps={{ accessibilityLabel: `E-post ${index + 1}`, autoCapitalize: "none", autoCorrect: false, keyboardType: "email-address", onBlur, onChangeText: (text) => { setServerError(null); onChange(text); }, placeholder: "navn@eksempel.no", returnKeyType: "next", value }} />} />
        <View style={styles.roleRow}>
          {(["PARENT", "CHILD", "GUEST"] as const).map((role) => <SecondaryButton key={role} title={role === "PARENT" ? "Voksen" : role === "CHILD" ? "Barn" : "Gjest"} onPress={() => setValue(`invitations.${index}.role`, role, { shouldValidate: true })} />)}
          {fields.length > 1 ? <TextButton title="Fjern" onPress={() => remove(index)} /> : null}
        </View>
      </View>)}
      {serverError ? <InlineMessage type="error">{serverError}</InlineMessage> : null}
      {success ? <InlineMessage type="success">{success}</InlineMessage> : null}
      <SecondaryButton title="Legg til en til" onPress={() => append({ email: "", role: "PARENT" })} disabled={isSubmitting} />
      <PrimaryButton title={isSubmitting ? "Sender…" : "Send invitasjoner"} onPress={handleSubmit(onSubmit)} disabled={isSubmitting || !isValid} />
      <TextButton title="Hopp over for nå" disabled={isSubmitting} onPress={finish} />
    </AuthFormStack>
  </AuthScreenShell>;
}
const styles = StyleSheet.create({ row: { gap: theme.spacing.sm }, roleRow: { gap: theme.spacing.xs } });

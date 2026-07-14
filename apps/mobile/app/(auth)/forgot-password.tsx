import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Link } from "expo-router";
import { AppText, Button, Card, Screen } from "../../src/components";
import { forgotPassword } from "../../src/features/auth/api";
import { GENERIC_FORGOT_PASSWORD_MESSAGE } from "../../src/features/auth/errors";
import { ApiError } from "../../src/lib/api/client";
import { theme } from "../../src/theme/tokens";

type FormValues = { email: string };

export default function ForgotPasswordScreen() {
  const [message, setMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const { control, handleSubmit, formState: { errors, isSubmitting, isValid } } = useForm<FormValues>({ mode: "onChange", defaultValues: { email: "" } });

  async function onSubmit(values: FormValues) {
    Keyboard.dismiss();
    setServerError(null);
    setMessage(null);
    try {
      await forgotPassword({ email: values.email.trim() });
      setMessage(GENERIC_FORGOT_PASSWORD_MESSAGE);
    } catch (error) {
      if (error instanceof ApiError && error.code === "network.unavailable") setServerError(error.message);
      else if (error instanceof ApiError && (error.status === 400 || error.status === 404)) setMessage(GENERIC_FORGOT_PASSWORD_MESSAGE);
      else setServerError("Kunne ikke sende forespørselen akkurat nå. Prøv igjen.");
    }
  }

  return <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", android: undefined })} style={styles.root}><Screen><AppText variant="label">FamilieAppen</AppText><AppText accessibilityRole="header" variant="title">Glemt passord?</AppText><AppText variant="lead" style={styles.muted}>Skriv inn e-postadressen din. Av sikkerhetshensyn viser vi samme melding uansett om adressen finnes.</AppText><Card accessibilityLabel="Glemt passord-skjema"><Controller control={control} name="email" rules={{ required: "E-post er påkrevd.", pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Skriv inn en gyldig e-postadresse." } }} render={({ field: { onChange, onBlur, value } }) => <View style={styles.field}><AppText variant="label">E-post</AppText><TextInput accessibilityLabel="E-postadresse" autoCapitalize="none" autoComplete="email" autoCorrect={false} editable={!isSubmitting} inputMode="email" keyboardType="email-address" onBlur={onBlur} onChangeText={(text) => { setServerError(null); onChange(text); }} onSubmitEditing={() => { if (isValid && !isSubmitting) void handleSubmit(onSubmit)(); }} placeholder="navn@eksempel.no" returnKeyType="send" style={[styles.input, errors.email && styles.inputError]} textContentType="username" value={value} />{errors.email ? <AppText accessibilityRole="alert" style={styles.error}>{errors.email.message}</AppText> : null}</View>} />{message ? <AppText accessibilityRole="alert" style={styles.successBox}>{message}</AppText> : null}{serverError ? <AppText accessibilityRole="alert" style={styles.errorBox}>{serverError}</AppText> : null}<Button accessibilityLabel="Send passordlenke" disabled={isSubmitting || !isValid} onPress={handleSubmit(onSubmit)} title={isSubmitting ? "Sender…" : "Send informasjon"} /><Link href="/(auth)/login" asChild><Pressable accessibilityRole="link"><AppText style={styles.loginLink}>Tilbake til login</AppText></Pressable></Link></Card></Screen></KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: theme.colors.background }, muted: { color: theme.colors.textMuted }, field: { gap: theme.spacing.sm }, input: { minHeight: 52, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing.md, color: theme.colors.text, fontSize: theme.typography.body }, inputError: { borderColor: theme.colors.error }, error: { color: theme.colors.error }, loginLink: { color: theme.colors.primaryStrong, fontWeight: "800", textAlign: "center" }, successBox: { borderRadius: theme.radius.md, backgroundColor: theme.colors.primarySoft, color: theme.colors.primaryStrong, padding: theme.spacing.md }, errorBox: { borderRadius: theme.radius.md, backgroundColor: theme.colors.errorSoft, color: theme.colors.error, padding: theme.spacing.md } });

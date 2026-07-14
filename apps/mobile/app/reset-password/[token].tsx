import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Keyboard, StyleSheet, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AppText, Button, Screen } from "../../src/components";
import { resetPassword } from "../../src/features/auth/api";
import { mapResetPasswordError } from "../../src/features/auth/errors";
import { getResetTokenFromParam } from "../../src/features/auth/routes";
import { theme } from "../../src/theme/tokens";

type FormValues = { password: string; confirmPassword: string };

export default function ResetPasswordScreen() {
  const { token: tokenParam } = useLocalSearchParams<{ token?: string | string[] }>();
  const token = getResetTokenFromParam(tokenParam);
  const [serverError, setServerError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { control, handleSubmit, formState: { errors, isSubmitting, isValid }, watch } = useForm<FormValues>({ mode: "onChange", defaultValues: { password: "", confirmPassword: "" } });
  const password = watch("password");

  async function onSubmit(values: FormValues) {
    if (!token) return;
    Keyboard.dismiss();
    setServerError(null);
    try {
      const response = await resetPassword({ token, password: values.password });
      setMessage(response.message || "Passordet er oppdatert. Du kan logge inn med det nye passordet.");
    } catch (error) {
      setServerError(mapResetPasswordError(error));
    }
  }

  return <Screen><AppText variant="label">FamilieAppen</AppText><AppText variant="title">Lag nytt passord</AppText><AppText variant="lead" style={{ color: theme.colors.textMuted }}>Skriv inn et nytt passord. Reset-token lagres ikke på enheten.</AppText>{!token ? <AppText accessibilityRole="alert" style={styles.errorBox}>Lenken mangler token. Be om en ny lenke.</AppText> : null}{message ? <><AppText accessibilityRole="alert" style={styles.successBox}>{message}</AppText><Button title="Til login" onPress={() => router.replace("/(auth)/login")} /></> : <View style={styles.form}><Controller control={control} name="password" rules={{ required: "Nytt passord er påkrevd.", minLength: { value: 8, message: "Passordet må være minst 8 tegn." }, maxLength: { value: 1024, message: "Passordet er for langt." } }} render={({ field: { onChange, onBlur, value } }) => <View style={styles.field}><TextInput accessibilityLabel="Nytt passord" autoCapitalize="none" autoComplete="new-password" onBlur={onBlur} onChangeText={(text) => { setServerError(null); onChange(text); }} placeholder="Nytt passord" returnKeyType="next" secureTextEntry={!showPassword} style={[styles.input, errors.password && styles.inputError]} textContentType="newPassword" value={value} /><Button title={showPassword ? "Skjul passord" : "Vis passord"} variant="ghost" onPress={() => setShowPassword((v) => !v)} />{errors.password ? <AppText accessibilityRole="alert" style={styles.error}>{errors.password.message}</AppText> : null}</View>} /><Controller control={control} name="confirmPassword" rules={{ required: "Gjenta passordet.", validate: (value) => value === password || "Passordene er ikke like." }} render={({ field: { onChange, onBlur, value } }) => <View style={styles.field}><TextInput accessibilityLabel="Gjenta nytt passord" autoCapitalize="none" autoComplete="new-password" onBlur={onBlur} onChangeText={(text) => { setServerError(null); onChange(text); }} onSubmitEditing={() => { if (isValid && !isSubmitting) void handleSubmit(onSubmit)(); }} placeholder="Gjenta nytt passord" returnKeyType="done" secureTextEntry={!showPassword} style={[styles.input, errors.confirmPassword && styles.inputError]} textContentType="newPassword" value={value} />{errors.confirmPassword ? <AppText accessibilityRole="alert" style={styles.error}>{errors.confirmPassword.message}</AppText> : null}</View>} />{serverError ? <AppText accessibilityRole="alert" style={styles.errorBox}>{serverError}</AppText> : null}<Button accessibilityLabel="Oppdater passord" disabled={!token || isSubmitting || !isValid} onPress={handleSubmit(onSubmit)} title={isSubmitting ? "Oppdaterer…" : "Oppdater passord"} /><Button title="Tilbake til login" variant="ghost" onPress={() => router.replace("/(auth)/login")} /></View>}</Screen>;
}
const styles = StyleSheet.create({ form: { gap: theme.spacing.md }, field: { gap: theme.spacing.sm }, input: { minHeight: 52, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing.md, color: theme.colors.text, fontSize: theme.typography.body }, inputError: { borderColor: theme.colors.error }, error: { color: theme.colors.error }, errorBox: { borderRadius: theme.radius.md, backgroundColor: theme.colors.errorSoft, color: theme.colors.error, padding: theme.spacing.md }, successBox: { borderRadius: theme.radius.md, backgroundColor: theme.colors.primarySoft, color: theme.colors.primaryStrong, padding: theme.spacing.md } });

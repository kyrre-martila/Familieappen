import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Keyboard, Pressable } from "react-native";
import { Link } from "expo-router";
import { AuthScreenShell, FormCard, FormField, InlineMessage, PasswordField, PrimaryButton, AppText } from "../../src/components";
import { mapAuthError } from "../../src/features/auth/errors";
import { useAuth } from "../../src/features/auth/AuthProvider";
import { theme } from "../../src/theme/tokens";

type LoginFormValues = { email: string; password: string };
export default function LoginScreen() {
  const { login, isLoggingIn, restoreError } = useAuth(); const [showPassword, setShowPassword] = useState(false); const [serverError, setServerError] = useState<string | null>(null);
  const { control, handleSubmit, formState: { errors, isSubmitting, isValid } } = useForm<LoginFormValues>({ mode: "onChange", defaultValues: { email: "", password: "" } });
  const disabled = isSubmitting || isLoggingIn || !isValid;
  async function onSubmit(values: LoginFormValues) { Keyboard.dismiss(); setServerError(null); try { await login({ email: values.email.trim(), password: values.password }); } catch (error) { setServerError(mapAuthError(error, "Kunne ikke logge inn. Kontroller e-post og passord.")); } }
  return <AuthScreenShell title="Logg inn" lead="Fortsett til familieoversikten med e-post og passord."><FormCard accessibilityLabel="Innloggingsskjema">
    <Controller control={control} name="email" rules={{ required: "E-post er påkrevd.", pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Skriv inn en gyldig e-postadresse." } }} render={({ field: { onChange, onBlur, value } }) => <FormField label="E-post" error={errors.email?.message} inputProps={{ accessibilityLabel: "E-post", autoCapitalize: "none", autoComplete: "email", autoCorrect: false, inputMode: "email", keyboardType: "email-address", onBlur, onChangeText: (text) => { setServerError(null); onChange(text); }, placeholder: "navn@eksempel.no", returnKeyType: "next", textContentType: "username", value }} />} />
    <Controller control={control} name="password" rules={{ required: "Passord er påkrevd.", minLength: { value: 8, message: "Passordet må være minst 8 tegn." } }} render={({ field: { onChange, onBlur, value } }) => <PasswordField label="Passord" visible={showPassword} onToggleVisible={() => setShowPassword((v) => !v)} error={errors.password?.message} inputProps={{ accessibilityLabel: "Passord", autoCapitalize: "none", autoComplete: "password", onBlur, onChangeText: (text) => { setServerError(null); onChange(text); }, onSubmitEditing: () => { if (!disabled) void handleSubmit(onSubmit)(); }, placeholder: "Passord", returnKeyType: "done", textContentType: "password", value }} />} />
    {restoreError ? <InlineMessage type="info">{restoreError}</InlineMessage> : null}{serverError ? <InlineMessage type="error">{serverError}</InlineMessage> : null}
    <PrimaryButton accessibilityLabel="Logg inn" disabled={disabled} onPress={handleSubmit(onSubmit)} title={isSubmitting || isLoggingIn ? "Logger inn…" : "Logg inn"} />
    <Link href="/(auth)/forgot-password" asChild><Pressable accessibilityRole="link" accessibilityLabel="Glemt passord" style={{ minHeight: 44, justifyContent: "center" }}><AppText style={{ color: theme.colors.primaryStrong, fontWeight: "800", textAlign: "center" }}>Glemt passord?</AppText></Pressable></Link>
    {isSubmitting || isLoggingIn ? <ActivityIndicator accessibilityLabel="Logger inn" color={theme.colors.primary} /> : null}
  </FormCard></AuthScreenShell>;
}

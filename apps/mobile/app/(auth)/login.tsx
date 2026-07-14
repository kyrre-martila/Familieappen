import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { AppText, Button, Card, Screen } from "../../src/components";
import { ApiError } from "../../src/lib/api/client";
import { useAuth } from "../../src/features/auth/AuthProvider";
import { theme } from "../../src/theme/tokens";

type LoginFormValues = { email: string; password: string };

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { control, handleSubmit, formState: { errors, isSubmitting, isValid } } = useForm<LoginFormValues>({ mode: "onChange", defaultValues: { email: "", password: "" } });
  const disabled = isSubmitting || isLoading || !isValid;

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    try {
      await login({ email: values.email.trim(), password: values.password });
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Kunne ikke logge inn. Prøv igjen.");
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", android: undefined })} style={styles.root}>
      <Screen>
        <AppText variant="label">FamilieAppen</AppText>
        <AppText accessibilityRole="header" variant="title">Logg inn</AppText>
        <AppText variant="lead" style={styles.muted}>Bruk e-post og passord for å fortsette til familieoversikten.</AppText>
        <Card accessibilityLabel="Innloggingsskjema">
          <Controller control={control} name="email" rules={{ required: "E-post er påkrevd.", pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Skriv inn en gyldig e-postadresse." } }} render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.field}>
              <AppText variant="label">E-post</AppText>
              <TextInput accessibilityLabel="E-post" autoCapitalize="none" autoComplete="email" autoCorrect={false} inputMode="email" keyboardType="email-address" onBlur={onBlur} onChangeText={onChange} placeholder="navn@eksempel.no" style={[styles.input, errors.email && styles.inputError]} textContentType="username" value={value} />
              {errors.email ? <AppText accessibilityRole="alert" style={styles.error}>{errors.email.message}</AppText> : null}
            </View>
          )} />
          <Controller control={control} name="password" rules={{ required: "Passord er påkrevd.", minLength: { value: 8, message: "Passordet må være minst 8 tegn." } }} render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.field}>
              <AppText variant="label">Passord</AppText>
              <View style={[styles.passwordRow, errors.password && styles.inputError]}>
                <TextInput accessibilityLabel="Passord" autoCapitalize="none" autoComplete="password" onBlur={onBlur} onChangeText={onChange} placeholder="Passord" secureTextEntry={!showPassword} style={styles.passwordInput} textContentType="password" value={value} />
                <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? "Skjul passord" : "Vis passord"} hitSlop={8} onPress={() => setShowPassword((current) => !current)}><AppText style={styles.toggle}>{showPassword ? "Skjul" : "Vis"}</AppText></Pressable>
              </View>
              {errors.password ? <AppText accessibilityRole="alert" style={styles.error}>{errors.password.message}</AppText> : null}
            </View>
          )} />
          {serverError ? <AppText accessibilityRole="alert" style={styles.errorBox}>{serverError}</AppText> : null}
          <Button accessibilityLabel="Logg inn" disabled={disabled} onPress={handleSubmit(onSubmit)} title={isSubmitting || isLoading ? "Logger inn…" : "Logg inn"} />
          {isSubmitting || isLoading ? <ActivityIndicator accessibilityLabel="Logger inn" color={theme.colors.primary} /> : null}
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: theme.colors.background }, muted: { color: theme.colors.textMuted }, field: { gap: theme.spacing.sm }, input: { minHeight: 52, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing.md, color: theme.colors.text, fontSize: theme.typography.body }, inputError: { borderColor: theme.colors.error }, passwordRow: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing.md }, passwordInput: { flex: 1, color: theme.colors.text, fontSize: theme.typography.body }, toggle: { color: theme.colors.primaryStrong, fontWeight: "800" }, error: { color: theme.colors.error }, errorBox: { borderRadius: theme.radius.md, backgroundColor: theme.colors.errorSoft, color: theme.colors.error, padding: theme.spacing.md } });

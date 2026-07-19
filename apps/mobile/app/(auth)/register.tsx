import { PASSWORD_POLICY, getPasswordValidationMessage } from "@familieappen/shared/auth/password-policy";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  AppText,
  AuthFormStack,
  AuthScreenShell,
  FormField,
  InlineMessage,
  PasswordField,
  PrimaryButton,
} from "../../src/components";
import { mapAuthError } from "../../src/features/auth/errors";
import { useAuth } from "../../src/features/auth/AuthProvider";
import { theme } from "../../src/theme/tokens";

type FormValues = {
  email: string;
  password: string;
  confirmPassword: string;
  terms: boolean;
};
export default function RegisterScreen() {
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isValid },
  } = useForm<FormValues>({
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  });
  const password = watch("password");
  async function onSubmit(values: FormValues) {
    Keyboard.dismiss();
    setServerError(null);
    try {
      await register({
        name: "",
        email: values.email.trim(),
        password: values.password,
      });
    } catch (error) {
      setServerError(mapAuthError(error, "Noe gikk galt. Prøv igjen."));
    }
  }
  return (
    <AuthScreenShell
      title="Registrer deg"
      lead="Lag din konto for å komme i gang."
    >
      <AuthFormStack accessibilityLabel="Registreringsskjema">
        <Controller
          control={control}
          name="email"
          rules={{
            required: "Skriv inn e-postadressen din.",
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: "Skriv inn en gyldig e-postadresse.",
            },
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <FormField
              label="E-postadresse"
              error={errors.email?.message}
              leadingIcon={
                <Ionicons
                  name="mail-outline"
                  size={22}
                  color={theme.colors.textMuted}
                />
              }
              inputProps={{
                accessibilityLabel: "E-postadresse",
                autoCapitalize: "none",
                autoComplete: "email",
                autoCorrect: false,
                keyboardType: "email-address",
                onBlur,
                onChangeText: (text) => {
                  setServerError(null);
                  onChange(text);
                },
                placeholder: "Skriv inn e-postadressen din",
                returnKeyType: "next",
                textContentType: "username",
                value,
              }}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          rules={{
            required: "Lag et passord.",
            validate: (value) => getPasswordValidationMessage(value) || true,
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <PasswordField
              label="Passord"
              visible={showPassword}
              onToggleVisible={() => setShowPassword((v) => !v)}
              error={errors.password?.message}
              leadingIcon={
                <Ionicons
                  name="lock-closed-outline"
                  size={22}
                  color={theme.colors.textMuted}
                />
              }
              inputProps={{
                accessibilityLabel: "Passord",
                autoCapitalize: "none",
                autoComplete: "new-password",
                onBlur,
                onChangeText: (text) => {
                  setServerError(null);
                  onChange(text);
                },
                placeholder: "Lag et passord",
                returnKeyType: "next",
                textContentType: "newPassword",
                value,
              }}
            />
          )}
        />
        <AppText variant="small" style={styles.helper}>
          {PASSWORD_POLICY.helperText}
        </AppText>
        <Controller
          control={control}
          name="confirmPassword"
          rules={{
            required: "Gjenta passordet ditt.",
            validate: (value) =>
              value === password || "Passordene må være like.",
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <PasswordField
              label="Bekreft passord"
              visible={showPassword}
              onToggleVisible={() => setShowPassword((v) => !v)}
              error={errors.confirmPassword?.message}
              inputProps={{
                accessibilityLabel: "Bekreft passord",
                autoCapitalize: "none",
                autoComplete: "new-password",
                onBlur,
                onChangeText: (text) => {
                  setServerError(null);
                  onChange(text);
                },
                placeholder: "Gjenta passordet ditt",
                returnKeyType: "done",
                secureTextEntry: !showPassword,
                textContentType: "newPassword",
                value,
              }}
            />
          )}
        />
        <Controller
          control={control}
          name="terms"
          rules={{
            validate: (value) =>
              value ||
              "Du må godta vilkår og personvernerklæring for å fortsette.",
          }}
          render={({ field: { onChange, value } }) => (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: value }}
              onPress={() => onChange(!value)}
              style={styles.terms}
            >
              <Ionicons
                name={value ? "checkbox" : "square-outline"}
                size={24}
                color={theme.colors.primaryStrong}
              />
              <AppText style={styles.termsText}>
                Jeg godtar vilkår og personvernerklæring
              </AppText>
            </Pressable>
          )}
        />
        <View style={styles.legalLinks}>
          <Link href="/(auth)/terms" asChild><Pressable accessibilityRole="link" style={styles.link}><AppText style={styles.linkText}>Les vilkår</AppText></Pressable></Link>
          <Link href="/(auth)/privacy" asChild><Pressable accessibilityRole="link" style={styles.link}><AppText style={styles.linkText}>Les personvern</AppText></Pressable></Link>
        </View>
        {errors.terms?.message ? (
          <InlineMessage type="error">{errors.terms.message}</InlineMessage>
        ) : null}
        {serverError ? (
          <InlineMessage type="error">{serverError}</InlineMessage>
        ) : null}
        <PrimaryButton
          accessibilityLabel="Opprett konto"
          disabled={isSubmitting || !isValid}
          onPress={handleSubmit(onSubmit)}
          title={isSubmitting ? "Oppretter konto…" : "Opprett konto"}
        />
        {isSubmitting ? (
          <ActivityIndicator accessibilityLabel="Oppretter konto" />
        ) : null}
        <View style={styles.loginRow}>
          <AppText>Har du allerede en konto?</AppText>
          <Link href="/(auth)/login" asChild>
            <Pressable accessibilityRole="link" style={styles.link}>
              <AppText style={styles.linkText}>Logg inn</AppText>
            </Pressable>
          </Link>
        </View>
      </AuthFormStack>
    </AuthScreenShell>
  );
}
const styles = StyleSheet.create({
  helper: { color: theme.colors.textMuted, marginTop: -theme.spacing.sm },
  terms: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  termsText: { flex: 1, color: theme.colors.text },
  legalLinks: { flexDirection: "row", justifyContent: "center", gap: theme.spacing.md, flexWrap: "wrap" },
  loginRow: {
    minHeight: 44,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  link: { minHeight: 44, justifyContent: "center" },
  linkText: {
    color: theme.colors.primaryStrong,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
});

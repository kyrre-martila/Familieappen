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

type LoginFormValues = { email: string; password: string };

export default function LoginScreen() {
  const { login, isLoggingIn, restoreError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<LoginFormValues>({
    mode: "onChange",
    defaultValues: { email: "", password: "" },
  });
  const disabled = isSubmitting || isLoggingIn || !isValid;

  async function onSubmit(values: LoginFormValues) {
    Keyboard.dismiss();
    setServerError(null);
    try {
      await login({ email: values.email.trim(), password: values.password });
    } catch (error) {
      setServerError(
        mapAuthError(
          error,
          "Kunne ikke logge inn. Kontroller e-post og passord.",
        ),
      );
    }
  }

  return (
    <AuthScreenShell
      title="Velkommen tilbake"
      lead="Logg inn for å fortsette med familien din."
    >
      <AuthFormStack accessibilityLabel="Innloggingsskjema">
        <Controller
          control={control}
          name="email"
          rules={{
            required: "E-post er påkrevd.",
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
                  aria-hidden
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
                inputMode: "email",
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
        <View style={styles.passwordBlock}>
          <Controller
            control={control}
            name="password"
            rules={{
              required: "Passord er påkrevd.",
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <PasswordField
                label="Passord"
                visible={showPassword}
                onToggleVisible={() => setShowPassword((v) => !v)}
                error={errors.password?.message}
                leadingIcon={
                  <Ionicons
                    aria-hidden
                    name="lock-closed-outline"
                    size={22}
                    color={theme.colors.textMuted}
                  />
                }
                inputProps={{
                  accessibilityLabel: "Passord",
                  autoCapitalize: "none",
                  autoComplete: "current-password",
                  onBlur,
                  onChangeText: (text) => {
                    setServerError(null);
                    onChange(text);
                  },
                  onSubmitEditing: () => {
                    if (!disabled) void handleSubmit(onSubmit)();
                  },
                  placeholder: "Skriv inn passordet ditt",
                  returnKeyType: "done",
                  textContentType: "password",
                  value,
                }}
              />
            )}
          />
          <Link href="/(auth)/forgot-password" asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Glemt passord"
              style={styles.forgotLink}
            >
              <AppText style={styles.forgotText}>Glemt passord?</AppText>
            </Pressable>
          </Link>
        </View>
        {restoreError ? (
          <InlineMessage type="info">{restoreError}</InlineMessage>
        ) : null}
        {serverError ? (
          <InlineMessage type="error">{serverError}</InlineMessage>
        ) : null}
        <PrimaryButton
          accessibilityLabel="Logg inn"
          disabled={disabled}
          onPress={handleSubmit(onSubmit)}
          title={isSubmitting || isLoggingIn ? "Logger inn…" : "Logg inn"}
        />
        {isSubmitting || isLoggingIn ? (
          <ActivityIndicator
            accessibilityLabel="Logger inn"
            color={theme.colors.primaryStrong}
          />
        ) : null}
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.divider}
        >
          <View style={styles.dividerLine} />
          <AppText style={styles.dividerText}>eller</AppText>
          <View style={styles.dividerLine} />
        </View>
        <View style={styles.registerRow}>
          <AppText style={styles.registerText}>Har du ikke konto?</AppText>
          <Link href="/(auth)/register" asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Registrer deg"
              style={styles.registerLink}
            >
              <AppText style={styles.registerLinkText}>Registrer deg</AppText>
            </Pressable>
          </Link>
        </View>
      </AuthFormStack>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  passwordBlock: { gap: theme.spacing.xs },
  forgotLink: {
    minHeight: 44,
    alignSelf: "flex-end",
    justifyContent: "center",
    paddingLeft: theme.spacing.md,
  },
  forgotText: {
    color: theme.colors.primaryStrong,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  divider: {
    width: "82%",
    maxWidth: 384,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.inputBorder,
  },
  dividerText: { color: theme.colors.textMuted, fontWeight: "500" },
  registerRow: {
    minHeight: 44,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    columnGap: theme.spacing.xs,
  },
  registerText: { color: theme.colors.text, fontWeight: "500" },
  registerLink: { minHeight: 44, justifyContent: "center" },
  registerLinkText: {
    color: theme.colors.textMuted,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
});

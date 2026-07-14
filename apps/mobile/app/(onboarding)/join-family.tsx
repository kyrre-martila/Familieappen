import { useMemo, useState } from "react";
import { Keyboard, StyleSheet, View } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  AppText,
  AuthFormStack,
  AuthScreenShell,
  FormField,
  InlineMessage,
  OnboardingHero,
  PrimaryButton,
  SecondaryButton,
  StatusCard,
  TextButton,
} from "../../src/components";
import { joinFamilyByCode } from "../../src/features/auth/api";
import { useAuth } from "../../src/features/auth/AuthProvider";
import { onboardingStorage } from "../../src/features/auth/onboardingStorage";
import { ApiError } from "../../src/lib/api/client";
import { appAssets } from "../../src/theme/assets";
import { theme } from "../../src/theme/tokens";
type FormValues = { code: string };
function normalize(v: string) {
  return v.trim().toUpperCase().replace(/\s+/g, "");
}
export default function JoinFamilyScreen() {
  const { accessToken } = useAuth();
  const [found, setFound] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting, isValid },
  } = useForm<FormValues>({ mode: "onChange", defaultValues: { code: "" } });
  const normalized = useMemo(() => normalize(watch("code")), [watch]);
  async function onSubmit() {
    if (!accessToken) return;
    Keyboard.dismiss();
    if (!normalized) {
      setServerError("Skriv inn familiekoden du har fått tilsendt.");
      return;
    }
    try {
      await joinFamilyByCode(accessToken, normalized);
      setServerError(null);
      setFound(true);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404)
        setServerError(
          "Vi fant ikke en familie med denne koden. Sjekk koden og prøv igjen.",
        );
      else if (e instanceof ApiError && e.status === 409)
        setServerError("Du er allerede medlem av denne familien.");
      else
        setServerError(
          "Kunne ikke sende forespørselen akkurat nå. Prøv igjen.",
        );
    }
  }
  if (found)
    return (
      <AuthScreenShell
        title="Forespørsel sendt"
        lead="Administrator må godkjenne deg før du får tilgang."
      >
        <AuthFormStack>
          <OnboardingHero source={appAssets.familyFound} label="" />
          <StatusCard>
            <AppText variant="heading" style={styles.center}>
              Familie funnet
            </AppText>
            <View style={styles.divider} />
            <AppText style={styles.center}>
              Administrator må godkjenne forespørselen din før du får tilgang.
            </AppText>
          </StatusCard>
          <PrimaryButton
            title="Gå videre"
            onPress={async () => {
              await onboardingStorage.savePendingFamilyRequest(normalized);
              router.replace("/(onboarding)/pending-approval");
            }}
          />
          <SecondaryButton
            title="Bruk en annen kode"
            onPress={() => {
              setFound(false);
              reset({ code: "" });
              setServerError(null);
            }}
          />
        </AuthFormStack>
      </AuthScreenShell>
    );
  return (
    <AuthScreenShell
      title="Skriv inn familiekode"
      lead="Bruk koden du har fått for å be om tilgang til familien."
    >
      <AuthFormStack accessibilityLabel="Familiekode-skjema">
        <Controller
          control={control}
          name="code"
          rules={{ required: "Skriv inn familiekoden du har fått tilsendt." }}
          render={({ field: { onChange, onBlur, value } }) => (
            <FormField
              label="Familiekode"
              error={errors.code?.message}
              leadingIcon={
                <Ionicons
                  name="key-outline"
                  size={22}
                  color={theme.colors.textMuted}
                />
              }
              inputProps={{
                accessibilityLabel: "Familiekode",
                autoCapitalize: "characters",
                autoCorrect: false,
                onBlur,
                onChangeText: (t) => {
                  setServerError(null);
                  onChange(t);
                },
                placeholder: "FAMILIE-1234",
                returnKeyType: "send",
                value,
              }}
            />
          )}
        />
        {serverError ? (
          <InlineMessage type="error">{serverError}</InlineMessage>
        ) : null}
        <PrimaryButton
          disabled={isSubmitting || !isValid}
          onPress={handleSubmit(onSubmit)}
          title={isSubmitting ? "Sjekker kode…" : "Sjekk kode"}
        />
        <TextButton
          title="Tilbake"
          onPress={() => router.push("/(onboarding)/family-start")}
        />
      </AuthFormStack>
    </AuthScreenShell>
  );
}
const styles = StyleSheet.create({
  center: { textAlign: "center", color: theme.colors.text },
  divider: {
    height: 1,
    width: "100%",
    backgroundColor: theme.colors.inputBorder,
    marginVertical: theme.spacing.sm,
  },
});

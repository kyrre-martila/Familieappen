import { useState } from "react";
import { Keyboard } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  AuthFormStack,
  AuthScreenShell,
  FormField,
  InlineMessage,
  PrimaryButton,
  TextButton,
  AppText,
} from "../../src/components";
import { createFamily, getFamily } from "../../src/features/auth/api";
import { useAuth } from "../../src/features/auth/AuthProvider";
import { ApiError } from "../../src/lib/api/client";
import { theme } from "../../src/theme/tokens";
type FormValues = { familyName: string };
export default function CreateFamilyScreen() {
  const { accessToken, refreshFamilyStatus } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<FormValues>({
    mode: "onChange",
    defaultValues: { familyName: "" },
  });
  async function onSubmit(v: FormValues) {
    if (!accessToken) return;
    Keyboard.dismiss();
    const name = v.familyName.trim();
    if (!name) {
      setServerError("Skriv inn et familienavn.");
      return;
    }
    try {
      const created = await createFamily(accessToken, { name });
      if (!created.family.code) await getFamily(accessToken, created.family.id);
      await refreshFamilyStatus();
      router.replace("/(app)/(tabs)");
    } catch (e) {
      setServerError(
        e instanceof ApiError
          ? e.message
          : "Kunne ikke opprette familien akkurat nå. Prøv igjen.",
      );
    }
  }
  return (
    <AuthScreenShell
      title="Opprett familien din"
      lead="Gi familien et navn og inviter medlemmer senere."
    >
      <AuthFormStack accessibilityLabel="Opprett familie-skjema">
        <Controller
          control={control}
          name="familyName"
          rules={{ required: "Skriv inn et familienavn." }}
          render={({ field: { onChange, onBlur, value } }) => (
            <FormField
              label="Familienavn *"
              error={errors.familyName?.message}
              leadingIcon={
                <Ionicons
                  name="home-outline"
                  size={22}
                  color={theme.colors.textMuted}
                />
              }
              inputProps={{
                accessibilityLabel: "Familienavn",
                autoComplete: "organization",
                onBlur,
                onChangeText: (t) => {
                  setServerError(null);
                  onChange(t);
                },
                placeholder: "F.eks. Familien Hansen",
                returnKeyType: "done",
                value,
              }}
            />
          )}
        />
        <AppText variant="small" style={{ color: theme.colors.textMuted }}>
          Du kan endre dette senere.
        </AppText>
        {serverError ? (
          <InlineMessage type="error">{serverError}</InlineMessage>
        ) : null}
        <PrimaryButton
          disabled={isSubmitting || !isValid}
          onPress={handleSubmit(onSubmit)}
          title={isSubmitting ? "Oppretter familie…" : "Opprett familie"}
        />
        <TextButton
          title="Tilbake"
          onPress={() => router.push("/(onboarding)/family-start")}
        />
      </AuthFormStack>
    </AuthScreenShell>
  );
}

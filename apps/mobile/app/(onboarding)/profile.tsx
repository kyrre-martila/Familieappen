import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Keyboard, StyleSheet, View } from "react-native";
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
import { updateCurrentUserProfile } from "../../src/features/auth/api";
import { useAuth } from "../../src/features/auth/AuthProvider";
import { onboardingStorage } from "../../src/features/auth/onboardingStorage";
import { ApiError } from "../../src/lib/api/client";
import { theme } from "../../src/theme/tokens";

type FormValues = {
  firstName: string;
  middleName: string;
  lastName: string;
  phoneNumber: string;
  birthDate: string;
};
const NORWAY = "+47";
export default function ProfileScreen() {
  const { accessToken } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    control,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<FormValues>({
    mode: "onChange",
    defaultValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      phoneNumber: "",
      birthDate: "",
    },
  });
  useEffect(() => {
    void onboardingStorage.getProfileDraft().then((d) => {
      if (d) reset(d);
    });
  }, [reset]);
  async function onSubmit(v: FormValues) {
    if (!accessToken) return;
    Keyboard.dismiss();
    setServerError(null);
    const trimmed = {
      firstName: v.firstName.trim(),
      middleName: v.middleName.trim(),
      lastName: v.lastName.trim(),
      phoneNumber: v.phoneNumber.trim(),
      birthDate: v.birthDate,
    };
    if (
      !trimmed.firstName ||
      !trimmed.lastName ||
      !trimmed.phoneNumber ||
      !trimmed.birthDate
    ) {
      setServerError("Fyll ut feltene som er merket med stjerne.");
      return;
    }
    try {
      await updateCurrentUserProfile(accessToken, {
        firstName: trimmed.firstName,
        middleName: trimmed.middleName || null,
        lastName: trimmed.lastName,
        phone: `${NORWAY} ${trimmed.phoneNumber}`.trim(),
      });
      await onboardingStorage.saveProfileDraft(trimmed);
      router.push("/(onboarding)/family-start");
    } catch (e) {
      setServerError(
        e instanceof ApiError
          ? e.message
          : "Kunne ikke lagre profilen akkurat nå. Prøv igjen.",
      );
    }
  }
  return (
    <AuthScreenShell title="Fortell litt om deg selv" lead="">
      <AuthFormStack accessibilityLabel="Profilskjema">
        <View accessible={false} style={styles.avatar}>
          <Ionicons
            name="person-outline"
            size={48}
            color={theme.colors.primaryStrong}
          />
          <AppText style={styles.photo}>Legg til bilde (anbefalt)</AppText>
        </View>
        {(
          [
            ["firstName", "Fornavn *", "Skriv inn fornavn", "givenName"],
            ["middleName", "Mellomnavn", "Skriv inn mellomnavn", "middleName"],
            ["lastName", "Etternavn *", "Skriv inn etternavn", "familyName"],
          ] as const
        ).map(([name, label, placeholder]) => (
          <Controller
            key={name}
            control={control}
            name={name}
            rules={
              name === "middleName"
                ? undefined
                : { required: "Fyll ut feltene som er merket med stjerne." }
            }
            render={({ field: { onChange, onBlur, value } }) => (
              <FormField
                label={label}
                error={errors[name]?.message}
                leadingIcon={
                  <Ionicons
                    name="person-outline"
                    size={22}
                    color={theme.colors.textMuted}
                  />
                }
                inputProps={{
                  accessibilityLabel: label,
                  autoComplete:
                    name === "firstName"
                      ? "given-name"
                      : name === "lastName"
                        ? "family-name"
                        : "additional-name",
                  onBlur,
                  onChangeText: (t) => {
                    setServerError(null);
                    onChange(t);
                  },
                  placeholder,
                  returnKeyType: "next",
                  value,
                }}
              />
            )}
          />
        ))}
        <Controller
          control={control}
          name="phoneNumber"
          rules={{ required: "Fyll ut feltene som er merket med stjerne." }}
          render={({ field: { onChange, onBlur, value } }) => (
            <FormField
              label="Telefonnummer *"
              error={errors.phoneNumber?.message}
              leadingIcon={
                <Ionicons
                  name="call-outline"
                  size={22}
                  color={theme.colors.textMuted}
                />
              }
              inputProps={{
                accessibilityLabel: "Telefonnummer",
                autoComplete: "tel",
                keyboardType: "phone-pad",
                onBlur,
                onChangeText: (t) => {
                  setServerError(null);
                  onChange(t);
                },
                placeholder: "Skriv inn telefonnummer",
                value,
              }}
            />
          )}
        />
        <Controller
          control={control}
          name="birthDate"
          rules={{ required: "Fyll ut feltene som er merket med stjerne." }}
          render={({ field: { onChange, onBlur, value } }) => (
            <FormField
              label="Fødselsdato *"
              error={errors.birthDate?.message}
              leadingIcon={
                <Ionicons
                  name="calendar-outline"
                  size={22}
                  color={theme.colors.textMuted}
                />
              }
              inputProps={{
                accessibilityLabel: "Fødselsdato",
                autoComplete: "birthdate-full",
                onBlur,
                onChangeText: (t) => {
                  setServerError(null);
                  onChange(t);
                },
                placeholder: "ÅÅÅÅ-MM-DD",
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
          title={isSubmitting ? "Lagrer…" : "Fortsett"}
        />
        <TextButton title="Tilbake" onPress={() => router.back()} />
      </AuthFormStack>
    </AuthScreenShell>
  );
}
const styles = StyleSheet.create({
  avatar: { alignItems: "center", gap: theme.spacing.sm },
  photo: { color: theme.colors.primaryStrong, fontWeight: "800" },
});

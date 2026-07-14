import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Image, Keyboard, Pressable, StyleSheet, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
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
import { removeCurrentUserAvatar, updateCurrentUserProfile, uploadCurrentUserAvatar } from "../../src/features/auth/api";
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
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export default function ProfileScreen() {
  const { accessToken, user, setCurrentUser } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatarUrl ?? null);
  const [avatarAsset, setAvatarAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
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

  async function pickAvatar() {
    if (!accessToken || avatarBusy) return;
    setServerError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setServerError("Gi tilgang til bildebiblioteket for å velge profilbilde.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
      mediaTypes: ["images"],
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? "image/jpeg";
    if (!ALLOWED_AVATAR_TYPES.has(mimeType)) {
      setServerError("Profilbildet må være JPEG, PNG eller WebP.");
      return;
    }
    if (typeof asset.fileSize === "number" && asset.fileSize > MAX_AVATAR_BYTES) {
      setServerError("Profilbildet er for stort. Velg et bilde under 2 MB.");
      return;
    }
    setAvatarAsset(asset);
    setAvatarUri(asset.uri);
  }

  async function removeAvatar() {
    if (!accessToken || avatarBusy) return;
    setAvatarBusy(true);
    setServerError(null);
    try {
      const updated = await removeCurrentUserAvatar(accessToken);
      setCurrentUser(updated);
      setAvatarAsset(null);
      setAvatarUri(null);
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : "Kunne ikke fjerne profilbildet akkurat nå.");
    } finally {
      setAvatarBusy(false);
    }
  }

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
      !trimmed.lastName
    ) {
      setServerError("Fyll ut feltene som er merket med stjerne.");
      return;
    }
    try {
      const updatedProfile = await updateCurrentUserProfile(accessToken, {
        firstName: trimmed.firstName,
        middleName: trimmed.middleName || null,
        lastName: trimmed.lastName,
        phone: trimmed.phoneNumber ? `${NORWAY} ${trimmed.phoneNumber}`.trim() : null,
      });
      let finalUser = updatedProfile;
      if (avatarAsset) {
        setAvatarBusy(true);
        const mimeType = avatarAsset.mimeType ?? "image/jpeg";
        if (!ALLOWED_AVATAR_TYPES.has(mimeType)) throw new ApiError("Profilbildet må være JPEG, PNG eller WebP.", 400, "avatar.invalid_type");
        if (typeof avatarAsset.fileSize === "number" && avatarAsset.fileSize > MAX_AVATAR_BYTES) throw new ApiError("Profilbildet er for stort. Velg et bilde under 2 MB.", 413, "avatar.too_large");
        const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
        const safeName = avatarAsset.fileName && /^[^/\\]+\.(jpe?g|png|webp)$/i.test(avatarAsset.fileName) ? avatarAsset.fileName : `avatar.${ext}`;
        finalUser = await uploadCurrentUserAvatar(accessToken, { uri: avatarAsset.uri, name: safeName, type: mimeType });
      }
      setCurrentUser(finalUser);
      await onboardingStorage.clearProfileDraft();
      router.push("/(onboarding)/family-start");
    } catch (e) {
      setServerError(
        e instanceof ApiError
          ? e.message
          : "Kunne ikke lagre profilen akkurat nå. Prøv igjen.",
      );
    } finally {
      setAvatarBusy(false);
    }
  }
  return (
    <AuthScreenShell title="Fortell litt om deg selv" lead="">
      <AuthFormStack accessibilityLabel="Profilskjema">
        <View accessible={false} style={styles.avatar}>
          {avatarUri ? <Image source={{ uri: avatarUri }} style={styles.avatarImage} /> : <Ionicons name="person-outline" size={48} color={theme.colors.primaryStrong} />}
          <Pressable accessibilityRole="button" onPress={pickAvatar} disabled={avatarBusy} style={styles.photoButton}><AppText style={styles.photo}>{avatarUri ? "Bytt bilde" : "Legg til bilde (anbefalt)"}</AppText></Pressable>
          {avatarUri ? <TextButton title="Fjern bilde" onPress={removeAvatar} disabled={avatarBusy} /> : null}
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
          render={({ field: { onChange, onBlur, value } }) => (
            <FormField
              label="Telefonnummer"
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
          render={({ field: { onChange, onBlur, value } }) => (
            <FormField
              label="Fødselsdato"
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
  avatarImage: { width: 96, height: 96, borderRadius: 48, backgroundColor: theme.colors.inputBackground },
  photoButton: { minHeight: 44, justifyContent: "center" },
  photo: { color: theme.colors.primaryStrong, fontWeight: "800" },
});

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Keyboard, Platform, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AuthFormStack, AuthScreenShell, FormField, InlineMessage, PrimaryButton, TextButton, AppText } from "../../src/components";
import { removeCurrentUserAvatar, updateCurrentUserProfile, uploadCurrentUserAvatar } from "../../src/features/auth/api";
import { useAuth } from "../../src/features/auth/AuthProvider";
import { onboardingStorage } from "../../src/features/auth/onboardingStorage";
import { birthDatePartsFromDate, birthDatePartsToLocalDate, formatBirthDateForApi, formatBirthDateForDisplay, formatNorwegianPhoneForApi, getAvatarPreviewUri, isFutureBirthDate, normalizeNorwegianPhoneNational, parseBirthDateFromApi, parsePhoneFromApi, type BirthDateParts } from "../../src/features/auth/profile/profileValidation";
import { ApiError } from "../../src/lib/api/client";
import { theme } from "../../src/theme/tokens";

type FormValues = { firstName: string; middleName: string; lastName: string; phoneNumber: string; birthDate: BirthDateParts | null };
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export default function ProfileScreen() {
  const { accessToken, user, setCurrentUser } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverAvatarUri, setServerAvatarUri] = useState<string | null>(user?.avatarUrl ?? null);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const [avatarAsset, setAvatarAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [avatarRetryOnly, setAvatarRetryOnly] = useState(false);
  const avatarUri = getAvatarPreviewUri(localAvatarUri, serverAvatarUri);
  const { control, reset, handleSubmit, getValues, formState: { errors, isSubmitting, isValid } } = useForm<FormValues>({
    mode: "onChange",
    defaultValues: { firstName: "", middleName: "", lastName: "", phoneNumber: "", birthDate: null },
  });

  useEffect(() => {
    setServerAvatarUri(user?.avatarUrl ?? null);
    void onboardingStorage.getProfileDraft().then((draft) => {
      const phone = parsePhoneFromApi(user?.phone ?? null);
      const backendBirthDate = parseBirthDateFromApi(user?.birthDate ?? null);
      reset({
        firstName: user?.firstName || draft?.firstName || "",
        middleName: user?.middleName ?? draft?.middleName ?? "",
        lastName: user?.lastName || draft?.lastName || "",
        phoneNumber: user?.phone ? phone.nationalNumber : draft?.phoneNumber ?? "",
        birthDate: backendBirthDate ?? parseBirthDateFromApi(draft?.birthDate ?? null),
      });
    });
  }, [reset, user]);

  async function pickAvatar() {
    if (!accessToken || isSubmitting) return;
    setServerError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setServerError("Gi tilgang til bildebiblioteket for å velge profilbilde."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.85, mediaTypes: ["images"] });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? (asset.uri.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg");
    if (!asset.uri) { setServerError("Kunne ikke lese bildet lokalt. Prøv et annet bilde."); return; }
    if (!ALLOWED_AVATAR_TYPES.has(mimeType)) { setServerError("Profilbildet må være JPEG, PNG, WebP eller HEIC."); return; }
    if (typeof asset.fileSize === "number" && asset.fileSize > MAX_AVATAR_BYTES) { setServerError("Profilbildet er for stort. Velg et bilde under 2 MB."); return; }
    setAvatarAsset({ ...asset, mimeType });
    setLocalAvatarUri(asset.uri);
    setAvatarRetryOnly(false);
  }

  function removeAvatar() {
    setAvatarAsset(null);
    setLocalAvatarUri(null);
    setServerAvatarUri(null);
  }

  async function uploadAvatarOnly() {
    if (!accessToken || !avatarAsset) return null;
    const mimeType = avatarAsset.mimeType ?? "image/jpeg";
    const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : mimeType.includes("hei") ? "heic" : "jpg";
    const safeName = avatarAsset.fileName && /^[^/\\]+\.(jpe?g|png|webp|heic|heif)$/i.test(avatarAsset.fileName) ? avatarAsset.fileName : `avatar.${ext}`;
    return uploadCurrentUserAvatar(accessToken, { uri: avatarAsset.uri, name: safeName, type: mimeType });
  }

  async function onSubmit(v: FormValues) {
    if (!accessToken || isSubmitting) return;
    Keyboard.dismiss(); setServerError(null);
    const firstName = v.firstName.trim(), middleName = v.middleName.trim(), lastName = v.lastName.trim();
    const phone = normalizeNorwegianPhoneNational(v.phoneNumber);
    if (!firstName || !lastName) { setServerError("Fyll ut feltene som er merket med stjerne."); return; }
    if (phone.error) { setServerError(phone.error); return; }
    if (v.birthDate && isFutureBirthDate(v.birthDate)) { setServerError("Fødselsdato kan ikke være i fremtiden."); return; }
    const payload = { firstName, middleName: middleName || null, lastName, phone: formatNorwegianPhoneForApi(v.phoneNumber), birthDate: formatBirthDateForApi(v.birthDate) };
    try {
      let finalUser = avatarRetryOnly ? user : await updateCurrentUserProfile(accessToken, payload);
      await onboardingStorage.saveProfileDraft({ firstName, middleName, lastName, phoneNumber: phone.value, birthDate: payload.birthDate ?? "" });
      if (!avatarAsset && user?.avatarUrl && serverAvatarUri === null) {
        finalUser = await removeCurrentUserAvatar(accessToken);
      }
      if (avatarAsset) {
        try { finalUser = await uploadAvatarOnly(); setAvatarAsset(null); setLocalAvatarUri(null); setAvatarRetryOnly(false); }
        catch { if (finalUser) setCurrentUser(finalUser); setAvatarRetryOnly(true); setServerError("Profilen ble lagret, men bildet kunne ikke lastes opp. Prøv å lagre bildet på nytt."); return; }
      }
      if (finalUser) setCurrentUser(finalUser);
      await onboardingStorage.clearProfileDraft();
      router.push("/(onboarding)/family-start");
    } catch (e) { setServerError(e instanceof ApiError ? e.message : "Kunne ikke lagre profilen akkurat nå. Prøv igjen."); }
  }

  const selectedDate = useMemo(() => birthDatePartsToLocalDate(getValues("birthDate") ?? { year: 1990, month: 1, day: 1 }), [getValues]);

  return <AuthScreenShell title="Fortell litt om deg selv" lead=""><AuthFormStack accessibilityLabel="Profilskjema">
    <View accessible={false} style={styles.avatar}>{avatarUri ? <Image source={{ uri: avatarUri }} style={styles.avatarImage} contentFit="cover" onError={() => setServerError("Kunne ikke vise bildet lokalt. Prøv et annet bilde.")} /> : <Ionicons name="person-outline" size={48} color={theme.colors.primaryStrong} />}<Pressable accessibilityRole="button" onPress={pickAvatar} disabled={isSubmitting} style={styles.photoButton}><AppText style={styles.photo}>{avatarUri ? "Bytt bilde" : "Legg til bilde (anbefalt)"}</AppText></Pressable>{avatarUri ? <TextButton title="Fjern bilde" onPress={removeAvatar} disabled={isSubmitting} /> : null}</View>
    {([ ["firstName", "Fornavn *", "Skriv inn fornavn"], ["middleName", "Mellomnavn", "Skriv inn mellomnavn"], ["lastName", "Etternavn *", "Skriv inn etternavn"] ] as const).map(([name,label,placeholder]) => <Controller key={name} control={control} name={name} rules={name === "middleName" ? undefined : { required: "Fyll ut feltene som er merket med stjerne." }} render={({ field: { onChange, onBlur, value } }) => <FormField label={label} error={errors[name]?.message} leadingIcon={<Ionicons name="person-outline" size={22} color={theme.colors.textMuted} />} inputProps={{ accessibilityLabel: label, autoComplete: name === "firstName" ? "given-name" : name === "lastName" ? "family-name" : "additional-name", onBlur, onChangeText: (t) => { setServerError(null); onChange(t); }, placeholder, returnKeyType: "next", value }} />} />)}
    <Controller control={control} name="phoneNumber" rules={{ validate: (value) => normalizeNorwegianPhoneNational(value).error ?? true }} render={({ field: { onChange, onBlur, value } }) => <FormField label="Telefonnummer" error={errors.phoneNumber?.message} leadingIcon={<AppText style={styles.countryCode}>+47</AppText>} inputProps={{ accessibilityLabel: "Telefonnummer, norsk landskode pluss førtisju", autoComplete: "tel-national", keyboardType: "number-pad", onBlur, onChangeText: (t) => { setServerError(null); onChange(t); }, placeholder: "8 sifre", value }} />} />
    <Controller control={control} name="birthDate" rules={{ validate: (value) => !value || !isFutureBirthDate(value) || "Fødselsdato kan ikke være i fremtiden." }} render={({ field: { onChange, value } }) => <View><Pressable accessibilityRole="button" accessibilityLabel={value ? `Fødselsdato ${formatBirthDateForDisplay(value)}` : "Velg fødselsdato"} onPress={() => setShowDatePicker(true)}><FormField label="Fødselsdato" error={errors.birthDate?.message} leadingIcon={<Ionicons name="calendar-outline" size={22} color={theme.colors.textMuted} />} trailingIcon={value ? <Pressable accessibilityRole="button" accessibilityLabel="Tøm fødselsdato" onPress={() => onChange(null)}><Ionicons name="close-circle-outline" size={22} color={theme.colors.textMuted} /></Pressable> : undefined} inputProps={{ editable: false, pointerEvents: "none", accessibilityLabel: "Fødselsdato", placeholder: "Velg fødselsdato", value: formatBirthDateForDisplay(value) }} /></Pressable>{showDatePicker ? <DateTimePicker value={value ? birthDatePartsToLocalDate(value) : selectedDate} mode="date" display={Platform.OS === "ios" ? "spinner" : "default"} maximumDate={new Date()} onChange={(event: DateTimePickerEvent, date?: Date) => { if (Platform.OS !== "ios") setShowDatePicker(false); if (event.type === "set" && date) { setServerError(null); onChange(birthDatePartsFromDate(date)); } }} /> : null}</View>} />
    {serverError ? <InlineMessage type="error">{serverError}</InlineMessage> : null}
    <PrimaryButton disabled={isSubmitting || !isValid} onPress={handleSubmit(onSubmit)} title={isSubmitting ? "Lagrer…" : avatarRetryOnly ? "Prøv bilde på nytt" : "Fortsett"} />
    <TextButton title="Tilbake" onPress={() => router.back()} />
  </AuthFormStack></AuthScreenShell>;
}
const styles = StyleSheet.create({ avatar: { alignItems: "center", gap: theme.spacing.sm }, avatarImage: { width: 96, height: 96, borderRadius: 48, backgroundColor: theme.colors.inputBackground, overflow: "hidden" }, photoButton: { minHeight: 44, justifyContent: "center" }, photo: { color: theme.colors.primaryStrong, fontWeight: "800" }, countryCode: { color: theme.colors.text, fontWeight: "800" } });

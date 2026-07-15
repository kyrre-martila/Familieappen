import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
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
import {
  removeCurrentUserAvatar,
  updateCurrentUserProfile,
  uploadCurrentUserAvatar,
} from "../../src/features/auth/api";
import { useAuth } from "../../src/features/auth/AuthProvider";
import { getProfileOnboardingSecondaryActions } from "../../src/features/auth/onboardingNavigation";
import { onboardingStorage } from "../../src/features/auth/onboardingStorage";
import {
  birthDatePartsFromDate,
  birthDatePartsToLocalDate,
  formatBirthDateForApi,
  formatBirthDateForDisplay,
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRIES,
  getAvatarSource,
  isFutureBirthDate,
  normalizePhoneForApi,
  parseBirthDateFromApi,
  parsePhoneFromApi,
  shouldShowLocalAvatarError,
  shouldUseBackendProfileName,
  type BirthDateParts,
  type PhoneCountry,
} from "../../src/features/auth/profile/profileValidation";
import { ApiError } from "../../src/lib/api/client";
import { theme } from "../../src/theme/tokens";

type FormValues = {
  firstName: string;
  middleName: string;
  lastName: string;
  phoneNumber: string;
  birthDate: BirthDateParts | null;
};
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export default function ProfileScreen() {
  const { accessToken, user, setCurrentUser, logout, isLoggingOut } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverAvatarUri, setServerAvatarUri] = useState<string | null>(
    user?.avatarUrl ?? null,
  );
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const [avatarAsset, setAvatarAsset] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [phoneCountry, setPhoneCountry] = useState<PhoneCountry>(
    DEFAULT_PHONE_COUNTRY,
  );
  const [countryQuery, setCountryQuery] = useState("");
  const [avatarRetryOnly, setAvatarRetryOnly] = useState(false);
  const avatarSource = getAvatarSource(localAvatarUri, serverAvatarUri);
  const avatarUri = avatarSource?.uri ?? null;
  const {
    control,
    reset,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting, isValid },
  } = useForm<FormValues>({
    mode: "onChange",
    defaultValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      phoneNumber: "",
      birthDate: null,
    },
  });

  useEffect(() => {
    setServerAvatarUri(user?.avatarUrl ?? null);
    void onboardingStorage.getProfileDraft().then((draft) => {
      const phone = parsePhoneFromApi(user?.phone ?? null);
      const backendBirthDate = parseBirthDateFromApi(user?.birthDate ?? null);
      setPhoneCountry(phone.country);
      reset({
        firstName: shouldUseBackendProfileName(user?.firstName, user?.email) ? user?.firstName ?? "" : draft?.firstName || "",
        middleName: user?.middleName ?? draft?.middleName ?? "",
        lastName: shouldUseBackendProfileName(user?.lastName, user?.email) ? user?.lastName ?? "" : draft?.lastName || "",
        phoneNumber: user?.phone
          ? phone.nationalNumber
          : (draft?.phoneNumber ?? ""),
        birthDate:
          backendBirthDate ?? parseBirthDateFromApi(draft?.birthDate ?? null),
      });
    });
  }, [reset, user]);

  async function pickAvatar() {
    if (!accessToken || isSubmitting) return;
    setServerError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setServerError(
        "Gi tilgang til bildebiblioteket for å velge profilbilde.",
      );
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
    const mimeType =
      asset.mimeType ??
      (asset.uri.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg");
    if (!asset.uri) {
      setServerError("Kunne ikke lese bildet lokalt. Prøv et annet bilde.");
      return;
    }
    if (!ALLOWED_AVATAR_TYPES.has(mimeType)) {
      setServerError("Profilbildet må være JPEG, PNG, WebP eller HEIC.");
      return;
    }
    if (
      typeof asset.fileSize === "number" &&
      asset.fileSize > MAX_AVATAR_BYTES
    ) {
      setServerError("Profilbildet er for stort. Velg et bilde under 2 MB.");
      return;
    }
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
    const ext = mimeType.includes("png")
      ? "png"
      : mimeType.includes("webp")
        ? "webp"
        : mimeType.includes("hei")
          ? "heic"
          : "jpg";
    const safeName =
      avatarAsset.fileName &&
      /^[^/\\]+\.(jpe?g|png|webp|heic|heif)$/i.test(avatarAsset.fileName)
        ? avatarAsset.fileName
        : `avatar.${ext}`;
    return uploadCurrentUserAvatar(accessToken, {
      uri: avatarAsset.uri,
      name: safeName,
      type: mimeType,
    });
  }

  async function onSubmit(v: FormValues) {
    if (!accessToken || isSubmitting) return;
    Keyboard.dismiss();
    setServerError(null);
    const firstName = v.firstName.trim(),
      middleName = v.middleName.trim(),
      lastName = v.lastName.trim();
    const phone = normalizePhoneForApi(phoneCountry, v.phoneNumber);
    if (!firstName || !lastName) {
      setServerError("Fyll ut feltene som er merket med stjerne.");
      return;
    }
    if (phone.error) {
      setServerError(phone.error);
      return;
    }
    if (v.birthDate && isFutureBirthDate(v.birthDate)) {
      setServerError("Fødselsdato kan ikke være i fremtiden.");
      return;
    }
    const payload = {
      firstName,
      middleName: middleName || null,
      lastName,
      phone: phone.value,
      birthDate: formatBirthDateForApi(v.birthDate),
    };
    try {
      let finalUser = avatarRetryOnly
        ? user
        : await updateCurrentUserProfile(accessToken, payload);
      await onboardingStorage.saveProfileDraft({
        firstName,
        middleName,
        lastName,
        phoneNumber: phone.nationalNumber,
        birthDate: payload.birthDate ?? "",
      });
      if (!avatarAsset && user?.avatarUrl && serverAvatarUri === null) {
        finalUser = await removeCurrentUserAvatar(accessToken);
      }
      if (avatarAsset) {
        try {
          finalUser = await uploadAvatarOnly();
          setServerAvatarUri(finalUser?.avatarUrl ?? null);
          setServerError(null);
          setAvatarAsset(null);
          setLocalAvatarUri(null);
          setAvatarRetryOnly(false);
        } catch {
          if (finalUser) setCurrentUser(finalUser);
          setAvatarRetryOnly(true);
          setServerError(
            "Profilen ble lagret, men bildet kunne ikke lastes opp. Prøv å lagre bildet på nytt.",
          );
          return;
        }
      }
      if (finalUser) setCurrentUser(finalUser);
      await onboardingStorage.clearProfileDraft();
      router.push("/(onboarding)/family-start");
    } catch (e) {
      setServerError(
        e instanceof ApiError
          ? e.message
          : "Kunne ikke lagre profilen akkurat nå. Prøv igjen.",
      );
    }
  }

  const selectedDate = useMemo(
    () =>
      birthDatePartsToLocalDate(
        getValues("birthDate") ?? { year: 1990, month: 1, day: 1 },
      ),
    [getValues],
  );
  const secondaryActions = getProfileOnboardingSecondaryActions(
    router.canGoBack(),
  );

  return (
    <AuthScreenShell title="Fortell litt om deg selv" lead="">
      <AuthFormStack accessibilityLabel="Profilskjema">
        <View accessible={false} style={styles.avatar}>
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              style={styles.avatarImage}
              contentFit="cover"
              onError={() => {
                if (shouldShowLocalAvatarError(avatarSource, avatarUri))
                  setServerError(
                    "Kunne ikke vise bildet lokalt. Prøv et annet bilde.",
                  );
              }}
            />
          ) : (
            <Ionicons
              name="person-outline"
              size={48}
              color={theme.colors.primaryStrong}
            />
          )}
          <Pressable
            accessibilityRole="button"
            onPress={pickAvatar}
            disabled={isSubmitting}
            style={styles.photoButton}
          >
            <AppText style={styles.photo}>
              {avatarUri ? "Bytt bilde" : "Legg til bilde (anbefalt)"}
            </AppText>
          </Pressable>
          {avatarUri ? (
            <TextButton
              title="Fjern bilde"
              onPress={removeAvatar}
              disabled={isSubmitting}
            />
          ) : null}
        </View>
        {(
          [
            ["firstName", "Fornavn *", "Skriv inn fornavn"],
            ["middleName", "Mellomnavn", "Skriv inn mellomnavn"],
            ["lastName", "Etternavn *", "Skriv inn etternavn"],
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
          rules={{
            validate: (value) =>
              normalizePhoneForApi(phoneCountry, value).error ?? true,
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.field}>
              <AppText variant="label" style={styles.fieldLabel}>
                Telefonnummer
              </AppText>
              <View
                style={[
                  styles.phoneShell,
                  errors.phoneNumber && styles.phoneShellError,
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Velg landskode, valgt ${phoneCountry.name} ${phoneCountry.callingCode}`}
                  onPress={() => setShowCountryPicker(true)}
                  style={styles.countryButton}
                >
                  <AppText numberOfLines={1} style={styles.countryCode}>
                    {phoneCountry.flag} {phoneCountry.callingCode}⌄
                  </AppText>
                </Pressable>
                <TextInput
                  accessibilityLabel="Telefonnummer"
                  autoComplete="tel-national"
                  keyboardType="number-pad"
                  onBlur={onBlur}
                  onChangeText={(t) => {
                    setServerError(null);
                    onChange(t);
                  }}
                  placeholder={phoneCountry.iso === "NO" ? "8 sifre" : "Nummer"}
                  placeholderTextColor={theme.colors.placeholder}
                  value={value}
                  style={styles.phoneInput}
                />
              </View>
              {errors.phoneNumber?.message ? (
                <AppText accessibilityRole="alert" style={styles.fieldError}>
                  {errors.phoneNumber.message}
                </AppText>
              ) : null}
            </View>
          )}
        />
        <Controller
          control={control}
          name="birthDate"
          rules={{
            validate: (value) =>
              !value ||
              !isFutureBirthDate(value) ||
              "Fødselsdato kan ikke være i fremtiden.",
          }}
          render={({ field: { onChange, value } }) => (
            <View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  value
                    ? `Fødselsdato ${formatBirthDateForDisplay(value)}`
                    : "Velg fødselsdato"
                }
                onPress={() => setShowDatePicker(true)}
              >
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
                  trailingIcon={
                    value ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Tøm fødselsdato"
                        onPress={() => onChange(null)}
                      >
                        <Ionicons
                          name="close-circle-outline"
                          size={22}
                          color={theme.colors.textMuted}
                        />
                      </Pressable>
                    ) : undefined
                  }
                  inputProps={{
                    editable: false,
                    pointerEvents: "none",
                    accessibilityLabel: "Fødselsdato",
                    placeholder: "Velg fødselsdato",
                    value: formatBirthDateForDisplay(value),
                  }}
                />
              </Pressable>
              {showDatePicker ? (
                <DateTimePicker
                  value={
                    value ? birthDatePartsToLocalDate(value) : selectedDate
                  }
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  maximumDate={new Date()}
                  onChange={(event: DateTimePickerEvent, date?: Date) => {
                    if (Platform.OS !== "ios") setShowDatePicker(false);
                    if (event.type === "set" && date) {
                      setServerError(null);
                      onChange(birthDatePartsFromDate(date));
                    }
                  }}
                />
              ) : null}
            </View>
          )}
        />
        <CountryPickerModal
          visible={showCountryPicker}
          query={countryQuery}
          onQueryChange={setCountryQuery}
          selected={phoneCountry}
          onClose={() => setShowCountryPicker(false)}
          onSelect={(country) => {
            setPhoneCountry(country);
            setCountryQuery("");
            setShowCountryPicker(false);
            setServerError(null);
          }}
        />
        {serverError ? (
          <InlineMessage type="error">{serverError}</InlineMessage>
        ) : null}
        <PrimaryButton
          disabled={isSubmitting || !isValid}
          onPress={handleSubmit(onSubmit)}
          title={
            isSubmitting
              ? "Lagrer…"
              : avatarRetryOnly
                ? "Prøv bilde på nytt"
                : "Fortsett"
          }
        />
        {secondaryActions.includes("back") ? (
          <TextButton
            title="Tilbake"
            onPress={() => {
              if (router.canGoBack()) router.back();
            }}
          />
        ) : null}
        {secondaryActions.includes("logout") ? (
          <TextButton
            title={isLoggingOut ? "Logger ut…" : "Logg ut"}
            disabled={isSubmitting || isLoggingOut}
            onPress={() => void logout()}
          />
        ) : null}
      </AuthFormStack>
    </AuthScreenShell>
  );
}
function CountryPickerModal({
  visible,
  query,
  onQueryChange,
  selected,
  onClose,
  onSelect,
}: {
  visible: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  selected: PhoneCountry;
  onClose: () => void;
  onSelect: (country: PhoneCountry) => void;
}) {
  const normalizedQuery = query.trim().toLowerCase();
  const countries = PHONE_COUNTRIES.filter(
    (country) =>
      !normalizedQuery ||
      country.name.toLowerCase().includes(normalizedQuery) ||
      country.callingCode.includes(normalizedQuery) ||
      country.iso.toLowerCase().includes(normalizedQuery),
  );
  return (
    <Modal
      animationType="slide"
      visible={visible}
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <AppText variant="title">Velg landskode</AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Lukk landskodevelger"
            onPress={onClose}
            style={styles.modalClose}
          >
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </Pressable>
        </View>
        <TextInput
          accessibilityLabel="Søk etter land eller landskode"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={onQueryChange}
          placeholder="Søk land eller +47"
          placeholderTextColor={theme.colors.placeholder}
          value={query}
          style={styles.searchInput}
        />
        <FlatList
          data={countries}
          keyExtractor={(item) => item.iso}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: item.iso === selected.iso }}
              onPress={() => onSelect(item)}
              style={styles.countryRow}
            >
              <AppText style={styles.countryName}>
                {item.flag} {item.name}
              </AppText>
              <AppText style={styles.countryDial}>
                {item.callingCode}
                {item.iso === selected.iso ? " ✓" : ""}
              </AppText>
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  avatar: { alignItems: "center", gap: theme.spacing.sm },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.inputBackground,
    overflow: "hidden",
  },
  photoButton: { minHeight: 44, justifyContent: "center" },
  photo: { color: theme.colors.primaryStrong, fontWeight: "800" },
  field: { gap: theme.spacing.sm, width: "100%" },
  fieldLabel: { color: theme.colors.heading, fontWeight: "800" },
  phoneShell: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.inputBorder,
    backgroundColor: theme.colors.inputBackground,
    paddingHorizontal: theme.spacing.md,
  },
  phoneShellError: { borderColor: theme.colors.error },
  countryButton: {
    minHeight: 44,
    minWidth: 92,
    flexShrink: 0,
    justifyContent: "center",
  },
  countryCode: { color: theme.colors.text, fontWeight: "800", flexShrink: 0 },
  phoneInput: {
    minHeight: 52,
    flex: 1,
    minWidth: 0,
    color: theme.colors.text,
    fontSize: theme.typography.body,
    fontWeight: "500",
    paddingVertical: 0,
  },
  fieldError: { color: theme.colors.error, lineHeight: 19 },
  modal: {
    flex: 1,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  modalClose: {
    minHeight: 44,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  searchInput: {
    minHeight: 52,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.inputBorder,
    backgroundColor: theme.colors.inputBackground,
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.typography.body,
  },
  countryRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  countryName: { color: theme.colors.text, fontWeight: "700" },
  countryDial: { color: theme.colors.textMuted, fontWeight: "800" },
});

import { appConfig } from "../../../config/env";

export type BirthDateParts = { year: number; month: number; day: number };
export type PhoneCountry = {
  iso: string;
  name: string;
  callingCode: string;
  flag: string;
};
export type ParsedPhone = {
  country: PhoneCountry;
  nationalNumber: string;
  unmatchedValue?: string;
};
export type AvatarSource = { uri: string; kind: "local" | "server" } | null;

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: "NO", name: "Norge", callingCode: "+47", flag: "🇳🇴" },
  { iso: "SE", name: "Sverige", callingCode: "+46", flag: "🇸🇪" },
  { iso: "DK", name: "Danmark", callingCode: "+45", flag: "🇩🇰" },
  { iso: "FI", name: "Finland", callingCode: "+358", flag: "🇫🇮" },
  { iso: "GB", name: "Storbritannia", callingCode: "+44", flag: "🇬🇧" },
  { iso: "US", name: "USA/Canada", callingCode: "+1", flag: "🇺🇸" },
  { iso: "DE", name: "Tyskland", callingCode: "+49", flag: "🇩🇪" },
  { iso: "FR", name: "Frankrike", callingCode: "+33", flag: "🇫🇷" },
  { iso: "ES", name: "Spania", callingCode: "+34", flag: "🇪🇸" },
  { iso: "PL", name: "Polen", callingCode: "+48", flag: "🇵🇱" },
];
export const DEFAULT_PHONE_COUNTRY = PHONE_COUNTRIES[0];

const API_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DISPLAY_DATE_RE = /^(\d{2})\.(\d{2})\.(\d{4})$/;
const ABSOLUTE_URL_RE = /^[a-z][a-z\d+.-]*:/i;

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
function daysInMonth(year: number, month: number) {
  return month === 2
    ? isLeapYear(year)
      ? 29
      : 28
    : [4, 6, 9, 11].includes(month)
      ? 30
      : 31;
}
export function isValidBirthDateParts(parts: BirthDateParts): boolean {
  return (
    Number.isInteger(parts.year) &&
    Number.isInteger(parts.month) &&
    Number.isInteger(parts.day) &&
    parts.year >= 1900 &&
    parts.month >= 1 &&
    parts.month <= 12 &&
    parts.day >= 1 &&
    parts.day <= daysInMonth(parts.year, parts.month)
  );
}
export function parseBirthDateFromApi(
  value: string | null | undefined,
): BirthDateParts | null {
  if (!value) return null;
  const m = API_DATE_RE.exec(value.trim());
  if (!m) return null;
  const p = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  return isValidBirthDateParts(p) ? p : null;
}
export function parseBirthDateFromDisplay(
  value: string,
): BirthDateParts | null {
  const m = DISPLAY_DATE_RE.exec(value.trim());
  if (!m) return null;
  const p = { year: Number(m[3]), month: Number(m[2]), day: Number(m[1]) };
  return isValidBirthDateParts(p) ? p : null;
}
function pad2(value: number) {
  return String(value).padStart(2, "0");
}
export function formatBirthDateForDisplay(
  parts: BirthDateParts | null | undefined,
): string {
  return parts && isValidBirthDateParts(parts)
    ? `${pad2(parts.day)}.${pad2(parts.month)}.${parts.year}`
    : "";
}
export function formatBirthDateForApi(
  parts: BirthDateParts | null | undefined,
): string | null {
  return parts && isValidBirthDateParts(parts)
    ? `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`
    : null;
}
export function birthDatePartsToLocalDate(parts: BirthDateParts): Date {
  return new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0, 0);
}
export function birthDatePartsFromDate(date: Date): BirthDateParts {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}
export function isFutureBirthDate(
  parts: BirthDateParts,
  today = new Date(),
): boolean {
  const api = formatBirthDateForApi(parts);
  const todayApi = formatBirthDateForApi(birthDatePartsFromDate(today));
  return Boolean(api && todayApi && api > todayApi);
}

export function normalizePhoneForApi(
  country: PhoneCountry,
  input: string,
): { value: string | null; nationalNumber: string; error: string | null } {
  const trimmed = input.trim();
  if (!trimmed) return { value: null, nationalNumber: "", error: null };
  const nationalNumber = trimmed.replace(/\s+/g, "");
  if (!/^\d+$/.test(nationalNumber))
    return {
      value: null,
      nationalNumber,
      error: "Telefonnummer kan bare inneholde tall og mellomrom.",
    };
  if (country.iso === "NO" && nationalNumber.length !== 8)
    return {
      value: null,
      nationalNumber,
      error: "Norske telefonnummer må ha nøyaktig 8 sifre.",
    };
  const e164Digits = `${country.callingCode.slice(1)}${nationalNumber}`;
  if (e164Digits.length < 4 || e164Digits.length > 15)
    return {
      value: null,
      nationalNumber,
      error: "Telefonnummeret må være 4–15 sifre totalt med landskode.",
    };
  return { value: `+${e164Digits}`, nationalNumber, error: null };
}
export function normalizeNorwegianPhoneNational(input: string) {
  const n = normalizePhoneForApi(DEFAULT_PHONE_COUNTRY, input);
  return { value: n.nationalNumber, error: n.error };
}
export function formatNorwegianPhoneForApi(
  nationalNumber: string,
): string | null {
  return normalizePhoneForApi(DEFAULT_PHONE_COUNTRY, nationalNumber).value;
}
export function parsePhoneFromApi(
  phone: string | null | undefined,
): ParsedPhone {
  if (!phone) return { country: DEFAULT_PHONE_COUNTRY, nationalNumber: "" };
  const compact = phone.replace(/[\s.-]+/g, "").replace(/[()]/g, "");
  if (!/^\+\d+$/.test(compact))
    return {
      country: DEFAULT_PHONE_COUNTRY,
      nationalNumber: phone,
      unmatchedValue: phone,
    };
  const country = [...PHONE_COUNTRIES]
    .sort((a, b) => b.callingCode.length - a.callingCode.length)
    .find((c) => compact.startsWith(c.callingCode));
  if (!country)
    return {
      country: DEFAULT_PHONE_COUNTRY,
      nationalNumber: compact,
      unmatchedValue: phone,
    };
  return { country, nationalNumber: compact.slice(country.callingCode.length) };
}
export function normalizeAvatarUri(
  uri: string | null | undefined,
): string | null {
  if (!uri) return null;
  const trimmed = uri.trim();
  if (!trimmed) return null;
  if (ABSOLUTE_URL_RE.test(trimmed)) return trimmed;
  const base = appConfig.apiUrl
    .trim()
    .replace(/\/api\/?$/, "")
    .replace(/\/+$/, "");
  return `${base}/${trimmed.replace(/^\/+/, "")}`;
}
export function getAvatarSource(
  localUri: string | null,
  serverUri: string | null,
): AvatarSource {
  if (localUri) return { uri: localUri, kind: "local" };
  const normalized = normalizeAvatarUri(serverUri);
  return normalized ? { uri: normalized, kind: "server" } : null;
}
export function getAvatarPreviewUri(
  localUri: string | null,
  serverUri: string | null,
): string | null {
  return getAvatarSource(localUri, serverUri)?.uri ?? null;
}
export function shouldShowLocalAvatarError(
  active: AvatarSource,
  failedUri: string,
): boolean {
  return Boolean(active && active.kind === "local" && active.uri === failedUri);
}
export function shouldUseBackendProfileName(
  value: string | null | undefined,
  email: string | null | undefined,
): boolean {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return false;
  const local = email?.split("@")[0]?.trim().toLowerCase();
  return !local || trimmed.toLowerCase() !== local;
}

export type BirthDateParts = { year: number; month: number; day: number };
export type ParsedPhone = { countryCode: "+47"; nationalNumber: string };

const API_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DISPLAY_DATE_RE = /^(\d{2})\.(\d{2})\.(\d{4})$/;

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number) {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function isValidBirthDateParts(parts: BirthDateParts): boolean {
  return Number.isInteger(parts.year) && Number.isInteger(parts.month) && Number.isInteger(parts.day) && parts.year >= 1900 && parts.month >= 1 && parts.month <= 12 && parts.day >= 1 && parts.day <= daysInMonth(parts.year, parts.month);
}

export function parseBirthDateFromApi(value: string | null | undefined): BirthDateParts | null {
  if (!value) return null;
  const match = API_DATE_RE.exec(value.trim());
  if (!match) return null;
  const parts = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  return isValidBirthDateParts(parts) ? parts : null;
}

export function parseBirthDateFromDisplay(value: string): BirthDateParts | null {
  const match = DISPLAY_DATE_RE.exec(value.trim());
  if (!match) return null;
  const parts = { year: Number(match[3]), month: Number(match[2]), day: Number(match[1]) };
  return isValidBirthDateParts(parts) ? parts : null;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function formatBirthDateForDisplay(parts: BirthDateParts | null | undefined): string {
  if (!parts || !isValidBirthDateParts(parts)) return "";
  return `${pad2(parts.day)}.${pad2(parts.month)}.${parts.year}`;
}

export function formatBirthDateForApi(parts: BirthDateParts | null | undefined): string | null {
  if (!parts || !isValidBirthDateParts(parts)) return null;
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

export function birthDatePartsToLocalDate(parts: BirthDateParts): Date {
  return new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0, 0);
}

export function birthDatePartsFromDate(date: Date): BirthDateParts {
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
}

export function isFutureBirthDate(parts: BirthDateParts, today = new Date()): boolean {
  const todayParts = birthDatePartsFromDate(today);
  const api = formatBirthDateForApi(parts);
  const todayApi = formatBirthDateForApi(todayParts);
  return Boolean(api && todayApi && api > todayApi);
}

export function normalizeNorwegianPhoneNational(input: string): { value: string; error: string | null } {
  const compact = input.replace(/\s+/g, "");
  if (!compact) return { value: "", error: null };
  if (!/^\d+$/.test(compact)) return { value: compact, error: "Telefonnummer kan bare inneholde tall og mellomrom." };
  if (compact.length !== 8) return { value: compact, error: "Norske telefonnummer må ha nøyaktig 8 sifre." };
  return { value: compact, error: null };
}

export function formatNorwegianPhoneForApi(nationalNumber: string): string | null {
  const normalized = normalizeNorwegianPhoneNational(nationalNumber);
  if (normalized.error || !normalized.value) return null;
  return `+47${normalized.value}`;
}

export function parsePhoneFromApi(phone: string | null | undefined): ParsedPhone {
  if (!phone) return { countryCode: "+47", nationalNumber: "" };
  const compact = phone.replace(/\s+/g, "");
  if (compact.startsWith("+47")) return { countryCode: "+47", nationalNumber: compact.slice(3) };
  return { countryCode: "+47", nationalNumber: compact };
}

export function getAvatarPreviewUri(localUri: string | null, serverUri: string | null): string | null {
  return localUri || serverUri || null;
}

/** Provider-neutral address selected from an authoritative address registry. */
export interface NormalizedAddress {
  label: string;
  streetName: string;
  houseNumber: number;
  houseLetter: string | null;
  postalCode: string;
  postalPlace: string;
  municipalityNumber: string;
  municipalityName: string;
  addressCode: string;
  latitude: number | null;
  longitude: number | null;
}

export interface WasteFraction {
  providerFractionId: string;
  name: string;
  icon: string | null;
  standardFractionId: string | null;
  standardFractionIcon: string | null;
}

export interface WasteCollectionEvent {
  providerFractionId: string;
  /** An ISO local calendar date (YYYY-MM-DD), never an instant. */
  collectionDate: string;
}

export interface WasteCollectionResult {
  fractions: WasteFraction[];
  events: WasteCollectionEvent[];
}

export interface WasteCollectionProvider {
  readonly providerId: string;
  getCollections(address: NormalizedAddress): Promise<WasteCollectionResult>;
}

export const ISO_LOCAL_DATE = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;

export function normalizeProviderDate(value: unknown): string {
  if (typeof value !== "string") throw new InvalidProviderResponseError("Collection date is not a string");
  const date = value.endsWith("T00:00:00") ? value.slice(0, 10) : value;
  if (!ISO_LOCAL_DATE.test(date) || (value !== date && value !== `${date}T00:00:00`)) {
    throw new InvalidProviderResponseError("Collection date must be a date or a timezone-free midnight value");
  }
  const [year, month, day] = date.split("-").map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day > days[month - 1]) {
    throw new InvalidProviderResponseError("Collection date is invalid");
  }
  return date;
}

export class WasteProviderError extends Error {}
export class WasteProviderUnavailableError extends WasteProviderError {}
export class InvalidProviderResponseError extends WasteProviderError {}
export class WasteProviderConfigurationError extends WasteProviderError {}

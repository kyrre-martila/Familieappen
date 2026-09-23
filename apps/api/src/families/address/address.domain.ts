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

export class AddressLookupUnavailableError extends Error {}
export class InvalidAddressLookupResponseError extends Error {}

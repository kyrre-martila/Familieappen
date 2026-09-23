import { Injectable } from "@nestjs/common";
import { InvalidProviderResponseError, NormalizedAddress, WasteProviderUnavailableError } from "../waste-collection.domain";

const URL = "https://ws.geonorge.no/adresser/v1/sok";

@Injectable()
export class GeonorgeClient {
  async search(query: string): Promise<NormalizedAddress[]> {
    const value = query.trim();
    if (value.length < 2 || value.length > 160) return [];
    let response: Response;
    try {
      response = await fetch(`${URL}?${new URLSearchParams({ sok: value, treffPerSide: "10" })}`, { signal: AbortSignal.timeout(8000) });
    } catch {
      throw new WasteProviderUnavailableError("Address service is temporarily unavailable");
    }
    if (!response.ok) throw new WasteProviderUnavailableError("Address service is temporarily unavailable");
    let body: any;
    try { body = await response.json(); } catch { throw new InvalidProviderResponseError("Address service returned an invalid response"); }
    if (!Array.isArray(body?.adresser)) throw new InvalidProviderResponseError("Address service returned an invalid response");
    return body.adresser.map(mapGeonorgeAddress);
  }
}

export function mapGeonorgeAddress(value: any): NormalizedAddress {
  const houseNumber = Number(value?.nummer);
  const point = value?.representasjonspunkt;
  if (!value?.adressetekst || !value?.adressenavn || !Number.isInteger(houseNumber) || !value?.postnummer ||
      !value?.poststed || !value?.kommunenummer || !value?.kommunenavn || value?.adressekode == null) {
    throw new InvalidProviderResponseError("Address service returned an incomplete address");
  }
  return {
    label: String(value.adressetekst), streetName: String(value.adressenavn), houseNumber,
    houseLetter: value.bokstav ? String(value.bokstav) : null, postalCode: String(value.postnummer),
    postalPlace: String(value.poststed), municipalityNumber: String(value.kommunenummer),
    municipalityName: String(value.kommunenavn), addressCode: String(value.adressekode),
    latitude: Number.isFinite(Number(point?.lat)) ? Number(point.lat) : null,
    longitude: Number.isFinite(Number(point?.lon)) ? Number(point.lon) : null
  };
}

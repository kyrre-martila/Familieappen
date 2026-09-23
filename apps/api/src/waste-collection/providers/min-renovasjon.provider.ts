import { Injectable } from "@nestjs/common";
import { InvalidProviderResponseError, NormalizedAddress, normalizeProviderDate, WasteCollectionProvider, WasteCollectionResult, WasteFraction } from "../waste-collection.domain";
import { MinRenovasjonClient } from "./min-renovasjon.client";

@Injectable()
export class MinRenovasjonProvider implements WasteCollectionProvider {
  readonly providerId = "min-renovasjon";
  constructor(private readonly client: MinRenovasjonClient) {}

  async getCollections(address: NormalizedAddress): Promise<WasteCollectionResult> {
    const [fractionPayload, calendarPayload] = await Promise.all([this.client.getFractions(address.municipalityNumber), this.client.getCalendar(address)]);
    const allFractions = mapFractions(fractionPayload);
    if (!Array.isArray(calendarPayload)) throw new InvalidProviderResponseError("Waste calendar is not a list");
    const events = calendarPayload.flatMap((entry: any) => {
      if (entry?.FraksjonId == null || !Array.isArray(entry?.Tommedatoer)) throw new InvalidProviderResponseError("Waste calendar entry is invalid");
      return entry.Tommedatoer.map((date: unknown) => ({ providerFractionId: String(entry.FraksjonId), collectionDate: normalizeProviderDate(date) }));
    });
    const activeIds = new Set(events.map((event) => event.providerFractionId));
    return { fractions: allFractions.filter((fraction) => activeIds.has(fraction.providerFractionId)), events };
  }
}

export function mapFractions(payload: unknown): WasteFraction[] {
  if (!Array.isArray(payload)) throw new InvalidProviderResponseError("Fraction response is not a list");
  return payload.map((item: any) => {
    if (item?.Id == null || typeof item?.Navn !== "string") throw new InvalidProviderResponseError("Fraction response is invalid");
    return { providerFractionId: String(item.Id), name: item.Navn, icon: item.Ikon == null ? null : String(item.Ikon),
      standardFractionId: item.NorkartStandardFraksjonId == null ? null : String(item.NorkartStandardFraksjonId),
      standardFractionIcon: item.NorkartStandardFraksjonIkon == null ? null : String(item.NorkartStandardFraksjonIkon) };
  });
}

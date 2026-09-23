import assert from "node:assert/strict";
import { mapGeonorgeAddress } from "../src/waste-collection/providers/geonorge.client";
import { MinRenovasjonClient } from "../src/waste-collection/providers/min-renovasjon.client";
import { mapFractions, MinRenovasjonProvider } from "../src/waste-collection/providers/min-renovasjon.provider";
import { normalizeProviderDate, WasteProviderUnavailableError } from "../src/waste-collection/waste-collection.domain";
import { WasteCollectionService } from "../src/waste-collection/waste-collection.service";

const address = {
  label: "Stull Hansens vei 42A", streetName: "Stull Hansens vei", houseNumber: 42, houseLetter: "A",
  postalCode: "9010", postalPlace: "Tromsø", municipalityNumber: "5605", municipalityName: "Tromsø",
  addressCode: "15050", latitude: 69.67, longitude: 18.95
};

async function run(): Promise<void> {
  const normalized = mapGeonorgeAddress({ adressetekst: address.label, adressenavn: address.streetName, nummer: 42,
    bokstav: "A", postnummer: address.postalCode, poststed: address.postalPlace, kommunenummer: 5605,
    kommunenavn: address.municipalityName, adressekode: 15050, representasjonspunkt: { lat: 69.67, lon: 18.95 } });
  assert.deepEqual(normalized, address, "Geonorge preserves the house letter and normalizes numeric identifiers");

  const fractions = mapFractions([{ Id: 2, Navn: "Matavfall", Ikon: "mat.png", NorkartStandardFraksjonId: null, NorkartStandardFraksjonIkon: null }]);
  assert.deepEqual(fractions[0], { providerFractionId: "2", name: "Matavfall", icon: "mat.png", standardFractionId: null, standardFractionIcon: null });
  assert.equal(normalizeProviderDate("2026-09-23"), "2026-09-23");
  assert.equal(normalizeProviderDate("2026-09-23T00:00:00"), "2026-09-23");
  for (const unsafe of ["2026-09-23T01:00:00", "2026-09-23T00:00:00Z", "2026-02-30"]) assert.throws(() => normalizeProviderDate(unsafe));

  const originalFetch = global.fetch;
  let requested = ""; let headers: HeadersInit | undefined;
  global.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    requested = String(input); headers = init?.headers;
    return new Response('[{"FraksjonId":2,"Tommedatoer":["2026-09-23","2026-10-21T00:00:00"]}]', { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
  }) as typeof fetch;
  const client = new MinRenovasjonClient({ minRenovasjonAppKey: "test-key" } as any);
  const calendar = await client.getCalendar(address);
  assert.match(decodeURIComponent(requested), /husnr=42(?:&|$)/);
  assert.doesNotMatch(decodeURIComponent(requested), /husnr=42A/);
  assert.deepEqual(headers, { Kommunenr: "5605", RenovasjonAppKey: "test-key" });
  assert.equal((calendar as any[]).length, 1, "text/html JSON is accepted");
  global.fetch = originalFetch;

  const provider = new MinRenovasjonProvider({
    getFractions: async () => [{ Id: 2, Navn: "Matavfall", Ikon: null, NorkartStandardFraksjonId: null, NorkartStandardFraksjonIkon: null }, { Id: 9, Navn: "Inactive" }],
    getCalendar: async () => [{ FraksjonId: 2, Tommedatoer: ["2026-09-23", "2026-10-21T00:00:00"] }]
  } as any);
  const result = await provider.getCollections(address);
  assert.equal(result.events.length, 2, "all Tommedatoer values are retained");
  assert.deepEqual(result.events.map((e) => e.collectionDate), ["2026-09-23", "2026-10-21"]);
  assert.deepEqual(result.fractions.map((f) => f.providerFractionId), ["2"], "only calendar-active fractions remain active");

  let authorizedFamily = ""; let queriedFamily = ""; const updates: any[] = [];
  const service = new WasteCollectionService({ client: {
    wasteCollectionSubscription: {
      findUnique: async (args: any) => { queriedFamily = args.where.familyId ?? queriedFamily; return args.where.id ? { id: "sub", enabled: true, address } : { id: "sub", provider: "min-renovasjon", enabled: true, address, selectedFractionIds: [], fractions: [], lastSuccessfulSyncAt: null, lastSyncStatus: null, lastSyncError: null }; },
      update: async (args: any) => { updates.push(args.data); return {}; }
    }
  }} as any, { requireFamilyMember: async (_u: string, family: string) => { authorizedFamily = family; } } as any, {} as any,
  { providerId: "min-renovasjon", getCollections: async () => { throw new WasteProviderUnavailableError("down"); } } as any);
  await service.getSubscription("user-a", "family-a");
  assert.equal(authorizedFamily, "family-a"); assert.equal(queriedFamily, "family-a", "authorization and lookup use the same family scope");
  await assert.rejects(() => service.syncSubscription("sub"));
  assert.equal(updates.some((u) => "lastSyncError" in u), true);
  assert.equal((service as any).prisma.client.wasteCollectionEvent, undefined, "provider failure cannot delete cached events");

  console.log("waste collection tests passed");
}
run().catch((error) => { console.error(error); process.exitCode = 1; });

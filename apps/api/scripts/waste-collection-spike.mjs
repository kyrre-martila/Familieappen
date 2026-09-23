#!/usr/bin/env node

/**
 * Development-only API contract probe for Geonorge and Min Renovasjon.
 *
 * Usage:
 *   MIN_RENOVASJON_APP_KEY=... pnpm --filter @familieappen/api spike:waste -- \
 *     "Seljeveien 50 3158 Andebu"
 *
 * The application key is read only from the process environment and is never
 * included in output. This script does not write responses to disk.
 */

const GEONORGE_SEARCH_URL = "https://ws.geonorge.no/adresser/v1/sok";
const PROXY_URL = "https://norkartrenovasjon.azurewebsites.net/proxyserver.ashx?server=";
const MIN_RENOVASJON_URL = "https://komteksky.norkart.no/MinRenovasjon.Api/api";

export function normalizeLocalDate(value) {
  if (typeof value !== "string") {
    throw new TypeError("A Min Renovasjon date must be a string");
  }

  const match = /^(\d{4}-\d{2}-\d{2})(?:T00:00:00(?:\.\d+)?)?$/.exec(value);
  if (!match) {
    throw new Error(`Unexpected Min Renovasjon local-date value: ${value}`);
  }

  return match[1];
}

export function addressParameters(address) {
  return {
    kommunenr: String(address.kommunenummer ?? ""),
    gatenavn: String(address.adressenavn ?? ""),
    gatekode: String(address.adressekode ?? ""),
    husnr: String(address.nummer ?? "")
  };
}

function minRenovasjonProxyUrl(pathAndQuery) {
  return `${PROXY_URL}${MIN_RENOVASJON_URL}/${pathAndQuery}`;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { Accept: "application/json", ...options.headers }
  });
  const bodyText = await response.text();
  let body;

  try {
    body = bodyText === "" ? null : JSON.parse(bodyText);
  } catch {
    body = bodyText;
  }

  return {
    status: response.status,
    contentType: response.headers.get("content-type"),
    body
  };
}

function assertSuccessful(result, operation) {
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`${operation} returned HTTP ${result.status}: ${JSON.stringify(result.body)}`);
  }
}

function summarizeAddress(address) {
  return {
    adressetekst: address.adressetekst,
    adressenavn: address.adressenavn,
    nummer: address.nummer,
    bokstav: address.bokstav,
    postnummer: address.postnummer,
    poststed: address.poststed,
    kommunenummer: address.kommunenummer,
    kommunenavn: address.kommunenavn,
    adressekode: address.adressekode,
    representasjonspunkt: address.representasjonspunkt,
    oppdateringsdato: address.oppdateringsdato,
    bruksenhetsnummer: address.bruksenhetsnummer,
    objtype: address.objtype
  };
}

function summarizeCalendar(body) {
  if (!Array.isArray(body)) return body;
  return body.map((entry) => ({
    ...entry,
    Tommedatoer: Array.isArray(entry.Tommedatoer)
      ? entry.Tommedatoer.map(normalizeLocalDate)
      : entry.Tommedatoer
  }));
}

async function main() {
  const appKey = process.env.MIN_RENOVASJON_APP_KEY;
  if (!appKey) {
    throw new Error("MIN_RENOVASJON_APP_KEY is required");
  }

  const searchArguments = process.argv.slice(2).filter((argument) => argument !== "--");
  const search = searchArguments.join(" ") || "Seljeveien 50 3158 Andebu";
  const geonorgeUrl = new URL(GEONORGE_SEARCH_URL);
  geonorgeUrl.searchParams.set("sok", search);
  geonorgeUrl.searchParams.set("treffPerSide", "10");

  const addressSearch = await requestJson(geonorgeUrl);
  assertSuccessful(addressSearch, "Geonorge address search");
  const addresses = addressSearch.body?.adresser;
  if (!Array.isArray(addresses) || addresses.length === 0) {
    throw new Error(`Geonorge returned no addresses for ${JSON.stringify(search)}`);
  }

  const address = addresses[0];
  const parameters = addressParameters(address);
  const headers = {
    Kommunenr: parameters.kommunenr,
    RenovasjonAppKey: appKey
  };
  const fractions = await requestJson(minRenovasjonProxyUrl("fraksjoner/"), { headers });

  const collectionQuery = new URLSearchParams(parameters);
  const calendar = await requestJson(
    minRenovasjonProxyUrl(`tommekalender?${collectionQuery.toString()}`),
    { headers }
  );

  console.log(JSON.stringify({
    request: {
      geonorge: geonorgeUrl.toString(),
      fractions: minRenovasjonProxyUrl("fraksjoner/"),
      calendar: minRenovasjonProxyUrl(`tommekalender?${collectionQuery.toString()}`),
      minRenovasjonHeaderNames: Object.keys(headers)
    },
    geonorge: {
      status: addressSearch.status,
      metadata: Object.fromEntries(
        Object.entries(addressSearch.body).filter(([key]) => key !== "adresser")
      ),
      selectedAddress: summarizeAddress(address),
      returnedAddressKeys: Object.keys(address).sort()
    },
    fractions,
    calendar: { ...calendar, body: summarizeCalendar(calendar.body) }
  }, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

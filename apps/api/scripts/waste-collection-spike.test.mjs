import assert from "node:assert/strict";
import test from "node:test";
import { addressParameters, normalizeLocalDate } from "./waste-collection-spike.mjs";

test("normalizes Min Renovasjon midnight values without using Date", () => {
  assert.equal(normalizeLocalDate("2026-09-23T00:00:00"), "2026-09-23");
  assert.equal(normalizeLocalDate("2026-09-23"), "2026-09-23");
});

test("rejects instants and non-midnight values as local dates", () => {
  assert.throws(() => normalizeLocalDate("2026-09-23T00:00:00Z"), /Unexpected/);
  assert.throws(() => normalizeLocalDate("2026-09-23T12:00:00"), /Unexpected/);
});

test("maps the Geonorge fields required by Min Renovasjon", () => {
  assert.deepEqual(addressParameters({
    kommunenummer: "3907",
    adressenavn: "Seljeveien",
    adressekode: 1234,
    nummer: 50,
    bokstav: "A"
  }), {
    kommunenr: "3907",
    gatenavn: "Seljeveien",
    gatekode: "1234",
    husnr: "50"
  });
});

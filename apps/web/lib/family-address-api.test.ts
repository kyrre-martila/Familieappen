import assert from "node:assert/strict";
import test from "node:test";
import { searchFamilyAddresses } from "./api";

const address = {
  label: "Stull Hansens vei 42A",
  streetName: "Stull Hansens vei",
  houseNumber: 42,
  houseLetter: "A",
  postalCode: "9010",
  postalPlace: "Tromsø",
  municipalityNumber: "5605",
  municipalityName: "Tromsø",
  addressCode: "15050",
  latitude: 69.67,
  longitude: 18.95
};

test("family address search uses the family-scoped generic endpoint", async () => {
  let requestedUrl = "";
  let familyHeader = "";
  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input);
    familyHeader = new Headers(init?.headers).get("X-Family-Id") ?? "";
    return new Response(JSON.stringify({ data: [address] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };

  const result = await searchFamilyAddresses("family/a", "Stull Hansens vei 42A");

  assert.equal(
    requestedUrl,
    "http://localhost:4000/api/families/family%2Fa/address/search?q=Stull%20Hansens%20vei%2042A"
  );
  assert.doesNotMatch(requestedUrl, /waste-collection/);
  assert.equal(familyHeader, "family/a");
  assert.deepEqual(result, [address]);
});

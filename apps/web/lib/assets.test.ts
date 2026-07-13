import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { resolveApiAssetUrl } from "./assets";

const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

afterEach(() => {
  process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
});

test("resolveApiAssetUrl preserves empty and absolute asset URLs", () => {
  process.env.NEXT_PUBLIC_API_URL = "https://api.example.test/api";
  assert.equal(resolveApiAssetUrl(null), null);
  assert.equal(resolveApiAssetUrl(undefined), undefined);
  assert.equal(resolveApiAssetUrl(""), "");
  assert.equal(resolveApiAssetUrl("https://cdn.example.test/image.webp"), "https://cdn.example.test/image.webp");
  assert.equal(resolveApiAssetUrl("data:image/png;base64,abc"), "data:image/png;base64,abc");
  assert.equal(resolveApiAssetUrl("blob:https://app.example.test/123"), "blob:https://app.example.test/123");
});

test("resolveApiAssetUrl resolves uploaded assets against the API origin", () => {
  process.env.NEXT_PUBLIC_API_URL = "https://api.example.test/api";
  assert.equal(resolveApiAssetUrl("/uploads/advertisements/ad/mobile.webp"), "https://api.example.test/uploads/advertisements/ad/mobile.webp");
});

test("resolveApiAssetUrl leaves non-upload relative paths unchanged", () => {
  process.env.NEXT_PUBLIC_API_URL = "https://api.example.test/api/";
  assert.equal(resolveApiAssetUrl("/icons/fallback.svg"), "/icons/fallback.svg");
  assert.equal(resolveApiAssetUrl("uploads/advertisements/ad/mobile.webp"), "uploads/advertisements/ad/mobile.webp");
});

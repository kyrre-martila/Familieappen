import { resolveApiAssetUrl } from "./assets";

function assertEqual(actual: string | null, expected: string | null, description: string): void {
  if (actual !== expected) throw new Error(`${description}: expected ${expected}, got ${actual}`);
}

const base = "https://api.example.test/api";
assertEqual(resolveApiAssetUrl("https://cdn.example.test/avatar.webp", base), "https://cdn.example.test/avatar.webp", "absolute HTTPS URL is preserved");
assertEqual(resolveApiAssetUrl("http://cdn.example.test/avatar.webp", base), "http://cdn.example.test/avatar.webp", "absolute HTTP URL is preserved");
assertEqual(resolveApiAssetUrl("/uploads/profile-images/a.webp", base), "https://api.example.test/uploads/profile-images/a.webp", "relative upload path with leading slash uses API origin");
assertEqual(resolveApiAssetUrl("uploads/profile-images/a.webp", `${base}/`), "https://api.example.test/uploads/profile-images/a.webp", "relative upload path without leading slash uses API origin");
assertEqual(resolveApiAssetUrl(null, base), null, "null returns no URL");
assertEqual(resolveApiAssetUrl(undefined, base), null, "undefined returns no URL");
assertEqual(resolveApiAssetUrl("", base), null, "empty string returns no URL");

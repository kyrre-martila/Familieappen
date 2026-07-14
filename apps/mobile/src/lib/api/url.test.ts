import { buildApiUrl } from "./url";

function assertEqual(actual: string, expected: string, description: string): void {
  if (actual !== expected) {
    throw new Error(`${description}: expected ${expected}, got ${actual}`);
  }
}

assertEqual(
  buildApiUrl("https://api-familieappen.martila.no/api", "/auth/login"),
  "https://api-familieappen.martila.no/api/auth/login",
  "base without trailing slash and path with leading slash"
);

assertEqual(
  buildApiUrl("https://api-familieappen.martila.no/api/", "/auth/login"),
  "https://api-familieappen.martila.no/api/auth/login",
  "base with trailing slash and path with leading slash"
);

assertEqual(
  buildApiUrl("https://api-familieappen.martila.no/api/", "me"),
  "https://api-familieappen.martila.no/api/me",
  "base keeps /api when normalizing"
);

assertEqual(
  buildApiUrl("http://192.168.1.50:4000/api/", "/auth/logout"),
  "http://192.168.1.50:4000/api/auth/logout",
  "local address with port and /api"
);

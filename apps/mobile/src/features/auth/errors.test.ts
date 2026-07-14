import { ApiError } from "../../lib/api/client";
import { GENERIC_FORGOT_PASSWORD_MESSAGE, mapAuthError, mapResetPasswordError } from "./errors";
function equal(actual: unknown, expected: unknown) { if (actual !== expected) throw new Error(`Expected ${String(expected)}, got ${String(actual)}`); }

equal(mapAuthError(new ApiError("Invalid email or password", 401)), "Feil e-post eller passord.");
equal(mapAuthError(new ApiError("Bad", 400, "validation.invalid_input")), "Sjekk feltene og prøv igjen.");
equal(GENERIC_FORGOT_PASSWORD_MESSAGE, "Hvis adressen finnes, har vi sendt informasjon om hvordan du lager et nytt passord.");
equal(mapResetPasswordError(new ApiError("Lenken er ugyldig eller utløpt", 400)), "Lenken er ugyldig eller utløpt. Be om en ny lenke.");
console.log("auth error tests passed");

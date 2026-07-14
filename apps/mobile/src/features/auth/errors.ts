import { ApiError } from "../../lib/api/client";

export const GENERIC_FORGOT_PASSWORD_MESSAGE = "Hvis adressen finnes, har vi sendt informasjon om hvordan du lager et nytt passord.";

export function mapAuthError(error: unknown, fallback = "Noe gikk galt. Prøv igjen."): string {
  if (!(error instanceof ApiError)) return fallback;
  switch (error.code) {
    case "auth.invalid_credentials": return "Feil e-post eller passord.";
    case "auth.requires_auth":
    case "auth.invalid_token":
    case "auth.expired_token": return "Økten er utløpt. Logg inn på nytt.";
    case "validation.invalid_input": return "Sjekk feltene og prøv igjen.";
    case "network.unavailable": return error.message;
    default:
      if (error.status === 401) return "Feil e-post eller passord.";
      if (error.status === 400) return "Sjekk feltene og prøv igjen.";
      return fallback;
  }
}

export function mapResetPasswordError(error: unknown): string {
  if (!(error instanceof ApiError)) return "Kunne ikke oppdatere passordet. Prøv igjen.";
  switch (error.code) {
    case "network.unavailable": return error.message;
    case "validation.invalid_input": return "Sjekk passordet og prøv igjen.";
    default:
      if (error.status === 400) return "Lenken er ugyldig eller utløpt. Be om en ny lenke.";
      return "Kunne ikke oppdatere passordet. Prøv igjen.";
  }
}

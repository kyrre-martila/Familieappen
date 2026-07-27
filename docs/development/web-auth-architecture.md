# Klientautentisering: arkitektur og migrering

## Analyse av utgangspunktet

Webklienten lagret access-token i `localStorage`. `api.ts` satte Bearer-header, forsøkte refresh ved 401 og ryddet lokal sesjon. Samtidig leste `ProtectedFamilyRoute`, `auth-family` og `onboarding-access` tokenet direkte, hentet familier og utførte redirects. Dermed kunne en familiefeil fremstå som en auth-feil, flere komponenter starte bootstrap, og en gammel PWA-fane bli stående i lokal loading-state. Expo hadde allerede et bedre skille: en AuthProvider med SecureStore-basert lagring.

Backenden **støtter refresh tokens**: login/register setter et roterende refresh-token i en HttpOnly-cookie, `POST /auth/refresh` roterer det, og logout tilbakekaller sesjonen og tømmer cookien. Tokenet returneres ikke i JSON. Web kan derfor bruke cookie-refresh (`credentials: include`), mens Expo fortsatt må bruke sin eksisterende SecureStore-/native-kontrakt. Dette arbeidet endrer ingen endepunkter.

## Valgt målmodell

* `AuthProvider` eier `bootstrapping | unauthenticated | authenticated | transient-error`. `authenticated` inneholder profil validert av `GET /me`.
* API-klienten er fortsatt ett inngangspunkt. Den har Bearer-header, credentials, timeout, ekstern `AbortSignal`, normaliserte feil, én samtidig refresh og maksimalt ett retry. 401 publiseres til provider.
* `FamilyProvider` starter først etter authenticated og eier `idle | loading | no-family | pending | ready | error`. Generasjonsnummer hindrer gamle svar i å skrive over nyere state. Familiefeil endrer aldri auth state.
* Deklarative `RequireAuth`, `RequireFamily`, `RequireNoFamily` og `RequirePendingFamily` er routing-grensen. Den gamle `ProtectedFamilyRoute` er midlertidig en kompatibilitets-wrapper.
* `pageshow` (også bfcache), synlig `visibilitychange`, `focus` og `online` validerer kontrollert. Restore er single-flight, events throttles, og generasjoner beskytter mot utdaterte svar.
* Login/logout synkroniseres med BroadcastChannel og storage-event fallback. Bare et hendelsesnavn sendes, aldri tokenet.
* Plattformnøytrale lifecycle- og feilunioner ligger i `packages/shared`; browser-storage og events forblir web-spesifikke, SecureStore forblir Expo-spesifikt.

## Referansemønstre og lisenser

Referansene ble lest som mønstre, uten direkte kodekopiering. `palatok/next-jwt-auth` (MIT) ga mønsteret provider + sentral klient + kontrollert refresh/logout. `bulletproof-react` (MIT) ga skillet mellom authentication, server-state/familietilgang, og små guards. `next-auth` og eksempelet (ISC) ga eksplisitt loading/error/session-lifecycle og forutsigbare redirects. `clarity-digital/nextjs-jwt-app-router` var oppgitt som App Router/REST-referanse, men repository-metadata/lisens kunne ikke verifiseres via GitHub API under arbeidet; derfor er ingen kode hentet derfra.

Vi innfører ikke NextAuth/Auth.js: API-et eier allerede JWT-sesjonen, web og Expo deler backend, og en ekstra auth-backend ville duplisere token- og provider-lifecycle. React Query innføres heller ikke bare for auth; single-flight og eksplisitte state-maskiner løser behovet uten ny global cacheavhengighet. Refresh-token lagres ikke i JavaScript eller BroadcastChannel fordi backendens HttpOnly-cookie er sikrere.

## Trinnvis migrering

1. Behold API-kontraktene og Expo-login uendret; del bare typer.
2. Monter AuthProvider og FamilyProvider ved webroten, og flytt login/register til provider.
3. La eksisterende `ProtectedFamilyRoute` delegere til guards, mens gamle sider med `useFamilyAccess` fortsetter å virke.
4. Flytt onboarding-rutene én etter én til `useAuth`/`useFamily`; behold dagens redirect-beslutninger og invitasjonsflyt.
5. Når ingen imports gjenstår, slett `auth-family.ts`, den imperative delen av `onboarding-access.ts`, `family-cache-events.ts` og den gamle hook/debug-koden i `ProtectedFamilyRoute.tsx`. `session.ts` beholdes som web storage-adapter, men auth-eierskap skal ikke lekke ut av provider/API-klient.

Denne rekkefølgen gjør at eksisterende web- og Expo-login ikke må migreres atomisk.

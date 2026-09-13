# Helseplan V1 – sikkerhet og personvern

## Autorisasjonsgrense

Alle `/health-plans`-ruter krever `AuthGuard`. `X-Family-Id` velger bare aktiv familiekontekst; hver serviceoperasjon kaller `FamilyAuthorizationService.requireFamilyMember` på nytt. Et tidligere gyldig kall eller en deep link gir derfor ikke tilgang etter at brukeren er fjernet eller deaktivert. Planoppslag kombinerer alltid ugjennomsiktig plan-ID med autorisert `familyId`, og svarer likt med `NotFound` for ukjent og fremmed plan.

Lister og occurrence-feed er alltid filtrert på autorisert familie. Klientfiltre kan snevre inn resultatet, men kan ikke bytte familie. Mutationer bruker familie-ID også i conditional writes.

## Nested ownership og servereide felter

Occurrence-oppslag krever samtidig `id`, route-plan-ID og familie-ID. Action- og note-targets må følge relasjonen tilbake til route-planen. Action-versjonering, lifecycle-endringer og recipient replacement skjer i transaksjoner; notes er append-only og har ingen PATCH/DELETE-rute.

Helseplan-requestene bruker lokale, rekursive allowlists. Ukjente felter avvises i stedet for å ignoreres. Klienten kan derfor ikke sette familie, lifecycle-status/pointers, occurrence snapshots/timestamps/actor, history actor/metadata eller notification dedupe key. Note-author og history-actor hentes fra den autentiserte brukeren, mens tidspunkter eies av tjenesten/databasen.

## Varslinger

Recipient-ID-er må være unike medlemmer i samme familie, ha en koblet bruker og ha en ikke-deaktivert bruker. Input er defensivt begrenset til 100 IDs. Scheduler revaliderer den aktive occurrence/planen og `NotificationsService` revaliderer aktivt familiemedlemskap umiddelbart før ledger-raden opprettes. Sletting av et recipient-medlem rydder recipient-koblingen via `ON DELETE CASCADE`; deaktiverte og frakoblede brukere hoppes over.

Både in-app-raden og Expo-push bruker bare de generiske konstantene «Helseplan» og «Du har en planlagt helseplan-hendelse.». Data inneholder kun occurrence-ID og `/health-plans`; ingen plan-, person-, action-, instruksjons-, dose- eller notetekst. Dedupe key består bare av opaque IDs og tidspunkt og fjernes fra offentlig notification-DTO. Push-token finnes ikke i Helseplan- eller recipient-responsene; token returneres bare fra brukerens autentiserte device-management-endepunkt. Device disable er scoped til innlogget bruker.

## Presentasjon, logging og feil

Home/Calendar bruker privacy-safe antall/status og viser ikke helseinnhold eller medlemsnavn. Full tekst og occurrence snapshots vises bare inne i den familieautoriserte Helseplan-flaten. React rendrer feltene som tekst; flaten bruker ikke raw HTML/markdown. Helseinnhold legges ikke i URL-er, local/session storage eller IndexedDB.

Schedulerlogger inneholder bare opaque IDs, tellinger og feilkoder – aldri entity, push-payload eller ekstern `error.message`. Uventede feil skjules av global exception filter; kjente validerings-, konflikt- og not-found-feil inneholder ikke fremmede IDs eller helseinnhold.

Helseplan-controlleren setter `Cache-Control: private, no-store`. Web-klienten holder resultatene i React-minne, avbryter/ignorerer stale requests ved familiebytte og har ingen service worker som cacher API-responser. Logout/sessionendring går gjennom de globale auth- og family-guardene. API-et bruker bearer access tokens; refresh-cookie/CSRF og CORS er globale auth-/plattformgrenser, og Helseplan introduserer ingen egen bypass.

## Sletting og historikk

Applikasjonens member-removal er hard delete. Recipient-relasjonen cascader, men en FamilyMember som er subject for en bevart Helseplan er med hensikt `RESTRICT`: historiske helseplaner og occurrences skal ikke bli orphaned eller slettet implisitt. Konsekvensen i V1 er at slikt medlemskap ikke kan hard-slettes før produktet har en eksplisitt arkiv-/anonymiseringspolicy. Dette er en kjent lifecycle-begrensning, ikke løst med risikabel automatisk sletting i denne hardening-runnen. Brukerdeaktivering blokkeres av `AuthGuard`; historiske actor-snapshots beholdes.

History og notes er begrenset til de 500 nyeste radene per kategori; eldre rader har ingen pagination i V1. Occurrence-feed har maks 500 rader og per-plan occurrences maks 1000. Definisjoner er begrenset til 10 levels, 20 steps per level, 20 schedules per step og 20 actions per schedule. Rate limiting, kryptering på feltnivå, E2E-kryptering og et separat klinisk audit-/samtykkesystem er utenfor FamilieAppen V1.

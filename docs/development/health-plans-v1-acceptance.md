# Helseplan V1 – funksjonell acceptance

Kontrollert 2026-09-13 mot implementasjonen og den representative planen
`Testplan` (Basisplan med to deler, flere handlinger på samme tidspunkt og ett
tilstøtende trinn). Dette er funksjonell acceptance, ikke produksjonsgodkjenning.

Medlems- og kontosletting er en V1-lifecycle-invariant: fjerning av planens subject terminaliserer aktivt arbeid atomisk, beholder historikken og subject-snapshotet i familien og fjerner subject-/recipient-tilgang; sletting av siste medlem sletter hele familien og Helseplan-treet.

| Område | Status | Kontroll |
| --- | --- | --- |
| Opprettelse og DRAFT | PASS | Validering, sortering, komplett definisjonstre, mottaker-default/`[]`, én `CREATED`, ingen scheduler/varsling før start. |
| Start og generering | PASS | Basisplan/Del 1, klokker og genereringsgrense; én occurrence per handling og tidspunkt; snapshots og databaseunik idempotensnøkkel. |
| Gjentakelse og tidssone | PASS | Daglig, ISO-ukedager, intervall, lokal kalender, Oslo vinter/sommer samt DST-gap og -overlapp. |
| I dag | PASS | Kronologi, person-/planfilter, reset av inkompatibelt filter, historisk kildekontekst og handlingspolicy. |
| Fullfør, hopp over og utsett | PASS | Individuell optimistic concurrency, immutable originaltid/snapshots, terminal sperre og presentation-policy for framtidig `SKIPPED`. |
| Kommentarer, notater og logg | PASS | Append-only, eierskap/forfatter, historisk mål-kontekst og defensive norske formatteringer. |
| Automatisk Del-skifte | PASS | Lokal kalender-expiry, atomisk enkel historikk, gammel framtidig kø ryddes, siste del går aldri automatisk til nytt level. |
| Trapp opp/ned | FIXED | Kun tilstøtende level og Del 1; klokker resettes. Acceptance avdekket og fikset at framtidig uløst arbeid fra forlatt level ikke ble markert `SKIPPED`. |
| Pause og fortsett | PASS | Framtidig kø ryddes, ingen paused-generering/varsling, logiske klokker forskyves og pauseperioden backfilles ikke. |
| Avslutt og arkiver | PASS | Atomisk terminalstatus/historikk og framtidig opprydding; terminal struktur/logg kan leses mens mutasjoner avvises. |
| Varslinger | PASS | Family-scoped mottakere med bruker, preferanse/bruker/enhet-sperrer, due-vindu, ledger-dedupe, generisk innhold og transportfeil-policy. |
| Hjem og Kalender | PASS | Privacy-safe aggregat, flere handlinger telles separat, Oslo-dato og felles policy som skjuler framtidig `SKIPPED`; ingen `CalendarEvent`-lagring. |
| Family switch/isolation | PASS | Request-generation + abort i web; API-oppslag scopes til family; nested occurrence/action/recipient-ID avvises. |
| Konkurranse og rollback | PASS | Lifecycle/occurrence optimistic concurrency, scheduler/notification dedupe og transaksjonell state/history/opprydding. |
| Mutation + refresh | PASS | Primær write beholdes ved sekundær refresh-feil uten falsk lagringsfeil eller automatisk duplikat. |
| Prisma runtime | KNOWN LIMITATION | SQL-invarianter er kontrollert statisk; reell PostgreSQL migration/trigger/race-test krever tilgjengelig testdatabase. Ingen schema/migration ble endret. |

## Bevisste V1-begrensninger

Ingen measurements, bilder/PDF, klinisk journal, AI/legeintegrasjon,
medikamentdatabase, automatisk klinisk eskalering eller level-up, plankopi,
årssykluser, strukturell redigering etter opprettelse, parallel Basisplan,
`SKIPPED`-årsak, egendefinert varslingstid, quiet hours, SMS/e-post eller nye
gjentakelsestyper. Notater kan ikke redigeres/slettes. Push-tokenregistrering i
mobilklienten og retry-kø for push er fortsatt utenfor V1.

Egne hardening-runder for sikkerhet/personvern, scheduling/tid/DST,
failure/recovery og endelig produksjonsberedskap gjenstår.

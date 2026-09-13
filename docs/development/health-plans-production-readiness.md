# Helseplan V1 – production-readiness audit

Auditdato: 2026-09-13. Dette dokumentet er en faktisk release-gate, ikke en
oppsummering av tidligere PR-er. Controller/service, scheduler, scheduling-domene,
notification-jobb og push-integrasjon, subject-removal, Prisma-modeller og alle tre
Helseplan-migrasjoner ble lest. Web-overview/detail, request guards,
mutation/refresh, rollover, Home og Calendar ble lest. Module/startup/Compose,
Dockerfiles, Prisma-workflow og de fire Helseplan-dokumentene ble også kontrollert.

Status betyr: **PASS** er kjørt eller konkret bevist, **FAIL** er en blocker, og
**NOT VERIFIED** kunne ikke bevises i miljøet. En hard `NOT VERIFIED` er aldri PASS.

## Release-gates

| Gate | Status | Konkret bevis / resultat |
|---|---|---|
| Functional acceptance | PASS | API-regresjonspakken fullførte; web hadde 47/47 tester. Lifecycle-matrisen dekker draft/start/active, pause/resume, nivå opp/ned, complete og archive samt ugyldige overganger, én history og optimistic winner. |
| Security / IDOR | PASS | Family-authorization kjøres før list/get/feed/mutasjoner. API-testene avviser foreign plan, occurrence, action, note-target og recipient samt wrong-plan nested IDs; `X-Family-Id` brukes bare som context. Gammelt family-context avvises når medlemskap er borte. |
| Privacy | PASS | Controller setter `private, no-store`; health-web bruker React state, ikke local/session storage eller IndexedDB. Ingen raw HTML-rendering ble funnet. Push-payload er generisk. Schedulerlogger inneholder kun opaque ID/safe code/counts. |
| Lifecycle | PASS | Service-regresjoner verifiserer transitions, atomisk history, generation boundary, cleanup og concurrent winner. |
| Scheduler | PASS | Scheduler-testene dekker flere forfalte steg, finalt steg, restart, `createMany`-feil/recovery, overlap og idempotent rerun uten gammel context. |
| DST / time | PASS | Scheduling- og webtestene dekker DAILY, ISO 1–7, INTERVAL_DAYS, anchor, CET/CEST, gap/overlap, Oslo-midnatt, måned/år, 4t lookback, 14 lokale kalenderdager og pause/resume. |
| Failure / recovery | PASS | Målrettet failure injection beviser action-version rollback, occurrence-status+note rollback, plan-2 rollback ved member removal og senere-family rollback ved account deletion. |
| Notifications | PASS | Tester dekker eligibility, recipient A/B, disabled/deactivated, DeviceNotRegistered, transportfeil, concurrent dedupe, snooze-identitet og terminal/resolved suppression. Payload-testene avviser helseinnhold. |
| Member removal | PASS | DRAFT→ARCHIVED, ACTIVE/PAUSED→COMPLETED, terminal bevares, future unresolved→SKIPPED, detach/snapshot/history/recipient cleanup og transaction rollback er testet. |
| Account deletion | PASS | Koden bruker én transaction på tvers av memberships. Ny regresjon beviser at senere family-feil ruller tilbake tidligere medlemskap, Helseplan-cleanup, session og user. Eksisterende cascade/detach-matrise dekker siste/ikke-siste medlem og actor/author-relasjoner. |
| Web overview/detail | PASS | 47 webtester og production build dekker filter, Oslo-today/upcoming, lifecycle/read-only, detached subject, stale guards, refresh-warning og rollover. Ingen SSR-crash på `/health-plans` eller `/health-plans/[id]`. |
| Home / Calendar | PASS | Integrasjonstestene beviser bare aggregert privacy-safe chip, ingen stor Home-card, ingen CalendarEvent-kopi, felles visibility, future-SKIPPED suppression og Oslo-gruppering. |
| PostgreSQL 16 full migration chain | **FAIL** | Mot tom PostgreSQL 16.15 stoppet første av 29 SQL-migrasjoner: `20260612000000_add_password_reset_tokens` prøver FK mot manglende `users`. Repoet mangler en baseline-migrasjon som oppretter eksisterende kjernetabeller. Prisma deploy kunne i tillegg ikke startes på grunn av engine HTTP 403. En helt tom database kan derfor ikke deployes fra repoets chain. |
| Subject-lifecycle migration | **NOT VERIFIED** | Selve SQL-en ble runtime-kjørt etter foundation+notifications mot PostgreSQL 16.15. Backfill, vanlig detach/snapshot, cross-family rejection, full family cascade for plan/levels/steps/schedules/actions/occurrences/notes/history/recipients, bevart completed occurrence og ny plan passerte. Prisma-lesing av detached plan kunne ikke kjøres fordi generert client mangler og generate blokkeres av HTTP 403. |
| Prisma validate | **NOT VERIFIED** | `prisma validate --schema prisma/schema.prisma` stoppet ved engine checksum-download med HTTP 403. |
| Prisma generate | **NOT VERIFIED** | `prisma generate --schema prisma/schema.prisma` stoppet ved engine checksum-download med HTTP 403. |
| API startup/typecheck/build | PASS | `tsc --noEmit` og `nest build` fullførte. API ble startet mot PostgreSQL 16 til `Nest application successfully started`; HealthPlansModule og alle routes ble initialisert. Auditen fant og rettet først manglende direkte `AuthModule`-import som ga AuthGuard DI-feil. |
| Web typecheck/build | PASS | Typecheck og Next production build fullførte, inkludert statisk `/health-plans` og dynamisk detail-route. |

## Bugs funnet og fikset

Runtime-start avdekket en reell dependency-injection-feil: `HealthPlansModule`
brukte `AuthGuard`, men importerte ikke modulen som eksporterer guardens
`AuthService`-dependency. Direkte `AuthModule`-import ble lagt til. API-start etter
rettingen initialiserte Helseplan provider/controller/cron dependency graph og
rapporterte `Nest application successfully started`.

## Database-audit

PostgreSQL var en lokal disposable **16.15**-instans. Full-chain-testen startet
med en tom database og anvendte alle kataloger sortert på migration timestamp med
`ON_ERROR_STOP=1`. Den feilet deterministisk på den første migrasjonens FK til
`users`; dette er ikke en miljøbegrensning og klassifiseres derfor `FAIL`. Ingen
merged migration ble endret, og ingen ny sen migration kan reparere en manglende
baseline før den første migrationen.

Subject-migrationen ble separat prøvd som upgrade: minimale eksisterende
kjernetabeller, foundation, notifications, pre-migration Helseplan-data, deretter
`20260913120000_health_plan_subject_lifecycle`. Alle SQL-runtimekrav passerte.
Prisma-read-kravet for detached historikk er fortsatt `NOT VERIFIED`, ikke
konvertert til PASS.

## Verifisert runtime wiring og multi-instance-semantikk

`AppModule` laster `ScheduleModule.forRoot()` og `HealthPlansModule`.
Helseplan-modulen registrerer controller, service, scheduler og notification
service som providers. Occurrence-jobben har hourly cron; notification-jobben har
minute cron. Dagens production Compose har én navngitt API-container. Ved senere
overlap mellom instanser beskytter `(sourceActionId, originalScheduledAt)`,
conditional step update og unik notification `dedupeKey`; distributed lock er
bevisst ikke innført.

## Ledger-first policy

Notification-ledger opprettes før fysisk push. Unik dedupeKey prioriterer ingen
dobbel ledger/push fremfor garantert levering. Crash etter ledger commit og før
transport kan miste fysisk push. Dette er akseptert V1; det finnes med vilje ingen
retry queue.

## Kjente, bevisste V1-begrensninger

Disse er produktavgrensninger, ikke forklaring på blocker-gatene:

- 4 timers occurrence catch-up og 30 minutters notification catch-up.
- Ingen push retry queue; ledger-first loss window; ingen exactly-once fysisk push.
- Standalone note har ingen client idempotency key.
- Ingen distributed job queue, websocket/live sync eller offline mutation queue.
- Mobilappen mangler komplett push permission/token-registration workflow.
- Fremtidig Calendar-visning er begrenset av genererte occurrences/horizon.
- Ingen measurements, copy, cycles/annual plans, clinical decision/escalation eller health-system/doctor integration.

## Deployment-checklist etter merge

Følg eksisterende Docker Compose-workflow. **Prisma-kommandoene skal kjøres inne i
API-containeren fra `/app/apps/api` med eksplisitt schema; aldri fra `/app` root.**

1. Stans release dersom denne auditens migration-chain blocker ikke først er løst og verifisert i en ny audit.
2. Ta og verifiser kryptert databasebackup (`pg_dump -Fc`), og dokumenter restore-plan/eier.
3. `git pull`, kontroller secrets uten å skrive dem til logg, deretter `docker compose -f docker-compose.prod.yml config`.
4. `docker compose -f docker-compose.prod.yml build`.
5. Kjør i API-image: `docker compose -f docker-compose.prod.yml run --rm --workdir /app/apps/api api pnpm exec prisma generate --schema /app/apps/api/prisma/schema.prisma`.
6. Før deploy: samme kommandoform med `prisma migrate status --schema /app/apps/api/prisma/schema.prisma`.
7. Deploy: `docker compose -f docker-compose.prod.yml run --rm --workdir /app/apps/api api pnpm exec prisma migrate deploy --schema /app/apps/api/prisma/schema.prisma`.
8. Kjør `migrate status` igjen med samme cwd/schema og krev ingen pending/failed migration.
9. `docker compose -f docker-compose.prod.yml up -d` og deretter `docker compose -f docker-compose.prod.yml ps`.
10. Krev `curl -f http://localhost:4000/api/health` og ekstern API/web health.
11. Inspiser `docker compose -f docker-compose.prod.yml logs --tail=200 api` og tilsvarende `web`; ingen Prisma/schema/DI/cron-feil.
12. Kjør Helseplan-smoke nedenfor og observer minst én occurrence- og notification-cron uten gjentatte unhandled errors.

### Produksjonssmoke (kun generiske testdata)

Bruk eksempeltekst som `Testplan`, `Testhandling` og `Testnotat`, aldri reelle
helseopplysninger. Åpne Helseplan, opprett en enkel plan, start den, bekreft en
generert occurrence, fullfør én og snooze en annen. Test pause/resume, nivåendring
hvis planen har flere nivåer, note/logg, aggregert Home-chip og Calendar-chip.
Complete planen, archive den, og fjern testdata hvis eksisterende UI/API tillater
det. Bekreft samtidig at terminal plan er read-only og at chips ikke viser
helsetekst.

### Stop/rollback-kriterier

Stopp utrullingen ved migration deploy-feil, pending/failed migration status,
feilende API health, Prisma/schema-feil ved API-start, 5xx fra Helseplan list/get,
gjentatte unhandled schedulerfeil, observert cross-family auth-regresjon eller
constraint/trigger-feil fra subject-lifecycle. Ikke gjør destruktiv database-
rollback uten verifisert backup og avtalt restore/forward-fix-plan; stopp nye
containere og følg incidentplanen.

## Konklusjon og konkrete blockers

1. **PostgreSQL 16 full migration chain: FAIL** – en tom database mangler `users` når første repo-migration legger til FK; kjerneschema-baseline finnes ikke i migration chain.
2. **Subject-lifecycle migration: NOT VERIFIED** – SQL-runtimekrav passerte, men obligatorisk Prisma-read av detached historikk kunne ikke kjøres.
3. **Prisma validate: NOT VERIFIED** – engine-download returnerte HTTP 403.
4. **Prisma generate: NOT VERIFIED** – engine-download returnerte HTTP 403.

HELSEPLAN V1 PRODUCTION READINESS: BLOCKED

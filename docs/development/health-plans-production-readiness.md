# Helseplan V1 – production-readiness audit

Auditdato: 2026-09-13. Dette dokumentet er release-gaten for Helseplan V1. Det
skiller med vilje repository-bootstrap fra oppgradering av FamilieAppens
eksisterende produksjonsdatabase. Ingen test skal kjøres eksperimentelt mot
produksjonsdatabasen.

Status betyr: **PASS** er kjørt eller konkret bevist, **FAIL** er en konstatert
feil, og **NOT VERIFIED** er ennå ikke bevist. En obligatorisk `NOT VERIFIED` er
ikke PASS.

## Korrigert databasemodell

### A. FRESH DATABASE BOOTSTRAP: FAIL

Hele repository-kjeden kan ikke bygge en helt tom PostgreSQL 16-database. Første
repository-migration,
`20260612000000_add_password_reset_tokens`, oppretter en foreign key mot `users`,
men kjeden inneholder ingen historisk baseline som oppretter `users` eller resten
av det eksisterende kjerneschemaet. Test på tom PostgreSQL 16.15 stoppet derfor
deterministisk på første migration.

Dette er reell repo-/migration-teknisk gjeld, men er separat fra Helseplans
oppgraderingssti for en eksisterende database. Den skal løses som et eget,
helhetlig baseline-prosjekt. Ikke reparer den med `CREATE TABLE users` i en sen
Helseplan-migration, ved å redigere gamle migrations, ved å registrere gamle
migrations manuelt som applied, eller ved å lage en løsrevet baseline uten analyse
av hele historikken. `prisma db push` er heller ikke en production migration-test.

### B. EXISTING PRODUCTION DATABASE UPGRADE: NOT VERIFIED

Den reelle Helseplan-gaten er oppgradering av en disposable restore av den faktiske
produksjonsdatabasen, eller en representativ database med samme schema og samme
`_prisma_migrations`-historikk. Codex har ikke fått en produksjonsdump, så testen
er ikke kjørt og skal ikke fremstilles som kjørt.

Produksjonsdata skal aldri være target for den eksperimentelle testen. En fersk
backup skal restores til en separat PostgreSQL 16-database; bare migrations som
Prisma rapporterer som pending skal deployes. Dagens API-image skal deretter
startes med testdatabasens URL, og Prisma/API read-write, detached historical
subject, lifecycle-constraints og sluttstatus for migrations skal verifiseres.

## Faktisk migration-historikk og avhengigheter

Hele `apps/api/prisma/migrations/` er lest i timestamp-rekkefølge. De faktiske
Helseplan-migrationene, i eneste gyldige rekkefølge, er:

1. `20260910120000_health_plans_foundation`
   - Oppretter Helseplan-typer, tabeller, foreign keys, checks, indekser og
     consistency-triggere.
   - Forventer eksisterende `families`, `family_members` og `users`, inkludert
     kolonnene `family_members.id` og `family_members.familyId`.
   - Legger selv til `family_members_id_familyId_key`, som de senere composite
     foreign keyene er avhengige av.
2. `20260912120000_health_plan_notifications`
   - Forventer foundation-tabellene og dennes
     `health_plans_id_familyId_key`; forventer også eksisterende `notifications`,
     `notification_preferences`, `families` og `family_members`.
   - Legger til `healthPlansEnabled`, notification `dedupeKey`/unik indeks og
     `health_plan_notification_recipients` med same-family composite keys.
3. `20260913120000_health_plan_subject_lifecycle`
   - Forventer begge foregående Helseplan-migrations, `family_members.displayName`,
     alle foundation-tabellene og de eksakte constraint-navnene som foundation
     opprettet.
   - Backfiller `subjectDisplayName`, gjør subject nullable, endrer subject til
     `ON DELETE SET NULL`, installerer same-family-trigger og endrer hele
     Helseplan-treet til family-owned cascade.

**Dependency-risk:** Ja. Notifications kan ikke kjøres uten foundation, og
subject-lifecycle kan ikke kjøres uten foundation (og må følge notifications i
repository-rekkefølgen). En produksjonsdatabase der en tidligere Helseplan-
migration mangler, er partially applied, eller er registrert applied uten at SQL-
objektene finnes, kan få senere migration til å feile. Prisma vil normalt anvende
reelt pending migrations i rekkefølge; derfor skal operatøren inspisere både
status, `_prisma_migrations` og faktisk schema. Historikken skal aldri håndredigeres.

## Readiness-matrise

| Gate | Status | Konkret bevis / gjenstående arbeid |
|---|---|---|
| Fresh database bootstrap | **FAIL** | Tom PostgreSQL 16.15 feiler på første repo-migration fordi historisk kjerneschema/baseline mangler. Separat repo technical debt, ikke i seg selv Helseplan-upgrade-gaten. |
| Existing production DB upgrade | **NOT VERIFIED** | Ingen produksjonsdump/representativ restore var tilgjengelig i Codex. |
| Helseplan subject-lifecycle SQL runtime | **PASS** | Foundation + notifications + lifecycle ble kjørt på PostgreSQL 16.15 med minimale eksisterende kjernetabeller. Backfill, detach/SET NULL, cross-family rejection, family cascade, historical occurrence preservation og ny plan SQL compatibility passerte. |
| Prisma generate in production image build | **NOT VERIFIED** | `infra/Dockerfile.api` kjører `pnpm --filter @familieappen/api prisma:generate` under image build. En vellykket production build er det konkrete beviset; den er ennå ikke rapportert fra production-miljøet. |
| Prisma migration deploy on restored production copy | **NOT VERIFIED** | Krever disposable restore og kun migrations Prisma vurderer som pending. |
| API startup on migrated production copy | **NOT VERIFIED** | Lokal startup/wiring er verifisert, men ikke dagens image mot en migrert produksjonskopi. |
| Helseplan smoke on migrated production copy | **NOT VERIFIED** | Prisma/API read-write og lifecycle-smoke gjenstår på produksjonskopien. |

De øvrige auditerte gatene (regresjoner for domain/lifecycle/scheduler,
notifications, IDOR/privacy, member/account removal, web, Home/Calendar, DST og
failure recovery) er **PASS**. API typecheck/build og lokal Nest-start er **PASS**;
webtestene var 47/47 og web typecheck/build er **PASS**.

### Subject-lifecycle-bevisets presise omfang

PostgreSQL 16-testen beviser SQL-runtime for `subjectDisplayName`-backfill,
detach/`SET NULL`, cross-family-avvisning, hel-family cascade, bevart historisk
occurrence og opprettelse av ny plan. Den beviser ikke Prisma Client read/write
eller API-smoke mot en produksjonslik, migrert database. Den siste delen tilhører
derfor production-copy-gaten og står fortsatt som `NOT VERIFIED`.

## Preflight for production-copy-gaten

Før noen migration skal operatøren dokumentere alle punktene under:

- fersk `pg_dump -Fc` finnes, og en faktisk restore til separat database lykkes;
- restored database har `_prisma_migrations`;
- ingen migration-row er failed, og `finished_at` er satt for alle applied rows;
- nåværende `prisma migrate status` og den eksakte listen over pending migrations
  er lagret i releaseloggen;
- ingen Helseplan-migration står som applied dersom dens tabeller, constraints,
  indekser, funksjoner eller triggere faktisk mangler;
- forventede kjernetabeller `users`, `families`, `family_members`, `notifications`
  og `notification_preferences` finnes med kolonnene som er listet over;
- restored server kjører kompatibel PostgreSQL major version (mål: PostgreSQL 16);
- dagens production API-image bygger ferdig, inkludert Prisma Client generation.

Failed eller inkonsistent historikk er stoppsignal. Ikke rediger
`_prisma_migrations` manuelt.

## Eksakt test på disposable produksjonskopi

Bruk placeholders; legg aldri passord, secrets eller ekte credentials i repo eller
releaselogger. Kommandoene under er en operatørprosedyre og må tilpasses serverens
PostgreSQL-bruker uten å eksponere credentials.

1. Ta en fersk custom-format backup fra production til `<BACKUP_FILE>` med
   `pg_dump -Fc -f <BACKUP_FILE> <PRODUCTION_DATABASE_URL>`.
2. Opprett en separat `<TEST_DB_NAME>` på PostgreSQL 16. Den må være tydelig
   disposable og må aldri være production-databasen.
3. Restore med `pg_restore --exit-on-error --clean --if-exists --no-owner \
   --dbname=<TEST_DATABASE_URL> <BACKUP_FILE>` og dokumenter at restore lykkes.
4. Bygg dagens images med den standardiserte build-flyten nedenfor. Ikke bruk
   `prisma db push`.
5. Kjør status mot kopien, fra API-imagets riktige working directory:

   ```sh
   docker compose -f docker-compose.prod.yml run --rm \
     -e DATABASE_URL='<TEST_DATABASE_URL>' api sh -lc \
     'cd /app/apps/api && pnpm exec prisma migrate status --schema=prisma/schema.prisma'
   ```

6. Lagre den eksakte pending-listen og sammenhold den med migration-auditen over.
7. Deploy kun denne listen via Prisma:

   ```sh
   docker compose -f docker-compose.prod.yml run --rm \
     -e DATABASE_URL='<TEST_DATABASE_URL>' api sh -lc \
     'cd /app/apps/api && pnpm exec prisma migrate deploy --schema=prisma/schema.prisma'
   ```

8. Kjør statuskommandoen igjen og krev ingen pending eller failed migration.
9. Start en isolert API-container fra dagens image med `DATABASE_URL` satt til
   `<TEST_DATABASE_URL>` (egen Compose override/project eller tilsvarende), uten å
   erstatte production API-containeren. Vent på vellykket Nest-start.
10. Kjør `curl -f http://<TEST_API_HOST>:4000/api/health`; kontroller logger for
    Prisma/schema/DI/cron-feil.
11. Kjør Helseplan-smoke og schema-inspection nedenfor med kun generiske testdata.
12. Lagre resultater, stopp den isolerte API-en, og slett `<TEST_DB_NAME>` først
    etter godkjent verifikasjon. Behold backup etter ordinær retention-policy.

`run --rm` over brukes bare som en isolert migration-klient mot testkopien. Det er
ikke et generate-steg og resultatet forventes ikke å endre det permanente imaget.

## Upgrade-smoke etter migration

Bruk bare generiske verdier som `Testplan`, `Testhandling` og `Testnotat`:

1. Bekreft at eksisterende FamilieAppen-data fremdeles kan leses.
2. Bekreft at API starter uten Prisma- eller schemafeil, og at Helseplan list
   endpoint svarer for autorisert test-family.
3. Opprett en enkel testplan, start den, og generer/les occurrences.
4. Marker en occurrence completed og en annen snoozed.
5. Pause/resume planen, deretter complete/archive; bekreft forventet read-only
   terminaltilstand.
6. Opprett en test-FamilyMember som subject, fjern medlemmet, og bekreft via API at
   historisk plan/subject-display og historisk occurrence består.
7. Forsøk å knytte subject fra en annen test-family og krev at triggeren avviser
   linken uten delvis write.
8. På isolerte testdata, slett en hel test-family og bekreft cascade for plan,
   levels, steps, schedules, actions, occurrences, notes, history og recipients.

Enhver uventet constraint/trigger-feil eller cross-family-regresjon er stoppsignal.

## Database-invariants etter upgrade

Ikke stol bare på SQL-filene. Inspiser den migrerte databasen via `pg_catalog`,
`information_schema`, `psql \d`/`\d+` eller tilsvarende, og lagre resultatet.
Bekreft minst:

- alle Helseplan foreign keys og deres faktiske delete-actions, særlig subject
  `ON DELETE SET NULL` og whole-family/tree `ON DELETE CASCADE`;
- unique keys for plan/family, level index, step order og recipient primary key;
- partial unique index `health_plan_actions_active_sort_order_key` med predicate
  `WHERE "retiredAt" IS NULL`;
- trigger `health_plan_subject_same_family_trigger` og funksjonen
  `health_plan_subject_same_family()` er enabled/til stede;
- notification-dedupeindeksen `notifications_dedupeKey_key` er unik;
- occurrence-identiteten
  `health_plan_occurrences_sourceActionId_originalScheduledAt_key` er unik;
- foundation consistency-triggere og relevante check constraints fortsatt finnes.

Kontroller deretter `_prisma_migrations`: ingen failed row, `finished_at` for alle
applied migrations, ingen falskt applied Helseplan-migration, og ingen pending
migration etter deploy. Ikke reparer avvik ved manuell tabellredigering.

## Korrekt production deployment-workflow

Den etablerte standardflyten er:

```sh
cd ~/apps/Familieappen && \
git pull --ff-only && \
pnpm install && \
docker compose -f docker-compose.prod.yml build && \
docker compose -f docker-compose.prod.yml up -d
```

`infra/Dockerfile.api` kjører allerede
`pnpm --filter @familieappen/api prisma:generate` i build-stage før API build og
kopierer resultatet inn i runner-imaget. En fullført production API-image build er
derfor generate-gaten i det faktiske build-miljøet. Et separat
`docker compose run --rm ... prisma generate` er fjernet fra ordinær deploy: det
er redundant, og filendringer i en midlertidig container forsvinner med den og
oppgraderer ikke den permanente API-containeren.

Etter at API-containeren kjører, kjøres production migration deploy **inne i den
kjørende containeren fra `/app/apps/api`**, aldri fra `/app` root:

```sh
cd ~/apps/Familieappen && \
docker compose -f docker-compose.prod.yml exec api sh -lc \
'cd /app/apps/api && pnpm exec prisma migrate deploy --schema=prisma/schema.prisma'
```

Migration status før/etter deploy:

```sh
cd ~/apps/Familieappen && \
docker compose -f docker-compose.prod.yml exec api sh -lc \
'cd /app/apps/api && pnpm exec prisma migrate status --schema=prisma/schema.prisma'
```

Merk at `up -d` må være startet for at `exec` skal fungere. Production deploy skal
først gjennomføres etter at disposable-copy-gaten er PASS. Ta/verifiser backup og
status før deploy; etter deploy kreves ren status, API health, loggkontroll og den
samme generiske Helseplan-smoken. Stopp ved migrate-feil, pending/failed status,
API health-feil, Prisma/schema/DI-feil eller lifecycle/cross-family-avvik.

## Prisma validate, generate og Codex-miljøet

Repository-script og API build kjører ikke `prisma validate` eksplisitt. Prisma
generate leser schemaet, men skal ikke omtales som en separat, eksplisitt validate-
gate. Operatøren kan derfor kjøre følgende som egen preflight i production-imaget:

```sh
cd ~/apps/Familieappen && \
docker compose -f docker-compose.prod.yml exec api sh -lc \
'cd /app/apps/api && pnpm exec prisma validate --schema=prisma/schema.prisma'
```

I Codex-miljøet stoppet både validate/generate ved nedlasting av Prisma engine med
HTTP 403. Dette er en environment limitation, ikke en påvist schema validation-
feil. Codex-403 er heller ikke en selvstendig releaseblocker dersom den faktiske
production Docker-builden fullfører generate. Det som blokkerer nå er kun at den
restored-production upgrade path ennå ikke er verifisert.

## AuthModule re-verifikasjon

`HealthPlansModule` importerer fortsatt `AuthModule`, `FamiliesModule`,
`NotificationsModule` og `PrismaModule`. `AuthModule` eksporterer `AuthGuard` og
`AuthService`; dermed kan guardens dependencies, `FamilyAuthorizationService`,
notifications, Prisma og scheduler-providerne resolves. Tidligere startup-test
initialiserte routes og endte med `Nest application successfully started`. Ingen
ny refactor er nødvendig.

## Krav for å åpne gaten

`EXISTING PRODUCTION DATABASE UPGRADE` kan bare endres til **PASS** når den
disposable testen dokumenterer at restore lykkes, status/pending-listen før deploy
er forstått, `migrate deploy` lykkes, status er ren etterpå, dagens API-image
starter, Prisma Client leser/skriver, hele Helseplan-smoken (inkludert detach)
passerer, og ingen constraint-, trigger- eller cross-family-regresjon finnes.

Før den testen er status:

- **FRESH DATABASE BOOTSTRAP: FAIL** – separat repo technical debt.
- **SUBJECT-LIFECYCLE SQL RUNTIME: PASS**.
- **EXISTING PRODUCTION DATABASE UPGRADE: NOT VERIFIED**.
- **HELSEPLAN V1 PRODUCTION READINESS: BLOCKED**.

Når og bare når production-copy-upgrade-gaten er dokumentert **PASS**, og ingen
annen obligatorisk gate har regrediert, kan **HELSEPLAN V1 PRODUCTION READINESS**
endres til **PASS**.

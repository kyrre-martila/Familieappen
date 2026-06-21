# Notification preferences production migration recovery

Production failed on `20260621140000_notification_preferences_categories` because the `notification_preferences` table already existed with the legacy preference columns. The migration has been made idempotent, and `20260621143000_notification_preferences_categories_hotfix` repeats the same reconciliation so databases that partially recovered still converge to the Prisma schema.

## Deploy steps for the failed production migration

1. Confirm the failed migration name in production:

   ```bash
   pnpm --filter @familieappen/api prisma migrate status
   ```

2. Because Prisma recorded `20260621140000_notification_preferences_categories` as failed before it completed, mark that failed attempt as rolled back:

   ```bash
   pnpm --filter @familieappen/api prisma migrate resolve --rolled-back 20260621140000_notification_preferences_categories
   ```

3. Deploy migrations normally:

   ```bash
   pnpm --filter @familieappen/api prisma migrate deploy
   ```

Do **not** use `prisma migrate resolve --applied` for `20260621140000_notification_preferences_categories` unless the SQL in that migration has already been completed manually in production. The safe default recovery path is `--rolled-back` followed by `migrate deploy`, which reruns the now-idempotent migration and then applies the hotfix migration.

## What the hotfix does

- Creates `notification_preferences` only when it does not exist.
- Adds missing category columns with safe defaults.
- Backfills category columns from legacy columns where possible:
  - `calendarEnabled` from `calendarEvents`.
  - `remindersEnabled` from `huskReminders`.
  - `wishlistEnabled` from `wishlistShared`.
  - `systemEnabled` from `familyInvites`.
  - `shoppingEnabled`, `tasksEnabled`, and `mealsEnabled` to `true`.
- Enforces `NOT NULL` and `DEFAULT true` for the new category columns.
- Recreates the primary key, unique/indexed `userId`, and cascading user foreign key if missing.
- Drops the legacy columns only after the new columns are populated, because the current Prisma model no longer references the legacy columns.

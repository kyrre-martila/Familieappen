ALTER TABLE "reminders" ALTER COLUMN "dueDate" DROP NOT NULL;

ALTER TABLE "reminders" ADD COLUMN "source_type" TEXT;
ALTER TABLE "reminders" ADD COLUMN "source_id" TEXT;

CREATE UNIQUE INDEX "reminders_createdByUserId_source_type_source_id_key" ON "reminders"("createdByUserId", "source_type", "source_id");
CREATE INDEX "reminders_source_type_source_id_idx" ON "reminders"("source_type", "source_id");

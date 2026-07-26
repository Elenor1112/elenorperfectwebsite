ALTER TABLE "case_studies" ADD COLUMN "industries" text[] DEFAULT '{}' NOT NULL;
--> statement-breakpoint
-- Backfill: every existing study surfaces under its single `industry`.
UPDATE "case_studies" SET "industries" = ARRAY["industry"] WHERE "industry" <> '';
-- Interactive 3D models in case-study galleries.
--
-- Gallery items become a discriminated union: 'image' (every existing row) or
-- 'model'. Viewer settings live on the join row rather than on `media` because
-- they describe this placement of the asset, not the asset itself.
--
-- Data-preserving: existing rows keep their gallery_id/media_id/sort_order and
-- default to type='image', so current galleries render exactly as before.

CREATE TYPE "gallery_item_type" AS ENUM('image', 'model');--> statement-breakpoint
CREATE TYPE "model_environment" AS ENUM('forest', 'studio', 'city', 'sunset', 'warehouse');--> statement-breakpoint

-- Surrogate PK replaces the composite (gallery_id, media_id). The composite key
-- forbade the same asset appearing twice in one gallery and left model rows —
-- which have no image media_id — unrepresentable.
ALTER TABLE "case_study_gallery_images"
  DROP CONSTRAINT IF EXISTS "case_study_gallery_images_gallery_id_media_id_pk";--> statement-breakpoint

ALTER TABLE "case_study_gallery_images"
  ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint

ALTER TABLE "case_study_gallery_images"
  ADD CONSTRAINT "case_study_gallery_images_pkey" PRIMARY KEY ("id");--> statement-breakpoint

-- Model rows carry no image; a nullable media_id doubles as the optional poster.
ALTER TABLE "case_study_gallery_images"
  ALTER COLUMN "media_id" DROP NOT NULL;--> statement-breakpoint

ALTER TABLE "case_study_gallery_images"
  ADD COLUMN IF NOT EXISTS "type" "gallery_item_type" DEFAULT 'image' NOT NULL,
  ADD COLUMN IF NOT EXISTS "model_media_id" uuid,
  ADD COLUMN IF NOT EXISTS "environment_preset" "model_environment" DEFAULT 'forest' NOT NULL,
  ADD COLUMN IF NOT EXISTS "auto_rotate" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "enable_hover_rotation" boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS "enable_mouse_parallax" boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS "model_x_offset" double precision DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "model_y_offset" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint

-- Deleting the model file clears the reference instead of dropping the row, so
-- an editor never silently loses a gallery item (it falls back to its poster).
DO $$ BEGIN
  ALTER TABLE "case_study_gallery_images"
    ADD CONSTRAINT "case_study_gallery_images_model_media_id_media_id_fk"
    FOREIGN KEY ("model_media_id") REFERENCES "media"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- Ordering index: the composite PK used to serve this lookup.
CREATE INDEX IF NOT EXISTS "case_study_gallery_images_gallery_order_idx"
  ON "case_study_gallery_images" ("gallery_id", "sort_order");--> statement-breakpoint

-- A row must have something to render: an image/poster or a model.
ALTER TABLE "case_study_gallery_images"
  DROP CONSTRAINT IF EXISTS "case_study_gallery_images_media_present";--> statement-breakpoint

ALTER TABLE "case_study_gallery_images"
  ADD CONSTRAINT "case_study_gallery_images_media_present"
  CHECK ("media_id" IS NOT NULL OR "model_media_id" IS NOT NULL);

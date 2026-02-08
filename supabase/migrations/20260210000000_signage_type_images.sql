-- Add image_url column to signage_types and signage_sub_types
-- Images are now stored at the type/sub-type level (shared across all annotations of that type)
-- rather than per-annotation.

ALTER TABLE signage_types ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE signage_sub_types ADD COLUMN IF NOT EXISTS image_url TEXT;

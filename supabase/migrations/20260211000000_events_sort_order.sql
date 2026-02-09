-- Add sort_order column to events table for manual reordering
ALTER TABLE events ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Backfill existing events: assign sort_order based on created_at (oldest first)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY organization_id ORDER BY created_at ASC) - 1 AS rn
  FROM events
)
UPDATE events
SET sort_order = ranked.rn
FROM ranked
WHERE events.id = ranked.id;

-- Create index for efficient ordering
CREATE INDEX IF NOT EXISTS idx_events_sort_order ON events (organization_id, sort_order);

-- Backfill signHolder for all existing signage annotations that are missing it.
-- The canvas always defaulted to 'sign-pedestal-2' in the UI, but the value was
-- never written to the database at creation time. This migration makes the data
-- explicit so exports and every consumer see the correct value.

UPDATE venue_layouts
SET annotations = (
  SELECT COALESCE(jsonb_agg(
    CASE
      WHEN elem->>'category' = 'signage' AND (elem->>'signHolder') IS NULL
      THEN elem || '{"signHolder": "sign-pedestal-2"}'::jsonb
      ELSE elem
    END
  ), '[]'::jsonb)
  FROM jsonb_array_elements(venue_layouts.annotations) AS elem
)
WHERE annotations IS NOT NULL
  AND annotations != '[]'::jsonb
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(venue_layouts.annotations) AS e
    WHERE e->>'category' = 'signage' AND (e->>'signHolder') IS NULL
  );

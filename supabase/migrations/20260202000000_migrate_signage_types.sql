-- ============================================================================
-- MIGRATION: Convert VIP to Ticket Type and Remove Area Annotations
-- ============================================================================
-- This migration updates the JSONB annotations array in venue_layouts to:
-- 1. Convert type: 'vip' annotations to type: 'ticket' with ticketTypeName: 'VIP'
-- 2. Remove type: 'area' annotations entirely
--
-- This migration is idempotent - safe to run multiple times.
-- ============================================================================

-- Update venue_layouts that have VIP or Area annotations
UPDATE public.venue_layouts
SET annotations = (
  SELECT COALESCE(
    jsonb_agg(
      CASE 
        -- Convert VIP to ticket with ticketTypeName
        WHEN annotation->>'type' = 'vip' THEN 
          jsonb_set(
            jsonb_set(annotation, '{type}', '"ticket"'),
            '{ticketTypeName}',
            '"VIP"'
          )
        ELSE annotation
      END
    ),
    '[]'::jsonb
  )
  FROM jsonb_array_elements(annotations) AS annotation
  WHERE annotation->>'type' != 'area'  -- Filter out area annotations
)
WHERE annotations @> '[{"type": "vip"}]'::jsonb 
   OR annotations @> '[{"type": "area"}]'::jsonb;

-- Handle edge case: if jsonb_agg returns NULL (all annotations were filtered out),
-- ensure we have an empty array instead of NULL
UPDATE public.venue_layouts
SET annotations = '[]'::jsonb
WHERE annotations IS NULL;

-- ============================================================================
-- MIGRATION: Signage types overhaul
-- ============================================================================
-- This migration:
-- A. Renames "Accessibility" to "Elevators" in signage_types and annotations JSONB
-- B. Converts Lucide icon strings to emoji characters
-- C. Removes the default signage type concept (is_default = false everywhere)
--
-- This migration is idempotent - safe to run multiple times.
-- ============================================================================

-- ============================================================================
-- A. Rename "Accessibility" to "Elevators"
-- ============================================================================

-- 1. Rename in signage_types table
UPDATE public.signage_types
SET name = 'Elevators'
WHERE name = 'Accessibility';

-- 2. Update annotations JSONB references
UPDATE public.venue_layouts
SET annotations = (
    SELECT COALESCE(
        jsonb_agg(
            CASE
                WHEN ann->>'signageTypeName' = 'Accessibility'
                THEN jsonb_set(ann, '{signageTypeName}', '"Elevators"')
                ELSE ann
            END
        ),
        '[]'::jsonb
    )
    FROM jsonb_array_elements(annotations) AS ann
)
WHERE EXISTS (
    SELECT 1 FROM jsonb_array_elements(annotations) a
    WHERE a->>'signageTypeName' = 'Accessibility'
);

-- ============================================================================
-- B. Convert Lucide icon strings to emoji characters
-- ============================================================================

UPDATE public.signage_types
SET icon = CASE icon
    WHEN 'Wine' THEN '🚫'
    WHEN 'Bath' THEN '🚻'
    WHEN 'Ticket' THEN '🎫'
    WHEN 'Accessibility' THEN '♿'
    ELSE '📍'
END
WHERE icon IS NULL
   OR icon IN ('Wine', 'Bath', 'Ticket', 'Accessibility', 'Circle', 'Minus', 'ArrowRight', 'LogOut');

-- Also set any remaining NULLs to a default emoji
UPDATE public.signage_types
SET icon = '📍'
WHERE icon IS NULL;

-- ============================================================================
-- C. Remove default signage type concept
-- ============================================================================

UPDATE public.signage_types
SET is_default = false
WHERE is_default = true;

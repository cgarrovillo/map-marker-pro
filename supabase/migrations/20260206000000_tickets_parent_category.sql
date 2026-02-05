-- ============================================================================
-- MIGRATION: Add "Tickets" as default parent category and migrate existing data
-- ============================================================================
-- This migration:
-- 1. Creates "Tickets" as a default parent signage type for all venue layouts
-- 2. Moves non-default signage_types (VIP, General Admission, etc.) to signage_sub_types
-- 3. Updates annotations to use "Tickets" as the parent with original names as sub-types
-- 4. Migrates "Custom" references to "Tickets"
-- 5. Cleans up orphaned signage_types rows
--
-- This migration is idempotent - safe to run multiple times.
-- ============================================================================

-- ============================================================================
-- STEP 1: Create "Tickets" as a default parent signage type for all venue layouts
-- ============================================================================
INSERT INTO public.signage_types (venue_layout_id, name, is_default, icon)
SELECT vl.id, 'Tickets', true, 'Ticket'
FROM public.venue_layouts vl
WHERE NOT EXISTS (
    SELECT 1 FROM public.signage_types st 
    WHERE st.venue_layout_id = vl.id AND st.name = 'Tickets'
)
ON CONFLICT (venue_layout_id, name) DO NOTHING;

-- ============================================================================
-- STEP 2: Move non-default signage_types to signage_sub_types under "Tickets"
-- ============================================================================
-- For each venue layout, take any signage_types that are NOT defaults
-- (No Alcohol, Accessibility, Washroom, Tickets) and insert them as 
-- signage_sub_types under the "Tickets" parent.
INSERT INTO public.signage_sub_types (signage_type_id, name)
SELECT tickets.id, old_types.name
FROM public.signage_types old_types
JOIN public.signage_types tickets 
    ON tickets.venue_layout_id = old_types.venue_layout_id 
    AND tickets.name = 'Tickets'
WHERE old_types.is_default = false
  AND old_types.name NOT IN ('Tickets', 'Custom')
ON CONFLICT (signage_type_id, name) DO NOTHING;

-- ============================================================================
-- STEP 3: Update annotations to use "Tickets" as the parent
-- ============================================================================
-- Annotations that reference old signage type names (like "VIP") need to be updated:
-- - Set signageTypeName to "Tickets"
-- - Set signageSubTypeName to the original name (e.g., "VIP")
UPDATE public.venue_layouts vl
SET annotations = (
    SELECT COALESCE(
        jsonb_agg(
            CASE 
                WHEN ann->>'type' = 'ticket' 
                     AND ann ? 'signageTypeName' 
                     AND ann->>'signageTypeName' NOT IN ('Tickets', 'Washroom', 'Accessibility', 'No Alcohol')
                THEN
                    ann || jsonb_build_object(
                        'signageSubTypeName', 
                        COALESCE(ann->>'signageSubTypeName', ann->>'signageTypeName'),
                        'signageTypeName', 'Tickets'
                    )
                ELSE ann
            END
        ),
        '[]'::jsonb
    )
    FROM jsonb_array_elements(vl.annotations) AS ann
)
WHERE EXISTS (
    SELECT 1 FROM jsonb_array_elements(vl.annotations) a 
    WHERE a->>'type' = 'ticket' 
      AND a ? 'signageTypeName' 
      AND a->>'signageTypeName' NOT IN ('Tickets', 'Washroom', 'Accessibility', 'No Alcohol')
);

-- ============================================================================
-- STEP 4: Migrate "Custom" references to "Tickets"
-- ============================================================================
-- The previous migration (20260205000000) used "Custom" as a catch-all parent.
-- Change these to "Tickets".

-- 4a. Move sub-types from Custom to Tickets (must happen BEFORE deleting Custom)
INSERT INTO public.signage_sub_types (signage_type_id, name)
SELECT tickets.id, sst.name
FROM public.signage_sub_types sst
JOIN public.signage_types custom ON sst.signage_type_id = custom.id AND custom.name = 'Custom'
JOIN public.signage_types tickets ON tickets.venue_layout_id = custom.venue_layout_id AND tickets.name = 'Tickets'
ON CONFLICT (signage_type_id, name) DO NOTHING;

-- 4b. Update annotations that reference "Custom" to use "Tickets" instead
UPDATE public.venue_layouts
SET annotations = (
    SELECT COALESCE(
        jsonb_agg(
            CASE 
                WHEN ann->>'signageTypeName' = 'Custom'
                THEN ann || jsonb_build_object('signageTypeName', 'Tickets')
                ELSE ann
            END
        ),
        '[]'::jsonb
    )
    FROM jsonb_array_elements(annotations) AS ann
)
WHERE EXISTS (
    SELECT 1 FROM jsonb_array_elements(annotations) a 
    WHERE a->>'signageTypeName' = 'Custom'
);

-- ============================================================================
-- STEP 5: Clean up orphaned signage_types
-- ============================================================================
-- Delete the old non-default signage_types that have been migrated 
-- (VIP, General Admission, Custom, etc.)
-- Note: CASCADE will delete associated signage_sub_types automatically
DELETE FROM public.signage_types
WHERE is_default = false;

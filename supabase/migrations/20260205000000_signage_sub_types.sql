-- ============================================================================
-- MIGRATION: Add two-level signage type hierarchy with sub-types
-- ============================================================================
-- This migration:
-- 1. Adds is_default column to signage_types to distinguish built-in from user-created
-- 2. Creates signage_sub_types table for child types under each signage type
-- 3. Seeds default signage types (No Alcohol, Accessibility, Washroom) for all venue layouts
-- 4. Migrates existing washroom sub-types (Men/Women/All) to signage_sub_types
-- 5. Migrates existing annotations to the new structure
--
-- This migration is idempotent - safe to run multiple times.
-- ============================================================================

-- 1. Add is_default column to signage_types (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'signage_types' 
        AND column_name = 'is_default'
    ) THEN
        ALTER TABLE public.signage_types ADD COLUMN is_default BOOLEAN DEFAULT false NOT NULL;
    END IF;
END $$;

-- Add icon column for signage types (optional, for UI customization)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'signage_types' 
        AND column_name = 'icon'
    ) THEN
        ALTER TABLE public.signage_types ADD COLUMN icon TEXT DEFAULT 'Ticket';
    END IF;
END $$;

-- 2. Create signage_sub_types table
CREATE TABLE IF NOT EXISTS public.signage_sub_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signage_type_id UUID NOT NULL REFERENCES public.signage_types(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(signage_type_id, name)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_signage_sub_types_signage_type_id ON public.signage_sub_types(signage_type_id);

-- Add comment for documentation
COMMENT ON TABLE public.signage_sub_types IS 'Sub-types within each signage type category';

-- 3. Seed default signage types for all existing venue layouts
-- Insert default types only if they don't already exist for each venue layout
INSERT INTO public.signage_types (venue_layout_id, name, is_default, icon)
SELECT vl.id, 'No Alcohol', true, 'Wine'
FROM public.venue_layouts vl
WHERE NOT EXISTS (
    SELECT 1 FROM public.signage_types st 
    WHERE st.venue_layout_id = vl.id AND st.name = 'No Alcohol'
)
ON CONFLICT (venue_layout_id, name) DO NOTHING;

INSERT INTO public.signage_types (venue_layout_id, name, is_default, icon)
SELECT vl.id, 'Accessibility', true, 'Accessibility'
FROM public.venue_layouts vl
WHERE NOT EXISTS (
    SELECT 1 FROM public.signage_types st 
    WHERE st.venue_layout_id = vl.id AND st.name = 'Accessibility'
)
ON CONFLICT (venue_layout_id, name) DO NOTHING;

INSERT INTO public.signage_types (venue_layout_id, name, is_default, icon)
SELECT vl.id, 'Washroom', true, 'Bath'
FROM public.venue_layouts vl
WHERE NOT EXISTS (
    SELECT 1 FROM public.signage_types st 
    WHERE st.venue_layout_id = vl.id AND st.name = 'Washroom'
)
ON CONFLICT (venue_layout_id, name) DO NOTHING;

-- 4. Seed default washroom sub-types for all Washroom signage types
INSERT INTO public.signage_sub_types (signage_type_id, name)
SELECT st.id, 'Men'
FROM public.signage_types st
WHERE st.name = 'Washroom' AND st.is_default = true
AND NOT EXISTS (
    SELECT 1 FROM public.signage_sub_types sst 
    WHERE sst.signage_type_id = st.id AND sst.name = 'Men'
)
ON CONFLICT (signage_type_id, name) DO NOTHING;

INSERT INTO public.signage_sub_types (signage_type_id, name)
SELECT st.id, 'Women'
FROM public.signage_types st
WHERE st.name = 'Washroom' AND st.is_default = true
AND NOT EXISTS (
    SELECT 1 FROM public.signage_sub_types sst 
    WHERE sst.signage_type_id = st.id AND sst.name = 'Women'
)
ON CONFLICT (signage_type_id, name) DO NOTHING;

INSERT INTO public.signage_sub_types (signage_type_id, name)
SELECT st.id, 'All Gender'
FROM public.signage_types st
WHERE st.name = 'Washroom' AND st.is_default = true
AND NOT EXISTS (
    SELECT 1 FROM public.signage_sub_types sst 
    WHERE sst.signage_type_id = st.id AND sst.name = 'All Gender'
)
ON CONFLICT (signage_type_id, name) DO NOTHING;

-- 5. Migrate existing annotations
-- Convert washroomSubType to the new signageTypeName + signageSubTypeName structure
UPDATE public.venue_layouts
SET annotations = (
    SELECT COALESCE(
        jsonb_agg(
            CASE 
                -- Migrate washroom annotations with washroomSubType
                WHEN ann->>'type' = 'washroom' AND ann ? 'washroomSubType' THEN 
                    (ann - 'washroomSubType') || jsonb_build_object(
                        'signageTypeName', 'Washroom',
                        'signageSubTypeName', 
                        CASE ann->>'washroomSubType'
                            WHEN 'men' THEN 'Men'
                            WHEN 'women' THEN 'Women'
                            WHEN 'all' THEN 'All Gender'
                            ELSE ann->>'washroomSubType'
                        END
                    )
                -- Migrate ticket type annotations (signageTypeName becomes signageSubTypeName)
                WHEN ann->>'type' = 'ticket' AND ann ? 'signageTypeName' AND NOT (ann ? 'signageSubTypeName') THEN 
                    ann || jsonb_build_object(
                        'signageSubTypeName', ann->>'signageTypeName'
                    ) - 'signageTypeName' || jsonb_build_object(
                        'signageTypeName', 'Custom'
                    )
                ELSE ann
            END
        ),
        '[]'::jsonb
    )
    FROM jsonb_array_elements(annotations) AS ann
)
WHERE EXISTS (
    SELECT 1 FROM jsonb_array_elements(annotations) a 
    WHERE (a->>'type' = 'washroom' AND a ? 'washroomSubType')
       OR (a->>'type' = 'ticket' AND a ? 'signageTypeName' AND NOT (a ? 'signageSubTypeName'))
);

-- Create "Custom" signage type for venue layouts that have migrated ticket annotations
INSERT INTO public.signage_types (venue_layout_id, name, is_default, icon)
SELECT DISTINCT vl.id, 'Custom', false, 'Ticket'
FROM public.venue_layouts vl
WHERE EXISTS (
    SELECT 1 FROM jsonb_array_elements(vl.annotations) a 
    WHERE a->>'signageTypeName' = 'Custom'
)
AND NOT EXISTS (
    SELECT 1 FROM public.signage_types st 
    WHERE st.venue_layout_id = vl.id AND st.name = 'Custom'
)
ON CONFLICT (venue_layout_id, name) DO NOTHING;

-- Migrate the sub-type names from annotations to signage_sub_types table
-- This ensures the dropdown shows the migrated sub-types
INSERT INTO public.signage_sub_types (signage_type_id, name)
SELECT DISTINCT st.id, ann->>'signageSubTypeName'
FROM public.venue_layouts vl
CROSS JOIN LATERAL jsonb_array_elements(vl.annotations) AS ann
JOIN public.signage_types st ON st.venue_layout_id = vl.id AND st.name = ann->>'signageTypeName'
WHERE ann->>'signageSubTypeName' IS NOT NULL
  AND ann->>'signageSubTypeName' != ''
ON CONFLICT (signage_type_id, name) DO NOTHING;

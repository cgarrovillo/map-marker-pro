-- ============================================================================
-- MIGRATION: Replace ticket_types with venue-layout-scoped signage_types
-- ============================================================================
-- This migration:
-- 1. Creates a new signage_types table tied to venue_layouts (not events)
-- 2. Migrates existing ticket_types to signage_types for ALL venue layouts
-- 3. Renames ticketTypeName to signageTypeName in annotations JSONB
-- 4. Drops the old ticket_types table
--
-- This migration is idempotent - safe to run multiple times.
-- ============================================================================

-- 1. Create signage_types table (if not exists for idempotency)
CREATE TABLE IF NOT EXISTS public.signage_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_layout_id UUID NOT NULL REFERENCES public.venue_layouts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(venue_layout_id, name)
);

-- Create index for faster lookups by venue layout
CREATE INDEX IF NOT EXISTS idx_signage_types_venue_layout_id ON public.signage_types(venue_layout_id);

-- Add comment for documentation
COMMENT ON TABLE public.signage_types IS 'User-defined signage types per venue layout for annotations';

-- 2. Migrate existing ticket_types to signage_types for ALL venue layouts of their events
-- Only migrate if ticket_types table exists and signage_types is empty
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ticket_types') THEN
        -- Insert ticket types for all venue layouts belonging to their events
        -- Use ON CONFLICT to handle duplicates (idempotency)
        INSERT INTO public.signage_types (venue_layout_id, name, created_at, updated_at)
        SELECT vl.id, tt.name, tt.created_at, tt.updated_at
        FROM public.ticket_types tt
        JOIN public.venue_layouts vl ON vl.event_id = tt.event_id
        ON CONFLICT (venue_layout_id, name) DO NOTHING;
    END IF;
END $$;

-- 3. Rename ticketTypeName to signageTypeName in all venue_layouts.annotations JSONB
-- This handles annotations that have the ticketTypeName field
UPDATE public.venue_layouts
SET annotations = (
    SELECT COALESCE(
        jsonb_agg(
            CASE 
                WHEN ann ? 'ticketTypeName' THEN 
                    (ann - 'ticketTypeName') || jsonb_build_object('signageTypeName', ann->'ticketTypeName')
                ELSE ann
            END
        ),
        '[]'::jsonb
    )
    FROM jsonb_array_elements(annotations) AS ann
)
WHERE EXISTS (
    SELECT 1 FROM jsonb_array_elements(annotations) a WHERE a ? 'ticketTypeName'
);

-- 4. Drop the old ticket_types table (if exists for idempotency)
DROP TABLE IF EXISTS public.ticket_types;

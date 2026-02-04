-- ============================================================================
-- MIGRATION: Create ticket_types table
-- ============================================================================
-- This migration creates a table for storing user-defined ticket types per event.
-- Ticket types are reusable sign categories that appear in the Annotations panel.
-- ============================================================================

-- Create ticket_types table
CREATE TABLE IF NOT EXISTS public.ticket_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(event_id, name)  -- Prevent duplicate names within an event
);

-- Create index for faster lookups by event
CREATE INDEX IF NOT EXISTS idx_ticket_types_event_id ON public.ticket_types(event_id);

-- Add comment for documentation
COMMENT ON TABLE public.ticket_types IS 'User-defined ticket types per event for signage annotations';

-- ============================================================================
-- MIGRATION: Add notes column to signage_types table
-- ============================================================================
-- This migration adds a notes field to signage_types for storing
-- user-defined notes per signage type.
--
-- This migration is idempotent - safe to run multiple times.
-- ============================================================================

-- Add notes column to signage_types table
ALTER TABLE public.signage_types 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.signage_types.notes IS 'User notes for this signage type';

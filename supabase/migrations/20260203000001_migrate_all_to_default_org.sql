-- ============================================================================
-- MIGRATE ALL USERS AND EVENTS TO DEFAULT ORGANIZATION
-- ============================================================================
-- This migration consolidates all existing users and events into the 
-- default organization created by the previous migration.
-- ============================================================================

-- Step 1: Migrate ALL existing users to the default org
UPDATE public.users
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id != '00000000-0000-0000-0000-000000000001'
   OR organization_id IS NULL;

-- Step 2: Migrate ALL existing events to the default org
UPDATE public.events
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id != '00000000-0000-0000-0000-000000000001';

-- Step 3: Delete orphaned organizations (cleanup)
DELETE FROM public.organizations
WHERE id != '00000000-0000-0000-0000-000000000001';

-- ============================================================================
-- SINGLE DEFAULT ORGANIZATION MIGRATION
-- ============================================================================
-- This migration:
-- 1. Creates a single default organization (if none exists)
-- 2. Updates handle_new_user() to auto-assign users to the default org
-- 3. Migrates existing users without an org to the default org
-- 4. Drops the now-unused create_organization_for_user() function
-- ============================================================================

-- Step 1: Create the default organization with a fixed UUID
INSERT INTO public.organizations (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization')
ON CONFLICT (id) DO NOTHING;

-- Step 2: Migrate any existing users without an organization to the default org
UPDATE public.users
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Step 3: Migrate any existing events without valid org to the default org
UPDATE public.events
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id NOT IN (SELECT id FROM public.organizations);

-- Step 4: Update handle_new_user() to auto-assign the default organization
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_email TEXT;
    default_org_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- Try multiple sources for the email
    user_email := COALESCE(
        NEW.email,
        NEW.raw_user_meta_data->>'email',
        (SELECT email FROM auth.identities WHERE user_id = NEW.id LIMIT 1)
    );

    -- If we still don't have an email, use a placeholder
    IF user_email IS NULL THEN
        user_email := NEW.id::TEXT || '@placeholder.local';
    END IF;

    INSERT INTO public.users (id, email, full_name, organization_id)
    VALUES (
        NEW.id,
        user_email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        default_org_id
    );
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- User already exists, ensure they have an org
        UPDATE public.users
        SET organization_id = default_org_id
        WHERE id = NEW.id AND organization_id IS NULL;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Drop the now-unused organization creation function
DROP FUNCTION IF EXISTS public.create_organization_for_user(UUID, TEXT, TEXT);

-- Step 6: Revoke any grants on the dropped function (cleanup)
-- (No action needed - grants are automatically removed when function is dropped)

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All new users will now automatically be assigned to the default organization.
-- The SignUpPage no longer needs to call create_organization_for_user().
-- ============================================================================

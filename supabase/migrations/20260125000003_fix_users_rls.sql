-- Fix infinite recursion in users RLS policy
-- The original policy referenced the users table in its own check, causing recursion

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view users in their organization" ON public.users;

-- Create a helper function that bypasses RLS to get user's organization_id
CREATE OR REPLACE FUNCTION public.get_user_organization_id(user_id UUID)
RETURNS UUID AS $$
    SELECT organization_id FROM public.users WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Users can view their own profile (simple, non-recursive)
CREATE POLICY "Users can view own profile"
    ON public.users
    FOR SELECT
    USING (id = auth.uid());

-- Users can view other users in their organization (using the helper function to avoid recursion)
CREATE POLICY "Users can view others in same organization"
    ON public.users
    FOR SELECT
    USING (
        organization_id IS NOT NULL 
        AND organization_id = public.get_user_organization_id(auth.uid())
    );

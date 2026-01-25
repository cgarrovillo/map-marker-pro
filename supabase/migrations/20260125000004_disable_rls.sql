-- Disable RLS - MVP mode, no need for complex security policies

-- Drop all existing policies on organizations
DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;
DROP POLICY IF EXISTS "Users can update their own organization" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

-- Drop all existing policies on users
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view others in same organization" ON public.users;
DROP POLICY IF EXISTS "Users can view users in their organization" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can create their profile" ON public.users;

-- Drop all existing policies on events
DROP POLICY IF EXISTS "Users can view events in their organization" ON public.events;
DROP POLICY IF EXISTS "Users can create events in their organization" ON public.events;
DROP POLICY IF EXISTS "Users can update events in their organization" ON public.events;
DROP POLICY IF EXISTS "Users can delete events in their organization" ON public.events;

-- Drop all existing policies on venue_layouts
DROP POLICY IF EXISTS "Users can view venue layouts in their organization" ON public.venue_layouts;
DROP POLICY IF EXISTS "Users can create venue layouts in their organization" ON public.venue_layouts;
DROP POLICY IF EXISTS "Users can update venue layouts in their organization" ON public.venue_layouts;
DROP POLICY IF EXISTS "Users can delete venue layouts in their organization" ON public.venue_layouts;

-- Disable RLS on all tables
ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_layouts DISABLE ROW LEVEL SECURITY;

-- Drop the helper function we no longer need
DROP FUNCTION IF EXISTS public.get_user_organization_id(UUID);

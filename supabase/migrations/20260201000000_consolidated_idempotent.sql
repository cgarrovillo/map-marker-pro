-- ============================================================================
-- CONSOLIDATED IDEMPOTENT MIGRATION
-- ============================================================================
-- This migration consolidates all previous migrations into a single file.
-- It is SAFE to run multiple times - it checks for existing objects and only
-- creates/modifies what's needed.
--
-- Replaces:
--   - 20260125000000_initial_schema.sql
--   - 20260125000001_storage_bucket.sql
--   - 20260125000002_signup_function.sql
--   - 20260125000003_fix_users_rls.sql
--   - 20260125000004_disable_rls.sql
--   - 20260131000000_fix_handle_new_user_trigger.sql
--   - 20260131012717_6488a3a8-a3fc-4202-9dd7-4f3394631614.sql
-- ============================================================================

-- ============================================================================
-- SECTION 1: TABLES
-- ============================================================================

-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add updated_at column if it doesn't exist (for existing tables)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.organizations ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now() NOT NULL;
    END IF;
END $$;

-- Create users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.users ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now() NOT NULL;
    END IF;
END $$;

-- Create events table
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    event_date DATE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add description column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'events' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE public.events ADD COLUMN description TEXT;
    END IF;
END $$;

-- Add event_date column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'events' 
        AND column_name = 'event_date'
    ) THEN
        ALTER TABLE public.events ADD COLUMN event_date DATE;
    END IF;
END $$;

-- Create venue_layouts table
CREATE TABLE IF NOT EXISTS public.venue_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Floor Plan',
    image_path TEXT,
    annotations JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================================
-- SECTION 2: INDEXES (IF NOT EXISTS)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_organization_id ON public.users(organization_id);
CREATE INDEX IF NOT EXISTS idx_events_organization_id ON public.events(organization_id);
CREATE INDEX IF NOT EXISTS idx_venue_layouts_event_id ON public.venue_layouts(event_id);

-- ============================================================================
-- SECTION 3: ROW LEVEL SECURITY - DISABLED FOR MVP
-- ============================================================================

-- Drop ALL existing policies to start fresh (idempotent - IF EXISTS)
-- Organizations policies
DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;
DROP POLICY IF EXISTS "Users can update their own organization" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

-- Users policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view others in same organization" ON public.users;
DROP POLICY IF EXISTS "Users can view users in their organization" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can create their profile" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

-- Events policies
DROP POLICY IF EXISTS "Users can view events in their organization" ON public.events;
DROP POLICY IF EXISTS "Users can create events in their organization" ON public.events;
DROP POLICY IF EXISTS "Users can update events in their organization" ON public.events;
DROP POLICY IF EXISTS "Users can delete events in their organization" ON public.events;

-- Venue layouts policies
DROP POLICY IF EXISTS "Users can view venue layouts in their organization" ON public.venue_layouts;
DROP POLICY IF EXISTS "Users can create venue layouts in their organization" ON public.venue_layouts;
DROP POLICY IF EXISTS "Users can update venue layouts in their organization" ON public.venue_layouts;
DROP POLICY IF EXISTS "Users can delete venue layouts in their organization" ON public.venue_layouts;
DROP POLICY IF EXISTS "Users can view layouts for their events" ON public.venue_layouts;
DROP POLICY IF EXISTS "Users can create layouts for their events" ON public.venue_layouts;
DROP POLICY IF EXISTS "Users can update layouts for their events" ON public.venue_layouts;
DROP POLICY IF EXISTS "Users can delete layouts for their events" ON public.venue_layouts;

-- DISABLE RLS on all tables (MVP mode - simpler for development)
ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_layouts DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 4: FUNCTIONS (CREATE OR REPLACE is inherently idempotent)
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user signup (robust version that handles null emails)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_email TEXT;
BEGIN
    -- Try multiple sources for the email
    -- 1. Direct email field (standard case)
    -- 2. Email from raw_user_meta_data (some auth providers store it here)
    -- 3. Email from identities (OAuth providers)
    user_email := COALESCE(
        NEW.email,
        NEW.raw_user_meta_data->>'email',
        (SELECT email FROM auth.identities WHERE user_id = NEW.id LIMIT 1)
    );
    
    -- If we still don't have an email, use a placeholder
    IF user_email IS NULL THEN
        user_email := NEW.id::TEXT || '@placeholder.local';
    END IF;
    
    INSERT INTO public.users (id, email, full_name)
    VALUES (
        NEW.id,
        user_email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- User already exists, just return
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create organization for user (used during signup)
CREATE OR REPLACE FUNCTION public.create_organization_for_user(
    user_id UUID,
    org_name TEXT,
    user_full_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_org_id UUID;
BEGIN
    -- Create the organization
    INSERT INTO public.organizations (name)
    VALUES (org_name)
    RETURNING id INTO new_org_id;
    
    -- Update the user with the organization_id and full_name
    UPDATE public.users
    SET 
        organization_id = new_org_id,
        full_name = COALESCE(user_full_name, full_name)
    WHERE id = user_id;
    
    RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_organization_for_user TO authenticated;

-- Drop helper function if it exists (no longer needed with RLS disabled)
DROP FUNCTION IF EXISTS public.get_user_organization_id(UUID);

-- ============================================================================
-- SECTION 5: TRIGGERS (drop and recreate to ensure consistency)
-- ============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
DROP TRIGGER IF EXISTS update_venue_layouts_updated_at ON public.venue_layouts;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create triggers for updated_at
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_venue_layouts_updated_at
    BEFORE UPDATE ON public.venue_layouts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- SECTION 6: STORAGE BUCKETS
-- ============================================================================

-- Create venue-images bucket (public) if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('venue-images', 'venue-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create floor-plans bucket (private) if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('floor-plans', 'floor-plans', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SECTION 7: STORAGE POLICIES
-- ============================================================================

-- Drop existing storage policies (idempotent)
DROP POLICY IF EXISTS "Authenticated users can upload venue images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view venue images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update venue images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete venue images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view floor plans for their events" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload floor plans" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their floor plans" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their floor plans" ON storage.objects;

-- Venue-images bucket policies (public bucket)
CREATE POLICY "Authenticated users can upload venue images"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'venue-images' 
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "Anyone can view venue images"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'venue-images');

CREATE POLICY "Users can update venue images"
    ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'venue-images' 
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can delete venue images"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'venue-images' 
        AND auth.uid() IS NOT NULL
    );

-- Floor-plans bucket policies (private bucket)
CREATE POLICY "Users can view floor plans for their events"
    ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'floor-plans'
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can upload floor plans"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'floor-plans'
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can update their floor plans"
    ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'floor-plans'
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can delete their floor plans"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'floor-plans'
        AND auth.uid() IS NOT NULL
    );

-- ============================================================================
-- SECTION 8: REALTIME
-- ============================================================================

-- Enable realtime for events and venue_layouts
-- Using DO block to handle case where tables are already in publication
DO $$
BEGIN
    -- Check if events is already in supabase_realtime
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'events'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
    END IF;
    
    -- Check if venue_layouts is already in supabase_realtime
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'venue_layouts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.venue_layouts;
    END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- This migration is fully idempotent and can be run multiple times safely.
-- It establishes the following schema:
--
-- Tables:
--   - public.organizations (id, name, created_at, updated_at)
--   - public.users (id, organization_id, email, full_name, created_at, updated_at)
--   - public.events (id, organization_id, name, description, event_date, created_at, updated_at)
--   - public.venue_layouts (id, event_id, name, image_path, annotations, created_at, updated_at)
--
-- Storage Buckets:
--   - venue-images (public)
--   - floor-plans (private)
--
-- RLS: DISABLED (MVP mode)
--
-- Functions:
--   - handle_new_user() - Creates user profile on auth signup
--   - create_organization_for_user() - Creates org and links to user
--   - update_updated_at_column() - Auto-updates updated_at timestamps
--
-- Realtime: Enabled for events and venue_layouts
-- ============================================================================

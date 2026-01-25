-- Create organizations table
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create users table (extends auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create events table
CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create venue_layouts table
CREATE TABLE public.venue_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Floor Plan',
    image_path TEXT,
    annotations JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes for foreign keys
CREATE INDEX idx_users_organization_id ON public.users(organization_id);
CREATE INDEX idx_events_organization_id ON public.events(organization_id);
CREATE INDEX idx_venue_layouts_event_id ON public.venue_layouts(event_id);

-- Enable Row Level Security
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_layouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
-- Users can view their own organization
CREATE POLICY "Users can view their own organization"
    ON public.organizations
    FOR SELECT
    USING (
        id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

-- Users can update their own organization
CREATE POLICY "Users can update their own organization"
    ON public.organizations
    FOR UPDATE
    USING (
        id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

-- Allow insert for authenticated users (for signup flow)
CREATE POLICY "Authenticated users can create organizations"
    ON public.organizations
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for users
-- Users can view users in their organization
CREATE POLICY "Users can view users in their organization"
    ON public.users
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
    ON public.users
    FOR UPDATE
    USING (id = auth.uid());

-- Allow insert for authenticated users (for signup flow)
CREATE POLICY "Authenticated users can create their profile"
    ON public.users
    FOR INSERT
    WITH CHECK (id = auth.uid());

-- RLS Policies for events
-- Users can view events in their organization
CREATE POLICY "Users can view events in their organization"
    ON public.events
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

-- Users can create events in their organization
CREATE POLICY "Users can create events in their organization"
    ON public.events
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

-- Users can update events in their organization
CREATE POLICY "Users can update events in their organization"
    ON public.events
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

-- Users can delete events in their organization
CREATE POLICY "Users can delete events in their organization"
    ON public.events
    FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

-- RLS Policies for venue_layouts
-- Users can view venue layouts for events in their organization
CREATE POLICY "Users can view venue layouts in their organization"
    ON public.venue_layouts
    FOR SELECT
    USING (
        event_id IN (
            SELECT e.id FROM public.events e
            JOIN public.users u ON e.organization_id = u.organization_id
            WHERE u.id = auth.uid()
        )
    );

-- Users can create venue layouts for events in their organization
CREATE POLICY "Users can create venue layouts in their organization"
    ON public.venue_layouts
    FOR INSERT
    WITH CHECK (
        event_id IN (
            SELECT e.id FROM public.events e
            JOIN public.users u ON e.organization_id = u.organization_id
            WHERE u.id = auth.uid()
        )
    );

-- Users can update venue layouts for events in their organization
CREATE POLICY "Users can update venue layouts in their organization"
    ON public.venue_layouts
    FOR UPDATE
    USING (
        event_id IN (
            SELECT e.id FROM public.events e
            JOIN public.users u ON e.organization_id = u.organization_id
            WHERE u.id = auth.uid()
        )
    );

-- Users can delete venue layouts for events in their organization
CREATE POLICY "Users can delete venue layouts in their organization"
    ON public.venue_layouts
    FOR DELETE
    USING (
        event_id IN (
            SELECT e.id FROM public.events e
            JOIN public.users u ON e.organization_id = u.organization_id
            WHERE u.id = auth.uid()
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_venue_layouts_updated_at
    BEFORE UPDATE ON public.venue_layouts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

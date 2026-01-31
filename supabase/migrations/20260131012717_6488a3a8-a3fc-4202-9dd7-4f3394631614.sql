-- Create organizations table
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create users table (profiles)
CREATE TABLE public.users (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  event_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create venue_layouts table
CREATE TABLE public.venue_layouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Main Layout',
  image_path TEXT,
  annotations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_layouts ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's organization_id
CREATE OR REPLACE FUNCTION public.get_user_organization_id(user_uuid UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.users WHERE id = user_uuid;
$$;

-- Organizations policies
CREATE POLICY "Users can view their own organization"
ON public.organizations FOR SELECT
USING (id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Users can update their own organization"
ON public.organizations FOR UPDATE
USING (id = public.get_user_organization_id(auth.uid()));

-- Users policies
CREATE POLICY "Users can view their own profile"
ON public.users FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.users FOR UPDATE
USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON public.users FOR INSERT
WITH CHECK (id = auth.uid());

-- Events policies
CREATE POLICY "Users can view events in their organization"
ON public.events FOR SELECT
USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Users can create events in their organization"
ON public.events FOR INSERT
WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Users can update events in their organization"
ON public.events FOR UPDATE
USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Users can delete events in their organization"
ON public.events FOR DELETE
USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Venue layouts policies
CREATE POLICY "Users can view layouts for their events"
ON public.venue_layouts FOR SELECT
USING (
  event_id IN (
    SELECT id FROM public.events 
    WHERE organization_id = public.get_user_organization_id(auth.uid())
  )
);

CREATE POLICY "Users can create layouts for their events"
ON public.venue_layouts FOR INSERT
WITH CHECK (
  event_id IN (
    SELECT id FROM public.events 
    WHERE organization_id = public.get_user_organization_id(auth.uid())
  )
);

CREATE POLICY "Users can update layouts for their events"
ON public.venue_layouts FOR UPDATE
USING (
  event_id IN (
    SELECT id FROM public.events 
    WHERE organization_id = public.get_user_organization_id(auth.uid())
  )
);

CREATE POLICY "Users can delete layouts for their events"
ON public.venue_layouts FOR DELETE
USING (
  event_id IN (
    SELECT id FROM public.events 
    WHERE organization_id = public.get_user_organization_id(auth.uid())
  )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_venue_layouts_updated_at
  BEFORE UPDATE ON public.venue_layouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create organization for new user (used during signup)
CREATE OR REPLACE FUNCTION public.create_organization_for_user(
  user_id UUID,
  org_name TEXT,
  user_full_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Create the organization
  INSERT INTO public.organizations (name)
  VALUES (org_name)
  RETURNING id INTO new_org_id;

  -- Create or update the user profile with organization link
  INSERT INTO public.users (id, email, full_name, organization_id)
  VALUES (
    user_id,
    (SELECT email FROM auth.users WHERE id = user_id),
    user_full_name,
    new_org_id
  )
  ON CONFLICT (id) DO UPDATE SET
    organization_id = new_org_id,
    full_name = user_full_name;

  RETURN new_org_id;
END;
$$;

-- Create storage bucket for floor plans
INSERT INTO storage.buckets (id, name, public) 
VALUES ('floor-plans', 'floor-plans', false);

-- Storage policies for floor-plans bucket
CREATE POLICY "Users can view floor plans for their events"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'floor-plans' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can upload floor plans"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'floor-plans' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update their floor plans"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'floor-plans' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their floor plans"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'floor-plans' AND
  auth.uid() IS NOT NULL
);

-- Enable realtime for events and venue_layouts
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.venue_layouts;
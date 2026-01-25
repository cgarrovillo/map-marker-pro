-- Function to create an organization and link it to a user during signup
-- Uses SECURITY DEFINER to bypass RLS during the signup flow
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

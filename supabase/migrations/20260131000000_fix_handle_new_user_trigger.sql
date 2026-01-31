-- Fix handle_new_user trigger to handle null emails
-- In some Supabase configurations, auth.users.email can be null at trigger time
-- The email might be in raw_user_meta_data or identities instead

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
    -- This prevents the insert from failing, and can be updated later
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

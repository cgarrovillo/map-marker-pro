import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { Tables } from '@/integrations/supabase/types';

type Organization = Tables<'organizations'>;
type User = Tables<'users'>;

export function useOrganization() {
  const { user } = useAuthContext();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setOrganization(null);
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    const fetchOrganization = async () => {
      setLoading(true);
      try {
        console.log('[useOrganization] Fetching user profile for:', user.id);
        
        // Get user profile with organization - use maybeSingle() to avoid error when no rows
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (userError) {
          console.error('[useOrganization] Error fetching user:', userError);
          return;
        }

        // If no user profile exists, create one
        if (!userData) {
          console.log('[useOrganization] No user profile found, creating one...');
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email ?? '',
              full_name: user.user_metadata?.full_name ?? '',
            })
            .select()
            .single();

          if (createError) {
            console.error('[useOrganization] Error creating user profile:', createError);
            return;
          }

          console.log('[useOrganization] Created user profile:', newUser);
          setCurrentUser(newUser);
          return;
        }

        console.log('[useOrganization] User data:', userData);
        setCurrentUser(userData);

        if (userData.organization_id) {
          console.log('[useOrganization] Fetching organization:', userData.organization_id);
          
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', userData.organization_id)
            .single();

          if (orgError) {
            console.error('[useOrganization] Error fetching organization:', orgError);
            return;
          }

          console.log('[useOrganization] Organization data:', orgData);
          setOrganization(orgData);
        } else {
          console.warn('[useOrganization] User has no organization_id');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrganization();
  }, [user]);

  const updateOrganization = async (updates: Partial<Organization>) => {
    if (!organization) return null;

    const { data, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', organization.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    setOrganization(data);
    return data;
  };

  const updateUserProfile = async (updates: Partial<User>) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    setCurrentUser(data);
    return data;
  };

  return {
    organization,
    currentUser,
    loading,
    updateOrganization,
    updateUserProfile,
  };
}

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  organizationName: string;
}

interface SignInData {
  email: string;
  password: string;
}

export function useAuth() {
  const [loading, setLoading] = useState(false);

  const signUp = async ({ email, password, fullName, organizationName }: SignUpData) => {
    setLoading(true);
    try {
      // 1. Sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      if (!authData.user) {
        throw new Error('Failed to create account');
      }

      // 2. Create organization and link to user using the database function
      // Using type assertion since the function exists but isn't in generated types
      const { data: orgId, error: orgError } = await (supabase.rpc as any)(
        'create_organization_for_user',
        {
          user_id: authData.user.id,
          org_name: organizationName,
          user_full_name: fullName,
        }
      );

      if (orgError) {
        throw orgError;
      }

      return { user: authData.user, organizationId: orgId };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async ({ email, password }: SignInData) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      return data;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      toast.success('Password reset email sent');
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };
}

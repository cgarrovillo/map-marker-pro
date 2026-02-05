import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/integrations/supabase/types';

type SignageType = Tables<'signage_types'>;
type SignageTypeInsert = TablesInsert<'signage_types'>;

export function useSignageTypes(venueLayoutId: string | null) {
  const [signageTypes, setSignageTypes] = useState<SignageType[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch signage types for the venue layout
  useEffect(() => {
    if (!venueLayoutId) {
      setSignageTypes([]);
      setLoading(false);
      return;
    }

    const fetchSignageTypes = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('signage_types')
        .select('*')
        .eq('venue_layout_id', venueLayoutId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching signage types:', error);
      } else {
        setSignageTypes(data || []);
      }
      setLoading(false);
    };

    fetchSignageTypes();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`signage-types-${venueLayoutId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'signage_types',
          filter: `venue_layout_id=eq.${venueLayoutId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Dedupe - might already be added by optimistic update
            setSignageTypes((prev) => {
              if (prev.some((t) => t.id === payload.new.id)) return prev;
              return [...prev, payload.new as SignageType];
            });
          } else if (payload.eventType === 'UPDATE') {
            setSignageTypes((prev) =>
              prev.map((t) => (t.id === payload.new.id ? (payload.new as SignageType) : t))
            );
          } else if (payload.eventType === 'DELETE') {
            setSignageTypes((prev) => prev.filter((t) => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueLayoutId]);

  const createSignageType = useCallback(
    async (name: string): Promise<SignageType | null> => {
      if (!venueLayoutId) return null;

      const trimmedName = name.trim();
      if (!trimmedName) return null;

      // Check for duplicate name
      const existingType = signageTypes.find(
        (t) => t.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (existingType) {
        throw new Error(`Signage type "${trimmedName}" already exists`);
      }

      const newSignageType: SignageTypeInsert = {
        venue_layout_id: venueLayoutId,
        name: trimmedName,
      };

      const { data, error } = await supabase
        .from('signage_types')
        .insert(newSignageType)
        .select()
        .single();

      if (error) {
        console.error('Error creating signage type:', error);
        throw error;
      }

      // Immediately update local state (realtime subscription will dedupe)
      if (data) {
        setSignageTypes((prev) => {
          // Check if already added by realtime
          if (prev.some((t) => t.id === data.id)) return prev;
          return [...prev, data];
        });
      }

      return data;
    },
    [venueLayoutId, signageTypes]
  );

  const deleteSignageType = useCallback(async (id: string) => {
    // Optimistic update - remove immediately
    const previousTypes = signageTypes;
    setSignageTypes((prev) => prev.filter((t) => t.id !== id));

    const { error } = await supabase
      .from('signage_types')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting signage type:', error);
      // Revert on error
      setSignageTypes(previousTypes);
      throw error;
    }
  }, [signageTypes]);

  const renameSignageType = useCallback(
    async (id: string, newName: string) => {
      const trimmedName = newName.trim();
      if (!trimmedName) throw new Error('Name cannot be empty');

      // Check for duplicate name
      const existingType = signageTypes.find(
        (t) => t.id !== id && t.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (existingType) {
        throw new Error(`Signage type "${trimmedName}" already exists`);
      }

      const { error } = await supabase
        .from('signage_types')
        .update({ name: trimmedName })
        .eq('id', id);

      if (error) {
        console.error('Error renaming signage type:', error);
        throw error;
      }
    },
    [signageTypes]
  );

  const updateSignageTypeNotes = useCallback(
    async (id: string, notes: string | null) => {
      // Optimistic update
      const previousTypes = signageTypes;
      setSignageTypes((prev) =>
        prev.map((t) => (t.id === id ? { ...t, notes } : t))
      );

      const { error } = await supabase
        .from('signage_types')
        .update({ notes })
        .eq('id', id);

      if (error) {
        console.error('Error updating signage type notes:', error);
        // Revert on error
        setSignageTypes(previousTypes);
        throw error;
      }
    },
    [signageTypes]
  );

  return {
    signageTypes,
    loading,
    createSignageType,
    deleteSignageType,
    renameSignageType,
    updateSignageTypeNotes,
  };
}

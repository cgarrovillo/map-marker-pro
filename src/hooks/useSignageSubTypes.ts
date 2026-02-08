import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/integrations/supabase/types';

type SignageSubType = Tables<'signage_sub_types'>;
type SignageSubTypeInsert = TablesInsert<'signage_sub_types'>;

// Hook to manage sub-types for ALL signage types in a venue layout
export function useSignageSubTypes(venueLayoutId: string | null, signageTypeIds: string[]) {
  const [subTypesByParent, setSubTypesByParent] = useState<Record<string, SignageSubType[]>>({});
  const [loading, setLoading] = useState(true);

  // Fetch all sub-types for the given signage type IDs
  useEffect(() => {
    if (!venueLayoutId || signageTypeIds.length === 0) {
      setSubTypesByParent({});
      setLoading(false);
      return;
    }

    const fetchSubTypes = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('signage_sub_types')
        .select('*')
        .in('signage_type_id', signageTypeIds)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching signage sub-types:', error);
      } else {
        // Group by parent signage type ID
        const grouped: Record<string, SignageSubType[]> = {};
        for (const subType of data || []) {
          if (!grouped[subType.signage_type_id]) {
            grouped[subType.signage_type_id] = [];
          }
          grouped[subType.signage_type_id].push(subType);
        }
        setSubTypesByParent(grouped);
      }
      setLoading(false);
    };

    fetchSubTypes();

    // Subscribe to realtime updates for all signage type IDs
    // Using a single channel with filter on signage_type_id
    const channels = signageTypeIds.map((signageTypeId) =>
      supabase
        .channel(`signage-sub-types-${signageTypeId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'signage_sub_types',
            filter: `signage_type_id=eq.${signageTypeId}`,
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newSubType = payload.new as SignageSubType;
              setSubTypesByParent((prev) => {
                const parentId = newSubType.signage_type_id;
                const existing = prev[parentId] || [];
                // Dedupe
                if (existing.some((t) => t.id === newSubType.id)) return prev;
                return { ...prev, [parentId]: [...existing, newSubType] };
              });
            } else if (payload.eventType === 'UPDATE') {
              const updatedSubType = payload.new as SignageSubType;
              setSubTypesByParent((prev) => {
                const parentId = updatedSubType.signage_type_id;
                const existing = prev[parentId] || [];
                return {
                  ...prev,
                  [parentId]: existing.map((t) =>
                    t.id === updatedSubType.id ? updatedSubType : t
                  ),
                };
              });
            } else if (payload.eventType === 'DELETE') {
              const deletedId = payload.old.id;
              const parentId = payload.old.signage_type_id;
              setSubTypesByParent((prev) => {
                const existing = prev[parentId] || [];
                return {
                  ...prev,
                  [parentId]: existing.filter((t) => t.id !== deletedId),
                };
              });
            }
          }
        )
        .subscribe()
    );

    return () => {
      channels.forEach((channel) => supabase.removeChannel(channel));
    };
  }, [venueLayoutId, signageTypeIds.join(',')]); // Join IDs for dependency comparison

  const createSubType = useCallback(
    async (signageTypeId: string, name: string): Promise<SignageSubType | null> => {
      const trimmedName = name.trim();
      if (!trimmedName) return null;

      // Check for duplicate name within this parent
      const existingSubTypes = subTypesByParent[signageTypeId] || [];
      const existingType = existingSubTypes.find(
        (t) => t.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (existingType) {
        throw new Error(`Sub-type "${trimmedName}" already exists`);
      }

      const newSubType: SignageSubTypeInsert = {
        signage_type_id: signageTypeId,
        name: trimmedName,
      };

      const { data, error } = await supabase
        .from('signage_sub_types')
        .insert(newSubType)
        .select()
        .single();

      if (error) {
        console.error('Error creating signage sub-type:', error);
        throw error;
      }

      // Optimistically update local state
      if (data) {
        setSubTypesByParent((prev) => {
          const existing = prev[signageTypeId] || [];
          if (existing.some((t) => t.id === data.id)) return prev;
          return { ...prev, [signageTypeId]: [...existing, data] };
        });
      }

      return data;
    },
    [subTypesByParent]
  );

  const deleteSubType = useCallback(
    async (signageTypeId: string, subTypeId: string) => {
      // Optimistic update
      const previousSubTypes = subTypesByParent[signageTypeId] || [];
      setSubTypesByParent((prev) => ({
        ...prev,
        [signageTypeId]: (prev[signageTypeId] || []).filter((t) => t.id !== subTypeId),
      }));

      const { error } = await supabase
        .from('signage_sub_types')
        .delete()
        .eq('id', subTypeId);

      if (error) {
        console.error('Error deleting signage sub-type:', error);
        // Revert on error
        setSubTypesByParent((prev) => ({
          ...prev,
          [signageTypeId]: previousSubTypes,
        }));
        throw error;
      }
    },
    [subTypesByParent]
  );

  const renameSubType = useCallback(
    async (signageTypeId: string, subTypeId: string, newName: string) => {
      const trimmedName = newName.trim();
      if (!trimmedName) throw new Error('Name cannot be empty');

      // Check for duplicate name within this parent
      const existingSubTypes = subTypesByParent[signageTypeId] || [];
      const existingType = existingSubTypes.find(
        (t) => t.id !== subTypeId && t.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (existingType) {
        throw new Error(`Sub-type "${trimmedName}" already exists`);
      }

      const { error } = await supabase
        .from('signage_sub_types')
        .update({ name: trimmedName })
        .eq('id', subTypeId);

      if (error) {
        console.error('Error renaming signage sub-type:', error);
        throw error;
      }
    },
    [subTypesByParent]
  );

  const updateSubTypeColor = useCallback(
    async (signageTypeId: string, subTypeId: string, color: string | null) => {
      // Optimistic update
      const previousSubTypes = subTypesByParent[signageTypeId] || [];
      setSubTypesByParent((prev) => ({
        ...prev,
        [signageTypeId]: (prev[signageTypeId] || []).map((t) =>
          t.id === subTypeId ? { ...t, color } : t
        ),
      }));

      const { error } = await supabase
        .from('signage_sub_types')
        .update({ color })
        .eq('id', subTypeId);

      if (error) {
        console.error('Error updating signage sub-type color:', error);
        // Revert on error
        setSubTypesByParent((prev) => ({
          ...prev,
          [signageTypeId]: previousSubTypes,
        }));
        throw error;
      }
    },
    [subTypesByParent]
  );

  const updateSubTypeImage = useCallback(
    async (signageTypeId: string, subTypeId: string, imageUrl: string | null) => {
      // Optimistic update
      const previousSubTypes = subTypesByParent[signageTypeId] || [];
      setSubTypesByParent((prev) => ({
        ...prev,
        [signageTypeId]: (prev[signageTypeId] || []).map((t) =>
          t.id === subTypeId ? { ...t, image_url: imageUrl } : t
        ),
      }));

      const { error } = await supabase
        .from('signage_sub_types')
        .update({ image_url: imageUrl })
        .eq('id', subTypeId);

      if (error) {
        console.error('Error updating signage sub-type image:', error);
        // Revert on error
        setSubTypesByParent((prev) => ({
          ...prev,
          [signageTypeId]: previousSubTypes,
        }));
        throw error;
      }
    },
    [subTypesByParent]
  );

  // Helper to get sub-types for a specific parent
  const getSubTypesForParent = useCallback(
    (signageTypeId: string): SignageSubType[] => {
      return subTypesByParent[signageTypeId] || [];
    },
    [subTypesByParent]
  );

  return {
    subTypesByParent,
    loading,
    createSubType,
    deleteSubType,
    renameSubType,
    updateSubTypeColor,
    updateSubTypeImage,
    getSubTypesForParent,
  };
}

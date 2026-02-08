import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate, Json } from '@/integrations/supabase/types';
import { Annotation, Point, WashroomSubType, DEFAULT_SIGN_HOLDER } from '@/types/annotations';

type VenueLayout = Tables<'venue_layouts'>;
type VenueLayoutInsert = TablesInsert<'venue_layouts'>;
type VenueLayoutUpdate = TablesUpdate<'venue_layouts'>;

export function useVenueLayouts(eventId: string | null) {
  const [layouts, setLayouts] = useState<VenueLayout[]>([]);
  const [activeLayoutId, setActiveLayoutId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const activeLayout = layouts.find((l) => l.id === activeLayoutId) || null;
  
  // Parse annotations from JSON
  const getAnnotations = (layout: VenueLayout | null): Annotation[] => {
    if (!layout) return [];
    return (layout.annotations as unknown as Annotation[]) || [];
  };

  // Get image URL from storage path
  const getImageUrl = (imagePath: string | null): string | null => {
    if (!imagePath) return null;
    const { data } = supabase.storage.from('venue-images').getPublicUrl(imagePath);
    return data.publicUrl;
  };

  // Fetch layouts for the event
  useEffect(() => {
    if (!eventId) {
      setLayouts([]);
      setActiveLayoutId(null);
      setLoading(false);
      return;
    }

    const fetchLayouts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('venue_layouts')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching layouts:', error);
      } else {
        setLayouts(data || []);
        // Auto-select first layout or create one if none exist
        if (data && data.length > 0) {
          setActiveLayoutId(data[0].id);
        } else {
          setActiveLayoutId(null);
        }
      }
      setLoading(false);
    };

    fetchLayouts();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`layouts-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'venue_layouts',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLayouts((prev) => [...prev, payload.new as VenueLayout]);
          } else if (payload.eventType === 'UPDATE') {
            setLayouts((prev) =>
              prev.map((l) => (l.id === payload.new.id ? (payload.new as VenueLayout) : l))
            );
          } else if (payload.eventType === 'DELETE') {
            setLayouts((prev) => prev.filter((l) => l.id !== payload.old.id));
            if (activeLayoutId === payload.old.id) {
              setActiveLayoutId(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, activeLayoutId]);

  const createLayout = useCallback(
    async (name: string = 'Floor Plan') => {
      if (!eventId) return null;

      const newLayout: VenueLayoutInsert = {
        event_id: eventId,
        name,
        annotations: [] as unknown as Json,
      };

      const { data, error } = await supabase
        .from('venue_layouts')
        .insert(newLayout)
        .select()
        .single();

      if (error) {
        console.error('Error creating layout:', error);
        throw error;
      }

      setActiveLayoutId(data.id);
      return data;
    },
    [eventId]
  );

  const deleteLayout = useCallback(
    async (id: string) => {
      // Get layout to delete its image
      const layout = layouts.find((l) => l.id === id);
      if (layout?.image_path) {
        await supabase.storage.from('venue-images').remove([layout.image_path]);
      }

      const { error } = await supabase.from('venue_layouts').delete().eq('id', id);

      if (error) {
        console.error('Error deleting layout:', error);
        throw error;
      }

      if (activeLayoutId === id) {
        const remaining = layouts.filter((l) => l.id !== id);
        setActiveLayoutId(remaining.length > 0 ? remaining[0].id : null);
      }
    },
    [activeLayoutId, layouts]
  );

  const uploadImage = useCallback(
    async (layoutId: string, file: File) => {
      const layout = layouts.find((l) => l.id === layoutId);
      
      // Delete old image if exists
      if (layout?.image_path) {
        await supabase.storage.from('venue-images').remove([layout.image_path]);
      }

      // Upload new image
      const fileExt = file.name.split('.').pop();
      const filePath = `${layoutId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('venue-images')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        throw uploadError;
      }

      // Update layout with new image path
      const { data, error: updateError } = await supabase
        .from('venue_layouts')
        .update({ image_path: filePath })
        .eq('id', layoutId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating layout image:', updateError);
        throw updateError;
      }

      return data;
    },
    [layouts]
  );

  const addAnnotation = useCallback(
    async (
      layoutId: string,
      category: string,
      type: string,
      points: Point[],
      label?: string,
      signageTypeName?: string,
      signageSubTypeName?: string
    ): Promise<Annotation | null> => {
      const layout = layouts.find((l) => l.id === layoutId);
      if (!layout) return null;

      const currentAnnotations = getAnnotations(layout);
      const newAnnotation: Annotation = {
        id: crypto.randomUUID(),
        category: category as Annotation['category'],
        type: type as Annotation['type'],
        points,
        label,
        createdAt: Date.now(),
        // Set default sign holder for signage annotations
        ...(category === 'signage' && { signHolder: DEFAULT_SIGN_HOLDER }),
        // Include signageTypeName for parent signage type
        ...(signageTypeName && { signageTypeName }),
        // Include signageSubTypeName for the specific sub-type
        ...(signageSubTypeName && { signageSubTypeName }),
      };

      const updatedAnnotations = [...currentAnnotations, newAnnotation];

      // Optimistically update local state immediately
      setLayouts((prev) =>
        prev.map((l) =>
          l.id === layoutId
            ? { ...l, annotations: updatedAnnotations as unknown as Json }
            : l
        )
      );

      const { error } = await supabase
        .from('venue_layouts')
        .update({ annotations: updatedAnnotations as unknown as Json })
        .eq('id', layoutId);

      if (error) {
        console.error('Error adding annotation:', error);
        // Revert optimistic update on error
        setLayouts((prev) =>
          prev.map((l) =>
            l.id === layoutId
              ? { ...l, annotations: currentAnnotations as unknown as Json }
              : l
          )
        );
        throw error;
      }

      return newAnnotation;
    },
    [layouts]
  );

  const deleteAnnotation = useCallback(
    async (layoutId: string, annotationId: string) => {
      const layout = layouts.find((l) => l.id === layoutId);
      if (!layout) return;

      const currentAnnotations = getAnnotations(layout);
      const updatedAnnotations = currentAnnotations.filter((a) => a.id !== annotationId);

      // Optimistically update local state immediately
      setLayouts((prev) =>
        prev.map((l) =>
          l.id === layoutId
            ? { ...l, annotations: updatedAnnotations as unknown as Json }
            : l
        )
      );

      const { error } = await supabase
        .from('venue_layouts')
        .update({ annotations: updatedAnnotations as unknown as Json })
        .eq('id', layoutId);

      if (error) {
        console.error('Error deleting annotation:', error);
        // Revert optimistic update on error
        setLayouts((prev) =>
          prev.map((l) =>
            l.id === layoutId
              ? { ...l, annotations: currentAnnotations as unknown as Json }
              : l
          )
        );
        throw error;
      }
    },
    [layouts]
  );

  const updateAnnotation = useCallback(
    async (layoutId: string, annotationId: string, updates: Partial<Annotation>) => {
      const layout = layouts.find((l) => l.id === layoutId);
      if (!layout) return;

      const currentAnnotations = getAnnotations(layout);
      const updatedAnnotations = currentAnnotations.map((a) =>
        a.id === annotationId ? { ...a, ...updates } : a
      );

      // Optimistically update local state immediately for smooth UX
      setLayouts((prev) =>
        prev.map((l) =>
          l.id === layoutId
            ? { ...l, annotations: updatedAnnotations as unknown as Json }
            : l
        )
      );

      const { error } = await supabase
        .from('venue_layouts')
        .update({ annotations: updatedAnnotations as unknown as Json })
        .eq('id', layoutId);

      if (error) {
        console.error('Error updating annotation:', error);
        // Revert optimistic update on error
        setLayouts((prev) =>
          prev.map((l) =>
            l.id === layoutId
              ? { ...l, annotations: currentAnnotations as unknown as Json }
              : l
          )
        );
        throw error;
      }
    },
    [layouts]
  );

  const clearAnnotations = useCallback(async (layoutId: string) => {
    const { error } = await supabase
      .from('venue_layouts')
      .update({ annotations: [] as unknown as Json })
      .eq('id', layoutId);

    if (error) {
      console.error('Error clearing annotations:', error);
      throw error;
    }
  }, []);

  const renameLayout = useCallback(async (layoutId: string, name: string) => {
    const { error } = await supabase
      .from('venue_layouts')
      .update({ name })
      .eq('id', layoutId);

    if (error) {
      console.error('Error renaming layout:', error);
      throw error;
    }
  }, []);

  return {
    layouts,
    activeLayout,
    activeLayoutId,
    setActiveLayoutId,
    loading,
    createLayout,
    deleteLayout,
    uploadImage,
    addAnnotation,
    deleteAnnotation,
    updateAnnotation,
    clearAnnotations,
    renameLayout,
    getAnnotations,
    getImageUrl,
  };
}

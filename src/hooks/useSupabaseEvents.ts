import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type Event = Tables<'events'>;
type EventInsert = TablesInsert<'events'>;
type EventUpdate = TablesUpdate<'events'>;

export function useSupabaseEvents() {
  const { organization } = useOrganization();
  const [events, setEvents] = useState<Event[]>([]);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const activeEvent = events.find((e) => e.id === activeEventId) || null;

  // Fetch events for the organization
  useEffect(() => {
    if (!organization) {
      console.log('[useSupabaseEvents] No organization, skipping event fetch');
      setEvents([]);
      setLoading(false);
      return;
    }

    const fetchEvents = async () => {
      setLoading(true);
      console.log('[useSupabaseEvents] Fetching events for organization:', organization.id);
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('organization_id', organization.id)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('[useSupabaseEvents] Error fetching events:', error);
      } else {
        console.log('[useSupabaseEvents] Fetched events:', data);
        setEvents(data || []);
      }
      setLoading(false);
    };

    fetchEvents();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('events-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `organization_id=eq.${organization.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setEvents((prev) => {
              const updated = [...prev, payload.new as Event];
              return updated.sort((a, b) => a.sort_order - b.sort_order);
            });
          } else if (payload.eventType === 'UPDATE') {
            setEvents((prev) => {
              const updated = prev.map((e) =>
                e.id === payload.new.id ? (payload.new as Event) : e
              );
              return updated.sort((a, b) => a.sort_order - b.sort_order);
            });
          } else if (payload.eventType === 'DELETE') {
            setEvents((prev) => prev.filter((e) => e.id !== payload.old.id));
            if (activeEventId === payload.old.id) {
              setActiveEventId(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organization, activeEventId]);

  const createEvent = useCallback(
    async (name: string) => {
      console.log('[useSupabaseEvents] createEvent called with name:', name);
      console.log('[useSupabaseEvents] Current organization:', organization);
      
      if (!organization) {
        throw new Error('No organization found. Please ensure you are logged in and have an organization set up.');
      }

      // New events get placed at the end of the list
      const maxSortOrder = events.length > 0
        ? Math.max(...events.map((e) => e.sort_order))
        : -1;

      const newEvent: EventInsert = {
        organization_id: organization.id,
        name,
        sort_order: maxSortOrder + 1,
      };

      console.log('[useSupabaseEvents] Inserting event:', newEvent);

      const { data, error } = await supabase
        .from('events')
        .insert(newEvent)
        .select()
        .single();

      if (error) {
        console.error('[useSupabaseEvents] Error creating event:', error);
        throw error;
      }

      console.log('[useSupabaseEvents] Event created successfully:', data);
      setActiveEventId(data.id);
      return data;
    },
    [organization, events]
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('events').delete().eq('id', id);

      if (error) {
        console.error('Error deleting event:', error);
        throw error;
      }

      if (activeEventId === id) {
        setActiveEventId(null);
      }
    },
    [activeEventId]
  );

  const renameEvent = useCallback(async (id: string, name: string) => {
    const updates: EventUpdate = { name };

    const { error } = await supabase.from('events').update(updates).eq('id', id);

    if (error) {
      console.error('Error renaming event:', error);
      throw error;
    }
  }, []);

  const updateEvent = useCallback(async (id: string, updates: EventUpdate) => {
    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating event:', error);
      throw error;
    }

    return data;
  }, []);

  const reorderEvents = useCallback(
    async (reorderedEvents: Event[]) => {
      // Optimistically update local state
      setEvents(reorderedEvents);

      // Batch update sort_order in the database
      const updates = reorderedEvents.map((event, index) => ({
        id: event.id,
        sort_order: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('events')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);

        if (error) {
          console.error('Error updating event sort order:', error);
          // Refetch to recover from partial failure
          if (organization) {
            const { data } = await supabase
              .from('events')
              .select('*')
              .eq('organization_id', organization.id)
              .order('sort_order', { ascending: true });
            if (data) setEvents(data);
          }
          throw error;
        }
      }
    },
    [organization]
  );

  return {
    events,
    activeEvent,
    activeEventId,
    setActiveEventId,
    loading,
    createEvent,
    deleteEvent,
    renameEvent,
    updateEvent,
    reorderEvents,
  };
}

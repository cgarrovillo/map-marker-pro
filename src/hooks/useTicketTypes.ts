import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/integrations/supabase/types';

type TicketType = Tables<'ticket_types'>;
type TicketTypeInsert = TablesInsert<'ticket_types'>;

export function useTicketTypes(eventId: string | null) {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch ticket types for the event
  useEffect(() => {
    if (!eventId) {
      setTicketTypes([]);
      setLoading(false);
      return;
    }

    const fetchTicketTypes = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('ticket_types')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching ticket types:', error);
      } else {
        setTicketTypes(data || []);
      }
      setLoading(false);
    };

    fetchTicketTypes();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`ticket-types-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_types',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Dedupe - might already be added by optimistic update
            setTicketTypes((prev) => {
              if (prev.some((t) => t.id === payload.new.id)) return prev;
              return [...prev, payload.new as TicketType];
            });
          } else if (payload.eventType === 'UPDATE') {
            setTicketTypes((prev) =>
              prev.map((t) => (t.id === payload.new.id ? (payload.new as TicketType) : t))
            );
          } else if (payload.eventType === 'DELETE') {
            setTicketTypes((prev) => prev.filter((t) => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const createTicketType = useCallback(
    async (name: string): Promise<TicketType | null> => {
      if (!eventId) return null;

      const trimmedName = name.trim();
      if (!trimmedName) return null;

      // Check for duplicate name
      const existingType = ticketTypes.find(
        (t) => t.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (existingType) {
        throw new Error(`Ticket type "${trimmedName}" already exists`);
      }

      const newTicketType: TicketTypeInsert = {
        event_id: eventId,
        name: trimmedName,
      };

      const { data, error } = await supabase
        .from('ticket_types')
        .insert(newTicketType)
        .select()
        .single();

      if (error) {
        console.error('Error creating ticket type:', error);
        throw error;
      }

      // Immediately update local state (realtime subscription will dedupe)
      if (data) {
        setTicketTypes((prev) => {
          // Check if already added by realtime
          if (prev.some((t) => t.id === data.id)) return prev;
          return [...prev, data];
        });
      }

      return data;
    },
    [eventId, ticketTypes]
  );

  const deleteTicketType = useCallback(async (id: string) => {
    // Optimistic update - remove immediately
    const previousTypes = ticketTypes;
    setTicketTypes((prev) => prev.filter((t) => t.id !== id));

    const { error } = await supabase
      .from('ticket_types')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting ticket type:', error);
      // Revert on error
      setTicketTypes(previousTypes);
      throw error;
    }
  }, [ticketTypes]);

  const renameTicketType = useCallback(
    async (id: string, newName: string) => {
      const trimmedName = newName.trim();
      if (!trimmedName) throw new Error('Name cannot be empty');

      // Check for duplicate name
      const existingType = ticketTypes.find(
        (t) => t.id !== id && t.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (existingType) {
        throw new Error(`Ticket type "${trimmedName}" already exists`);
      }

      const { error } = await supabase
        .from('ticket_types')
        .update({ name: trimmedName })
        .eq('id', id);

      if (error) {
        console.error('Error renaming ticket type:', error);
        throw error;
      }
    },
    [ticketTypes]
  );

  return {
    ticketTypes,
    loading,
    createTicketType,
    deleteTicketType,
    renameTicketType,
  };
}

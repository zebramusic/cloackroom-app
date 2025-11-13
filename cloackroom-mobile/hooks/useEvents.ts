import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import type { Event } from '@/lib/types';

export function useEvents(enabled: boolean = true) {
  return useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const data = await apiFetch<{ items: Event[] }>('/api/events');
      return data.items;
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
    enabled,
  });
}

type EventInput = {
  name: string;
  startsAt: number;
  endsAt: number;
};

type EventUpdateInput = Partial<EventInput> & { id: string };

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: EventInput) => {
      return apiFetch<Event>('/api/events', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: EventUpdateInput) => {
      return apiFetch<Event>('/api/events', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      if (variables.id) {
        queryClient.invalidateQueries({ queryKey: ['events', variables.id] });
      }
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/events?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

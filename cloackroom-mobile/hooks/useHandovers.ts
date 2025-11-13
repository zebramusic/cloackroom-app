import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import type { HandoverReport } from '@/lib/types';

export interface HandoversFilters {
  q?: string;
  coat?: string;
  name?: string;
  phone?: string;
  eventName?: string;
  eventId?: string;
  limit?: number;
  offset?: number;
}

function buildQuery(filters?: HandoversFilters) {
  const usp = new URLSearchParams();
  if (!filters) return '';
  if (filters.q) usp.set('q', filters.q);
  if (filters.coat) usp.set('coat', filters.coat);
  if (filters.name) usp.set('name', filters.name);
  if (filters.phone) usp.set('phone', filters.phone);
  if (filters.eventName) usp.set('eventName', filters.eventName);
  if (filters.eventId) usp.set('eventId', filters.eventId);
  if (filters.limit) usp.set('limit', filters.limit.toString());
  if (filters.offset) usp.set('offset', filters.offset.toString());
  const str = usp.toString();
  return str ? `?${str}` : '';
}

export function useHandoversList(filters?: HandoversFilters, enabled: boolean = true) {
  return useQuery({
    queryKey: ['handovers', filters],
    queryFn: async () => {
      const data = await apiFetch<{ items: HandoverReport[] }>(
        `/api/handover${buildQuery(filters)}`
      );
      return data.items;
    },
    refetchOnWindowFocus: false,
    enabled,
  });
}

export function useHandoverDetail(id: string | null) {
  return useQuery({
    queryKey: ['handover', id],
    queryFn: async () => {
      if (!id) return null;
      const data = await apiFetch<{ items: HandoverReport[] }>(
        `/api/handover?id=${encodeURIComponent(id)}`
      );
      const match = data.items.find((item) => item.id === id) ?? null;
      return match;
    },
    enabled: Boolean(id),
    refetchOnWindowFocus: false,
  });
}

type HandoverMutationPayload = HandoverReport;

function useHandoverMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: HandoverMutationPayload) => {
      const data = await apiFetch<HandoverReport>('/api/handover', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['handover', data.id], data);
      queryClient.invalidateQueries({ queryKey: ['handovers'] });
    },
  });
}

export function useCreateHandover() {
  return useHandoverMutation();
}

export function useUpdateHandover() {
  return useHandoverMutation();
}

export function useDeleteHandover() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/handover?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['handovers'] });
      queryClient.removeQueries({ queryKey: ['handover', id] });
    },
  });
}

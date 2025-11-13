import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api';
import type { AdminListItem, StaffListItem } from '@/lib/types';

export function useStaffList(enabled: boolean = true) {
  return useQuery({
    queryKey: ['admin', 'staff'],
    queryFn: async () => {
      const data = await apiFetch<{ items: StaffListItem[] }>('/api/admin/staff');
      return data.items;
    },
    enabled,
  });
}

export function useAdminList(enabled: boolean = true) {
  return useQuery({
    queryKey: ['admin', 'admins'],
    queryFn: async () => {
      const data = await apiFetch<{ items: AdminListItem[] }>('/api/admin/admins');
      return data.items;
    },
    enabled,
  });
}

export function useAuthorizeStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; isAuthorized: boolean }) => {
      await apiFetch('/api/admin/staff', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] });
    },
  });
}

type CreateStaffInput = {
  fullName: string;
  email: string;
  password: string;
  isAuthorized?: boolean;
  authorizedEventId?: string | null;
};

type UpdateStaffInput = {
  id: string;
  fullName?: string;
  email?: string;
  password?: string;
  isAuthorized?: boolean;
  authorizedEventId?: string | null;
};

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateStaffInput) => {
      return apiFetch('/api/admin/staff', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] });
    },
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateStaffInput) => {
      return apiFetch('/api/admin/staff', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] });
      if (variables.id) {
        queryClient.invalidateQueries({ queryKey: ['admin', 'staff', variables.id] });
      }
    },
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/admin/staff?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] });
    },
  });
}

type CreateAdminInput = {
  fullName: string;
  email: string;
  password: string;
};

type UpdateAdminInput = {
  id: string;
  fullName?: string;
  email?: string;
  password?: string;
};

export function useCreateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateAdminInput) => {
      return apiFetch('/api/admin/admins', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'admins'] });
    },
  });
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateAdminInput) => {
      return apiFetch('/api/admin/admins', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'admins'] });
    },
  });
}

export function useDeleteAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/admin/admins?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'admins'] });
    },
  });
}

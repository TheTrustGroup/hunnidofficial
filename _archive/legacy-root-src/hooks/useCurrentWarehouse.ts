/**
 * Phase 2 Rebirth: Single source for current warehouse (real UUID only).
 * Option A: uses GET /api/auth/current-warehouse (Bearer token). No Supabase client or RLS needed.
 */
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../lib/api';
import { apiGet } from '../lib/apiClient';

export interface CurrentWarehouse {
  id: string;
  name: string;
  isLoading: boolean;
  error: string | null;
}

interface CurrentWarehouseResponse {
  id: string | null;
  name: string | null;
}

export function useCurrentWarehouse(): CurrentWarehouse {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['current-warehouse', user?.id ?? user?.email],
    queryFn: async (): Promise<CurrentWarehouseResponse> => {
      if (!user?.email?.trim()) throw new Error('No user');
      const res = await apiGet<CurrentWarehouseResponse>(
        API_BASE_URL,
        '/api/auth/current-warehouse',
        { timeoutMs: 15_000 }
      );
      if (!res?.id) throw new Error('No warehouse assigned');
      return { id: res.id, name: res.name ?? 'Warehouse' };
    },
    enabled: !!user?.email?.trim(),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  return {
    id: data?.id ?? '',
    name: data?.name ?? '',
    isLoading,
    error: error ? (error as Error).message : null,
  };
}

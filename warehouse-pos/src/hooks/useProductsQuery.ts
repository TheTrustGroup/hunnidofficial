/**
 * Shared products query for POS (and optionally Inventory).
 * Cache key: ['products', warehouseId]; staleTime 60s, gcTime 5min so navigation doesn't refetch when fresh.
 *
 * Inventory page currently uses its own fetch with server-side filters (q, category, size_code, color).
 * To share cache in a future iteration: use this hook when all filters are "all" and fall back to
 * the existing fetch when any filter is applied.
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { API_BASE_URL, getApiHeaders } from '../lib/api';
import type { POSProduct } from '../components/pos/SizePickerSheet';
import { isValidWarehouseId } from '../lib/warehouseId';

const PAGE_SIZE = 100;
const STALE_MS = 60_000;
const GC_MS = 5 * 60 * 1000;

export const productsQueryKey = (warehouseId: string) => ['products', warehouseId] as const;

async function fetchProductsPage(
  warehouseId: string,
  offset: number
): Promise<{ data: POSProduct[]; total: number }> {
  const url = `${API_BASE_URL}/api/products?warehouse_id=${encodeURIComponent(warehouseId)}&limit=${PAGE_SIZE}&offset=${offset}`;
  const res = await fetch(url, {
    headers: getApiHeaders() as HeadersInit,
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
  }
  const raw = await res.json();
  const data = Array.isArray(raw) ? raw : raw?.data ?? raw?.products ?? [];
  const total = typeof raw?.total === 'number' ? raw.total : data.length;
  return { data: data as POSProduct[], total };
}

export function useProductsQuery(warehouseId: string | undefined, enabled: boolean) {
  const q = useInfiniteQuery({
    queryKey: productsQueryKey(warehouseId ?? ''),
    queryFn: ({ pageParam }) => fetchProductsPage(warehouseId!, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + (p.data?.length ?? 0), 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    enabled: Boolean(enabled && isValidWarehouseId(warehouseId)),
    staleTime: STALE_MS,
    gcTime: GC_MS,
  });

  const products = q.data?.pages.flatMap((p) => p.data ?? []) ?? [];
  const totalCount = q.data?.pages[q.data.pages.length - 1]?.total ?? 0;

  return {
    products,
    totalCount,
    isLoading: q.isPending && q.isFetching,
    loadingMore: q.isFetchingNextPage,
    loadMore: q.hasNextPage ? q.fetchNextPage : undefined,
    refetch: q.refetch,
    error: q.error,
  };
}

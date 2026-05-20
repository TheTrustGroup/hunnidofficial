/**
 * GET /api/dashboard?warehouse_id=...&date=YYYY-MM-DD
 * Returns dashboard stats for the given warehouse (stock value, low stock, today's sales, etc.).
 * Auth required.
 */
import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/cors';
import { requireAuth } from '@/lib/auth/session';
import { getDashboardStats } from '@/lib/data/dashboardStats';
import { isInvalidWarehouseId, resolveWarehouseId } from '@/lib/data/resolveWarehouseId';
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
/** Dashboard may load up to 250 products for category summary; allow cold start. */
export const maxDuration = 30;

function withCors(res: NextResponse, req: NextRequest): NextResponse {
  Object.entries(corsHeaders(req)).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return withCors(auth, req);

  const sp = req.nextUrl.searchParams;
  const warehouseId = sp.get('warehouse_id')?.trim();
  const date = sp.get('date')?.trim() ?? new Date().toISOString().split('T')[0];

  if (!warehouseId || isInvalidWarehouseId(warehouseId)) {
    return withCors(
      NextResponse.json({ error: 'warehouse_id is required and must be valid' }, { status: 400 }),
      req
    );
  }

  const resolvedId = await resolveWarehouseId(getSupabase(), warehouseId);
  if (isInvalidWarehouseId(resolvedId)) {
    return withCors(
      NextResponse.json({ error: 'Unknown warehouse_id' }, { status: 400 }),
      req
    );
  }

  try {
    const data = await getDashboardStats(resolvedId, { date });
    return withCors(NextResponse.json(data), req);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Internal error';
    return withCors(
      NextResponse.json({ error: message }, { status: 500 }),
      req
    );
  }
}

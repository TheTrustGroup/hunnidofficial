/**
 * GET /api/dashboard?warehouse_id=...&date=YYYY-MM-DD
 * Returns dashboard stats for the given warehouse (stock value, low stock, today's sales, etc.).
 * Auth required.
 * Cached 30s by warehouse_stats:{warehouseId}:{date}; invalidated on sale and product create/update/delete for that warehouse.
 */
import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/cors';
import { requireAuth } from '@/lib/auth/session';
import { getDashboardStats } from '@/lib/data/dashboardStats';
import { getCachedStats, setCachedStats } from '@/lib/cache/warehouseStatsCache';

export const dynamic = 'force-dynamic';

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

  if (!warehouseId) {
    return withCors(
      NextResponse.json({ error: 'warehouse_id is required' }, { status: 400 }),
      req
    );
  }

  try {
    let data: Awaited<ReturnType<typeof getDashboardStats>> | null = null;
    try {
      data = await getCachedStats(warehouseId, date);
    } catch {
      /* cache failure: fall back to DB */
    }
    if (data != null) {
      return withCors(NextResponse.json(data), req);
    }
    data = await getDashboardStats(warehouseId, { date });
    try {
      await setCachedStats(warehouseId, date, data);
    } catch {
      /* cache write failure: response still correct */
    }
    return withCors(NextResponse.json(data), req);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Internal error';
    return withCors(
      NextResponse.json({ error: message }, { status: 500 }),
      req
    );
  }
}

/**
 * GET /api/dashboard?warehouse_id=...&date=YYYY-MM-DD
 * Returns dashboard stats for the given warehouse (stock value, low stock, today's sales, etc.).
 * Auth required.
 */
import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/cors';
import { requireAuth } from '@/lib/auth/session';
import { getDashboardStats } from '@/lib/data/dashboardStats';

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
    const data = await getDashboardStats(warehouseId, { date });
    return withCors(NextResponse.json(data), req);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Internal error';
    return withCors(
      NextResponse.json({ error: message }, { status: 500 }),
      req
    );
  }
}

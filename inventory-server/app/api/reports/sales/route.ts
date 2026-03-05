/**
 * GET /api/reports/sales?from=ISO&to=ISO&warehouse_id=UUID&include_voided=false
 * Returns aggregated sales report from SQL (get_sales_report RPC).
 * Revenue, COGS (sale_lines.cost_price), profit, AOV, top products, sales by day, by category.
 * Auth required. Excludes voided sales unless include_voided=true.
 */
import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/cors';
import { requireAuth, getEffectiveWarehouseId, type Session } from '@/lib/auth/session';
import { getScopeForUser } from '@/lib/data/userScopes';
import { getSupabase } from '@/lib/supabase';

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
  const fromParam = sp.get('from')?.trim();
  const toParam = sp.get('to')?.trim();
  const requestedWarehouseId = sp.get('warehouse_id')?.trim();
  const warehouseId = requestedWarehouseId || (await getEffectiveWarehouseId(auth as Session, undefined)) || '';

  if (!fromParam || !toParam) {
    return withCors(
      NextResponse.json({ error: 'from and to (ISO date) are required' }, { status: 400 }),
      req
    );
  }

  const fromDate = new Date(fromParam);
  const toDate = new Date(toParam);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return withCors(
      NextResponse.json({ error: 'from and to must be valid ISO dates' }, { status: 400 }),
      req
    );
  }
  if (fromDate > toDate) {
    return withCors(
      NextResponse.json({ error: 'from must be before or equal to to' }, { status: 400 }),
      req
    );
  }

  const includeVoided = sp.get('include_voided') === 'true';

  const scope = await getScopeForUser((auth as Session).email);
  const allowedIds = scope.allowedWarehouseIds ?? [];
  const hasScope = allowedIds.length > 0;
  const isUnrestricted = /^(admin|super_admin|administrator)$/i.test((auth as Session).role ?? '');
  if (warehouseId && hasScope && !isUnrestricted && !allowedIds.includes(warehouseId)) {
    return withCors(
      NextResponse.json({ error: 'Not allowed for this warehouse' }, { status: 403 }),
      req
    );
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('get_sales_report', {
      p_from: fromDate.toISOString(),
      p_to: toDate.toISOString(),
      p_warehouse_id: warehouseId || null,
      p_include_voided: includeVoided,
    });

    if (error) {
      console.error('[GET /api/reports/sales] RPC error', error);
      return withCors(
        NextResponse.json({ error: error.message ?? 'Report failed' }, { status: 500 }),
        req
      );
    }

    const raw = data as Record<string, unknown> | null;
    if (!raw || typeof raw !== 'object') {
      return withCors(NextResponse.json({ data: null, error: 'Empty report' }, { status: 200 }), req);
    }

    const response = {
      revenue: Number(raw.revenue ?? 0),
      cogs: Number(raw.cogs ?? 0),
      profit: Number(raw.profit ?? 0),
      transactionCount: Number(raw.transaction_count ?? 0),
      totalItemsSold: Number(raw.total_items_sold ?? 0),
      averageOrderValue: Number(raw.average_order_value ?? 0),
      totalVoided: Number(raw.total_voided ?? 0),
      topProducts: (raw.top_products as Array<Record<string, unknown>>) ?? [],
      salesByDay: (raw.sales_by_day as Array<Record<string, unknown>>) ?? [],
      salesByCategory: (raw.sales_by_category as Array<Record<string, unknown>>) ?? [],
    };

    const res = NextResponse.json({ data: response }, { status: 200 });
    res.headers.set('Cache-Control', 'private, max-age=60');
    return withCors(res, req);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Internal error';
    console.error('[GET /api/reports/sales]', message);
    return withCors(
      NextResponse.json({ error: message }, { status: 500 }),
      req
    );
  }
}

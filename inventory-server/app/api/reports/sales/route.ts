/**
 * GET /api/reports/sales — aggregated sales report (get_sales_report RPC).
 */
import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/cors';
import { requireAuth } from '@/lib/auth/session';
import { getScopeForUser } from '@/lib/data/userScopes';
import { getSupabase } from '@/lib/supabase';
import { toSafeError } from '@/lib/safeError';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

function withCors(res: NextResponse, req: NextRequest): NextResponse {
  Object.entries(corsHeaders(req)).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const h = corsHeaders(req);
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return withCors(auth, req);

  const { searchParams } = new URL(req.url);
  const warehouseId = searchParams.get('warehouse_id')?.trim() ?? '';
  const fromRaw = searchParams.get('from')?.trim() ?? '';
  const toRaw = searchParams.get('to')?.trim() ?? '';
  const includeVoided = searchParams.get('include_voided') === 'true';

  if (!warehouseId) {
    return withCors(
      NextResponse.json({ error: 'warehouse_id is required' }, { status: 400, headers: h }),
      req
    );
  }

  const scope = await getScopeForUser(auth.email);
  if (
    scope.allowedWarehouseIds.length > 0 &&
    !scope.allowedWarehouseIds.includes(warehouseId)
  ) {
    return withCors(
      NextResponse.json({ error: 'Forbidden: warehouse not in scope' }, { status: 403, headers: h }),
      req
    );
  }

  const pFrom = fromRaw || new Date(0).toISOString();
  const pTo = toRaw || new Date().toISOString();

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('get_sales_report', {
      p_from: pFrom,
      p_to: pTo,
      p_warehouse_id: warehouseId,
      p_include_voided: includeVoided,
    });
    if (error) {
      console.error('[GET /api/reports/sales] RPC error:', error.message);
      return withCors(
        NextResponse.json({ error: toSafeError(error) }, { status: 500, headers: h }),
        req
      );
    }
    const raw = (data ?? {}) as Record<string, unknown>;
    const body = {
      data: {
        revenue: Number(raw.revenue ?? 0),
        cogs: Number(raw.cogs ?? 0),
        profit: Number(raw.profit ?? 0),
        transactionCount: Number(raw.transaction_count ?? 0),
        totalItemsSold: Number(raw.total_items_sold ?? 0),
        averageOrderValue: Number(raw.average_order_value ?? 0),
        totalVoided: Number(raw.total_voided ?? 0),
        topProducts: Array.isArray(raw.top_products) ? raw.top_products : [],
        salesByDay: Array.isArray(raw.sales_by_day) ? raw.sales_by_day : [],
        salesByCategory: Array.isArray(raw.sales_by_category) ? raw.sales_by_category : [],
      },
    };
    const res = NextResponse.json(body, { headers: h });
    res.headers.set('Cache-Control', 'private, max-age=60');
    return withCors(res, req);
  } catch (e) {
    console.error('[GET /api/reports/sales]', e);
    return withCors(
      NextResponse.json({ error: toSafeError(e) }, { status: 500, headers: h }),
      req
    );
  }
}

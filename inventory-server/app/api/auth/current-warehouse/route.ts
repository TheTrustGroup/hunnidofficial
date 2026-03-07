/**
 * GET /api/auth/current-warehouse — current warehouse for the authenticated user (Option A: API-based).
 * Returns { id, name } from user_scopes (first allowed warehouse). No Supabase client needed on frontend.
 */
import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/cors';
import { requireAuth } from '@/lib/auth/session';
import { getScopeForUser } from '@/lib/data/userScopes';
import { getWarehouseById } from '@/lib/data/warehouses';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

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

  const scope = await getScopeForUser(auth.email);
  const warehouseId = scope.allowedWarehouseIds[0] ?? auth.warehouse_id ?? null;
  if (!warehouseId) {
    // 200 + null so client doesn't retry (404 would be retried by apiGet). UI shows "Could not load warehouse".
    return withCors(
      NextResponse.json({ id: null, name: null }, { status: 200, headers: h }),
      req
    );
  }

  const warehouse = await getWarehouseById(warehouseId);
  const name = warehouse?.name ?? 'Warehouse';
  return withCors(
    NextResponse.json({ id: warehouseId, name }, { status: 200, headers: h }),
    req
  );
}

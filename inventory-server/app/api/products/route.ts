/**
 * Products API — list, create, get-by-id, update, delete.
 * List: GET /api/products (no id).
 * Create: POST /api/products.
 * Get one: GET /api/products?id=xxx&warehouse_id=yyy (Vercel-safe; path /api/products/:id not routed).
 * Update: PUT or PATCH /api/products with body { id, warehouseId, ... }.
 * Delete: DELETE /api/products with body or query { id, warehouseId } (or warehouse_id).
 */
import { NextRequest, NextResponse } from 'next/server';

/** Allow up to 30s so large product lists (e.g. limit=1000) don't hit Vercel default 10s and cause "connection was lost". */
export const maxDuration = 30;
import { getWarehouseProducts, createWarehouseProduct } from '@/lib/data/warehouseProducts';
import { getScopeForUser } from '@/lib/data/userScopes';
import { requireAuth, requireAdmin, getEffectiveWarehouseId } from '@/lib/auth/session';
import { logDurability } from '@/lib/data/durabilityLogger';
import {
  handleGetProductById,
  handlePutProductById,
  handleDeleteProductById,
} from '@/lib/api/productByIdHandlers';
import type { PutProductBody } from '@/lib/data/warehouseProducts';
import { corsHeaders } from '@/lib/cors';
import { toSafeError } from '@/lib/safeError';

export const dynamic = 'force-dynamic';

/** CORS preflight for cross-origin PUT/PATCH/DELETE from the warehouse frontend. */
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

function getRequestId(request: NextRequest): string {
  return request.headers.get('x-request-id')?.trim() || request.headers.get('x-correlation-id')?.trim() || crypto.randomUUID();
}

/** Attach CORS to a response so cross-origin fetch with credentials succeeds. */
function withCors(res: NextResponse, request: NextRequest): NextResponse {
  const h = corsHeaders(request);
  Object.entries(h).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return withCors(auth, request);
  const { searchParams } = new URL(request.url);
  const requestedWarehouseId = searchParams.get('warehouse_id')?.trim() ?? undefined;

  const scope = await getScopeForUser(auth.email);
  const isAdmin = /^(admin|super_admin|administrator)$/i.test(auth.role ?? '');
  if (!isAdmin && scope.allowedWarehouseIds.length > 0 && requestedWarehouseId && !scope.allowedWarehouseIds.includes(requestedWarehouseId)) {
    return withCors(NextResponse.json({ error: 'Access denied' }, { status: 403 }), request);
  }

  const effectiveWarehouseId = await getEffectiveWarehouseId(auth, requestedWarehouseId);
  if (effectiveWarehouseId === null) {
    return withCors(NextResponse.json({ error: 'Access denied' }, { status: 403 }), request);
  }

  const id = searchParams.get('id')?.trim();
  if (id) {
    return withCors(await handleGetProductById(id, effectiveWarehouseId), request);
  }
  try {
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    const q = searchParams.get('q') ?? undefined;
    const category = searchParams.get('category') ?? undefined;
    const sizeCode = searchParams.get('size_code') ?? undefined;
    const color = searchParams.get('color') ?? undefined;
    const lowStock = searchParams.get('low_stock') === '1' || searchParams.get('low_stock') === 'true';
    const outOfStock = searchParams.get('out_of_stock') === '1' || searchParams.get('out_of_stock') === 'true';
    const result = await getWarehouseProducts(effectiveWarehouseId, {
      limit: limit != null ? parseInt(limit, 10) : undefined,
      offset: offset != null ? parseInt(offset, 10) : undefined,
      q,
      category,
      sizeCode,
      color,
      lowStock,
      outOfStock,
    });
    const res = NextResponse.json({ data: result.data, total: result.total });
    res.headers.set('Cache-Control', 'private, max-age=60');
    return withCors(res, request);
  } catch (e) {
    console.error('[API ERROR]', e);
    return withCors(
      NextResponse.json(
        { error: toSafeError(e) },
        { status: 500 }
      ),
      request
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return withCors(auth, request);
  const requestId = getRequestId(request);
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return withCors(NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }), request);
  }
  const warehouseId = (body?.warehouseId as string) ?? undefined;
  const scope = await getScopeForUser(auth.email);
  if (scope.allowedWarehouseIds.length > 0 && warehouseId && !scope.allowedWarehouseIds.includes(warehouseId)) {
    return withCors(
      NextResponse.json(
        { error: 'Forbidden: you do not have access to this warehouse' },
        { status: 403 }
      ),
      request
    );
  }
  try {
    const created = await createWarehouseProduct(body);
    const entityId = (created as { id?: string })?.id ?? '';
    logDurability({
      status: 'success',
      entity_type: 'product',
      entity_id: entityId,
      warehouse_id: warehouseId,
      request_id: requestId,
      user_role: auth.role,
    });
    return withCors(NextResponse.json(created, { status: 201 }), request);
  } catch (e) {
    const entityId = (body?.id && typeof body.id === 'string' ? body.id : '') || 'unknown';
    logDurability({
      status: 'failed',
      entity_type: 'product',
      entity_id: entityId,
      warehouse_id: warehouseId,
      request_id: requestId,
      user_role: auth.role,
      message: e instanceof Error ? e.message : 'Failed to create product',
    });
    console.error('[API ERROR]', e);
    return withCors(
      NextResponse.json(
        { error: toSafeError(e) },
        { status: 400 }
      ),
      request
    );
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return withCors(auth, request);
  let body: PutProductBody & { id?: string };
  try {
    body = (await request.json()) as PutProductBody & { id?: string };
  } catch {
    return withCors(NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }), request);
  }
  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id) return withCors(NextResponse.json({ error: 'id required in body' }, { status: 400 }), request);
  const bodyWarehouseId = String(body.warehouseId ?? body.warehouse_id ?? '').trim();
  const warehouseId = await getEffectiveWarehouseId(auth, bodyWarehouseId || undefined, {
    path: request.nextUrl.pathname,
    method: 'PUT',
  });
  if (!warehouseId) return withCors(NextResponse.json({ error: 'warehouseId required' }, { status: 400 }), request);
  return withCors(await handlePutProductById(request, id, body, warehouseId, auth), request);
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  return PUT(request);
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return withCors(auth, request);
  const { searchParams } = new URL(request.url);
  let id = searchParams.get('id')?.trim() ?? '';
  let warehouseId: string | null = searchParams.get('warehouse_id')?.trim() ?? null;
  if (!id || !warehouseId) {
    try {
      const body = (await request.json()) as { id?: string; warehouseId?: string; warehouse_id?: string };
      id = id || String(body?.id ?? '').trim();
      warehouseId = warehouseId ?? (String(body?.warehouseId ?? body?.warehouse_id ?? '').trim() || null);
    } catch {
      /* body optional */
    }
  }
  if (!id) return withCors(NextResponse.json({ error: 'id required (query or body)' }, { status: 400 }), request);
  if (!warehouseId) return withCors(NextResponse.json({ error: 'warehouseId required (query or body)' }, { status: 400 }), request);
  return withCors(await handleDeleteProductById(request, id, warehouseId, auth), request);
}

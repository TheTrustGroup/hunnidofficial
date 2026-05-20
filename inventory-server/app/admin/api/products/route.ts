import { NextRequest, NextResponse } from 'next/server';
import { getWarehouseProducts, createWarehouseProduct } from '@/lib/data/warehouseProducts';
import { requireAdmin, getEffectiveWarehouseId } from '@/lib/auth/session';
import { logDurability } from '@/lib/data/durabilityLogger';
import { toSafeError } from '@/lib/safeError';
import { handlePutProductById } from '@/lib/api/productByIdHandlers';
import type { PutProductBody } from '@/lib/data/warehouseProducts';

export const dynamic = 'force-dynamic';

function getRequestId(request: NextRequest): string {
  return request.headers.get('x-request-id')?.trim() || request.headers.get('x-correlation-id')?.trim() || crypto.randomUUID();
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth as NextResponse;
  try {
    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouse_id') ?? undefined;
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    const q = searchParams.get('q') ?? undefined;
    const category = searchParams.get('category') ?? undefined;
    const sizeCode = searchParams.get('size_code') ?? undefined;
    const color = searchParams.get('color') ?? undefined;
    const lowStock = searchParams.get('low_stock') === '1' || searchParams.get('low_stock') === 'true';
    const outOfStock = searchParams.get('out_of_stock') === '1' || searchParams.get('out_of_stock') === 'true';
    const result = await getWarehouseProducts(warehouseId, {
      limit: limit != null ? parseInt(limit, 10) : undefined,
      offset: offset != null ? parseInt(offset, 10) : undefined,
      q,
      category,
      sizeCode,
      color,
      lowStock,
      outOfStock,
    });
    return NextResponse.json({ data: result.data, total: result.total });
  } catch (e) {
    console.error('[API ERROR]', e);
    return NextResponse.json(
      { error: toSafeError(e) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth as NextResponse;
  const requestId = getRequestId(request);
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const warehouseId = (body?.warehouseId as string) ?? undefined;
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
    return NextResponse.json(created, { status: 201 });
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
    return NextResponse.json(
      { error: toSafeError(e) },
      { status: 400 }
    );
  }
}

/** PUT product: body { id, warehouseId, ... }. Returns updated product. Same behavior as /api/products PUT. */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  let body: PutProductBody & { id?: string };
  try {
    body = (await request.json()) as PutProductBody & { id?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id) return NextResponse.json({ error: 'id required in body' }, { status: 400 });
  const bodyWarehouseId = String(body.warehouseId ?? body.warehouse_id ?? '').trim();
  const warehouseId = await getEffectiveWarehouseId(auth, bodyWarehouseId || undefined, {
    path: request.nextUrl.pathname,
    method: 'PUT',
  });
  if (!warehouseId) return NextResponse.json({ error: 'warehouseId required' }, { status: 400 });
  return handlePutProductById(request, id, body, warehouseId, auth);
}

/** PATCH: same as PUT. */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  return PUT(request);
}

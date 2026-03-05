import { NextRequest, NextResponse } from 'next/server';
import {
  getProductById,
  updateWarehouseProduct,
  deleteWarehouseProduct,
} from '@/lib/data/warehouseProducts';
import type { Session } from '@/lib/auth/session';
import type { PutProductBody } from '@/lib/data/warehouseProducts';
import { toSafeError } from '@/lib/safeError';
import { invalidateDashboardCacheForWarehouse } from '@/lib/cache/warehouseStatsCache';

/** GET one product by query id + warehouse_id. Returns 200 with product (includes images) or 404. */
export async function handleGetProductById(
  productId: string,
  warehouseId: string
): Promise<NextResponse> {
  const product = await getProductById(warehouseId, productId);
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }
  return NextResponse.json(product);
}

/** PUT one product. Updates warehouse_products and warehouse inventory for the given warehouse. */
export async function handlePutProductById(
  _request: NextRequest,
  id: string,
  body: PutProductBody,
  warehouseId: string,
  _auth: Session
): Promise<NextResponse> {
  try {
    const updated = await updateWarehouseProduct(id, warehouseId, body);
    if (!updated) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    await invalidateDashboardCacheForWarehouse(warehouseId);
    return NextResponse.json(updated);
  } catch (e) {
    const err = e as Error & { code?: string };
    if (err?.code === '23505') {
      return NextResponse.json(
        { error: 'A product with this name, color, and SKU already exists.' },
        { status: 409 }
      );
    }
    console.error('[API ERROR]', e);
    return NextResponse.json({ message: toSafeError(e) }, { status: 400 });
  }
}

/** DELETE one product from the given warehouse; removes product row if no other warehouse has it. */
export async function handleDeleteProductById(
  _request: NextRequest,
  id: string,
  warehouseId: string,
  _auth: Session
): Promise<NextResponse> {
  try {
    await deleteWarehouseProduct(id, warehouseId);
    await invalidateDashboardCacheForWarehouse(warehouseId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[API ERROR]', e);
    return NextResponse.json({ message: toSafeError(e) }, { status: 400 });
  }
}

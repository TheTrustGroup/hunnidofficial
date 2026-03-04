import { NextRequest, NextResponse } from 'next/server';
import { processSaleDeductions } from '@/lib/data/warehouseInventory';
import { requirePosRole, getEffectiveWarehouseId } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/** POST /api/inventory/deduct — atomic batch deduction for POS sale. Cashier+ only. Warehouse must be in user scope. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requirePosRole(request);
  if (auth instanceof NextResponse) return auth as NextResponse;
  try {
    const body = await request.json();
    const bodyWarehouseId = typeof body.warehouseId === 'string' ? body.warehouseId.trim() : '';
    const items = body.items as Array<{ productId: string; quantity: number }>;

    if (!bodyWarehouseId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { message: 'warehouseId and non-empty items array required' },
        { status: 400 }
      );
    }

    const warehouseId = await getEffectiveWarehouseId(auth, bodyWarehouseId || undefined);
    if (!warehouseId) {
      return NextResponse.json(
        { message: 'warehouseId must be a warehouse you are allowed to use' },
        { status: 403 }
      );
    }

    await processSaleDeductions(warehouseId, items);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const err = e as Error & { status?: number };
    const isInsufficient = err.message?.includes('INSUFFICIENT_STOCK') ?? err.status === 409;
    return NextResponse.json(
      { message: err.message ?? 'Deduction failed' },
      { status: isInsufficient ? 409 : 400 }
    );
  }
}

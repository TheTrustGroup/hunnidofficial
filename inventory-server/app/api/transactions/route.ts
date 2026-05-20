import { NextRequest, NextResponse } from 'next/server';
import { processSale, listTransactions, getTransactionByIdempotencyKey } from '@/lib/data/transactions';
import { requirePosRole, getEffectiveWarehouseId, requireAuth } from '@/lib/auth/session';
import { resolveUserScope, isStoreAllowed, isWarehouseAllowed, isPosAllowed, logScopeDeny } from '@/lib/auth/scope';
import { getRejectionByKey, recordRejection } from '@/lib/data/syncRejections';
import { isLegacyTransactionPostAllowed } from '@/lib/legacyTransactions';
import { toSafeError } from '@/lib/safeError';

export const dynamic = 'force-dynamic';

/** GET /api/transactions — list transactions (auth required). Admin/unrestricted: full. Scoped: only allowed store/warehouse/pos. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth as NextResponse;
  try {
    const { searchParams } = new URL(request.url);
    const clientWarehouseId = searchParams.get('warehouse_id') ?? undefined;
    const clientStoreId = searchParams.get('store_id') ?? undefined;
    const clientPosId = searchParams.get('pos_id') ?? undefined;
    const from = searchParams.get('from') ?? undefined;
    const to = searchParams.get('to') ?? undefined;
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    const scope = await resolveUserScope(auth);
    if (!scope.isUnrestricted) {
      if (clientStoreId && !isStoreAllowed(scope, clientStoreId)) {
        logScopeDeny({ path: request.nextUrl.pathname, method: request.method, email: auth.email, storeId: clientStoreId });
      }
      if (clientWarehouseId && !isWarehouseAllowed(scope, clientWarehouseId)) {
        logScopeDeny({ path: request.nextUrl.pathname, method: request.method, email: auth.email, warehouseId: clientWarehouseId });
      }
      if (clientPosId && !isPosAllowed(scope, clientPosId)) {
        logScopeDeny({ path: request.nextUrl.pathname, method: request.method, email: auth.email, posId: clientPosId });
      }
    }

    const warehouse_id = scope.isUnrestricted ? clientWarehouseId : (clientWarehouseId && isWarehouseAllowed(scope, clientWarehouseId) ? clientWarehouseId : undefined);
    const store_id = scope.isUnrestricted ? clientStoreId : (clientStoreId && isStoreAllowed(scope, clientStoreId) ? clientStoreId : undefined);
    const pos_id = scope.isUnrestricted ? clientPosId : (clientPosId && isPosAllowed(scope, clientPosId) ? clientPosId : undefined);

    const result = await listTransactions({
      warehouse_id,
      store_id,
      pos_id,
      from,
      to,
      limit: limit != null ? parseInt(limit, 10) : undefined,
      offset: offset != null ? parseInt(offset, 10) : undefined,
      scopeStoreIds: scope.isUnrestricted ? undefined : (scope.allowedStoreIds.length > 0 ? scope.allowedStoreIds : undefined),
      scopeWarehouseIds: scope.isUnrestricted ? undefined : (scope.allowedWarehouseIds.length > 0 ? scope.allowedWarehouseIds : undefined),
      scopePosIds: scope.isUnrestricted ? undefined : (scope.allowedPosIds.length > 0 ? scope.allowedPosIds : undefined),
    });
    const response = NextResponse.json({ data: result.data, total: result.total });
    response.headers.set('Cache-Control', 'private, max-age=60');
    return response;
  } catch (e) {
    console.error('[api/transactions GET]', e);
    return NextResponse.json({ message: toSafeError(e) }, { status: 500 });
  }
}

/** POST /api/transactions — deprecated. Use POST /api/sales (record_sale). Gated by ALLOW_LEGACY_TRANSACTION_POST. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isLegacyTransactionPostAllowed()) {
    console.warn('[sales-path] legacy_transactions_rejected', {
      path: request.nextUrl.pathname,
      hint: 'Client should use POST /api/sales',
    });
    return NextResponse.json(
      {
        error: 'POST /api/transactions is deprecated. Use POST /api/sales for POS and offline sale replay.',
        code: 'USE_SALES_API',
      },
      { status: 410 }
    );
  }
  const auth = await requirePosRole(request);
  if (auth instanceof NextResponse) return auth as NextResponse;
  let idempotencyKey: string | null = null;
  let warehouseId: string | null = null;
  try {
    const body = await request.json();
    const bodyWarehouseId = body.warehouseId ?? body.warehouse_id;
    warehouseId = await getEffectiveWarehouseId(auth, bodyWarehouseId, {
      path: request.nextUrl.pathname,
      method: request.method,
    });
    if (!warehouseId) {
      return NextResponse.json(
        { message: 'warehouseId required' },
        { status: 400 }
      );
    }
    const scope = await resolveUserScope(auth);
    if (!scope.isUnrestricted && scope.allowedWarehouseIds.length > 0 && !scope.allowedWarehouseIds.includes(warehouseId)) {
      logScopeDeny({ path: request.nextUrl.pathname, method: request.method, email: auth.email, warehouseId });
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    idempotencyKey =
      (typeof body.idempotencyKey === 'string' && body.idempotencyKey.trim()) ||
      request.headers.get('idempotency-key')?.trim() ||
      request.headers.get('Idempotency-Key')?.trim() ||
      null;

    if (idempotencyKey) {
      const existing = await getTransactionByIdempotencyKey(idempotencyKey);
      if (existing) {
        return NextResponse.json({ id: existing.id, ...body });
      }
      const rejection = await getRejectionByKey(idempotencyKey);
      if (rejection) {
        const code = rejection.voidedAt ? 'VOIDED' : rejection.reason;
        return NextResponse.json(
          { code, message: rejection.voidedAt ? 'This sale was voided by admin.' : rejection.reason },
          { status: 409 }
        );
      }
    }

    const payload = {
      id: body.id,
      transactionNumber: body.transactionNumber ?? body.transaction_number,
      type: body.type ?? 'sale',
      warehouseId,
      items: Array.isArray(body.items) ? body.items : [],
      subtotal: Number(body.subtotal) ?? 0,
      tax: Number(body.tax) ?? 0,
      discount: Number(body.discount) ?? 0,
      total: Number(body.total) ?? 0,
      paymentMethod: body.paymentMethod ?? body.payment_method ?? 'cash',
      payments: Array.isArray(body.payments) ? body.payments : [],
      cashier: body.cashier ?? '',
      customer: body.customer ?? null,
      status: body.status ?? 'completed',
      syncStatus: body.syncStatus ?? body.sync_status ?? 'synced',
      createdAt: body.createdAt ?? body.created_at ?? new Date().toISOString(),
      completedAt: body.completedAt ?? body.completed_at ?? null,
    };
    const sessionContext = {
      storeId: auth.store_id ?? undefined,
      posId: auth.device_id ?? undefined,
      operatorId: undefined as string | null | undefined,
    };
    const result = await processSale(payload, sessionContext, idempotencyKey);
    console.warn('[sales-path] legacy_transactions_post', {
      warehouseId,
      email: auth.email,
      idempotencyKey: idempotencyKey ?? undefined,
      saleId: result.id,
    });
    return NextResponse.json({ id: result.id, ...body });
  } catch (e: unknown) {
    const err = e as Error & { status?: number };
    if (err.status === 409 && idempotencyKey && err.message?.includes?.('INSUFFICIENT_STOCK')) {
      try {
        await recordRejection({
          idempotencyKey,
          posId: auth.device_id ?? undefined,
          storeId: auth.store_id ?? undefined,
          warehouseId: warehouseId ?? undefined,
          reason: 'INSUFFICIENT_STOCK',
        });
      } catch (recordErr) {
        console.error('[api/transactions] recordRejection failed', recordErr);
      }
      return NextResponse.json(
        { code: 'INSUFFICIENT_STOCK', message: toSafeError(err) },
        { status: 409 }
      );
    }
    const status = err.status === 409 ? 409 : 400;
    return NextResponse.json({ message: toSafeError(err) }, { status });
  }
}

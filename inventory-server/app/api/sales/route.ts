// ============================================================
// route.ts  →  inventory-server/app/api/sales/route.ts
//
// POST /api/sales         — record sale + deduct stock
// GET  /api/sales         — list sales with line items (?pending=true for pending/dispatched)
// PATCH /api/sales        — mark delivery status (body: saleId, deliveryStatus, deliveredBy?)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '@/lib/cors';
import { requireAuth, getEffectiveWarehouseId } from '@/lib/auth/session';
import { getScopeForUser } from '@/lib/data/userScopes';
import { toSafeError } from '@/lib/safeError';
import { invalidateDashboardCacheForWarehouse } from '@/lib/cache/warehouseStatsCache';

function withCors(res: NextResponse, req: NextRequest): NextResponse {
  const h = corsHeaders(req);
  Object.entries(h).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

function getDb() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── POST /api/sales ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const h = corsHeaders(req);
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return withCors(auth, req);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: h });
  }

  const bodyWarehouseId = String(body.warehouseId ?? '').trim();
  const paymentMethod = String(body.paymentMethod ?? '').trim();
  const lines = body.lines as Array<Record<string, unknown>> | undefined;
  const subtotal = Number(body.subtotal ?? 0);
  const discountPct = Number(body.discountPct ?? 0);
  const discountAmt = Number(body.discountAmt ?? 0);
  const total = Number(body.total ?? subtotal - discountAmt);
  const customerName = String(body.customerName ?? '').trim() || null;

  // Delivery fields (all optional, default = instant delivery)
  const deliveryStatus = String(body.deliveryStatus ?? 'delivered').trim();
  const recipientName = String(body.recipientName ?? '').trim() || null;
  const recipientPhone = String(body.recipientPhone ?? '').trim() || null;
  const deliveryAddress = String(body.deliveryAddress ?? '').trim() || null;
  const deliveryNotes = String(body.deliveryNotes ?? '').trim() || null;
  const expectedDate = String(body.expectedDate ?? '').trim() || null;

  const validStatuses = ['delivered', 'pending', 'dispatched'];
  const effectiveDeliveryStatus = validStatuses.includes(deliveryStatus) ? deliveryStatus : 'delivered';

  const warehouseId = await getEffectiveWarehouseId(auth, bodyWarehouseId || undefined, {
    path: req.nextUrl.pathname,
    method: req.method,
  });
  if (!warehouseId)
    return NextResponse.json(
      { error: 'warehouseId is required and must be a warehouse you are allowed to use' },
      { status: 400, headers: h }
    );
  if (!['Cash', 'MoMo', 'Card', 'Mix'].includes(paymentMethod))
    return NextResponse.json({ error: 'paymentMethod must be Cash, MoMo, Card, or Mix' }, { status: 400, headers: h });
  if (!Array.isArray(lines) || lines.length === 0)
    return NextResponse.json({ error: 'lines must be non-empty array' }, { status: 400, headers: h });

  const rawMix = body.paymentMixBreakdown as Record<string, unknown> | undefined;
  let paymentMixBreakdown: { cash: number; momo: number; card: number } | null = null;
  if (paymentMethod === 'Mix' && rawMix && typeof rawMix === 'object') {
    const cash = Number(rawMix.cash ?? 0);
    const momo = Number(rawMix.momo ?? 0);
    const card = Number(rawMix.card ?? 0);
    const sum = cash + momo + card;
    if (Math.abs(sum - total) > 0.01) {
      return NextResponse.json(
        { error: `Mix breakdown (Cash + MoMo + Card) must equal total. Got ${sum.toFixed(2)}, total ${total.toFixed(2)}` },
        { status: 400, headers: h }
      );
    }
    paymentMixBreakdown = { cash, momo, card };
  }

  type NLine = {
    productId: string;
    sizeCode: string | null;
    qty: number;
    unitPrice: number;
    lineTotal: number;
    name: string;
    sku: string;
    imageUrl: string | null;
  };
  let normalizedLines: NLine[];
  try {
    normalizedLines = lines.map((l, i) => {
      const productId = String(l.productId ?? '').trim();
      if (!productId) throw new Error(`lines[${i}].productId missing`);
      const qty = Math.max(1, Math.floor(Number(l.qty ?? 1)));
      const up = Number(l.unitPrice ?? 0);
      return {
        productId,
        sizeCode: String(l.sizeCode ?? '').trim().toUpperCase() || null,
        qty,
        unitPrice: up,
        lineTotal: Number(l.lineTotal ?? up * qty),
        name: String(l.name ?? 'Product'),
        sku: String(l.sku ?? ''),
        imageUrl: String(l.imageUrl ?? '').trim() || null,
      };
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Invalid lines';
    return NextResponse.json({ error: message }, { status: 400, headers: h });
  }

  try {
    const db = getDb();

    // Try atomic RPC first. record_sale deducts stock (warehouse_inventory / warehouse_inventory_by_size)
    // and inserts sale + sale_lines. Pass p_lines as JSON string so DB always receives valid array (record_sale has text overload).
    const { data, error } = await db.rpc('record_sale', {
      p_warehouse_id: warehouseId,
      p_lines: JSON.stringify(normalizedLines),
      p_subtotal: subtotal,
      p_discount_pct: discountPct,
      p_discount_amt: discountAmt,
      p_total: total,
      p_payment_method: paymentMethod,
      p_customer_name: customerName,
      p_sold_by: null,
      p_sold_by_email: auth?.email ?? null,
    });

    if (error) {
      if (error.message?.includes('INSUFFICIENT_STOCK')) {
        return NextResponse.json(
          { error: 'Insufficient stock for one or more items. Reduce quantity or remove items and try again.' },
          { status: 409, headers: h }
        );
      }
      if (error.message?.includes('INVALID_LINE')) {
        return NextResponse.json(
          { error: 'Invalid line items. Ensure each product has an ID; sized products must include size.' },
          { status: 400, headers: h }
        );
      }
      // One-time fix: duplicate record_sale overload causes "Could not choose the best candidate"
      if (error.message?.includes('Could not choose the best candidate')) {
        console.error('[POST /api/sales] record_sale ambiguous (duplicate overload). Run RUN_ONCE_fix_record_sale_500.sql in Supabase.', {
          message: error.message,
        });
        return NextResponse.json(
          {
            error: 'Sale recording requires a one-time database fix. Run the SQL below in Supabase SQL Editor (project linked to this API), then retry.',
            code: 'RECORD_SALE_AMBIGUOUS',
            fixSql: [
              'DROP FUNCTION IF EXISTS record_sale(uuid, jsonb, numeric, numeric, numeric, numeric, text, text, uuid, text, jsonb);',
              'DROP FUNCTION IF EXISTS record_sale(uuid, text, numeric, numeric, numeric, numeric, text, text, uuid, text, jsonb);',
              'DROP FUNCTION IF EXISTS record_sale(uuid, jsonb, numeric, numeric, numeric, numeric, text, text, uuid, text);',
            ],
          },
          { status: 503, headers: h }
        );
      }
      // RPC missing (e.g. record_sale not deployed). Fallback is non-atomic — disabled by default.
      // To use atomic sales: run migration 20250228170000_sales_sold_by_email.sql in Supabase (creates record_sale).
      // Set ALLOW_SALE_FALLBACK=true only in dev/staging if you must test without the RPC; never in production.
      if (error.code === '42883' || error.message?.includes('does not exist')) {
        console.error('[POST /api/sales] record_sale RPC failed (missing or error)', {
          code: error.code,
          message: error.message,
          details: error.details,
        });
        const allowFallback = process.env.ALLOW_SALE_FALLBACK === 'true';
        if (!allowFallback) {
          return NextResponse.json(
            { error: 'Sale processing unavailable. Contact support.' },
            { status: 503, headers: h }
          );
        }
        console.warn('[SALE FALLBACK] Non-atomic path used — not safe for production');
        return manualSaleFallback({
          db,
          auth,
          warehouseId,
          normalizedLines,
          subtotal,
          discountPct,
          discountAmt,
          total,
          paymentMethod,
          customerName,
          deliveryStatus: effectiveDeliveryStatus,
          recipientName,
          recipientPhone,
          deliveryAddress,
          deliveryNotes,
          expectedDate,
          paymentMixBreakdown,
          h,
        });
      }
      console.error('[POST /api/sales] record_sale RPC error', { code: error.code, message: error.message, details: error.details });
      return NextResponse.json({ error: toSafeError(error) }, { status: 500, headers: h });
    }

    const result = typeof data === 'string' ? JSON.parse(data) : (data ?? {});
    const saleId = result.id ?? result.saleId ?? null;

    // Patch delivery fields and/or mix breakdown onto the sale if needed
    if (saleId) {
      const patches: Record<string, unknown> = {};
      if (effectiveDeliveryStatus !== 'delivered') {
        Object.assign(patches, {
          delivery_status: effectiveDeliveryStatus,
          recipient_name: recipientName,
          recipient_phone: recipientPhone,
          delivery_address: deliveryAddress,
          delivery_notes: deliveryNotes,
          expected_date: expectedDate,
        });
      }
      if (paymentMethod === 'Mix' && paymentMixBreakdown) {
        patches.payment_mix_breakdown = paymentMixBreakdown;
      }
      if (Object.keys(patches).length > 0) {
        await db.from('sales').update(patches).eq('id', saleId);
      }
    }

    await invalidateDashboardCacheForWarehouse(warehouseId);

    const receiptId = result.receiptId ?? result.receipt_id ?? `RCP-${saleId?.slice(0, 8) ?? 'unknown'}`;
    console.info('[POST /api/sales] 201', { saleId, receiptId, warehouseId, itemCount: normalizedLines.reduce((s, l) => s + l.qty, 0) });

    const res = NextResponse.json(
      {
        id: saleId,
        receiptId,
        total,
        itemCount: normalizedLines.reduce((s, l) => s + l.qty, 0),
        status: 'completed',
        deliveryStatus: effectiveDeliveryStatus,
        createdAt: result.createdAt ?? result.created_at ?? new Date().toISOString(),
      },
      { status: 201, headers: h }
    );
    if (saleId) res.headers.set('X-Sale-Id', saleId);
    return res;
  } catch (e: unknown) {
    console.error('[API ERROR]', e);
    return NextResponse.json({ error: toSafeError(e) }, { status: 500, headers: h });
  }
}

// ── Manual fallback (use only when record_sale RPC is missing) ─────────────
// Disabled by default (ALLOW_SALE_FALLBACK must be explicitly "true"). Not atomic:
// if a deduction fails mid-loop, sale + some lines may be inserted without corresponding
// stock deduction. To re-enable the atomic path: deploy the record_sale RPC via
// migration 20250228170000_sales_sold_by_email.sql in Supabase; then do not set
// ALLOW_SALE_FALLBACK in production.

async function manualSaleFallback(args: {
  db: ReturnType<typeof getDb>;
  auth?: { email: string };
  warehouseId: string;
  normalizedLines: Array<{
    productId: string;
    sizeCode: string | null;
    qty: number;
    unitPrice: number;
    lineTotal: number;
    name: string;
    sku: string;
    imageUrl: string | null;
  }>;
  subtotal: number;
  discountPct: number;
  discountAmt: number;
  total: number;
  paymentMethod: string;
  customerName: string | null;
  deliveryStatus: string;
  recipientName: string | null;
  recipientPhone: string | null;
  deliveryAddress: string | null;
  deliveryNotes: string | null;
  expectedDate: string | null;
  paymentMixBreakdown: { cash: number; momo: number; card: number } | null;
  h: Record<string, string>;
}): Promise<NextResponse> {
  const {
    db,
    auth,
    warehouseId,
    normalizedLines,
    subtotal,
    discountPct,
    discountAmt,
    total,
    paymentMethod,
    customerName,
    deliveryStatus,
    recipientName,
    recipientPhone,
    deliveryAddress,
    deliveryNotes,
    expectedDate,
    paymentMixBreakdown,
    h,
  } = args;
  const { randomUUID } = await import('crypto');
  const saleId = randomUUID();
  const ts = new Date();
  const receiptId = `RCP-${ts.toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(1000 + Math.random() * 9000))}`;
  const now = ts.toISOString();
  const itemCount = normalizedLines.reduce((s, l) => s + l.qty, 0);

  const { error: saleErr } = await db.from('sales').insert({
    id: saleId,
    warehouse_id: warehouseId,
    customer_name: customerName,
    payment_method: paymentMethod,
    subtotal,
    discount_pct: discountPct,
    discount_amt: discountAmt,
    total,
    item_count: itemCount,
    receipt_id: receiptId,
    status: 'completed',
    sold_by_email: auth?.email?.trim() || null,
    delivery_status: deliveryStatus,
    recipient_name: recipientName,
    recipient_phone: recipientPhone,
    delivery_address: deliveryAddress,
    delivery_notes: deliveryNotes,
    expected_date: expectedDate,
    ...(paymentMixBreakdown && { payment_mix_breakdown: paymentMixBreakdown }),
    created_at: now,
  });
  if (saleErr) {
    console.error('[API ERROR]', saleErr);
    return NextResponse.json({ error: toSafeError(saleErr) }, { status: 500, headers: h });
  }

  for (const line of normalizedLines) {
    await db.from('sale_lines').insert({
      id: randomUUID(),
      sale_id: saleId,
      product_id: line.productId,
      size_code: line.sizeCode,
      name: line.name,
      sku: line.sku,
      unit_price: line.unitPrice,
      qty: line.qty,
      line_total: line.lineTotal,
      ...(line.imageUrl != null && { product_image_url: line.imageUrl }),
    });

    // Stock deduction
    const { data: prod } = await db
      .from('warehouse_products')
      .select('size_kind')
      .eq('id', line.productId)
      .maybeSingle();
    const sizeKind = (prod as { size_kind?: string } | null)?.size_kind ?? 'na';

    if (sizeKind === 'sized' && line.sizeCode) {
      const { data: sr } = await db
        .from('warehouse_inventory_by_size')
        .select('quantity')
        .eq('warehouse_id', warehouseId)
        .eq('product_id', line.productId)
        .ilike('size_code', line.sizeCode)
        .maybeSingle();
      if (sr != null) {
        await db
          .from('warehouse_inventory_by_size')
          .update({
            quantity: Math.max(0, (sr as { quantity: number }).quantity - line.qty),
            updated_at: now,
          })
          .eq('warehouse_id', warehouseId)
          .eq('product_id', line.productId)
          .ilike('size_code', line.sizeCode);
      }
      const { data: allSizes } = await db
        .from('warehouse_inventory_by_size')
        .select('quantity')
        .eq('warehouse_id', warehouseId)
        .eq('product_id', line.productId);
      const newTotal = (allSizes ?? []).reduce((s: number, r: { quantity?: number }) => s + (r.quantity ?? 0), 0);
      await db
        .from('warehouse_inventory')
        .update({ quantity: newTotal, updated_at: now })
        .eq('warehouse_id', warehouseId)
        .eq('product_id', line.productId);
    } else {
      const { data: inv } = await db
        .from('warehouse_inventory')
        .select('quantity')
        .eq('warehouse_id', warehouseId)
        .eq('product_id', line.productId)
        .maybeSingle();
      if (inv != null) {
        await db
          .from('warehouse_inventory')
          .update({
            quantity: Math.max(0, (inv as { quantity: number }).quantity - line.qty),
            updated_at: now,
          })
          .eq('warehouse_id', warehouseId)
          .eq('product_id', line.productId);
      }
    }
  }

  await invalidateDashboardCacheForWarehouse(warehouseId);

  return NextResponse.json(
    {
      id: saleId,
      receiptId,
      total,
      itemCount,
      status: 'completed',
      deliveryStatus,
      createdAt: now,
    },
    { status: 201, headers: h }
  );
}

// ── GET /api/sales ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const h = corsHeaders(req);
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return withCors(auth, req);

  const sp = req.nextUrl.searchParams;
  const requestedWarehouseId = sp.get('warehouse_id') ?? '';
  const date = sp.get('date');
  const from = sp.get('from') ?? (date ? `${date}T00:00:00.000Z` : undefined);
  const to = sp.get('to') ?? (date ? `${date}T23:59:59.999Z` : undefined);
  const limit = Math.min(Number(sp.get('limit') ?? 100), 500);
  const offset = Number(sp.get('offset') ?? 0);
  const pending = sp.get('pending') === 'true';
  const deliveryHistory = sp.get('delivery_history') === 'true';
  const includeVoided = sp.get('include_voided') === 'true';

  // Enforce warehouse scope: Hunnid Main users must not see Main Jeff data and vice versa.
  const scope = await getScopeForUser(auth.email);
  const isUnrestricted = /^(admin|super_admin|administrator)$/i.test(auth.role ?? '');
  const allowedIds = scope.allowedWarehouseIds ?? [];
  const hasScope = allowedIds.length > 0;
  const warehouseId = requestedWarehouseId;
  if (hasScope && !isUnrestricted) {
    if (requestedWarehouseId && !allowedIds.includes(requestedWarehouseId)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have access to this warehouse' },
        { status: 403, headers: h }
      );
    }
  }

  try {
    const db = getDb();
    // sale_lines table uses columns name, sku (not product_name, product_sku)
    let q = db
      .from('sales')
      .select(
        `
      id, receipt_id, warehouse_id, customer_name,
      payment_method, payment_mix_breakdown, subtotal, discount_pct, discount_amt,
      total, item_count, sold_by, sold_by_email, status, created_at,
      voided_at, voided_by,
      delivery_status, recipient_name, recipient_phone,
      delivery_address, delivery_notes, expected_date,
      delivered_at, delivered_by,
      sale_lines (
        id, product_id, size_code, name, sku,
        unit_price, qty, line_total, product_image_url, cost_price
      )
    `
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (!includeVoided) q = q.is('voided_at', null);

    if (warehouseId) q = q.eq('warehouse_id', warehouseId);
    else if (hasScope && !isUnrestricted && allowedIds.length > 0) {
      q = q.in('warehouse_id', allowedIds);
    }
    if (from) q = q.gte('created_at', from);
    if (to) q = q.lte('created_at', to);
    // Queue: pending/dispatched/cancelled. History: delivered + cancelled.
    if (deliveryHistory) q = q.in('delivery_status', ['delivered', 'cancelled']);
    else if (pending) q = q.in('delivery_status', ['pending', 'dispatched', 'cancelled']);

    const { data, error } = await q;

    if (error) {
      const msg = error.message ?? '';
      const useLegacy =
        msg.includes('delivery_status') ||
        msg.includes('recipient_name') ||
        msg.includes('voided_at') ||
        msg.includes('voided_by') ||
        msg.includes('delivered_at') ||
        msg.includes('delivered_by') ||
        msg.includes('expected_date') ||
        msg.includes('sold_by_email') ||
        msg.includes('payment_mix_breakdown') ||
        /column.*does not exist/i.test(msg);
      if (useLegacy) {
        console.warn('[GET /api/sales] DB missing columns, using legacy:', msg);
        return getSalesLegacy(db, req, h, warehouseId, from, to, limit, offset, {
          allowedIds,
          hasScope,
          isUnrestricted,
        });
      }
      console.error('[API ERROR]', error);
      return NextResponse.json({ error: toSafeError(error) }, { status: 500, headers: h });
    }

    const rows = (data ?? []).filter((s: { status?: string }) => !s.status || s.status === 'completed');
    const res = NextResponse.json({ data: shapeSales(rows), total: rows.length }, { headers: h });
    res.headers.set('Cache-Control', 'private, max-age=60');
    return res;
  } catch (e: unknown) {
    console.error('[API ERROR]', e);
    return NextResponse.json({ error: toSafeError(e) }, { status: 500, headers: h });
  }
}

// ── PATCH /api/sales — mark delivery status ───────────────────────────────
// Body: { saleId, deliveryStatus, deliveredBy? }

export async function PATCH(req: NextRequest) {
  const h = corsHeaders(req);
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return withCors(auth, req);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: h });
  }

  const saleId = String(body.saleId ?? body.id ?? '').trim();
  const deliveryStatus = String(body.deliveryStatus ?? '').trim();
  const deliveredBy = String(body.deliveredBy ?? '').trim() || null;
  const warehouseId = String(body.warehouseId ?? '').trim();

  if (!saleId)
    return NextResponse.json({ error: 'saleId is required' }, { status: 400, headers: h });
  if (!['delivered', 'pending', 'dispatched', 'cancelled'].includes(deliveryStatus))
    return NextResponse.json(
      { error: 'deliveryStatus must be delivered, pending, dispatched, or cancelled' },
      { status: 400, headers: h }
    );

  try {
    const db = getDb();
    const updates: Record<string, unknown> = { delivery_status: deliveryStatus };

    if (deliveryStatus === 'delivered') {
      (updates as Record<string, string>).delivered_at = new Date().toISOString();
      if (deliveredBy) (updates as Record<string, string>).delivered_by = deliveredBy;
    }

    let q = db.from('sales').update(updates).eq('id', saleId);
    if (warehouseId) q = q.eq('warehouse_id', warehouseId);

    const { error } = await q;
    if (error) {
      console.error('[API ERROR]', error);
      return NextResponse.json({ error: toSafeError(error) }, { status: 500, headers: h });
    }

    const { data: saleRow } = await db.from('sales').select('warehouse_id').eq('id', saleId).maybeSingle();
    const whIdToInvalidate = warehouseId || (saleRow as { warehouse_id?: string } | null)?.warehouse_id;
    if (whIdToInvalidate) await invalidateDashboardCacheForWarehouse(whIdToInvalidate);

    return NextResponse.json({ success: true, saleId, deliveryStatus }, { headers: h });
  } catch (e: unknown) {
    console.error('[API ERROR]', e);
    return NextResponse.json({ error: toSafeError(e) }, { status: 500, headers: h });
  }
}

// ── Legacy fallback (old schema without delivery columns) ─────────────────

async function getSalesLegacy(
  db: ReturnType<typeof getDb>,
  _req: NextRequest,
  h: Record<string, string>,
  warehouseId: string,
  from?: string,
  to?: string,
  limit = 100,
  offset = 0,
  scope?: { allowedIds: string[]; hasScope: boolean; isUnrestricted: boolean }
): Promise<NextResponse> {
  // sale_lines uses name, sku (not product_name, product_sku)
  let q = db
    .from('sales')
    .select(
      `id, receipt_id, warehouse_id, customer_name, payment_method,
             subtotal, discount_pct, discount_amt, total, item_count, sold_by, created_at,
             sale_lines(id, product_id, size_code, name, sku, unit_price, qty, line_total)`
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (warehouseId) q = q.eq('warehouse_id', warehouseId);
  else if (scope?.hasScope && !scope?.isUnrestricted && (scope.allowedIds?.length ?? 0) > 0) {
    q = q.in('warehouse_id', scope.allowedIds);
  }
  if (from) q = q.gte('created_at', from);
  if (to) q = q.lte('created_at', to);
  const { data, error } = await q;
  if (error) {
    console.error('[API ERROR]', error);
    return NextResponse.json({ error: toSafeError(error) }, { status: 500, headers: h });
  }
  return NextResponse.json(
    { data: shapeSales(data ?? []), total: data?.length ?? 0 },
    { headers: h }
  );
}

// ── Shape helper ──────────────────────────────────────────────────────────

function shapeSales(rows: Array<Record<string, unknown>>) {
  return rows.map((s: Record<string, unknown>) => ({
    id: s.id,
    receiptId: s.receipt_id,
    warehouseId: s.warehouse_id,
    customerName: s.customer_name,
    paymentMethod: s.payment_method,
    paymentMixBreakdown: s.payment_mix_breakdown as { cash?: number; momo?: number; card?: number } | null ?? null,
    subtotal: Number(s.subtotal ?? 0),
    discountPct: Number(s.discount_pct ?? 0),
    discountAmt: Number(s.discount_amt ?? 0),
    total: Number(s.total ?? 0),
    itemCount: s.item_count,
    status: s.status ?? 'completed',
    deliveryStatus: s.delivery_status ?? 'delivered',
    recipientName: s.recipient_name ?? null,
    recipientPhone: s.recipient_phone ?? null,
    deliveryAddress: s.delivery_address ?? null,
    deliveryNotes: s.delivery_notes ?? null,
    expectedDate: s.expected_date ?? null,
    deliveredAt: s.delivered_at ?? null,
    deliveredBy: s.delivered_by ?? null,
    soldBy: s.sold_by ?? null,
    soldByEmail: s.sold_by_email ?? null,
    voidedAt: s.voided_at ?? null,
    voidedBy: s.voided_by ?? null,
    createdAt: s.created_at,
    lines: ((s.sale_lines as Array<Record<string, unknown>>) ?? []).map((l: Record<string, unknown>) => ({
      id: l.id,
      productId: l.product_id,
      sizeCode: l.size_code,
      name: (l.name ?? l.product_name) ?? '',
      sku: (l.sku ?? l.product_sku) ?? '',
      unitPrice: Number(l.unit_price ?? 0),
      qty: l.qty,
      lineTotal: Number(l.line_total ?? 0),
      imageUrl: l.product_image_url ?? null,
      costPrice: Number(l.cost_price ?? 0),
    })),
  }));
}

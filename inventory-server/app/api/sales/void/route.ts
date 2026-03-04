// POST /api/sales/void — void a sale (restore stock, set voided_at). Uses void_sale RPC.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '@/lib/cors';
import { requireAuth } from '@/lib/auth/session';
import { getScopeForUser } from '@/lib/data/userScopes';

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

  const saleId = String(body.saleId ?? body.id ?? '').trim();
  const voidedBy = String(body.voidedBy ?? auth?.email ?? '').trim() || null;
  const warehouseId = String(body.warehouseId ?? '').trim();

  if (!saleId) {
    return NextResponse.json({ error: 'saleId is required' }, { status: 400, headers: h });
  }

  try {
    const db = getDb();

    if (warehouseId) {
      const scope = await getScopeForUser(auth?.email ?? '');
      const allowedIds = scope.allowedWarehouseIds ?? [];
      const hasScope = allowedIds.length > 0;
      const isUnrestricted = /^(admin|super_admin|administrator)$/i.test((auth as { role?: string })?.role ?? '');
      if (hasScope && !isUnrestricted && !allowedIds.includes(warehouseId)) {
        return NextResponse.json({ error: 'Not allowed to void sales for this warehouse' }, { status: 403, headers: h });
      }
    }

    const { error } = await db.rpc('void_sale', {
      p_sale_id: saleId,
      p_voided_by: voidedBy,
    });

    if (error) {
      if (error.message?.includes('SALE_NOT_FOUND')) {
        return NextResponse.json({ error: 'Sale not found' }, { status: 404, headers: h });
      }
      if (error.message?.includes('SALE_ALREADY_VOIDED')) {
        return NextResponse.json({ error: 'Sale is already voided' }, { status: 409, headers: h });
      }
      return NextResponse.json({ error: error.message }, { status: 500, headers: h });
    }

    return NextResponse.json({ success: true, saleId }, { headers: h });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500, headers: h });
  }
}

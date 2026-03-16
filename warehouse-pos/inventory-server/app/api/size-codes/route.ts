/**
 * GET /api/size-codes?warehouse_id= — return size codes for datalist (auth required).
 * warehouse_id is optional; response is global size code list.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getSupabase } from '@/lib/supabase';
import { corsHeaders } from '@/lib/cors';

export const dynamic = 'force-dynamic';

function withCors(res: NextResponse, req: NextRequest): NextResponse {
  Object.entries(corsHeaders(req)).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return withCors(auth, request);

  try {
    const db = getSupabase();
    const { data, error } = await db
      .from('size_codes')
      .select('size_code, size_label, sort_order, size_order');

    if (error) {
      // Table may not exist or RLS; return empty array so UI still works
      console.warn('[api/size-codes]', error.message);
      return withCors(NextResponse.json([]), request);
    }

    const list = (data ?? []).map((row: { size_code?: string; size_label?: string; sort_order?: number; size_order?: number }) => {
      const order = typeof row.sort_order === 'number' ? row.sort_order : typeof row.size_order === 'number' ? row.size_order : 0;
      return {
        size_code: String(row.size_code ?? ''),
        size_label: row.size_label ?? undefined,
        size_order: order,
      };
    });
    return withCors(NextResponse.json(list), request);
  } catch (e) {
    console.warn('[api/size-codes]', e);
    return withCors(NextResponse.json([]), request);
  }
}

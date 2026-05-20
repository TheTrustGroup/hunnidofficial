import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const NOT_IMPLEMENTED = {
  error: 'Orders management is not implemented',
  code: 'NOT_IMPLEMENTED',
} as const;

/**
 * GET /api/orders — list orders (auth required).
 * Returns empty array when this backend does not store orders.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth as NextResponse;
  return NextResponse.json({ data: [] });
}

/**
 * POST /api/orders — create order (stub).
 * Returns 501 until orders are implemented; frontend can fall back to local-only.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth as NextResponse;
  return NextResponse.json(NOT_IMPLEMENTED, { status: 501 });
}

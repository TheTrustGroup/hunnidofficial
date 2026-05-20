import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const NOT_IMPLEMENTED = {
  error: 'Orders management is not implemented',
  code: 'NOT_IMPLEMENTED',
} as const;

/** PATCH /api/orders/[id]/assign-driver — assign driver (stub). Returns 501 until implemented. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth as NextResponse;
  await params;
  return NextResponse.json(NOT_IMPLEMENTED, { status: 501 });
}

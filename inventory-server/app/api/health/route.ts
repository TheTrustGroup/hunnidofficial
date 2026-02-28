import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/cors';

export const dynamic = 'force-dynamic';

/** Health check for deploy verification and CI. No auth required. */
export async function GET(request: NextRequest) {
  const res = NextResponse.json({
    status: 'ok',
    db: 'unavailable',
    timestamp: new Date().toISOString(),
  });
  Object.entries(corsHeaders(request)).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

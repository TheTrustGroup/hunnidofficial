import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/cors';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';
const envOk = Boolean(SUPABASE_URL && SUPABASE_KEY);

/** Health check for deploy verification and CI. No auth required. */
export async function GET(request: NextRequest) {
  const payload: { status: string; db: string; timestamp: string; env?: string } = {
    status: envOk ? 'ok' : 'degraded',
    db: 'unavailable',
    timestamp: new Date().toISOString(),
  };
  if (!envOk) payload.env = 'SUPABASE_URL or Supabase key missing';
  const res = NextResponse.json(payload, { status: envOk ? 200 : 503 });
  Object.entries(corsHeaders(request)).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

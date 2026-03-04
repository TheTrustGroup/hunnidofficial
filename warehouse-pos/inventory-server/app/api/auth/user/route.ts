/**
 * GET /api/auth/user — return current session user (Bearer or cookie).
 * Fallback when /admin/api/me returns 404/403/401. Returns 401 when not authenticated.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSession, sessionUserToJson } from '@/lib/auth/session';
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
  const session = await getSession(request);
  if (!session) {
    return withCors(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      request
    );
  }
  return withCors(
    NextResponse.json(sessionUserToJson(session)),
    request
  );
}

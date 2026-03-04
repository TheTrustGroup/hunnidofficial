import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/** Simple liveness check. Requires auth so it is not a public info leak. Use GET /api/health for unauthenticated health checks. */
export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ message: 'API is working!', timestamp: new Date().toISOString() });
}

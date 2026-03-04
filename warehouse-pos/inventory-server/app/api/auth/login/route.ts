import { NextRequest, NextResponse } from 'next/server';
import {
  getRoleFromEmail,
  setSessionCookie,
  sessionUserToJson,
  createSessionToken,
} from '@/lib/auth/session';
import { isPosRestrictedEmail, verifyPosPassword, getWarehouseIdForPosEmail } from '@/lib/auth/posPasswords';
import { corsHeaders } from '@/lib/cors';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

/** Login: validate email (and POS password when applicable). Derive role from email (server-side). */
export async function POST(request: NextRequest) {
  const addCors = (res: NextResponse) => {
    Object.entries(corsHeaders(request)).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  };
  try {
    const body = await request.json().catch(() => ({}));
    const email = (body.email || body.username || '').trim().toLowerCase();
    const password = typeof body.password === 'string' ? body.password : '';
    if (!email) {
      return addCors(NextResponse.json({ error: 'Email is required' }, { status: 400 }));
    }

    if (isPosRestrictedEmail(email)) {
      if (!verifyPosPassword(email, password)) {
        return addCors(
          NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
        );
      }
    }

    const role = getRoleFromEmail(email);
    // POS users: bind warehouse_id by email so frontend skips warehouse selector (Main Store / Main Town).
    const posWarehouseId = getWarehouseIdForPosEmail(email);
    const binding =
      posWarehouseId != null ||
      body.warehouse_id != null ||
      body.store_id !== undefined ||
      body.device_id != null
        ? {
            warehouse_id: posWarehouseId ?? (body.warehouse_id != null ? String(body.warehouse_id).trim() : undefined),
            store_id: body.store_id !== undefined ? body.store_id : undefined,
            device_id: body.device_id != null ? String(body.device_id).trim() : undefined,
          }
        : undefined;
    const sessionPayload = { email, role, exp: 0, ...binding };
    const sessionToken = await createSessionToken(email, role, binding);
    const response = NextResponse.json({
      user: sessionUserToJson(sessionPayload as import('@/lib/auth/session').Session),
      token: sessionToken,
    });
    await setSessionCookie(response, email, role, binding);
    return addCors(response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (process.env.NODE_ENV === 'production' && msg.includes('SESSION_SECRET')) {
      console.error('[auth] Login failed: SESSION_SECRET not set in production.');
      return addCors(
        NextResponse.json(
          { error: 'Server configuration error. Please contact the administrator.' },
          { status: 503 }
        )
      );
    }
    console.error('[auth] Login failed:', err);
    return addCors(NextResponse.json({ error: 'Login failed' }, { status: 400 }));
  }
}

/**
 * Consistent API error shape and request id for observability.
 */
import { NextResponse } from 'next/server';

const REQUEST_ID_HEADER = 'x-request-id';

export function getRequestId(req: { headers: { get: (name: string) => string | null } }): string {
  const fromHeader = req.headers.get(REQUEST_ID_HEADER)?.trim();
  if (fromHeader) return fromHeader;
  return crypto.randomUUID?.() ?? `req-${Date.now()}`;
}

export interface JsonErrorOptions {
  code?: string;
  requestId?: string;
  message?: string;
  headers?: HeadersInit;
}

export function jsonError(
  status: number,
  message: string,
  opts?: JsonErrorOptions
): NextResponse {
  const requestId = opts?.requestId;
  const body: Record<string, string> = { error: message };
  if (opts?.message && opts.message !== message) body.message = opts.message;
  if (opts?.code) body.code = opts.code;
  if (requestId) body.requestId = requestId;
  const res = NextResponse.json(body, { status, headers: opts?.headers });
  if (requestId) res.headers.set(REQUEST_ID_HEADER, requestId);
  return res;
}

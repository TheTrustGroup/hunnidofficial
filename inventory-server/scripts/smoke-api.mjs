#!/usr/bin/env node
/**
 * Smoke test for API: health returns 200/ok; /api/test returns 401 without auth.
 * Run after starting the server: BASE_URL=http://localhost:3001 node scripts/smoke-api.mjs
 */
const baseUrl = (process.env.BASE_URL || 'http://localhost:3001').replace(/\/$/, '');

async function run() {
  let failed = false;

  const res = await fetch(`${baseUrl}/api/health`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.status !== 'ok') {
    console.error('FAIL: GET /api/health expected 200 and status ok', { status: res.status, data });
    failed = true;
  } else {
    console.log('OK: GET /api/health');
  }

  const testRes = await fetch(`${baseUrl}/api/test`);
  if (testRes.status !== 401) {
    console.error('FAIL: GET /api/test without auth expected 401', { status: testRes.status });
    failed = true;
  } else {
    console.log('OK: GET /api/test returns 401 when unauthenticated');
  }

  process.exit(failed ? 1 : 0);
}

run().catch((e) => {
  console.error('Smoke failed:', e);
  process.exit(1);
});

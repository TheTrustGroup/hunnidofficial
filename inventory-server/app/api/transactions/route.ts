import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function legacyGoneResponse() {
  return NextResponse.json(
    {
      error: 'Transactions API is retired. Use /api/sales and /api/reports/sales.',
      code: 'LEGACY_TRANSACTIONS_RETIRED',
    },
    { status: 410 }
  );
}

/** GET /api/transactions — retired. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  void request;
  return legacyGoneResponse();
}

/** POST /api/transactions — retired. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  void request;
  return legacyGoneResponse();
}

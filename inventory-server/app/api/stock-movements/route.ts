import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** GET /api/stock-movements — retired with legacy transactions pipeline. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  void request;
  return NextResponse.json(
    {
      error: 'Stock movements API is retired. Use /api/sales and /api/reports/sales.',
      code: 'LEGACY_STOCK_MOVEMENTS_RETIRED',
    },
    { status: 410 }
  );
}

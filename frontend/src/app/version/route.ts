import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION || 'unknown';

  return NextResponse.json(
    { version },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}

import { NextResponse } from 'next/server'

// Returns the build ID embedded at deploy time.
// AppGuard polls this on tab focus to detect new deployments and reload.
export async function GET() {
  return NextResponse.json(
    { buildId: process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev' },
    {
      headers: {
        // Never cache — always return the live server's build ID
        'Cache-Control': 'no-store',
      },
    }
  )
}

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    success: true,
    supabase: {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    nodeEnv: process.env.NODE_ENV,
    message: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? 'Supabase variables configured'
      : 'ERROR: NEXT_PUBLIC_SUPABASE_URL not configured'
  });
}

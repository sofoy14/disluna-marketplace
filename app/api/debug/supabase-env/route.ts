import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // #region agent log
  const fs = require('fs');
  const path = require('path');
  try {
    const logPath = path.join(process.cwd(), '.cursor', 'debug.log');
    const logEntry = JSON.stringify({
      location: 'app/api/debug/supabase-env/route.ts:GET',
      message: 'Supabase env check endpoint',
      data: {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        supabaseUrlValue: process.env.NEXT_PUBLIC_SUPABASE_URL || 'undefined',
        supabaseAnonKeyPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) || 'undefined',
        nodeEnv: process.env.NODE_ENV
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'E'
    }) + '\n';
    fs.appendFileSync(logPath, logEntry);
  } catch (e) {
    // Ignore if log file doesn't exist
  }
  // #endregion

  return NextResponse.json({
    success: true,
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'MISSING',
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      anonKeyPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...' || 'MISSING',
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      urlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      anonKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
    },
    nodeEnv: process.env.NODE_ENV,
    message: process.env.NEXT_PUBLIC_SUPABASE_URL 
      ? 'Variables de Supabase están configuradas' 
      : 'ERROR: NEXT_PUBLIC_SUPABASE_URL no está configurada'
  });
}


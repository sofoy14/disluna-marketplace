// app/api/debug/env-check/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // #region agent log
    const fs = require('fs');
    const path = require('path');
    try {
      const logPath = path.join(process.cwd(), '.cursor', 'debug.log');
      const logEntry = JSON.stringify({
        location: 'app/api/debug/env-check/route.ts:GET',
        message: 'Debug endpoint - env vars check',
        data: {
          hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          supabaseUrlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
          supabaseAnonKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
          nodeEnv: process.env.NODE_ENV
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'D'
      }) + '\n';
      fs.appendFileSync(logPath, logEntry);
    } catch (e) {
      // Ignore if log file doesn't exist
    }
    // #endregion

    const envVars = {
      // Supabase
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing',
      // Wompi
      WOMPI_ENVIRONMENT: process.env.WOMPI_ENVIRONMENT,
      NEXT_PUBLIC_WOMPI_PUBLIC_KEY: process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY ? 'Set' : 'Missing',
      WOMPI_PRIVATE_KEY: process.env.WOMPI_PRIVATE_KEY ? 'Set' : 'Missing',
      WOMPI_INTEGRITY_SECRET: process.env.WOMPI_INTEGRITY_SECRET ? 'Set' : 'Missing',
      WOMPI_WEBHOOK_SECRET: process.env.WOMPI_WEBHOOK_SECRET ? 'Set' : 'Missing',
      NEXT_PUBLIC_WOMPI_BASE_URL: process.env.NEXT_PUBLIC_WOMPI_BASE_URL,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    };

    return NextResponse.json({
      success: true,
      environmentVariables: envVars,
      supabaseUrlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
      supabaseAnonKeyPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...',
      publicKeyPrefix: process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY?.substring(0, 15) + '...',
      privateKeyPrefix: process.env.WOMPI_PRIVATE_KEY?.substring(0, 15) + '...',
      integritySecretPrefix: process.env.WOMPI_INTEGRITY_SECRET?.substring(0, 15) + '...',
      nodeEnv: process.env.NODE_ENV,
    });

  } catch (error) {
    console.error('Error checking environment variables:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error checking environment variables',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}





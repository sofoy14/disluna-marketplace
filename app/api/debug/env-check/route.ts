// app/api/debug/env-check/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const envVars = {
      WOMPI_ENVIRONMENT: process.env.WOMPI_ENVIRONMENT,
      NEXT_PUBLIC_WOMPI_PUBLIC_KEY: process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY,
      WOMPI_PRIVATE_KEY: process.env.WOMPI_PRIVATE_KEY,
      WOMPI_INTEGRITY_SECRET: process.env.WOMPI_INTEGRITY_SECRET,
      WOMPI_WEBHOOK_SECRET: process.env.WOMPI_WEBHOOK_SECRET,
      NEXT_PUBLIC_WOMPI_BASE_URL: process.env.NEXT_PUBLIC_WOMPI_BASE_URL,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    };

    return NextResponse.json({
      success: true,
      environmentVariables: envVars,
      publicKeyPrefix: process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY?.substring(0, 15) + '...',
      privateKeyPrefix: process.env.WOMPI_PRIVATE_KEY?.substring(0, 15) + '...',
      integritySecretPrefix: process.env.WOMPI_INTEGRITY_SECRET?.substring(0, 15) + '...',
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





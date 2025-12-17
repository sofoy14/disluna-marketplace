import { NextResponse } from 'next/server'
import { getEnvVar } from '@/lib/env/runtime-env'

// This endpoint must be evaluated at request time so Dockploy/runtime env vars
// are reflected without requiring rebuilds.
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

function toJs(obj: unknown) {
  return `window.__ENV=${JSON.stringify(obj)};`
}

export function GET() {
  const payload = {
    NEXT_PUBLIC_SUPABASE_URL: getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    NEXT_PUBLIC_APP_URL: getEnvVar('NEXT_PUBLIC_APP_URL'),
    NEXT_PUBLIC_SITE_URL: getEnvVar('NEXT_PUBLIC_SITE_URL'),
    NEXT_PUBLIC_BILLING_ENABLED: getEnvVar('NEXT_PUBLIC_BILLING_ENABLED'),
    NEXT_PUBLIC_WOMPI_PUBLIC_KEY: getEnvVar('NEXT_PUBLIC_WOMPI_PUBLIC_KEY'),
    NEXT_PUBLIC_WOMPI_BASE_URL: getEnvVar('NEXT_PUBLIC_WOMPI_BASE_URL'),
    NEXT_PUBLIC_OLLAMA_URL: getEnvVar('NEXT_PUBLIC_OLLAMA_URL')
  }

  return new NextResponse(toJs(payload), {
    headers: {
      'content-type': 'application/javascript; charset=utf-8',
      'cache-control': 'no-store, max-age=0'
    }
  })
}

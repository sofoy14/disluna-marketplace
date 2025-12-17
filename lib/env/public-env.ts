export type PublicEnvKey =
  | 'NEXT_PUBLIC_SUPABASE_URL'
  | 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  | 'NEXT_PUBLIC_APP_URL'
  | 'NEXT_PUBLIC_SITE_URL'
  | 'NEXT_PUBLIC_BILLING_ENABLED'
  | 'NEXT_PUBLIC_WOMPI_PUBLIC_KEY'
  | 'NEXT_PUBLIC_WOMPI_BASE_URL'
  | 'NEXT_PUBLIC_OLLAMA_URL'

function readProcessEnv(key: PublicEnvKey): string | undefined {
  try {
    const proc = (globalThis as any)?.process
    const value = proc?.env?.[key]
    return typeof value === 'string' && value.trim() ? value.trim() : undefined
  } catch {
    return undefined
  }
}

function readWindowEnv(key: PublicEnvKey): string | undefined {
  if (typeof window === 'undefined') return undefined
  const candidate = (window as any)?.__ENV?.[key]
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : undefined
}

export function getPublicEnvVar(
  key: PublicEnvKey,
  options: { required?: boolean; fallback?: string } = {}
): string {
  const value = readProcessEnv(key) ?? readWindowEnv(key) ?? options.fallback ?? ''
  if (!value && options.required) {
    throw new Error(`Missing required environment variable ${key}`)
  }
  return value
}

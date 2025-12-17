/**
 * Runtime environment helper
 * Centralizes environment access to avoid build-time substitution issues
 */

type RequiredEnvKey =
  | 'NEXT_PUBLIC_SUPABASE_URL'
  | 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  | 'SUPABASE_SERVICE_ROLE_KEY'

type OptionalEnvKey =
  | 'NEXT_PUBLIC_APP_URL'
  | 'NEXT_PUBLIC_SITE_URL'
  | 'NEXT_PUBLIC_BILLING_ENABLED'
  | 'NEXT_PUBLIC_WOMPI_PUBLIC_KEY'
  | 'NEXT_PUBLIC_WOMPI_BASE_URL'
  | 'NEXT_PUBLIC_OLLAMA_URL'

const runtimeEnv: NodeJS.ProcessEnv = process.env

// Build-time fallbacks for NEXT_PUBLIC_* variables.
// Next.js may inline these reads during build; bracket-access won't.
const buildTimePublicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_BILLING_ENABLED: process.env.NEXT_PUBLIC_BILLING_ENABLED,
  NEXT_PUBLIC_WOMPI_PUBLIC_KEY: process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY,
  NEXT_PUBLIC_WOMPI_BASE_URL: process.env.NEXT_PUBLIC_WOMPI_BASE_URL,
  NEXT_PUBLIC_OLLAMA_URL: process.env.NEXT_PUBLIC_OLLAMA_URL
} as const

export function getEnvVar(
  key: RequiredEnvKey | OptionalEnvKey,
  options: { required?: boolean; fallback?: string } = {}
): string {
  const rawRuntime = runtimeEnv[key as keyof NodeJS.ProcessEnv]
  const runtimeValue = typeof rawRuntime === 'string' ? rawRuntime.trim() : rawRuntime

  if (runtimeValue) {
    return runtimeValue
  }

  // If runtime doesn't have the key, allow build-time inlined values for NEXT_PUBLIC_*.
  const rawBuild =
    key in buildTimePublicEnv
      ? buildTimePublicEnv[key as keyof typeof buildTimePublicEnv]
      : undefined
  const buildValue = typeof rawBuild === 'string' ? rawBuild.trim() : rawBuild
  const value = buildValue ?? ''

  if (!value && options.required) {
    throw new Error(`Missing required environment variable ${key}`)
  }

  if (!value && options.fallback) {
    return options.fallback
  }

  return value ?? ''
}

export const env = {
  supabaseUrl: () =>
    getEnvVar('NEXT_PUBLIC_SUPABASE_URL', { required: true }),
  supabaseAnonKey: () =>
    getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY', { required: true }),
  supabaseServiceRole: () =>
    getEnvVar('SUPABASE_SERVICE_ROLE_KEY', { required: true }),
  appUrl: () =>
    getEnvVar('NEXT_PUBLIC_APP_URL', {
      fallback: getEnvVar('NEXT_PUBLIC_SITE_URL', {
        fallback: 'https://aliado.pro'
      })
    }),
  billingEnabled: () => getEnvVar('NEXT_PUBLIC_BILLING_ENABLED'),
  wompiPublicKey: () => getEnvVar('NEXT_PUBLIC_WOMPI_PUBLIC_KEY'),
  wompiBaseUrl: () =>
    getEnvVar('NEXT_PUBLIC_WOMPI_BASE_URL', {
      fallback: 'https://sandbox.wompi.co'
    })
}

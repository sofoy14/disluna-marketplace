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

const runtimeEnv: NodeJS.ProcessEnv = process.env

export function getEnvVar(
  key: RequiredEnvKey | OptionalEnvKey,
  options: { required?: boolean; fallback?: string } = {}
): string {
  const raw = runtimeEnv[key as keyof NodeJS.ProcessEnv]
  const value = typeof raw === 'string' ? raw.trim() : raw

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

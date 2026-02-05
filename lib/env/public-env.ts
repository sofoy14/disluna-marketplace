/**
 * Public environment variable access
 * Re-exports from client-env for consistent API
 */

import {
  getClientEnv,
  initClientEnv,
  checkClientEnv
} from "./client-env"

export type PublicEnvKey =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "NEXT_PUBLIC_APP_URL"
  | "NEXT_PUBLIC_SITE_URL"
  | "NEXT_PUBLIC_BILLING_ENABLED"
  | "NEXT_PUBLIC_WOMPI_PUBLIC_KEY"
  | "NEXT_PUBLIC_WOMPI_BASE_URL"
  | "NEXT_PUBLIC_OLLAMA_URL"

/**
 * Get a public environment variable
 * @deprecated Use getClientEnv from ./client-env instead
 */
export function getPublicEnvVar(
  key: PublicEnvKey,
  options: { required?: boolean; fallback?: string } = {}
): string {
  return getClientEnv(key, options)
}

// Re-export for convenience
export { initClientEnv, checkClientEnv, getClientEnv }

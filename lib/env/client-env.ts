/**
 * Client-side environment variable loader
 * Handles runtime environment variables with multiple fallback strategies
 */

import type { PublicEnvKey } from "./public-env"

type EnvCache = {
  [K in PublicEnvKey]?: string
}

// Cache for resolved values
let envCache: EnvCache = {}
let isInitialized = false

/**
 * Initialize the environment from all available sources
 * This should be called as early as possible in the app lifecycle
 */
export function initClientEnv(): void {
  if (isInitialized) return
  if (typeof window === "undefined") return

  // Priority 1: window.__ENV__ (set by env.js)
  const winEnv = (window as any).__ENV__ as Record<string, string> | undefined

  // Priority 2: Meta tags (server-injected runtime values)
  const readMetaTag = (name: string): string | undefined => {
    try {
      const meta = document.querySelector(`meta[name="${name}"]`)
      const content = meta?.getAttribute("content")
      return content && content.trim() ? content.trim() : undefined
    } catch {
      return undefined
    }
  }

  // Build the complete env object
  const buildEnv = (): EnvCache => ({
    NEXT_PUBLIC_SUPABASE_URL:
      winEnv?.NEXT_PUBLIC_SUPABASE_URL ||
      readMetaTag("supabase-url") ||
      "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      winEnv?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      readMetaTag("supabase-anon-key") ||
      "",
    NEXT_PUBLIC_APP_URL:
      winEnv?.NEXT_PUBLIC_APP_URL ||
      readMetaTag("app-url") ||
      readMetaTag("site-url") ||
      (typeof window !== "undefined" ? window.location.origin : "https://aliado.pro"),
    NEXT_PUBLIC_SITE_URL:
      winEnv?.NEXT_PUBLIC_SITE_URL ||
      readMetaTag("site-url") ||
      readMetaTag("app-url") ||
      (typeof window !== "undefined" ? window.location.origin : "https://aliado.pro"),
    NEXT_PUBLIC_BILLING_ENABLED:
      winEnv?.NEXT_PUBLIC_BILLING_ENABLED ||
      readMetaTag("billing-enabled") ||
      "false",
    NEXT_PUBLIC_WOMPI_PUBLIC_KEY:
      winEnv?.NEXT_PUBLIC_WOMPI_PUBLIC_KEY ||
      readMetaTag("wompi-public-key") ||
      "",
    NEXT_PUBLIC_WOMPI_BASE_URL:
      winEnv?.NEXT_PUBLIC_WOMPI_BASE_URL ||
      readMetaTag("wompi-base-url") ||
      "https://sandbox.wompi.co",
    NEXT_PUBLIC_OLLAMA_URL:
      winEnv?.NEXT_PUBLIC_OLLAMA_URL ||
      readMetaTag("ollama-url") ||
      ""
  })

  envCache = buildEnv()
  isInitialized = true

  // Debug logging in development
  if (process.env.NODE_ENV === "development") {
    console.log("[client-env] Initialized with:", {
      hasSupabaseUrl: !!envCache.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!envCache.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasAppUrl: !!envCache.NEXT_PUBLIC_APP_URL
    })
  }
}

/**
 * Get a client-side environment variable
 * Must be called after initClientEnv()
 */
export function getClientEnv(
  key: PublicEnvKey,
  options: { required?: boolean; fallback?: string } = {}
): string {
  if (!isInitialized) {
    initClientEnv()
  }

  const value = envCache[key]

  if (value) {
    return value
  }

  if (options.fallback) {
    return options.fallback
  }

  if (options.required) {
    throw new Error(
      `[client-env] Missing required environment variable: ${key}\n` +
        `Available vars: ${Object.entries(envCache)
          .map(([k, v]) => `${k}: ${v ? "✓" : "✗"}`)
          .join(", ")}`
    )
  }

  return ""
}

/**
 * Check if all required environment variables are present
 */
export function checkClientEnv(): {
  valid: boolean
  missing: PublicEnvKey[]
  present: PublicEnvKey[]
} {
  if (!isInitialized) {
    initClientEnv()
  }

  const required: PublicEnvKey[] = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  ]

  const missing: PublicEnvKey[] = []
  const present: PublicEnvKey[] = []

  for (const key of required) {
    if (envCache[key]) {
      present.push(key)
    } else {
      missing.push(key)
    }
  }

  return { valid: missing.length === 0, missing, present }
}

/**
 * Wait for environment to be ready
 * Useful for async initialization scenarios
 */
export async function waitForClientEnv(
  timeoutMs = 5000
): Promise<boolean> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    initClientEnv()
    const check = checkClientEnv()
    if (check.valid) {
      return true
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  return false
}

/**
 * Centralized Supabase configuration helpers.
 * Keep this file free of logs and secret previews.
 */

import { env, getEnvVar } from "@/lib/env/runtime-env"
import { Database } from "@/supabase/types"
import { createBrowserClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"

export type SupabasePublicConfig = {
  url: string
  anonKey: string
}

export type SupabaseAdminConfig = SupabasePublicConfig & {
  serviceRoleKey: string
}

export function getSupabasePublicConfig(): SupabasePublicConfig {
  return {
    url: getEnvVar("NEXT_PUBLIC_SUPABASE_URL", { required: true }),
    anonKey: getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY", { required: true })
  }
}

export function getSupabaseAdminConfig(): SupabaseAdminConfig {
  return {
    ...getSupabasePublicConfig(),
    serviceRoleKey: getEnvVar("SUPABASE_SERVICE_ROLE_KEY", { required: true })
  }
}

export const SUPABASE_CONFIG = {
  get url() {
    return getEnvVar("NEXT_PUBLIC_SUPABASE_URL") || undefined
  },
  get anonKey() {
    return getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY") || undefined
  },
  get serviceRoleKey() {
    return getEnvVar("SUPABASE_SERVICE_ROLE_KEY") || undefined
  }
} as const

export function createSupabaseBrowserClient() {
  const { url, anonKey } = getSupabasePublicConfig()
  return createBrowserClient<Database>(url, anonKey)
}

export function createSupabaseServerClient() {
  const { url, serviceRoleKey } = getSupabaseAdminConfig()
  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

let _supabaseBrowser: ReturnType<typeof createSupabaseBrowserClient> | null = null
let _supabaseServer: ReturnType<typeof createSupabaseServerClient> | null = null

export const supabaseBrowser = new Proxy(
  {} as ReturnType<typeof createSupabaseBrowserClient>,
  {
    get(_target, prop) {
      if (!_supabaseBrowser) _supabaseBrowser = createSupabaseBrowserClient()
      const value = (_supabaseBrowser as any)[prop]
      return typeof value === "function" ? value.bind(_supabaseBrowser) : value
    }
  }
)

export const supabaseServer = new Proxy(
  {} as ReturnType<typeof createSupabaseServerClient>,
  {
    get(_target, prop) {
      if (!_supabaseServer) _supabaseServer = createSupabaseServerClient()
      const value = (_supabaseServer as any)[prop]
      return typeof value === "function" ? value.bind(_supabaseServer) : value
    }
  }
)

export function getSupabaseDebugInfo() {
  return {
    hasUrl: !!SUPABASE_CONFIG.url,
    hasAnonKey: !!SUPABASE_CONFIG.anonKey,
    hasServiceKey: !!SUPABASE_CONFIG.serviceRoleKey,
    nodeEnv: process.env.NODE_ENV || "unknown",
    appUrl: env.appUrl()
  }
}

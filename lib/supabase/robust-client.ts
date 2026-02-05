import { Database } from "@/supabase/types"
import { createBrowserClient } from "@supabase/ssr"
import { getClientEnv, initClientEnv } from "@/lib/env/client-env"

/**
 * Get Supabase browser configuration
 * Uses client-side environment system for runtime variable support
 */
function getSupabaseConfig() {
  initClientEnv()

  const url = getClientEnv("NEXT_PUBLIC_SUPABASE_URL", { required: true })
  const anonKey = getClientEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", {
    required: true
  })

  return { url, anonKey }
}

// Cache for browser client
let _supabaseClient: ReturnType<
  typeof createBrowserClient<Database>
> | null = null

/**
 * Lazy-initialized Supabase browser client
 */
export const supabase = (() => {
  return new Proxy({} as ReturnType<typeof createBrowserClient<Database>>, {
    get(target, prop) {
      if (!_supabaseClient) {
        const { url, anonKey } = getSupabaseConfig()
        _supabaseClient = createBrowserClient<Database>(url, anonKey)
      }
      const value = (_supabaseClient as any)[prop]
      return typeof value === "function"
        ? value.bind(_supabaseClient)
        : value
    }
  })
})()

/**
 * Verify Supabase connection
 */
export async function verifySupabaseConnection() {
  const { error } = await supabase.from("profiles").select("count").limit(1)
  if (error) {
    throw new Error(`Supabase connection failed: ${error.message}`)
  }
  return true
}

/**
 * Check if Supabase client can be created (diagnostic function)
 */
export function canCreateSupabaseClient(): boolean {
  try {
    initClientEnv()
    getClientEnv("NEXT_PUBLIC_SUPABASE_URL", { required: true })
    getClientEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", { required: true })
    return true
  } catch {
    return false
  }
}

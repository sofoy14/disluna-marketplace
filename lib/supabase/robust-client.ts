import { env } from "@/lib/env/runtime-env"
import { Database } from "@/supabase/types"
import { createBrowserClient } from "@supabase/ssr"

/**
 * Get Supabase browser configuration
 */
function getSupabaseConfig() {
  const url = env.supabaseUrl()
  const anonKey = env.supabaseAnonKey()
  return { url, anonKey }
}

// Cache for browser client
let _supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null = null

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
      return typeof value === 'function' ? value.bind(_supabaseClient) : value
    }
  })
})()

/**
 * Verify Supabase connection
 */
export async function verifySupabaseConnection() {
  const { error } = await supabase.from('profiles').select('count').limit(1)
  if (error) {
    throw new Error(`Supabase connection failed: ${error.message}`)
  }
  return true
}

/**
 * Get server-side Supabase configuration (for admin operations)
 * Uses SERVICE_ROLE_KEY for privileged operations
 */
export function getServerSupabaseConfig() {
  const url = env.supabaseUrl()
  const serviceRoleKey = env.supabaseServiceRole()
  return { url, serviceRoleKey }
}

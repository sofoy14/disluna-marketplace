import { Database } from "@/supabase/types"
import { createBrowserClient } from "@supabase/ssr"

/**
 * Get Supabase browser configuration
 */
function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase configuration. Please check environment variables:\n' +
      '- NEXT_PUBLIC_SUPABASE_URL\n' +
      '- NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }

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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase server configuration. Please check environment variables:\n' +
      '- NEXT_PUBLIC_SUPABASE_URL\n' +
      '- SUPABASE_SERVICE_ROLE_KEY'
    )
  }

  return { url, serviceRoleKey }
}


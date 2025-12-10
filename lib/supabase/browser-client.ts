import { createBrowserClient } from "@supabase/ssr"
import { Database } from "@/supabase/types"

/**
 * Get Supabase environment variables
 */
function getSupabaseEnv() {
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

/**
 * Create a Supabase browser client
 */
export const createClient = () => {
  const { url, anonKey } = getSupabaseEnv()
  return createBrowserClient<Database>(url, anonKey)
}

// Lazy-initialized singleton instance
let _supabaseInstance: ReturnType<typeof createBrowserClient<Database>> | null = null

export const supabase = new Proxy({} as ReturnType<typeof createBrowserClient<Database>>, {
  get(target, prop) {
    if (!_supabaseInstance) {
      _supabaseInstance = createClient()
    }
    const value = (_supabaseInstance as any)[prop]
    return typeof value === 'function' ? value.bind(_supabaseInstance) : value
  }
})

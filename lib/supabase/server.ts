import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { Database } from "@/supabase/types"

/**
 * Create a Supabase client for Server Components
 * Uses ANON_KEY for user authentication flows
 */
export const createClient = (cookieStore: ReturnType<typeof cookies>) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    // Enhanced error message with diagnostic information
    const missing = []
    if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!anonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    
    const errorMessage = `Missing Supabase configuration. Please check environment variables:\n` +
      `- ${missing.join('\n- ')}\n\n` +
      `Diagnostic info:\n` +
      `- NODE_ENV: ${process.env.NODE_ENV || 'not set'}\n` +
      `- URL present: ${!!url}\n` +
      `- AnonKey present: ${!!anonKey}\n` +
      `- URL length: ${url?.length || 0}\n` +
      `- AnonKey length: ${anonKey?.length || 0}`
    
    console.error('[Supabase] Configuration error:', errorMessage)
    throw new Error(errorMessage)
  }

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Called from Server Component - ignore
        }
      }
    }
  })
}

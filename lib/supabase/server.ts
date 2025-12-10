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
    throw new Error(
      'Missing Supabase configuration. Please check environment variables:\n' +
      '- NEXT_PUBLIC_SUPABASE_URL\n' +
      '- NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
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

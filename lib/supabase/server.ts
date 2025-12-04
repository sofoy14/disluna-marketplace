import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getServerSupabaseConfig } from "@/lib/supabase/robust-client"

export const createClient = (cookieStore: ReturnType<typeof cookies>) => {
  const { url, serviceRoleKey } = getServerSupabaseConfig()
  
  return createServerClient(url, serviceRoleKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch (error) {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      }
    }
  })
}

import { createBrowserClient } from "@supabase/ssr"
import { Database } from "@/supabase/types"
import { getClientEnv } from "@/lib/env/client-env"

export const createClient = () => {
  const url = getClientEnv("NEXT_PUBLIC_SUPABASE_URL", { required: true })
  const anonKey = getClientEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", {
    required: true
  })

  return createBrowserClient<Database>(url, anonKey)
}

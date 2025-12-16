import { createBrowserClient } from "@supabase/ssr"
import { Database } from "@/supabase/types"
import { getPublicEnvVar } from "@/lib/env/public-env"

export const createClient = () => {
  const url = getPublicEnvVar('NEXT_PUBLIC_SUPABASE_URL', { required: true })
  const anonKey = getPublicEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY', { required: true })

  return createBrowserClient<Database>(url, anonKey)
}

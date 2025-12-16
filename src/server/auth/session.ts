import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import type { User } from "@supabase/supabase-js"

export async function getSessionUser(): Promise<User | null> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data, error } = await supabase.auth.getUser()
  if (error) return null
  return data.user ?? null
}


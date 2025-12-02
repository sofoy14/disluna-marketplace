import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export default async function HomePage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  
  // Use getUser() for secure authentication
  const { data: { user }, error } = await supabase.auth.getUser()

  // Si no hay usuario autenticado, mostrar landing
  if (error || !user) {
    console.log('[HomePage] No user, redirecting to landing')
    redirect("/landing")
  }

  console.log('[HomePage] User authenticated:', user.id)

  // Usuario autenticado - verificar workspace
  const { data: homeWorkspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_home", true)
    .maybeSingle()

  if (!homeWorkspace) {
    console.log('[HomePage] No workspace, redirecting to onboarding')
    redirect("/onboarding")
  }

  // Verificar suscripción activa
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id, status")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .maybeSingle()

  if (!subscription) {
    console.log('[HomePage] No subscription, redirecting to onboarding')
    redirect("/onboarding")
  }

  // Usuario con workspace y suscripción - ir al chat
  console.log('[HomePage] All good, redirecting to chat')
  redirect(`/${homeWorkspace.id}/chat`)
}

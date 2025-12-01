import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export default async function HomePage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  
  const session = (await supabase.auth.getSession()).data.session

  // Si no hay sesión, mostrar landing
  if (!session) {
    redirect("/landing")
  }

  // Verificar perfil del usuario
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, has_onboarded")
    .eq("user_id", session.user.id)
    .single()

  // Si no tiene perfil configurado, ir a setup
  if (!profile?.display_name && !profile?.has_onboarded) {
    redirect("/setup")
  }

  // Usuario autenticado - verificar workspace y suscripción
  const { data: homeWorkspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("user_id", session.user.id)
    .eq("is_home", true)
    .single()

  if (!homeWorkspace) {
    // Sin workspace - ir a setup
    redirect("/setup")
  }

  // Verificar suscripción activa
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id, status")
    .eq("user_id", session.user.id)
    .in("status", ["active", "trialing"])
    .single()

  if (!subscription) {
    // Sin suscripción - ir a onboarding para seleccionar plan
    redirect("/onboarding")
  }

  // Usuario con workspace y suscripción - ir al chat
  redirect(`/${homeWorkspace.id}/chat`)
}

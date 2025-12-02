import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { redirect, notFound } from "next/navigation"
import i18nConfig from "@/i18nConfig"

// Valid locales from i18n config
const VALID_LOCALES = i18nConfig.locales as string[]

// Routes that should NOT be treated as locales (handled by their own pages)
const RESERVED_ROUTES = [
  'onboarding', 'login', 'setup', 'billing', 'landing', 'admin', 
  'account', 'help', 'auth', 'debug-auth', 'test-signup'
]

interface PageProps {
  params: { locale: string }
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = params
  
  // If this route is a reserved route, let Next.js handle it with 404
  // This prevents /onboarding from being treated as locale="onboarding"
  if (RESERVED_ROUTES.includes(locale)) {
    // This should never happen if routes are set up correctly,
    // but if it does, return 404 to prevent infinite loops
    notFound()
  }
  
  // If locale is not valid, redirect to default locale
  if (!VALID_LOCALES.includes(locale)) {
    redirect(`/${i18nConfig.defaultLocale}`)
  }

  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  
  // Use getUser() for secure authentication
  const { data: { user }, error } = await supabase.auth.getUser()

  // Si no hay usuario autenticado, mostrar landing
  if (error || !user) {
    redirect(`/${locale}/landing`)
  }

  // Usuario autenticado - verificar workspace
  const { data: homeWorkspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_home", true)
    .maybeSingle()

  if (!homeWorkspace) {
    // Use /onboarding without locale - handled by (auth) route group
    redirect('/onboarding')
  }

  // Verificar suscripción activa
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id, status")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .maybeSingle()

  if (!subscription) {
    // Use /onboarding without locale - handled by (auth) route group
    redirect('/onboarding')
  }

  // Usuario con workspace y suscripción - ir al chat
  redirect(`/${homeWorkspace.id}/chat`)
}

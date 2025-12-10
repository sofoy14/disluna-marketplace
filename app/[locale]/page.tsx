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
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/1d59dc66-8b75-476c-bd1d-2b247f5ce997',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/[locale]/page.tsx:19',message:'HomePage entry',data:{locale,nodeEnv:process.env.NODE_ENV,hasNextPublicUrl:!!process.env.NEXT_PUBLIC_SUPABASE_URL,hasServiceKey:!!process.env.SUPABASE_SERVICE_ROLE_KEY,urlValue:process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0,30)||'undefined',allSupabaseKeys:Object.keys(process.env).filter(k=>k.includes('SUPABASE')).join(',')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,E'})}).catch(()=>{});
  // #endregion
  
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
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/1d59dc66-8b75-476c-bd1d-2b247f5ce997',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/[locale]/page.tsx:36',message:'Before createClient call',data:{hasCookieStore:!!cookieStore},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  
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

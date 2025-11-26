import { createClient } from "@/lib/supabase/middleware"
import { i18nRouter } from "next-i18n-router"
import { NextResponse, type NextRequest } from "next/server"
import i18nConfig from "./i18nConfig"
import { isAdmin } from "@/lib/admin/check-admin"

// Rutas que requieren suscripción activa para acceder
const SUBSCRIPTION_REQUIRED_ROUTES = ['/chat'];

// Verificar si billing está habilitado
const isBillingEnabled = () => process.env.NEXT_PUBLIC_BILLING_ENABLED === 'true';

export async function middleware(request: NextRequest) {
  const i18nResult = i18nRouter(request, i18nConfig)
  if (i18nResult) return i18nResult

  try {
    const { supabase, response } = createClient(request)
    const session = await supabase.auth.getSession()
    const user = session.data.session?.user

    // Rutas públicas (con o sin prefijo de locale)
    const publicSegments = ['login', 'auth/verify-email', 'onboarding', 'debug-auth', 'test-signup', 'billing']
    const pathname = request.nextUrl.pathname
    const isPublicRoute = publicSegments.some(seg => pathname === `/${seg}` || pathname.includes(`/${seg}`))

    if (isPublicRoute) {
      return response
    }

    // Redirigir a login si no hay sesión
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Protección de rutas de admin
    if (request.nextUrl.pathname.startsWith('/admin')) {
      if (!isAdmin(user.email)) {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    // Verificar confirmación de email
    if (!user.email_confirmed_at) {
      return NextResponse.redirect(new URL('/auth/verify-email', request.url))
    }

    // Verificar onboarding para rutas protegidas
    const protectedRoutes = ['/chat', '/settings']
    const isProtectedRoute = protectedRoutes.some(route => 
      request.nextUrl.pathname.includes(route)
    )

    if (isProtectedRoute) {
      const isUserAdmin = isAdmin(user.email)
      
      if (!isUserAdmin) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('user_id', user.id)
          .single()

        // Si no tiene onboarding completado, redirigir
        if (!profile?.onboarding_completed) {
          return NextResponse.redirect(new URL('/onboarding', request.url))
        }

        // Verificar suscripción activa para rutas que lo requieran
        if (isBillingEnabled()) {
          const requiresSubscription = SUBSCRIPTION_REQUIRED_ROUTES.some(route =>
            request.nextUrl.pathname.includes(route)
          )

          if (requiresSubscription) {
            const subscriptionStatus = await checkSubscriptionInMiddleware(supabase, user.id)
            
            if (!subscriptionStatus.hasAccess) {
              // Agregar mensaje a la URL de billing
              const billingUrl = new URL('/billing', request.url)
              if (subscriptionStatus.reason === 'expired') {
                billingUrl.searchParams.set('alert', 'subscription_expired')
              } else if (subscriptionStatus.reason === 'past_due') {
                billingUrl.searchParams.set('alert', 'payment_required')
              } else {
                billingUrl.searchParams.set('alert', 'subscription_required')
              }
              return NextResponse.redirect(billingUrl)
            }
          }
        }
      }
    }

    // Redirigir al chat si está en la raíz
    const redirectToChat = session && request.nextUrl.pathname === "/"

    if (redirectToChat) {
      const { data: homeWorkspace, error } = await supabase
        .from("workspaces")
        .select("*")
        .eq("user_id", session.data.session?.user.id)
        .eq("is_home", true)
        .single()

      if (!homeWorkspace) {
        // Si es admin y no tiene workspace, crear uno automáticamente
        if (isAdmin(user.email)) {
          const { data: newWorkspace, error: createError } = await supabase
            .from("workspaces")
            .insert({
              user_id: user.id,
              is_home: true,
              name: "Home",
              default_context_length: 4096,
              default_model: "gpt-4-turbo-preview",
              default_prompt: "You are a friendly, helpful AI assistant.",
              default_temperature: 0.5,
              description: "My home workspace.",
              embeddings_provider: "openai",
              include_profile_context: true,
              include_workspace_instructions: true,
              instructions: ""
            })
            .select()
            .single()

          if (newWorkspace && !createError) {
            return NextResponse.redirect(
              new URL(`/${newWorkspace.id}/chat`, request.url)
            )
          }
        }
        throw new Error(error?.message)
      }

      return NextResponse.redirect(
        new URL(`/${homeWorkspace.id}/chat`, request.url)
      )
    }

    return response
  } catch (e) {
    return NextResponse.next({
      request: {
        headers: request.headers
      }
    })
  }
}

// Verificación ligera de suscripción para el middleware
async function checkSubscriptionInMiddleware(
  supabase: any, 
  userId: string
): Promise<{ hasAccess: boolean; reason?: string }> {
  try {
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !subscription) {
      return { hasAccess: false, reason: 'no_subscription' }
    }

    const now = new Date()
    const periodEnd = new Date(subscription.current_period_end)

    // Activa o en trial
    if (subscription.status === 'active' || subscription.status === 'trialing') {
      if (periodEnd > now) {
        return { hasAccess: true }
      }
      return { hasAccess: false, reason: 'expired' }
    }

    // Past due - dar 3 días de gracia
    if (subscription.status === 'past_due') {
      const graceEnd = new Date(periodEnd)
      graceEnd.setDate(graceEnd.getDate() + 3)
      
      if (graceEnd > now) {
        return { hasAccess: true }
      }
      return { hasAccess: false, reason: 'past_due' }
    }

    return { hasAccess: false, reason: 'unknown' }

  } catch (error) {
    console.error('Error checking subscription in middleware:', error)
    // En caso de error, permitir acceso para no bloquear usuarios
    return { hasAccess: true }
  }
}

export const config = {
  matcher: "/((?!api|static|.*\\..*|_next|auth|onboarding|debug-auth|test-signup|billing).*)"
}

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
    
    // Rutas públicas (con o sin prefijo de locale) - check first to avoid unnecessary auth calls
    const publicSegments = ['login', 'auth/verify-email', 'onboarding', 'setup', 'debug-auth', 'test-signup', 'billing', 'landing']
    const pathname = request.nextUrl.pathname
    const isPublicRoute = publicSegments.some(seg => pathname === `/${seg}` || pathname.includes(`/${seg}`))

    if (isPublicRoute) {
      return response
    }

    // Use getUser() for secure authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    // Redirigir a login si no hay sesión
    if (authError || !user) {
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
          .maybeSingle()

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

    // Redirigir al chat si está en la raíz (including locale paths like /es, /en)
    const isRootPath = request.nextUrl.pathname === "/" || 
                       request.nextUrl.pathname === "" ||
                       /^\/[a-z]{2}$/.test(request.nextUrl.pathname) // matches /es, /en, etc.

    if (user && isRootPath) {
      const { data: homeWorkspace } = await supabase
        .from("workspaces")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_home", true)
        .maybeSingle()

      if (!homeWorkspace) {
        // Sin workspace - ir a onboarding
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }

      // Verificar suscripción (excepto admins)
      if (!isAdmin(user.email) && isBillingEnabled()) {
        const subscriptionStatus = await checkSubscriptionInMiddleware(supabase, user.id)
        
        if (!subscriptionStatus.hasAccess) {
          // Sin suscripción - ir a onboarding para seleccionar plan
          return NextResponse.redirect(new URL('/onboarding', request.url))
        }
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
      .maybeSingle()

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
  matcher: "/((?!api|static|.*\\..*|_next|auth|onboarding|setup|debug-auth|test-signup|billing).*)"
}

import { createClient } from "@/lib/supabase/middleware"
import { i18nRouter } from "next-i18n-router"
import { NextResponse, type NextRequest } from "next/server"
import i18nConfig from "./i18nConfig"
import { isAdmin } from "@/lib/admin/check-admin"
import { getEnvVar } from "@/lib/env/runtime-env"

// Rutas que requieren suscripción activa para acceder
const SUBSCRIPTION_REQUIRED_ROUTES = ['/chat'];

// Rutas de autenticación que NO deben pasar por i18n
const AUTH_ROUTES = ['/onboarding', '/login', '/setup', '/auth/verify-email', '/auth/callback']

// Verificar si billing está habilitado
const isBillingEnabled = () => getEnvVar('NEXT_PUBLIC_BILLING_ENABLED') === 'true';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // If a stale client is still attempting to call a Server Action from an older build,
  // short-circuit the request with a controlled response to avoid noisy "Failed to find Server Action" logs.
  if (request.method === 'POST' && request.headers.get('next-action')) {
    return new NextResponse(
      'Client is out of date. Please refresh the page and try again.',
      {
        status: 409,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'cache-control': 'no-store, max-age=0'
        }
      }
    )
  }
  
  // Rutas públicas - verificar ANTES del i18n router para evitar redirecciones innecesarias
  // Estas rutas son accesibles tanto para usuarios autenticados como no autenticados
  const publicSegments = ['login', 'auth/verify-email', 'auth/callback', 'onboarding', 'setup', 'debug-auth', 'test-signup', 'precios', 'landing', 'billing/success']
  const isPublicRoute = publicSegments.some(seg => {
    // Coincide con /seg, /seg/, /locale/seg, o cualquier variante
    return pathname === `/${seg}` || 
           pathname === `/${seg}/` ||
           pathname.includes(`/${seg}/`) ||
           pathname.endsWith(`/${seg}`)
  })

  // Si es una ruta pública, procesar i18n pero permitir acceso sin más verificaciones
  if (isPublicRoute) {
    // Skip i18n processing for auth routes
    const isAuthRoute = AUTH_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`))
    
    if (!isAuthRoute) {
      const i18nResult = i18nRouter(request, i18nConfig)
      if (i18nResult) {
        // Para rutas públicas, permitir la redirección de i18n pero asegurar acceso
        return i18nResult
      }
    }
    
    // Si no hay redirección de i18n, crear cliente y permitir acceso
    const { response } = createClient(request)
    return response
  }
  
  // Skip i18n processing for auth routes
  const isAuthRoute = AUTH_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`))
  
  if (!isAuthRoute) {
    const i18nResult = i18nRouter(request, i18nConfig)
    if (i18nResult) return i18nResult
  }

  try {
    const { supabase, response } = createClient(request)

    // If Supabase is not configured, redirect to login
    if (!supabase) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Verificar autenticación para rutas protegidas
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
      return response
    }

    // Verificar confirmación de email
    // Para usuarios OAuth (Google/Facebook), el email ya está verificado por el proveedor
    // Solo verificar email_confirmed_at para usuarios que se registraron con email/password
    const isOAuthUser = user.app_metadata?.provider && user.app_metadata.provider !== 'email'
    if (!isOAuthUser && !user.email_confirmed_at) {
      return NextResponse.redirect(new URL('/auth/verify-email', request.url))
    }

    // Verificar suscripción activa SOLO para rutas protegidas
    const protectedRoutes = ['/chat', '/settings']
    const isProtectedRoute = protectedRoutes.some(route => 
      request.nextUrl.pathname.includes(route)
    )

    if (isProtectedRoute) {
      const isUserAdmin = isAdmin(user.email)
      
      // Admins siempre tienen acceso
      if (isUserAdmin) {
        return response
      }

      // Si billing está habilitado, verificar suscripción activa
      if (isBillingEnabled()) {
        const subscriptionStatus = await checkSubscriptionInMiddleware(supabase, user.id)
        
        if (!subscriptionStatus.hasAccess) {
          // No tiene suscripción activa - redirigir según la ruta
          const requiresSubscription = SUBSCRIPTION_REQUIRED_ROUTES.some(route =>
            request.nextUrl.pathname.includes(route)
          )

          if (requiresSubscription) {
            // Para /chat, redirigir a precios
            const preciosUrl = new URL('/precios', request.url)
            if (subscriptionStatus.reason === 'expired') {
              preciosUrl.searchParams.set('alert', 'subscription_expired')
            } else if (subscriptionStatus.reason === 'past_due') {
              preciosUrl.searchParams.set('alert', 'payment_required')
            } else {
              preciosUrl.searchParams.set('alert', 'subscription_required')
            }
            return NextResponse.redirect(preciosUrl)
          } else {
            // Para otras rutas protegidas, redirigir a onboarding
            return NextResponse.redirect(new URL('/onboarding', request.url))
          }
        }
        // Si tiene suscripción activa, permitir acceso (continuar)
      }
      // Si billing no está habilitado, permitir acceso
    }

    // Redirigir al chat si está en la ruta raíz
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

      // Si no tiene workspace y no es admin, verificar suscripción
      if (!homeWorkspace) {
        if (isBillingEnabled() && !isAdmin(user.email)) {
          const subscriptionStatus = await checkSubscriptionInMiddleware(supabase, user.id)
          if (!subscriptionStatus.hasAccess) {
            // Sin suscripción - redirigir a onboarding
            return NextResponse.redirect(new URL('/onboarding', request.url))
          }
        }
        // Si tiene suscripción activa o es admin, permitir acceso
        return response
      }

      // Verificar suscripción activa antes de redirigir al chat (excepto admins)
      if (!isAdmin(user.email) && isBillingEnabled()) {
        const subscriptionStatus = await checkSubscriptionInMiddleware(supabase, user.id)
        
        if (!subscriptionStatus.hasAccess) {
          // Sin suscripción activa - redirigir a onboarding
          return NextResponse.redirect(new URL('/onboarding', request.url))
        }
      }

      // Tiene suscripción activa o es admin - redirigir al chat
      return NextResponse.redirect(
        new URL(`/${homeWorkspace.id}/chat`, request.url)
      )
    }

    // Para cualquier otra ruta, permitir acceso
    return response
  } catch (e) {
    console.error('Middleware error:', e)
    // En caso de error, permitir acceso para no bloquear
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
    // En caso de error, denegar acceso para forzar verificación
    return { hasAccess: false, reason: 'error' }
  }
}

export const config = {
  // Include auth routes but NOT api, static files, _next
  matcher: "/((?!api|static|.*\\..*|_next).*)"
}

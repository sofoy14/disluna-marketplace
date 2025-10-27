import { createClient } from "@/lib/supabase/middleware"
import { i18nRouter } from "next-i18n-router"
import { NextResponse, type NextRequest } from "next/server"
import i18nConfig from "./i18nConfig"
import { isAdmin } from "@/lib/admin/check-admin"

export async function middleware(request: NextRequest) {
  const i18nResult = i18nRouter(request, i18nConfig)
  if (i18nResult) return i18nResult

  try {
    const { supabase, response } = createClient(request)

    const session = await supabase.auth.getSession()
    const user = session.data.session?.user

    // Allow access to public routes
    const publicRoutes = ['/login', '/auth/verify-email', '/onboarding', '/debug-auth', '/test-signup', '/billing']
    const isPublicRoute = publicRoutes.some(route => 
      request.nextUrl.pathname.startsWith(route)
    )

    if (isPublicRoute) {
      return response
    }

    // Redirect to login if no session
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Admin route protection
    if (request.nextUrl.pathname.startsWith('/admin')) {
      if (!isAdmin(user.email)) {
        // Redirigir al home en lugar de login para evitar loops
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    // Check email verification for protected routes
    if (!user.email_confirmed_at) {
      return NextResponse.redirect(new URL('/auth/verify-email', request.url))
    }

    // Check onboarding completion for chat and other protected routes
    const protectedRoutes = ['/chat', '/billing', '/settings']
    const isProtectedRoute = protectedRoutes.some(route => 
      request.nextUrl.pathname.includes(route)
    )

    if (isProtectedRoute) {
      // Permite que admins accedan sin onboarding
      const isUserAdmin = isAdmin(user.email)
      
      if (!isUserAdmin) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('user_id', user.id)
          .single()

        // Si no es admin y no tiene onboarding completado, redirigir
        if (!profile?.onboarding_completed) {
          return NextResponse.redirect(new URL('/onboarding', request.url))
        }
      }
    }

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

export const config = {
  matcher: "/((?!api|static|.*\\..*|_next|auth|onboarding|debug-auth|test-signup|billing).*)"
}

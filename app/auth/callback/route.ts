import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next")

  console.log('[Auth Callback] Received request:', { 
    hasCode: !!code, 
    next,
    origin: requestUrl.origin 
  })

  if (code) {
    const cookieStore = cookies()
    
    // Create Supabase client with proper cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              // Ignore - might be called from Server Component
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.delete(name)
            } catch (error) {
              // Ignore - might be called from Server Component
            }
          }
        }
      }
    )
    
    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('[Auth Callback] Error exchanging code:', error)
      return NextResponse.redirect(new URL('/login?message=Error de autenticación', requestUrl.origin))
    }

    if (!data.user) {
      console.error('[Auth Callback] No user after code exchange')
      return NextResponse.redirect(new URL('/login?message=No se pudo obtener usuario', requestUrl.origin))
    }

    console.log('[Auth Callback] User authenticated:', data.user.email)

    // If there's a specific next URL, redirect there
    if (next) {
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }

    // Check for active subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', data.user.id)
      .in('status', ['active', 'trialing'])
      .maybeSingle()

    // Get home workspace
    const { data: homeWorkspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('user_id', data.user.id)
      .eq('is_home', true)
      .maybeSingle()

    // Update profile for OAuth users
    await supabase
      .from('profiles')
      .update({ 
        email_verified: true,
        onboarding_step: subscription ? 'completed' : 'plan_selection'
      })
      .eq('user_id', data.user.id)

    // Redirect based on subscription status
    if (subscription && homeWorkspace) {
      console.log('[Auth Callback] User has subscription, redirecting to chat')
      return NextResponse.redirect(new URL(`/${homeWorkspace.id}/chat`, requestUrl.origin))
    }

    console.log('[Auth Callback] No subscription, redirecting to onboarding')
    return NextResponse.redirect(new URL('/onboarding', requestUrl.origin))
  }

  // No code provided
  console.log('[Auth Callback] No code provided')
  if (next) {
    return NextResponse.redirect(new URL(next, requestUrl.origin))
  }
  return NextResponse.redirect(new URL('/', requestUrl.origin))
}

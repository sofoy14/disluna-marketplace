import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next")

  // Create the response object early so we can add cookies to it
  const response = NextResponse.redirect(new URL('/onboarding', requestUrl.origin))
  
  if (code) {
    const cookieStore = cookies()
    
    // Track cookies that need to be set in the response
    const cookiesToSet: { name: string; value: string; options: CookieOptions }[] = []
    
    // Use anon key for auth callback to properly set session cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            // Store cookies to set them on the response
            cookiesToSet.push({ name, value, options })
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              // Ignore errors from Server Components
            }
          },
          remove(name: string, options: CookieOptions) {
            // Store cookie removal as empty value
            cookiesToSet.push({ name, value: '', options: { ...options, maxAge: 0 } })
            try {
              cookieStore.delete(name)
            } catch (error) {
              // Ignore errors from Server Components
            }
          }
        }
      }
    )
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(new URL('/login?message=Error verificando email', requestUrl.origin))
    }

    const user = data.user
    if (!user) {
      console.error('No user after exchanging code')
      return NextResponse.redirect(new URL('/login?message=Error de autenticación', requestUrl.origin))
    }

    // Apply all cookies to the response before returning
    const applyAuthCookies = (targetResponse: NextResponse) => {
      cookiesToSet.forEach(({ name, value, options }) => {
        targetResponse.cookies.set(name, value, {
          path: options.path || '/',
          maxAge: options.maxAge,
          domain: options.domain,
          secure: options.secure,
          httpOnly: options.httpOnly,
          sameSite: options.sameSite as 'lax' | 'strict' | 'none' | undefined
        })
      })
      return targetResponse
    }

    // Check if user has a profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed, onboarding_step, email_verified, display_name, has_onboarded')
      .eq('user_id', user.id)
      .single()

    // Get user's home workspace
    const { data: homeWorkspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_home', true)
      .single()

    // If there's a specific next URL (like password reset), redirect there
    if (next) {
      return applyAuthCookies(NextResponse.redirect(new URL(next, requestUrl.origin)))
    }

    // Mark email as verified for OAuth users
    if (user.email_confirmed_at && profile && !profile.email_verified) {
      await supabase
        .from('profiles')
        .update({ email_verified: true })
        .eq('user_id', user.id)
    }

    // Check for active subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .single()

    // 1. If user has an active subscription, go to chat
    if (subscription && homeWorkspace) {
      if (!profile?.onboarding_completed) {
        await supabase
          .from('profiles')
          .update({ onboarding_completed: true, onboarding_step: 'completed' })
          .eq('user_id', user.id)
      }
      return applyAuthCookies(NextResponse.redirect(new URL(`/${homeWorkspace.id}/chat`, requestUrl.origin)))
    }

    // 2. No subscription - redirect to onboarding for plan selection
    // Update onboarding step and email verified
    await supabase
      .from('profiles')
      .update({ 
        email_verified: true,
        onboarding_step: 'plan_selection'
      })
      .eq('user_id', user.id)
    
    return applyAuthCookies(NextResponse.redirect(new URL('/onboarding', requestUrl.origin)))
  }

  // No code provided - redirect to home
  if (next) {
    return NextResponse.redirect(new URL(next, requestUrl.origin))
  } else {
    return NextResponse.redirect(new URL('/', requestUrl.origin))
  }
}

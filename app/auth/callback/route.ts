import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

// Get the correct app URL for redirects
function getAppUrl(): string {
  // Always prioritize configured URL, fallback to production domain
  // NEVER use localhost in production
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  
  if (configuredUrl) {
    return configuredUrl;
  }
  
  // Hardcoded production fallback - NEVER localhost
  return 'https://aliado.pro';
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next")
  const error_description = requestUrl.searchParams.get("error_description")
  
  // Get the correct base URL for redirects - ALWAYS use production URL
  const appUrl = getAppUrl();

  console.log('[Auth Callback] Received request:', { 
    hasCode: !!code, 
    next,
    appUrl,
    envAppUrl: process.env.NEXT_PUBLIC_APP_URL || 'NOT SET',
    error_description: error_description || 'none'
  })

  // Handle OAuth errors
  if (error_description) {
    console.error('[Auth Callback] OAuth error:', error_description)
    return NextResponse.redirect(new URL(`/login?message=${encodeURIComponent(error_description)}`, appUrl))
  }

  const cookieStore = cookies()
  
  // Create Supabase client with proper cookie handling using getAll/setAll/removeAll
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
        removeAll(cookiesToRemove) {
          try {
            cookiesToRemove.forEach(({ name, options }) => {
              cookieStore.set(name, '', { ...options, maxAge: 0 })
            })
          } catch (error) {
            // The `removeAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        }
      }
    }
  )

  if (code) {
    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('[Auth Callback] Error exchanging code:', error)
      
      // PKCE error typically happens when code verifier is missing (different device login)
      // Try to check if user already has an active session
      if (error.message?.includes('code verifier') || error.code === 'validation_failed') {
        console.log('[Auth Callback] PKCE error - attempting to get existing session')
        
        // Try to get existing session from cookies
        const { data: sessionData } = await supabase.auth.getSession()
        
        if (sessionData?.session?.user) {
          console.log('[Auth Callback] Found existing session for:', sessionData.session.user.email)
          return await handleAuthenticatedUser(supabase, sessionData.session.user, next, appUrl)
        }
        
        // No existing session, redirect to login with helpful message
        console.log('[Auth Callback] No session found, redirecting to login')
        return NextResponse.redirect(
          new URL('/login?message=Tu sesión expiró. Por favor inicia sesión nuevamente.', appUrl)
        )
      }
      
      // Generic auth error
      return NextResponse.redirect(new URL('/login?message=Error de autenticación. Por favor intenta nuevamente.', appUrl))
    }

    if (!data.user) {
      console.error('[Auth Callback] No user after code exchange')
      return NextResponse.redirect(new URL('/login?message=No se pudo obtener usuario', appUrl))
    }

    console.log('[Auth Callback] User authenticated:', data.user.email)
    return await handleAuthenticatedUser(supabase, data.user, next, appUrl)
  }

  // No code provided - try to get existing session
  console.log('[Auth Callback] No code provided, checking for existing session')
  
  const { data: sessionData } = await supabase.auth.getSession()
  
  if (sessionData?.session?.user) {
    console.log('[Auth Callback] Found existing session:', sessionData.session.user.email)
    return await handleAuthenticatedUser(supabase, sessionData.session.user, next, appUrl)
  }
  
  if (next) {
    return NextResponse.redirect(new URL(next, appUrl))
  }
  return NextResponse.redirect(new URL('/', appUrl))
}

// Helper function to handle authenticated user redirect
async function handleAuthenticatedUser(
  supabase: any, 
  user: any, 
  next: string | null, 
  appUrl: string
): Promise<NextResponse> {
  // If there's a specific next URL, redirect there
  if (next && !next.includes('callback')) {
    return NextResponse.redirect(new URL(next, appUrl))
  }

  // Check for active subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, status')
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing'])
    .maybeSingle()

  // Get home workspace
  const { data: homeWorkspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_home', true)
    .maybeSingle()

  // Update profile for OAuth users - CRITICAL: set onboarding_completed for middleware check
  await supabase
    .from('profiles')
    .update({ 
      email_verified: true,
      onboarding_completed: subscription ? true : false,
      onboarding_step: subscription ? 'completed' : 'plan_selection',
      has_onboarded: true
    })
    .eq('user_id', user.id)

  // Redirect based on subscription status
  if (subscription && homeWorkspace) {
    console.log('[Auth Callback] User has subscription, redirecting to chat')
    return NextResponse.redirect(new URL(`/${homeWorkspace.id}/chat`, appUrl))
  }

  console.log('[Auth Callback] No subscription, redirecting to onboarding')
  return NextResponse.redirect(new URL('/onboarding', appUrl))
}

import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next")

  if (code) {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
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

    // Check if user has a profile (indicates if they're new or existing)
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed, onboarding_step, email_verified')
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
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }

    // Mark email as verified for OAuth users (their email is already verified by the provider)
    if (user.email_confirmed_at && profile && !profile.email_verified) {
      await supabase
        .from('profiles')
        .update({ email_verified: true })
        .eq('user_id', user.id)
    }

    // Determine where to redirect the user
    // 1. If user has completed onboarding, check subscription
    if (profile?.onboarding_completed && homeWorkspace) {
      // Check for active subscription
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('id, status')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing'])
        .single()

      if (subscription) {
        // User has active subscription - go to chat
        return NextResponse.redirect(new URL(`/${homeWorkspace.id}/chat`, requestUrl.origin))
      } else {
        // User completed onboarding but no active subscription - go to billing
        return NextResponse.redirect(new URL('/billing', requestUrl.origin))
      }
    }

    // 2. If user hasn't completed onboarding, send to onboarding
    // This handles both new users (from OAuth) and users who started but didn't finish onboarding
    if (profile && !profile.onboarding_completed) {
      // Update onboarding step if needed
      if (!profile.onboarding_step || profile.onboarding_step === 'email_verification') {
        await supabase
          .from('profiles')
          .update({ onboarding_step: 'profile_setup' })
          .eq('user_id', user.id)
      }
      return NextResponse.redirect(new URL('/onboarding', requestUrl.origin))
    }

    // 3. Fallback: If we have a workspace, go to chat, otherwise onboarding
    if (homeWorkspace) {
      return NextResponse.redirect(new URL(`/${homeWorkspace.id}/chat`, requestUrl.origin))
    } else {
      return NextResponse.redirect(new URL('/onboarding', requestUrl.origin))
    }
  }

  // No code provided - redirect based on next param or to home
  if (next) {
    return NextResponse.redirect(new URL(next, requestUrl.origin))
  } else {
    return NextResponse.redirect(new URL('/', requestUrl.origin))
  }
}

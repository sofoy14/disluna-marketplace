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

    // Check for active subscription first
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .single()

    // Determine where to redirect the user
    // 1. If user has an active subscription, go to chat
    if (subscription && homeWorkspace) {
      // Ensure onboarding is marked complete
      if (!profile?.onboarding_completed) {
        await supabase
          .from('profiles')
          .update({ onboarding_completed: true, onboarding_step: 'completed' })
          .eq('user_id', user.id)
      }
      return NextResponse.redirect(new URL(`/${homeWorkspace.id}/chat`, requestUrl.origin))
    }

    // 2. If user has no active subscription, always go to onboarding (which includes plan selection)
    // This ensures users must choose a plan before accessing the chat
    if (!subscription) {
      // Update onboarding step if needed
      const newStep = profile?.display_name ? 'plan_selection' : 'profile_setup'
      
      if (!profile?.onboarding_step || profile.onboarding_step !== newStep) {
        await supabase
          .from('profiles')
          .update({ 
            onboarding_step: newStep,
            email_verified: true // Mark as verified since they came from OAuth/email confirmation
          })
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

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

    // If this is an email verification, redirect to onboarding
    if (data.user?.email_confirmed_at) {
      // Update profile to mark email as verified
      await supabase
        .from('profiles')
        .update({
          email_verified: true,
          onboarding_step: 'profile_setup'
        })
        .eq('user_id', data.user.id)
      
      return NextResponse.redirect(new URL('/onboarding', requestUrl.origin))
    }
  }

  if (next) {
    return NextResponse.redirect(requestUrl.origin + next)
  } else {
    return NextResponse.redirect(requestUrl.origin)
  }
}

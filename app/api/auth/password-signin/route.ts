import { env } from '@/lib/env/runtime-env'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function redirect303(path: string) {
  return NextResponse.redirect(new URL(path, env.appUrl()), 303)
}

function sanitizeRedirect(path: string | null): string | null {
  const value = (path || "").trim()
  if (!value) return null
  if (!value.startsWith("/")) return null
  if (value.startsWith("//")) return null
  if (value.includes("\\")) return null
  return value
}

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const formData = await req.formData()

  const locale =
    (formData.get('locale') as string | null) ||
    cookieStore.get('NEXT_LOCALE')?.value ||
    'es'
  const email = (formData.get('email') as string | null)?.trim() || ''
  const password = (formData.get('password') as string | null) || ''
  const redirectPath = sanitizeRedirect(formData.get('redirect') as string | null)

  if (!email || !password) {
    return redirect303(
      `/${locale}/login?message=${encodeURIComponent('Correo y contraseña son obligatorios')}`
    )
  }

  const supabase = createClient(cookieStore)

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error || !data.user) {
    return redirect303(
      `/${locale}/login?message=${encodeURIComponent(error?.message || 'Error de autenticación')}`
    )
  }

  const userId = data.user.id

  // If user is coming from an invitation link, send them back to accept it (no subscription/home-workspace required)
  if (redirectPath?.startsWith('/invite/')) {
    return redirect303(redirectPath)
  }

  const { data: homeWorkspace } = await supabase
    .from('workspaces')
    .select('*')
    .eq('user_id', userId)
    .eq('is_home', true)
    .maybeSingle()

  if (!homeWorkspace) {
    return redirect303(`/${locale}/onboarding`)
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, status')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
    .maybeSingle()

  if (!subscription) {
    return redirect303(`/${locale}/onboarding`)
  }

  await supabase
    .from('profiles')
    .update({
      onboarding_completed: true,
      onboarding_step: 'completed',
      has_onboarded: true
    })
    .eq('user_id', userId)

  if (redirectPath) {
    return redirect303(redirectPath)
  }

  return redirect303(`/${locale}/${homeWorkspace.id}/chat`)
}

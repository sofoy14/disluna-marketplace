import { env } from '@/lib/env/runtime-env'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function redirect303(path: string) {
  return NextResponse.redirect(new URL(path, env.appUrl()), 303)
}

function splitCsv(value: string | undefined) {
  return value
    ? value
        .split(',')
        .map(v => v.trim())
        .filter(Boolean)
    : []
}

function sanitizeRedirect(path: string | null): string | null {
  const value = (path || '').trim()
  if (!value) return null
  if (!value.startsWith('/')) return null
  if (value.startsWith('//')) return null
  if (value.includes('\\')) return null
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

  const emailDomainWhitelist = splitCsv(process.env['EMAIL_DOMAIN_WHITELIST'])
  const emailWhitelist = splitCsv(process.env['EMAIL_WHITELIST'])

  if (emailDomainWhitelist.length > 0 || emailWhitelist.length > 0) {
    const domain = email.split('@')[1] || ''
    const domainMatch = emailDomainWhitelist.includes(domain)
    const emailMatch = emailWhitelist.includes(email)
    if (!domainMatch && !emailMatch) {
      return redirect303(
        `/${locale}/login?message=${encodeURIComponent(`Email ${email} no está permitido para registrarse.`)}`
      )
    }
  }

  const supabase = createClient(cookieStore)
  const appUrl = env.appUrl()
  const nextAfterVerify =
    redirectPath?.startsWith('/invite/') ? redirectPath : `/${locale}/auth/verify-email`

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent(nextAfterVerify)}`
    }
  })

  if (error) {
    return redirect303(
      `/${locale}/login?message=${encodeURIComponent(error.message)}`
    )
  }

  return redirect303(
    `/${locale}/auth/verify-email?message=${encodeURIComponent('Revisa tu correo para verificar tu cuenta')}`
  )
}

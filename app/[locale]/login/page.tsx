import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SubmitButton } from "@/components/ui/submit-button"
import { createClient } from "@/lib/supabase/server"
import { Database } from "@/supabase/types"
import { createServerClient } from "@supabase/ssr"
import { get } from "@vercel/edge-config"
import { Metadata } from "next"
import { ShaderCanvas } from "@/components/shader-canvas"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { OAuthButtons } from "@/components/auth/oauth-buttons"

export const metadata: Metadata = {
  title: "Iniciar Sesión"
}

export default async function Login({
  params,
  searchParams
}: {
  params: { locale: string }
  searchParams: { message: string }
}) {
  const { locale } = params
  const cookieStore = cookies()
  const supabase = createServerClient<Database>(
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
          } catch {
            // Called from Server Component - ignore
          }
        },
        removeAll(cookiesToRemove) {
          try {
            cookiesToRemove.forEach(({ name, options }) => {
              cookieStore.set(name, '', { ...options, maxAge: 0 })
            })
          } catch {
            // Called from Server Component - ignore
          }
        }
      }
    }
  )
  // Use getUser() for secure authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (!authError && user) {
    // Get user's home workspace
    const { data: homeWorkspace } = await supabase
      .from("workspaces")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_home", true)
      .maybeSingle()

    if (!homeWorkspace) {
      // No workspace - redirect to onboarding
      return redirect(`/${locale}/onboarding`)
    }

    // Check for active subscription
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("id, status")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .maybeSingle()

    if (!subscription) {
      // No active subscription - redirect to onboarding for plan selection
      return redirect(`/${locale}/onboarding`)
    }

    // CRITICAL: Ensure profile has onboarding_completed = true for middleware check
    // This fixes users who paid before the bug fix
    await supabase
      .from('profiles')
      .update({ 
        onboarding_completed: true, 
        onboarding_step: 'completed',
        has_onboarded: true
      })
      .eq('user_id', user.id)

    // User has workspace and subscription - go to chat
    return redirect(`/${locale}/${homeWorkspace.id}/chat`)
  }

  const signIn = async (formData: FormData) => {
    "use server"

    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    console.log('[Login] Attempting sign in for:', email)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      console.log('[Login] Auth error:', error.message)
      // Get locale from cookie or default to 'es'
      const localeCookie = cookieStore.get('NEXT_LOCALE')?.value || 'es'
      return redirect(`/${localeCookie}/login?message=${error.message}`)
    }

    console.log('[Login] Auth successful for user:', data.user.id)

    // Get locale from cookie or default to 'es'
    const localeCookie = cookieStore.get('NEXT_LOCALE')?.value || 'es'

    // Get workspace
    const { data: homeWorkspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("*")
      .eq("user_id", data.user.id)
      .eq("is_home", true)
      .maybeSingle()

    console.log('[Login] Workspace check:', { found: !!homeWorkspace, error: workspaceError?.message })

    if (!homeWorkspace) {
      // No workspace - go to onboarding
      console.log('[Login] No workspace, redirecting to /onboarding')
      return redirect(`/${localeCookie}/onboarding`)
    }

    // Check for active subscription
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("id, status")
      .eq("user_id", data.user.id)
      .in("status", ["active", "trialing"])
      .maybeSingle()

    console.log('[Login] Subscription check:', { found: !!subscription, error: subError?.message })

    if (!subscription) {
      // No subscription - go to onboarding for plan selection
      console.log('[Login] No subscription, redirecting to /onboarding')
      return redirect(`/${localeCookie}/onboarding`)
    }

    // CRITICAL: Ensure profile has onboarding_completed = true for middleware check
    await supabase
      .from('profiles')
      .update({ 
        onboarding_completed: true, 
        onboarding_step: 'completed',
        has_onboarded: true
      })
      .eq('user_id', data.user.id)

    // All good - go to chat
    console.log('[Login] All good, redirecting to chat:', homeWorkspace.id)
    return redirect(`/${localeCookie}/${homeWorkspace.id}/chat`)
  }

  const getEnvVarOrEdgeConfigValue = async (name: string) => {
    "use server"
    if (process.env.EDGE_CONFIG) {
      return await get<string>(name)
    }

    return process.env[name]
  }

  const signUp = async (formData: FormData) => {
    "use server"

    const email = formData.get("email") as string
    const password = formData.get("password") as string

    const emailDomainWhitelistPatternsString = await getEnvVarOrEdgeConfigValue(
      "EMAIL_DOMAIN_WHITELIST"
    )
    const emailDomainWhitelist = emailDomainWhitelistPatternsString?.trim()
      ? emailDomainWhitelistPatternsString?.split(",")
      : []
    const emailWhitelistPatternsString =
      await getEnvVarOrEdgeConfigValue("EMAIL_WHITELIST")
    const emailWhitelist = emailWhitelistPatternsString?.trim()
      ? emailWhitelistPatternsString?.split(",")
      : []

    // If there are whitelist patterns, check if the email is allowed to sign up
    if (emailDomainWhitelist.length > 0 || emailWhitelist.length > 0) {
      const domainMatch = emailDomainWhitelist?.includes(email.split("@")[1])
      const emailMatch = emailWhitelist?.includes(email)
      if (!domainMatch && !emailMatch) {
        return redirect(
          `/login?message=Email ${email} is not allowed to sign up.`
        )
      }
    }

    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Get app URL from env or use production default
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://aliado.pro';
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback?next=/auth/verify-email`
      }
    })

    if (error) {
      console.error('Signup error:', error)
      return redirect(`/login?message=${error.message}`)
    }

    // Log the signup result for debugging
    console.log('Signup successful, redirecting to verify-email')
    return redirect("/auth/verify-email?message=Revisa tu correo para verificar tu cuenta")
  }

  const handleResetPassword = async (formData: FormData) => {
    "use server"

    const email = formData.get("email") as string
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    // Always use the configured APP_URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://aliado.pro'

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/callback?next=/login/password`
    })

    if (error) {
      return redirect(`/login?message=${error.message}`)
    }

    return redirect("/login?message=Revisa tu correo para restablecer la contraseña")
  }

  // OAuth buttons are now handled client-side to preserve PKCE code_verifier in browser cookies
  // See components/auth/oauth-buttons.tsx

  return (
    <div className="grid min-h-screen w-full grid-cols-1 md:grid-cols-2">
      {/* Left side (visual) */}
      <div className="relative hidden md:flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/20">
        <div className="flex flex-col items-center justify-center">
          <div className="relative" style={{ width: 480, height: 480 }}>
            <ShaderCanvas size={480} shaderId={2} />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-9xl font-extrabold tracking-wide bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent whitespace-nowrap">ALI</span>
            </div>
          </div>
          <div className="mt-4 text-4xl font-semibold text-gray-600 dark:text-gray-300 text-center whitespace-nowrap">
            Asistente Legal Inteligente
          </div>
        </div>
      </div>

      {/* Right side (login form) */}
      <div className="flex w-full flex-1 flex-col justify-center gap-2 px-6 md:px-8 sm:max-w-md mx-auto">
        <div className="flex flex-col items-center justify-center mb-4 md:hidden">
          <div className="relative" style={{ width: 200, height: 200 }}>
            <ShaderCanvas size={200} shaderId={2} />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-6xl font-extrabold tracking-wide bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent whitespace-nowrap">ALI</span>
            </div>
          </div>
          <div className="mt-2 text-xl font-semibold text-gray-600 dark:text-gray-300 text-center whitespace-nowrap">
            Asistente Legal Inteligente
          </div>
        </div>

        <div className="relative w-full rounded-2xl border border-white/10 bg-gradient-to-b from-background/60 to-background/30 backdrop-blur-xl p-6 md:p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_20px_60px_-20px_rgba(124,58,237,0.5)]">
          <form
            className="animate-in text-foreground flex w-full flex-1 flex-col justify-center gap-2"
            action={signIn}
          >
            <Label className="text-md mt-2" htmlFor="email">
              Correo Electrónico
            </Label>
            <Input
              className="mb-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-foreground placeholder:text-foreground/50 focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-0"
              name="email"
              placeholder="tu@ejemplo.com"
              required
            />

            <Label className="text-md" htmlFor="password">
              Contraseña
            </Label>
            <Input
              className="mb-6 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-foreground placeholder:text-foreground/50 focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-0"
              type="password"
              name="password"
              placeholder="••••••••"
            />

            <SubmitButton className="mb-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 px-4 py-2 text-white shadow-[0_10px_30px_-10px_rgba(124,58,237,0.7)] hover:from-fuchsia-500 hover:to-indigo-500">
              Iniciar Sesión
            </SubmitButton>

            <SubmitButton
              formAction={signUp}
              className="border-white/10 mb-2 rounded-xl border px-4 py-2 bg-white/5 hover:bg-white/10"
            >
              Registrarse
            </SubmitButton>

            <div className="text-muted-foreground mt-1 flex justify-center text-sm">
              <span className="mr-1">¿Olvidaste tu contraseña?</span>
              <button
                formAction={handleResetPassword}
                className="text-primary ml-1 underline hover:opacity-80"
              >
                Restablecer
              </button>
            </div>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full bg-gradient-to-r from-transparent via-white/10 to-transparent h-px" />
            </div>
            <div className="relative flex justify-center text-[10px] tracking-widest uppercase">
              <span className="bg-background/70 px-3 text-muted-foreground rounded-full border border-white/10">
                O continúa con
              </span>
            </div>
          </div>

          <OAuthButtons />
        </div>

        {searchParams?.message && (
          <p className="bg-foreground/10 text-foreground mt-4 p-4 text-center">
            {searchParams.message}
          </p>
        )}
      </div>
    </div>
  )
}

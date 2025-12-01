import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SubmitButton } from "@/components/ui/submit-button"
import { createClient } from "@/lib/supabase/server"
import { Database } from "@/supabase/types"
import { createServerClient } from "@supabase/ssr"
import { get } from "@vercel/edge-config"
import { Metadata } from "next"
import { ShaderCanvas } from "@/components/shader-canvas"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Iniciar Sesión"
}

export default async function Login({
  searchParams
}: {
  searchParams: { message: string }
}) {
  const cookieStore = cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        }
      }
    }
  )
  const session = (await supabase.auth.getSession()).data.session

  if (session) {
    // Get user profile to check setup status
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, has_onboarded")
      .eq("user_id", session.user.id)
      .single()

    // If user hasn't set up their profile, redirect to setup
    if (!profile?.display_name && !profile?.has_onboarded) {
      return redirect('/setup')
    }

    // Get user's home workspace
    const { data: homeWorkspace } = await supabase
      .from("workspaces")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("is_home", true)
      .single()

    if (!homeWorkspace) {
      // User doesn't have a workspace yet - redirect to setup
      return redirect('/setup')
    }

    // Check for active subscription
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("id, status")
      .eq("user_id", session.user.id)
      .in("status", ["active", "trialing"])
      .single()

    if (!subscription) {
      // No active subscription - redirect to onboarding for plan selection
      return redirect('/onboarding')
    }

    // User has workspace and subscription - go to chat
    return redirect(`/${homeWorkspace.id}/chat`)
  }

  const signIn = async (formData: FormData) => {
    "use server"

    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      return redirect(`/login?message=${error.message}`)
    }

    // Get workspace
    const { data: homeWorkspace } = await supabase
      .from("workspaces")
      .select("*")
      .eq("user_id", data.user.id)
      .eq("is_home", true)
      .single()

    if (!homeWorkspace) {
      // No workspace - go to onboarding
      return redirect('/onboarding')
    }

    // Check for active subscription
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("id, status")
      .eq("user_id", data.user.id)
      .in("status", ["active", "trialing"])
      .single()

    if (!subscription) {
      // No subscription - go to onboarding for plan selection
      return redirect('/onboarding')
    }

    // All good - go to chat
    return redirect(`/${homeWorkspace.id}/chat`)
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

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?next=/auth/verify-email`
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

    const origin = headers().get("origin")
    const email = formData.get("email") as string
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/login/password`
    })

    if (error) {
      return redirect(`/login?message=${error.message}`)
    }

    return redirect("/login?message=Revisa tu correo para restablecer la contraseña")
  }

  const signInWithGoogle = async () => {
    "use server"
    
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
      }
    })

    if (error) {
      return redirect(`/login?message=${error.message}`)
    }

    if (data.url) {
      return redirect(data.url)
    }
  }

  const signInWithFacebook = async () => {
    "use server"
    
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
      }
    })

    if (error) {
      return redirect(`/login?message=${error.message}`)
    }

    if (data.url) {
      return redirect(data.url)
    }
  }

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

          <form action={signInWithGoogle}>
            <SubmitButton className="mb-2 w-full rounded-xl bg-white/10 px-4 py-2 text-white hover:bg-white/20 border border-white/10">
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continuar con Google
            </SubmitButton>
          </form>

          <form action={signInWithFacebook}>
            <SubmitButton className="mb-2 w-full rounded-xl bg-white/10 px-4 py-2 text-white hover:bg-white/20 border border-white/10">
              <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Continuar con Facebook
            </SubmitButton>
          </form>
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

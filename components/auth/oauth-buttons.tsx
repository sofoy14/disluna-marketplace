'use client'

import { getPublicEnvVar } from "@/lib/env/public-env"
import { createClient } from "@/lib/supabase/browser-client"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function OAuthButtons() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const handleOAuth = async (provider: 'google') => {
    try {
      setLoading(provider)

      const supabase = createClient()

      // ALWAYS force redirect to production domain - never use window.location.origin
      // This ensures OAuth always redirects to aliado.pro, not to Supabase or other domains
      const appUrl =
        getPublicEnvVar('NEXT_PUBLIC_APP_URL') ||
        getPublicEnvVar('NEXT_PUBLIC_SITE_URL') ||
        'https://aliado.pro'

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${appUrl}/auth/callback`,
        }
      })

      if (error) {
        console.error(`[OAuth] ${provider} error:`, error)
        router.push(`/login?message=${encodeURIComponent(error.message)}`)
        return
      }

      if (data.url) {
        window.location.href = data.url
      } else {
        console.error(`[OAuth] ${provider} - No URL returned from signInWithOAuth`)
        setLoading(null)
        router.push(`/login?message=${encodeURIComponent('Error al iniciar sesión. Por favor intenta nuevamente.')}`)
      }
    } catch (error) {
      console.error(`[OAuth] ${provider} exception:`, error)
      setLoading(null)
      router.push(`/login?message=${encodeURIComponent('Error al iniciar sesión. Por favor intenta nuevamente.')}`)
    }
  }

  return (
    <>
      <button
        onClick={() => handleOAuth('google')}
        disabled={loading !== null}
        className="w-full rounded-xl bg-white/10 px-4 py-2 text-white hover:bg-white/20 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading === 'google' ? (
          <span>Cargando...</span>
        ) : (
          <>
            <svg className="mr-2 h-4 w-4 inline" viewBox="0 0 24 24">
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
          </>
        )}
      </button>
    </>
  )
}

"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

// Setup page now redirects to onboarding
// All profile setup and plan selection is handled in /onboarding
export default function SetupPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to onboarding which handles both profile setup and plan selection
    router.replace('/onboarding')
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-violet-500 mx-auto mb-4" />
        <p className="text-slate-400">Redirigiendo...</p>
      </div>
    </div>
  )
}

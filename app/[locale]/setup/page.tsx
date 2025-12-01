"use client"

import { ChatbotUIContext } from "@/context/context"
import { getProfileByUserId, updateProfile } from "@/db/profile"
import {
  getHomeWorkspaceByUserId,
  getWorkspacesByUserId
} from "@/db/workspaces"
import {
  fetchHostedModels,
  fetchOpenRouterModels
} from "@/lib/models/fetch-models"
import { supabase } from "@/lib/supabase/browser-client"
import { TablesUpdate } from "@/supabase/types"
import { useRouter } from "next/navigation"
import { useContext, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  User, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle, 
  Loader2,
  Scale,
  MessageSquare,
  Zap
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShaderCanvas } from "@/components/shader-canvas"
import {
  PROFILE_DISPLAY_NAME_MAX,
  PROFILE_USERNAME_MAX,
  PROFILE_USERNAME_MIN
} from "@/db/limits"
import { toast } from "sonner"

const SETUP_STEP_COUNT = 2

export default function SetupPage() {
  const {
    profile,
    setProfile,
    setWorkspaces,
    setSelectedWorkspace,
    setEnvKeyMap,
    setAvailableHostedModels,
    setAvailableOpenRouterModels
  } = useContext(ChatbotUIContext)

  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)

  // Profile Step
  const [displayName, setDisplayName] = useState("")
  const [username, setUsername] = useState(profile?.username || "")
  const [usernameAvailable, setUsernameAvailable] = useState(true)
  const [checkingUsername, setCheckingUsername] = useState(false)

  useEffect(() => {
    ;(async () => {
      const session = (await supabase.auth.getSession()).data.session

      if (!session) {
        return router.push("/login")
      } else {
        const user = session.user

        const profile = await getProfileByUserId(user.id)
        setProfile(profile)
        setUsername(profile.username)
        
        // Pre-fill display name from profile if available
        if (profile.display_name) {
          setDisplayName(profile.display_name)
        }

        if (!profile.has_onboarded) {
          setLoading(false)
        } else {
          const data = await fetchHostedModels(profile)

          if (!data) return

          setEnvKeyMap(data.envKeyMap)
          setAvailableHostedModels(data.hostedModels)

          if (profile["openrouter_api_key"] || data.envKeyMap["openrouter"]) {
            const openRouterModels = await fetchOpenRouterModels()
            if (!openRouterModels) return
            setAvailableOpenRouterModels(openRouterModels)
          }

          const homeWorkspaceId = await getHomeWorkspaceByUserId(session.user.id)
          return router.push(`/${homeWorkspaceId}/chat`)
        }
      }
    })()
  }, [])

  const handleProceed = (forward: boolean) => {
    if (forward) {
      if (currentStep === SETUP_STEP_COUNT) {
        handleSaveSetupSetting()
      } else {
        setCurrentStep(currentStep + 1)
      }
    } else {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSaveSetupSetting = async () => {
    setSaving(true)
    
    const session = (await supabase.auth.getSession()).data.session
    if (!session) {
      return router.push("/login")
    }

    const user = session.user
    const profile = await getProfileByUserId(user.id)

    const updateProfilePayload: TablesUpdate<"profiles"> = {
      ...profile,
      has_onboarded: true,
      onboarding_step: 'plan_selection', // Mark that profile is done, now need plan
      display_name: displayName,
      username
    }

    const updatedProfile = await updateProfile(profile.id, updateProfilePayload)
    setProfile(updatedProfile)

    const workspaces = await getWorkspacesByUserId(profile.user_id)
    const homeWorkspace = workspaces.find(w => w.is_home)

    setSelectedWorkspace(homeWorkspace!)
    setWorkspaces(workspaces)

    // Redirect to onboarding for plan selection instead of chat
    return router.push('/onboarding')
  }

  // Username availability check with debounce
  const checkUsernameAvailability = async (newUsername: string) => {
    if (!newUsername) return

    if (newUsername.length < PROFILE_USERNAME_MIN) {
      setUsernameAvailable(false)
      return
    }

    if (newUsername.length > PROFILE_USERNAME_MAX) {
      setUsernameAvailable(false)
      return
    }

    const usernameRegex = /^[a-zA-Z0-9_]+$/
    if (!usernameRegex.test(newUsername)) {
      setUsernameAvailable(false)
      toast.error("Solo letras, números y guiones bajos permitidos")
      return
    }

    setCheckingUsername(true)

    try {
      const response = await fetch(`/api/username/available`, {
        method: "POST",
        body: JSON.stringify({ username: newUsername })
      })

      const data = await response.json()
      setUsernameAvailable(data.isAvailable)
    } catch (error) {
      console.error("Error checking username:", error)
    } finally {
      setCheckingUsername(false)
    }
  }

  // Debounced username check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (username) {
        checkUsernameAvailability(username)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [username])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-10 h-10 animate-spin text-violet-500 mx-auto mb-4" />
          <p className="text-slate-400">Cargando...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-500/20 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-fuchsia-500/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-[150px]" />
        
        {/* Floating particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-violet-400/30 rounded-full"
              initial={{
                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
                y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
              }}
              animate={{
                y: [null, Math.random() * -100 - 50],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: Math.random() * 3 + 2,
                repeat: Infinity,
                repeatType: "loop",
                delay: Math.random() * 2
              }}
            />
          ))}
        </div>
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Logo and header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="relative inline-block mb-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Scale className="w-10 h-10 text-white" />
            </div>
            <motion.div
              className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Sparkles className="w-3 h-3 text-white" />
            </motion.div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">
            Asistente Legal <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Inteligente</span>
          </h1>
          <p className="text-slate-400 text-sm">Tu aliado en la práctica legal</p>
        </motion.div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {[1, 2].map((step) => (
            <motion.div
              key={step}
              className={`flex items-center gap-2 ${step <= currentStep ? 'text-violet-400' : 'text-slate-600'}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: step * 0.1 }}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                step < currentStep 
                  ? 'bg-emerald-500 text-white' 
                  : step === currentStep 
                    ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30' 
                    : 'bg-slate-800 text-slate-500'
              }`}>
                {step < currentStep ? <CheckCircle className="w-4 h-4" /> : step}
              </div>
              {step < 2 && (
                <div className={`w-12 h-0.5 rounded-full transition-all duration-300 ${
                  step < currentStep ? 'bg-emerald-500' : 'bg-slate-700'
                }`} />
              )}
            </motion.div>
          ))}
        </div>

        {/* Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Step 1: Profile */}
            {currentStep === 1 && (
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Crea tu perfil</h2>
                    <p className="text-sm text-slate-400">Personaliza tu experiencia</p>
                  </div>
                </div>

                <div className="space-y-5">
                  {/* Username field */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-slate-300">Nombre de Usuario</Label>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          usernameAvailable 
                            ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' 
                            : 'border-red-500/50 text-red-400 bg-red-500/10'
                        }`}
                      >
                        {checkingUsername ? (
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : usernameAvailable ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : null}
                        {usernameAvailable ? 'Disponible' : 'No disponible'}
                      </Badge>
                    </div>
                    <div className="relative">
                      <Input
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, '_'))}
                        placeholder="tu_usuario"
                        className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-violet-500 focus:ring-violet-500/20 pr-10"
                        minLength={PROFILE_USERNAME_MIN}
                        maxLength={PROFILE_USERNAME_MAX}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {checkingUsername ? (
                          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                        ) : usernameAvailable ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center">
                            <span className="text-red-500 text-xs">✕</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">{username.length}/{PROFILE_USERNAME_MAX} caracteres</p>
                  </div>

                  {/* Display name field */}
                  <div className="space-y-2">
                    <Label className="text-slate-300">Nombre para mostrar</Label>
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Tu nombre completo"
                      className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-violet-500 focus:ring-violet-500/20"
                      maxLength={PROFILE_DISPLAY_NAME_MAX}
                    />
                    <p className="text-xs text-slate-500">{displayName.length}/{PROFILE_DISPLAY_NAME_MAX} caracteres</p>
                  </div>
                </div>

                {/* Next button */}
                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={() => handleProceed(true)}
                    disabled={!username || !usernameAvailable || checkingUsername}
                    className="bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700 text-white shadow-lg shadow-violet-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continuar
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Finish */}
            {currentStep === 2 && (
              <div className="p-6">
                <div className="text-center py-6">
                  {/* Orb animation */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="relative mx-auto mb-6"
                    style={{ width: 160, height: 160 }}
                  >
                    <ShaderCanvas size={160} shaderId={2} />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-4xl font-extrabold tracking-wide bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                        ALI
                      </span>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h2 className="text-2xl font-bold text-white mb-2">
                      ¡Bienvenido{displayName ? `, ${displayName.split(' ')[0]}` : ''}!
                    </h2>
                    <p className="text-slate-400 mb-6">
                      Tu perfil está listo. Ahora elige tu plan para comenzar.
                    </p>
                  </motion.div>

                  {/* Features preview */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="grid grid-cols-3 gap-4 mb-6"
                  >
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                      <MessageSquare className="w-6 h-6 text-violet-400 mx-auto mb-2" />
                      <p className="text-xs text-slate-400">Chat IA Legal</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                      <Scale className="w-6 h-6 text-fuchsia-400 mx-auto mb-2" />
                      <p className="text-xs text-slate-400">Análisis Jurídico</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                      <Zap className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                      <p className="text-xs text-slate-400">Respuestas Rápidas</p>
                    </div>
                  </motion.div>
                </div>

                {/* Navigation buttons */}
                <div className="flex justify-between">
                  <Button
                    variant="ghost"
                    onClick={() => handleProceed(false)}
                    className="text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Atrás
                  </Button>
                  <Button
                    onClick={() => handleProceed(true)}
                    disabled={saving}
                    className="bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700 text-white shadow-lg shadow-violet-500/25"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        Elegir Plan
                        <Sparkles className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-slate-500 mt-6"
        >
          Paso {currentStep} de {SETUP_STEP_COUNT}
        </motion.p>
      </div>
    </div>
  )
}

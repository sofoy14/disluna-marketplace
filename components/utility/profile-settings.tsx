import { ALIContext } from "@/context/context"
import {
  PROFILE_CONTEXT_MAX,
  PROFILE_DISPLAY_NAME_MAX,
  PROFILE_USERNAME_MAX,
  PROFILE_USERNAME_MIN
} from "@/db/limits"
import { updateProfile } from "@/db/profile"
import { uploadProfileImage } from "@/db/storage/profile-images"
import { supabase } from "@/lib/supabase/browser-client"
import {
  IconCircleCheckFilled,
  IconCircleXFilled,
  IconLoader2,
  IconLogout,
  IconUser,
  IconCreditCard,
  IconSettings,
  IconChevronRight
} from "@tabler/icons-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { FC, ReactNode, useCallback, useContext, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { SIDEBAR_ICON_SIZE } from "../sidebar/sidebar-switcher"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import ImagePicker from "../ui/image-picker"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { LimitDisplay } from "../ui/limit-display"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "../ui/sheet"
import { TextareaAutosize } from "../ui/textarea-autosize"
import WhatsAppSVG from "@/components/icons/whatsapp-svg"
import { ThemeSwitcher } from "./theme-switcher"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Sparkles, 
  Crown, 
  Building, 
  Palette, 
  FileText, 
  Shield,
  Bell,
  ChevronRight
} from "lucide-react"

interface ProfileSettingsProps {
  trigger?: ReactNode
}

const debounce = <Args extends unknown[]>(
  func: (...args: Args) => void,
  wait: number
) => {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return (...args: Args) => {
    if (timeout) clearTimeout(timeout)

    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

// Secciones del menú de configuración
type SettingsSection = 'profile' | 'organization' | 'appearance' | 'contexts' | 'security'

const menuSections = [
  { id: 'profile' as SettingsSection, label: 'Perfil', icon: IconUser, description: 'Tu información personal' },
  { id: 'organization' as SettingsSection, label: 'Organización', icon: Building, description: 'Datos de tu firma' },
  { id: 'appearance' as SettingsSection, label: 'Apariencia', icon: Palette, description: 'Tema y colores' },
  { id: 'contexts' as SettingsSection, label: 'Contextos', icon: FileText, description: 'Preferencias de IA' },
  { id: 'security' as SettingsSection, label: 'Seguridad', icon: Shield, description: 'Contraseña y 2FA' },
]

export const ProfileSettings: FC<ProfileSettingsProps> = ({ trigger }) => {
  const { profile, setProfile } = useContext(ALIContext)
  const router = useRouter()

  const buttonRef = useRef<HTMLButtonElement>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile')

  const [displayName, setDisplayName] = useState(profile?.display_name || "")
  const [username, setUsername] = useState(profile?.username || "")
  const [usernameAvailable, setUsernameAvailable] = useState(true)
  const [loadingUsername, setLoadingUsername] = useState(false)
  const [profileImageSrc, setProfileImageSrc] = useState(profile?.image_url || "")
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [profileInstructions, setProfileInstructions] = useState(
    profile?.profile_context || ""
  )

  const resetForm = useCallback(() => {
    setDisplayName(profile?.display_name || "")
    setUsername(profile?.username || "")
    setProfileImageSrc(profile?.image_url || "")
    setProfileImageFile(null)
    setProfileInstructions(profile?.profile_context || "")
    setUsernameAvailable(true)
    setLoadingUsername(false)
    setActiveSection('profile')
  }, [profile])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const handleWhatsAppClick = () => {
    const phoneNumber = "+57 323 2341127"
    const message = "Hola, necesito soporte con ALI"
    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${encodedMessage}`
    window.open(whatsappUrl, '_blank')
  }

  const handleSave = async () => {
    if (!profile) return

    try {
      let profileImageUrl = profile.image_url
      let profileImagePath = profile.image_path || ""

      if (profileImageFile) {
        const { path, url } = await uploadProfileImage(profile, profileImageFile)
        profileImageUrl = url ?? profileImageUrl
        profileImagePath = path
      }

      const updatedProfile = await updateProfile(profile.id, {
        ...profile,
        display_name: displayName,
        username,
        profile_context: profileInstructions,
        image_url: profileImageUrl,
        image_path: profileImagePath
      })

      setProfile(updatedProfile)
      toast.success("Perfil actualizado correctamente.")
      setIsOpen(false)
    } catch (error) {
      toast.error("No se pudo guardar la configuración.")
    }
  }

  const checkUsernameAvailability = useCallback(
    debounce(async (candidate: string) => {
      if (!candidate) return

      if (candidate.length < PROFILE_USERNAME_MIN) {
        setUsernameAvailable(false)
        return
      }

      if (candidate.length > PROFILE_USERNAME_MAX) {
        setUsernameAvailable(false)
        return
      }

      const usernameRegex = /^[a-zA-Z0-9_]+$/
      if (!usernameRegex.test(candidate)) {
        setUsernameAvailable(false)
        toast.error(
          "El nombre de usuario solo puede contener letras, números o guiones bajos."
        )
        return
      }

      setLoadingUsername(true)

      const response = await fetch(`/api/username/available`, {
        method: "POST",
        body: JSON.stringify({ username: candidate })
      })

      const data = await response.json()
      const isAvailable = data.isAvailable

      setUsernameAvailable(
        candidate === profile?.username ? true : Boolean(isAvailable)
      )
      setLoadingUsername(false)
    }, 400),
    [profile?.username]
  )

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") {
      buttonRef.current?.click()
    }
  }

  if (!profile) return null

  return (
    <Sheet
      open={isOpen}
      onOpenChange={open => {
        setIsOpen(open)
        if (open) resetForm()
      }}
    >
      <SheetTrigger asChild>
        {trigger || (
          <Button size="icon" variant="ghost" className="relative">
            <IconUser size={SIDEBAR_ICON_SIZE} />
            {profile && (
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
            )}
          </Button>
        )}
      </SheetTrigger>

      <SheetContent
        className="flex flex-col w-full sm:max-w-lg p-0 gap-0 overflow-hidden"
        side="right"
        onKeyDown={handleKeyDown}
      >
        {/* Header con perfil - Glassmorphism */}
        <div className="relative shrink-0 p-6 border-b border-white/5">
          {/* Fondo degradado */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />
          
          <SheetHeader className="relative text-left space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-16 w-16 ring-2 ring-white/10 ring-offset-2 ring-offset-background shadow-lg">
                    <AvatarImage
                      src={profile.image_url || undefined}
                      alt={profile.display_name || profile.username}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-xl font-bold">
                      {(profile.display_name || profile.username || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                </div>
                
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <SheetTitle className="text-lg font-semibold truncate">
                      {profile.display_name || profile.username}
                    </SheetTitle>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    @{profile.username || "usuario"}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Sparkles className="h-3 w-3 text-amber-400" />
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-amber-500/10 text-amber-400 border-0">
                      Pro
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 rounded-lg border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                  onClick={() => {
                    setIsOpen(false)
                    router.push('/precios')
                  }}
                >
                  <Crown className="mr-1.5 h-3.5 w-3.5" />
                  Plan Pro
                </Button>
              </div>
            </div>

            {/* Botones de soporte y logout */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-9 rounded-lg border-white/10 hover:bg-white/5"
                onClick={handleWhatsAppClick}
              >
                <WhatsAppSVG className="mr-2 w-4 h-4" />
                Soporte
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-9 rounded-lg border-destructive/30 text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
                onClick={handleSignOut}
              >
                <IconLogout className="mr-2" size={16} />
                Cerrar sesión
              </Button>
            </div>
          </SheetHeader>
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeSection === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="p-6 space-y-6"
              >
                {/* Información de perfil */}
                <div className="glass-card rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                    Información
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Username */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="username" className="text-sm">Nombre de usuario</Label>
                        {username !== profile.username && (
                          <span className={cn(
                            "text-xs font-medium",
                            usernameAvailable ? "text-emerald-400" : "text-red-400"
                          )}>
                            {usernameAvailable ? "Disponible" : "No disponible"}
                          </span>
                        )}
                      </div>

                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                        <Input
                          id="username"
                          className="pl-7 pr-10 glass-input border-0"
                          placeholder="ej. abogada.civil"
                          value={username}
                          onChange={event => {
                            setUsername(event.target.value)
                            checkUsernameAvailability(event.target.value)
                          }}
                          minLength={PROFILE_USERNAME_MIN}
                          maxLength={PROFILE_USERNAME_MAX}
                        />
                        {username !== profile.username && (
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
                            {loadingUsername ? (
                              <IconLoader2 className="h-4 w-4 animate-spin" />
                            ) : usernameAvailable ? (
                              <IconCircleCheckFilled className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <IconCircleXFilled className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <LimitDisplay used={username.length} limit={PROFILE_USERNAME_MAX} />
                        <span>{PROFILE_USERNAME_MIN}-{PROFILE_USERNAME_MAX} caracteres</span>
                      </div>
                    </div>

                    {/* Display Name */}
                    <div className="space-y-2">
                      <Label htmlFor="display-name" className="text-sm">Nombre visible</Label>
                      <Input
                        id="display-name"
                        placeholder="Nombre que verán tus clientes"
                        value={displayName}
                        onChange={event => setDisplayName(event.target.value)}
                        maxLength={PROFILE_DISPLAY_NAME_MAX}
                        className="glass-input border-0"
                      />
                      <div className="text-xs text-muted-foreground">
                        <LimitDisplay used={displayName.length} limit={PROFILE_DISPLAY_NAME_MAX} />
                      </div>
                    </div>

                    {/* Profile Image */}
                    <div className="space-y-2">
                      <Label className="text-sm">Imagen de perfil</Label>
                      <div className="flex items-center gap-4">
                        <ImagePicker
                          src={profileImageSrc}
                          image={profileImageFile}
                          height={72}
                          width={72}
                          onSrcChange={setProfileImageSrc}
                          onImageChange={setProfileImageFile}
                        />
                        <p className="text-xs text-muted-foreground max-w-[200px]">
                          Sube una imagen cuadrada para que se vea nítida en el chat.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contexto del asistente */}
                <div className="glass-card rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                    Contexto para ALI
                  </h3>
                  <div className="space-y-2">
                    <TextareaAutosize
                      id="profile-context"
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm leading-relaxed focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors resize-none"
                      placeholder="Describe tu especialidad, estilo de respuesta o cualquier información relevante..."
                      value={profileInstructions}
                      onValueChange={setProfileInstructions}
                      minRows={4}
                      maxRows={8}
                      maxLength={PROFILE_CONTEXT_MAX}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <LimitDisplay used={profileInstructions.length} limit={PROFILE_CONTEXT_MAX} />
                      <span>Máximo {PROFILE_CONTEXT_MAX} caracteres</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeSection === 'organization' && (
              <motion.div
                key="organization"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="p-6"
              >
                <div className="glass-card rounded-2xl p-8 text-center">
                  <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <Building className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Configuración de organización</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Gestiona los datos de tu firma legal desde el panel de ajustes completo.
                  </p>
                  <Button 
                    onClick={() => {
                      setIsOpen(false)
                      router.push('/account')
                    }}
                    className="rounded-xl"
                  >
                    Ir a ajustes completos
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {activeSection === 'appearance' && (
              <motion.div
                key="appearance"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="p-6"
              >
                <div className="glass-card rounded-2xl p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Tema
                  </h3>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                    <span className="text-sm">Modo oscuro</span>
                    <ThemeSwitcher />
                  </div>
                </div>
              </motion.div>
            )}

            {activeSection === 'contexts' && (
              <motion.div
                key="contexts"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="p-6"
              >
                <div className="glass-card rounded-2xl p-8 text-center">
                  <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Contextos avanzados</h3>
                  <p className="text-sm text-muted-foreground">
                    Configura contextos más detallados desde el panel completo de ajustes.
                  </p>
                </div>
              </motion.div>
            )}

            {activeSection === 'security' && (
              <motion.div
                key="security"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="p-6 space-y-4"
              >
                <div className="glass-card rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                    Seguridad
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                      <div>
                        <p className="text-sm font-medium">Contraseña</p>
                        <p className="text-xs text-muted-foreground">Última actualización hace 3 meses</p>
                      </div>
                      <Button variant="outline" size="sm" className="rounded-lg border-white/10 hover:bg-white/5">
                        Cambiar
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                      <div>
                        <p className="text-sm font-medium">Autenticación de dos factores</p>
                        <p className="text-xs text-muted-foreground">No configurada</p>
                      </div>
                      <Button variant="outline" size="sm" className="rounded-lg border-white/10 hover:bg-white/5">
                        Configurar
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer con navegación y acciones */}
        <div className="shrink-0 border-t border-white/5 bg-card/30 backdrop-blur-sm">
          {/* Menú de navegación rápida */}
          <div className="flex items-center justify-between px-2 py-2 border-b border-white/5 overflow-x-auto scrollbar-hide">
            {menuSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                  activeSection === section.id
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                <section.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{section.label}</span>
              </button>
            ))}
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Tema</span>
              <ThemeSwitcher />
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsOpen(false)}
                className="rounded-xl border-white/10 hover:bg-white/5"
              >
                Cerrar
              </Button>
              <Button 
                ref={buttonRef} 
                onClick={handleSave}
                className="rounded-xl bg-primary hover:bg-primary/90"
              >
                Guardar
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

'use client'

import { useContext, useState } from "react"
import { ALIContext } from "@/context/context"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThemeSwitcher } from "@/components/utility/theme-switcher"
import { supabase } from "@/lib/supabase/browser-client"
import { useRouter } from "next/navigation"
import { 
  Menu, 
  User, 
  Building, 
  Sun, 
  FileText, 
  LogOut, 
  Sparkles,
  Crown,
  Palette,
  CreditCard,
  ChevronRight,
  Settings2
} from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface UserSettingsLayoutProps {
  children?: React.ReactNode
}

type SettingsTab = 'account' | 'organization' | 'appearance' | 'contexts' | 'subscription'

const menuItems = [
  { id: 'account' as SettingsTab, label: 'Mi cuenta', icon: User, description: 'Información personal' },
  { id: 'organization' as SettingsTab, label: 'Organización', icon: Building, description: 'Datos de tu firma' },
]

const personalizationItems = [
  { id: 'appearance' as SettingsTab, label: 'Apariencia', icon: Palette, description: 'Tema y colores' },
  { id: 'contexts' as SettingsTab, label: 'Contextos', icon: FileText, description: 'Preferencias de IA' },
]

const subscriptionItem = { id: 'subscription' as SettingsTab, label: 'Suscripción', icon: Crown, description: 'Plan y facturación' }

export function UserSettingsLayout({ children }: UserSettingsLayoutProps) {
  const { profile } = useContext(ALIContext)
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<SettingsTab>('account')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const SidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header con perfil - Glassmorphism */}
      <div className="relative p-5">
        {/* Fondo degradado sutil */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />
        
        <div className="relative flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-14 w-14 ring-2 ring-white/10 ring-offset-2 ring-offset-background shadow-lg">
              <AvatarImage src={profile?.image_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white font-semibold text-lg">
                {(profile?.display_name || profile?.username || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {/* Indicador de estado online */}
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-background" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">
              {profile?.display_name || profile?.username || 'Usuario'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              @{profile?.username || 'usuario'}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <Sparkles className="h-3 w-3 text-amber-400" />
              <span className="text-[10px] font-medium text-amber-400/80 uppercase tracking-wide">Pro</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
        {/* Sección: Mi Cuenta */}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2">
            Mi Cuenta
          </p>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group",
                activeTab === item.id
                  ? "bg-primary/10 text-primary shadow-sm shadow-primary/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-colors",
                activeTab === item.id ? "bg-primary/20" : "bg-muted/50 group-hover:bg-muted"
              )}>
                <item.icon className="h-4 w-4" />
              </div>
              <span className="font-medium">{item.label}</span>
              {activeTab === item.id && (
                <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
              )}
            </button>
          ))}
        </div>

        {/* Sección: Personalización */}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2">
            Personalización
          </p>
          {personalizationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group",
                activeTab === item.id
                  ? "bg-primary/10 text-primary shadow-sm shadow-primary/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-colors",
                activeTab === item.id ? "bg-primary/20" : "bg-muted/50 group-hover:bg-muted"
              )}>
                <item.icon className="h-4 w-4" />
              </div>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Sección: Suscripción */}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2">
            Plan
          </p>
          <button
            onClick={() => setActiveTab(subscriptionItem.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group relative overflow-hidden",
              activeTab === subscriptionItem.id
                ? "bg-gradient-to-r from-amber-500/20 to-orange-500/10 text-amber-400 border border-amber-500/20"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent"
            )}
          >
            <div className={cn(
              "p-1.5 rounded-lg transition-colors",
              activeTab === subscriptionItem.id ? "bg-amber-500/20" : "bg-muted/50 group-hover:bg-muted"
            )}>
              <Crown className="h-4 w-4" />
            </div>
            <div className="flex-1 text-left">
              <span className="font-medium block">{subscriptionItem.label}</span>
              <span className="text-[10px] opacity-70">Plan Pro activo</span>
            </div>
          </button>
        </div>

        {/* Preferencias: Tema */}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2">
            Preferencias
          </p>
          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/5 border border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-muted/50">
                <Sun className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Tema</span>
            </div>
            <ThemeSwitcher />
          </div>
        </div>
      </div>

      {/* Footer: Cerrar sesión */}
      <div className="p-3 border-t border-white/5">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-destructive/80 hover:text-destructive hover:bg-destructive/10 rounded-xl h-11"
          onClick={handleSignOut}
        >
          <div className="p-1.5 rounded-lg bg-destructive/10">
            <LogOut className="h-4 w-4" />
          </div>
          <span className="font-medium">Cerrar sesión</span>
        </Button>
      </div>
    </div>
  )

  return (
    <div className="flex h-full min-h-0 bg-gradient-to-br from-background via-background to-muted/20">
      {/* Desktop sidebar - Glassmorphism */}
      <div className="hidden md:block w-72 flex-shrink-0">
        <div className="h-full border-r border-white/10 bg-card/40 backdrop-blur-xl">
          {SidebarContent}
        </div>
      </div>

      {/* Mobile menu */}
      <div className="md:hidden absolute left-3 top-3 z-50">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              className="bg-card/80 backdrop-blur-xl border-white/10 shadow-lg hover:bg-card/90"
            >
              <Menu className="h-4 w-4" />
              <span className="sr-only">Abrir menú</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 bg-card/95 backdrop-blur-xl border-white/10">
            {SidebarContent}
          </SheetContent>
        </Sheet>
      </div>

      {/* Main content - Glassmorphism */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header móvil */}
        <div className="md:hidden h-14 border-b border-white/5 flex items-center px-4 bg-card/30 backdrop-blur-sm">
          <Settings2 className="h-5 w-5 text-muted-foreground mr-2" />
          <span className="font-semibold">Ajustes</span>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-3xl mx-auto"
            >
              {activeTab === 'account' && <AccountSettings />}
              {activeTab === 'organization' && <OrganizationSettings />}
              {activeTab === 'appearance' && <AppearanceSettings />}
              {activeTab === 'contexts' && <ContextsSettings />}
              {activeTab === 'subscription' && <SubscriptionSettings />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// Sub-componentes para cada sección

function AccountSettings() {
  const { profile } = useContext(ALIContext)
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [email, setEmail] = useState(profile?.email || '')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Mi cuenta</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Gestiona tu información personal y credenciales de acceso
        </p>
      </div>

      {/* Tarjeta de perfil */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-start gap-6">
          <div className="relative group">
            <Avatar className="h-24 w-24 ring-4 ring-white/5 shadow-xl">
              <AvatarImage src={profile?.image_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-3xl font-bold">
                {(profile?.display_name || profile?.username || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <button className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium">
              Cambiar
            </button>
          </div>
          
          <div className="flex-1 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Nombre visible</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
                  placeholder="Tu nombre"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Nombre de usuario</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                  <input
                    type="text"
                    value={profile?.username || ''}
                    className="w-full pl-7 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
                    placeholder="usuario"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
                placeholder="tu@email.com"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-white/5">
          <Button variant="outline" className="rounded-xl border-white/10 hover:bg-white/5">
            Cancelar
          </Button>
          <Button className="rounded-xl bg-primary hover:bg-primary/90">
            Guardar cambios
          </Button>
        </div>
      </div>

      {/* Seguridad */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Seguridad</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
            <div>
              <p className="font-medium">Contraseña</p>
              <p className="text-sm text-muted-foreground">Última actualización hace 3 meses</p>
            </div>
            <Button variant="outline" size="sm" className="rounded-lg border-white/10 hover:bg-white/5">
              Cambiar
            </Button>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
            <div>
              <p className="font-medium">Autenticación de dos factores</p>
              <p className="text-sm text-muted-foreground">Añade una capa extra de seguridad</p>
            </div>
            <Button variant="outline" size="sm" className="rounded-lg border-white/10 hover:bg-white/5">
              Configurar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function OrganizationSettings() {
  const [orgName, setOrgName] = useState('Estudio Jurídico XYZ')
  const [description, setDescription] = useState('')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Organización</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configura los datos de tu firma legal
        </p>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Nombre de la organización</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
              placeholder="Nombre de tu firma"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors resize-none"
              placeholder="Describe tu organización..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Logo</label>
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Building className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="rounded-lg border-white/10 hover:bg-white/5">
                  Subir logo
                </Button>
                <p className="text-xs text-muted-foreground">JPG, PNG o SVG. Máximo 2MB.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-white/5">
          <Button variant="outline" className="rounded-xl border-white/10 hover:bg-white/5">
            Cancelar
          </Button>
          <Button className="rounded-xl bg-primary hover:bg-primary/90">
            Guardar cambios
          </Button>
        </div>
      </div>

      {/* Equipo */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Equipo</h3>
            <p className="text-sm text-muted-foreground">Gestiona los miembros de tu equipo</p>
          </div>
          <Button size="sm" className="rounded-lg">
            Invitar miembro
          </Button>
        </div>
        
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <User className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-muted-foreground">No hay miembros en tu equipo</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Invita a colegas para colaborar
          </p>
        </div>
      </div>
    </div>
  )
}

function AppearanceSettings() {
  const themes = [
    { id: 'dark', label: 'Oscuro', color: 'bg-zinc-900', border: 'border-zinc-700' },
    { id: 'midnight', label: 'Medianoche', color: 'bg-slate-950', border: 'border-slate-700' },
    { id: 'purple', label: 'Púrpura', color: 'bg-purple-950', border: 'border-purple-700' },
  ]

  const [selectedTheme, setSelectedTheme] = useState('dark')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Apariencia</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Personaliza el aspecto visual de la aplicación
        </p>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Tema</h3>
        <div className="grid grid-cols-3 gap-4">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => setSelectedTheme(theme.id)}
              className={cn(
                "relative rounded-xl p-4 border-2 transition-all duration-200",
                theme.color,
                selectedTheme === theme.id ? `border-primary` : `border-transparent hover:border-white/10`
              )}
            >
              <div className={cn("h-16 rounded-lg border mb-3", theme.border)} />
              <p className={cn(
                "text-sm font-medium",
                selectedTheme === theme.id ? "text-white" : "text-muted-foreground"
              )}>
                {theme.label}
              </p>
              {selectedTheme === theme.id && (
                <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Color de acento</h3>
        <div className="flex flex-wrap gap-3">
          {['violet', 'blue', 'emerald', 'amber', 'rose', 'cyan'].map((color) => (
            <button
              key={color}
              className={cn(
                "h-10 w-10 rounded-full border-2 border-transparent hover:scale-110 transition-all duration-200",
                color === 'violet' && "bg-violet-500 ring-2 ring-violet-500/30",
                color === 'blue' && "bg-blue-500 ring-2 ring-blue-500/30",
                color === 'emerald' && "bg-emerald-500 ring-2 ring-emerald-500/30",
                color === 'amber' && "bg-amber-500 ring-2 ring-amber-500/30",
                color === 'rose' && "bg-rose-500 ring-2 ring-rose-500/30",
                color === 'cyan' && "bg-cyan-500 ring-2 ring-cyan-500/30",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ContextsSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Contextos</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configura el comportamiento del asistente legal
        </p>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Contexto del asistente</label>
            <textarea
              rows={6}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors resize-none"
              placeholder="Describe tu especialidad, estilo de respuesta preferido, o cualquier información relevante para que ALI te asista mejor..."
            />
            <p className="text-xs text-muted-foreground">
              Este contexto ayuda a ALI a personalizar sus respuestas según tu estilo y necesidades.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-white/5">
          <Button variant="outline" className="rounded-xl border-white/10 hover:bg-white/5">
            Cancelar
          </Button>
          <Button className="rounded-xl bg-primary hover:bg-primary/90">
            Guardar cambios
          </Button>
        </div>
      </div>
    </div>
  )
}

function SubscriptionSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Suscripción</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Gestiona tu plan y facturación
        </p>
      </div>

      {/* Plan actual */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-6">
        <div className="absolute top-0 right-0 p-4">
          <Crown className="h-12 w-12 text-amber-500/20" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">Plan actual</span>
          </div>
          <h3 className="text-3xl font-bold mb-1">Pro</h3>
          <p className="text-muted-foreground">$29/mes - Renovación el 15 de marzo, 2025</p>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Método de pago</h3>
        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
          <div className="flex items-center gap-4">
            <div className="h-10 w-16 rounded bg-white/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">•••• •••• •••• 4242</p>
              <p className="text-sm text-muted-foreground">Expira 12/26</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="rounded-lg border-white/10 hover:bg-white/5">
            Cambiar
          </Button>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Historial de facturas</h3>
        <div className="space-y-2">
          {[
            { date: '15 Feb, 2025', amount: '$29.00', status: 'Pagado' },
            { date: '15 Ene, 2025', amount: '$29.00', status: 'Pagado' },
            { date: '15 Dic, 2024', amount: '$29.00', status: 'Pagado' },
          ].map((invoice, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Factura #{2025001 + i}</p>
                  <p className="text-sm text-muted-foreground">{invoice.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-medium">{invoice.amount}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
                  {invoice.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

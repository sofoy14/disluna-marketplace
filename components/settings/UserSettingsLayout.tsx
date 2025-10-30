'use client'

import { useContext } from "react"
import { ChatbotUIContext } from "@/context/context"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThemeSwitcher } from "@/components/utility/theme-switcher"
import { supabase } from "@/lib/supabase/browser-client"
import { useRouter } from "next/navigation"
import { Menu, User, Building, Sun, FileText, LogOut } from "lucide-react"

interface UserSettingsLayoutProps {
  children?: React.ReactNode
}

export function UserSettingsLayout({ children }: UserSettingsLayoutProps) {
  const { profile } = useContext(ChatbotUIContext)
  const router = useRouter()

  const Sidebar = (
    <div className="w-64 border-r bg-muted/40 p-4 space-y-4 flex-shrink-0">
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarImage src={profile?.image_url || undefined} />
          <AvatarFallback>
            {(profile?.display_name || profile?.username || 'U').charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{profile?.display_name || profile?.username || 'Usuario'}</p>
          <p className="text-xs text-muted-foreground truncate">{profile?.username || 'alias'}</p>
        </div>
      </div>

      <Separator />

      <div className="space-y-1">
        <p className="px-2 text-[11px] font-semibold tracking-wider text-muted-foreground">MI CUENTA</p>
        <Button variant="ghost" className="w-full justify-start gap-2" size="sm">
          <User className="h-4 w-4" /> Mi cuenta
        </Button>
      </div>

      <div className="space-y-1">
        <p className="px-2 text-[11px] font-semibold tracking-wider text-muted-foreground">ORGANIZACIÓN</p>
        <Button variant="ghost" className="w-full justify-start gap-2" size="sm">
          <Building className="h-4 w-4" /> Mi organización
        </Button>
      </div>

      <div className="space-y-1">
        <p className="px-2 text-[11px] font-semibold tracking-wider text-muted-foreground">PERSONALIZACIÓN</p>
        <Button variant="ghost" className="w-full justify-start gap-2" size="sm">
          <Sun className="h-4 w-4" /> Apariencia
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2" size="sm">
          <FileText className="h-4 w-4" /> Contextos
        </Button>
      </div>

      <div className="space-y-2 pt-2">
        <p className="px-2 text-[11px] font-semibold tracking-wider text-muted-foreground">PREFERENCIAS</p>
        <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Tema</span>
          <ThemeSwitcher />
        </div>
      </div>

      <div className="pt-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-destructive hover:text-destructive"
          size="sm"
          onClick={async () => {
            await supabase.auth.signOut()
            router.push('/login')
            router.refresh()
          }}
        >
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </Button>
      </div>
    </div>
  )

  return (
    <div className="flex h-full min-h-0">
      {/* Desktop sidebar */}
      <div className="hidden md:block">{Sidebar}</div>

      {/* Mobile trigger */}
      <div className="md:hidden absolute left-2 top-2 z-10">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="bg-background/80 backdrop-blur-sm border border-border shadow">
              <Menu className="h-4 w-4" />
              <span className="sr-only">Abrir menú</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            {Sidebar}
          </SheetContent>
        </Sheet>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-2 md:p-6 overflow-y-auto min-h-0">
        {children}
      </div>
    </div>
  )
}



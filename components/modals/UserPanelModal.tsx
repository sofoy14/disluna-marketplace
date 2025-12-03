// components/modals/UserPanelModal.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetTrigger
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  User, 
  Settings, 
  CreditCard, 
  Shield, 
  HelpCircle, 
  LogOut,
  ChevronRight,
  CheckCircle,
  Clock,
  FileText,
  Users,
  Building,
  X,
  Sun,
  Moon,
  Lock
} from 'lucide-react';
import { ALIContext } from '@/context/context';
import { useContext } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeSwitcher } from '../utility/theme-switcher';
import { supabase } from '@/lib/supabase/browser-client';
import { ColorPaletteSelector, colorPalettes } from '../utility/color-palette-selector';
import { ShaderSelector } from '@/components/shader-selector';

interface UserPanelModalProps {
  children: React.ReactNode;
}

interface UserStats {
  chats: number;
  files: number;
  storage: number;
  daysActive: number;
}

export function UserPanelModal({ children }: UserPanelModalProps) {
  const { profile } = useContext(ALIContext);
  const router = useRouter();
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('mi-cuenta');
  const [stats, setStats] = useState<UserStats>({ chats: 0, files: 0, storage: 0, daysActive: 0 });
  const [loadingStats, setLoadingStats] = useState(false);
  const [selectedPalette, setSelectedPalette] = useState(((profile as any)?.selected_palette as string) || 'purple');
  const [saving, setSaving] = useState(false);
  const [selectedShader, setSelectedShader] = useState<number>(() => {
    // Primero intentar usar el valor del perfil, luego localStorage
    if ((profile as any)?.selected_shader) {
      return (profile as any).selected_shader;
    }
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selectedShader');
      return saved ? parseInt(saved, 10) : 1;
    }
    return 1;
  });

  const applyCustomColorImmediately = (color: string) => {
    // Convertir hex a HSL
    const hexToHsl = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255
      const g = parseInt(hex.slice(3, 5), 16) / 255
      const b = parseInt(hex.slice(5, 7), 16) / 255

      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      let h = 0
      let s = 0
      const l = (max + min) / 2

      if (max !== min) {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        switch (max) {
          case r:
            h = ((g - b) / d + (g < b ? 6 : 0)) / 6
            break
          case g:
            h = ((b - r) / d + 2) / 6
            break
          case b:
            h = ((r - g) / d + 4) / 6
            break
        }
      }

      return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
      }
    }

    const { h, s, l } = hexToHsl(color)
    const root = document.documentElement
    root.style.setProperty('--primary', `${h} ${s}% ${l}%`)
    const foregroundL = l > 50 ? 0 : 100
    root.style.setProperty('--primary-foreground', `0 0% ${foregroundL}%`)
  };

  const handlePaletteChange = async (paletteId: string) => {
    setSelectedPalette(paletteId);
    setSaving(true);
    
    try {
      const selectedPaletteData = colorPalettes.find(p => p.id === paletteId);
      if (selectedPaletteData) {
        // Aplicar color inmediatamente
        const color = selectedPaletteData.colors.primary;
        applyCustomColorImmediately(color);
        
        // Guardar en backend
        const response = await fetch('/api/user/update-theme', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            selectedPalette: paletteId,
            customPrimaryColor: color
          })
        });
        
        if (response.ok) {
          router.refresh();
        }
      }
    } catch (error) {
      console.error('Error actualizando paleta:', error);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen]);

  // Sincronizar selectedPalette con el perfil
  useEffect(() => {
    if ((profile as any)?.selected_palette) {
      setSelectedPalette(((profile as any).selected_palette as string));
      // Aplicar el color del perfil
      const selectedPaletteData = colorPalettes.find(p => p.id === (profile as any).selected_palette);
      if (selectedPaletteData) {
        applyCustomColorImmediately(selectedPaletteData.colors.primary);
      }
    }
  }, [(profile as any)?.selected_palette]);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const response = await fetch('/api/user/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const formatStorage = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const navigationSections = [
    {
      id: 'mi-cuenta',
      title: 'MI CUENTA',
      items: [
        { id: 'mi-cuenta', title: 'Mi cuenta', icon: User, active: activeSection === 'mi-cuenta' }
      ]
    },
    {
      id: 'personalizacion',
      title: 'PERSONALIZACIÓN',
      items: [
        { id: 'apariencia', title: 'Personalización', icon: Sun, active: activeSection === 'apariencia' },
        { id: 'contextos', title: 'Suscripción', icon: FileText, active: activeSection === 'contextos' }
      ]
    }
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="right" className="p-0 w-full sm:max-w-5xl">
        <div className="flex h-full">
          {/* Sidebar - visible en escritorio */}
          <div className="hidden md:block w-64 border-r bg-muted/40 p-4 space-y-4 flex-shrink-0">
            {/* User Profile in Sidebar */}
            <div className="space-y-2">
              <Avatar className="h-12 w-12 mx-auto">
                <AvatarImage src={profile?.image_url} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white">
                  {profile?.display_name?.charAt(0) || profile?.username?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <p className="text-sm font-semibold truncate">{profile?.display_name || profile?.username || 'Usuario'}</p>
                <p className="text-xs text-muted-foreground truncate">{profile?.username || 'usuario@ejemplo.com'}</p>
              </div>
            </div>

            <Separator />

            {/* Navigation */}
            {navigationSections.map((section) => (
              <div key={section.id} className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
                  {section.title}
                </p>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors",
                        item.active
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </button>
                  );
                })}
              </div>
            ))}

            {/* Preferences */}
            <div className="pt-4 border-t space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
                Preferencias
              </p>
              <div className="px-2 py-2">
                <div className="flex items-center justify-between rounded-md px-2 py-2 bg-muted/50">
                  <span className="text-sm">Tema</span>
                  <ThemeSwitcher />
                </div>
              </div>
            </div>

            {/* Cerrar sesión (escritorio) dentro de la barra lateral */}
            <div className="pt-2">
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar sesión
              </Button>
            </div>
          </div>

          {/* Main Content */
          }
          <div className="flex-1 flex flex-col">
            <SheetHeader className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <SheetTitle className="text-2xl font-bold">
                    {activeSection === 'mi-cuenta' && 'Mi cuenta'}
                    {activeSection === 'apariencia' && 'Personalización'}
                    {activeSection === 'contextos' && 'Suscripción'}
                  </SheetTitle>
                  <SheetDescription className="text-muted-foreground">
                    {activeSection === 'mi-cuenta' && 'Gestiona tu información personal y seguridad'}
                    {activeSection === 'apariencia' && 'Personaliza el tema, estilo y colores de la interfaz'}
                    {activeSection === 'contextos' && 'Gestiona tu suscripción, pagos y soporte'}
                  </SheetDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </SheetHeader>

            {/* Barra de navegación superior (móvil) */}
            <div className="md:hidden sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
              <nav
                className="px-4 py-3 -mx-1 flex gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory"
                role="tablist"
                aria-label="Navegación de ajustes"
              >
                {[
                  { id: 'mi-cuenta', title: 'Mi cuenta' },
                  { id: 'apariencia', title: 'Personalización' },
                  { id: 'contextos', title: 'Suscripción' }
                ].map(item => (
                  <button
                    key={item.id}
                    role="tab"
                    aria-selected={activeSection === item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      'snap-start min-w-max rounded-full px-4 py-2 text-sm font-medium transition-colors',
                      activeSection === item.id
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted/60 text-foreground hover:bg-muted'
                    )}
                  >
                    {item.title}
                  </button>
                ))}
              </nav>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
                {/* MI CUENTA Section */}
                {activeSection === 'mi-cuenta' && (
                  <div className="space-y-6">
                    {/* Profile Card */}
                    <Card>
                      <CardHeader className="p-4 sm:p-6">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12 sm:h-16 sm:w-16">
                            <AvatarImage src={profile?.image_url} />
                            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white text-xl">
                              {profile?.display_name?.charAt(0) || profile?.username?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <CardTitle className="text-lg sm:text-xl">{profile?.display_name || profile?.username || 'Usuario'}</CardTitle>
                            <CardDescription className="text-xs sm:text-sm">{profile?.username || 'usuario@ejemplo.com'}</CardDescription>
                            <div className="flex gap-2 mt-2">
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Plan Pro
                              </Badge>
                              <Badge variant="secondary">
                                <Clock className="h-3 w-3 mr-1" />
                                Activo
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>

                    {/* Statistics */}
                    <div>
                      <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Estadísticas
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                        <Card className="text-center">
                          <CardContent className="pt-5 sm:pt-6">
                            <FileText className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-blue-500" />
                            <div className="text-xl sm:text-2xl font-bold">{loadingStats ? '...' : stats.chats}</div>
                            <div className="text-[11px] sm:text-xs text-muted-foreground">Chats</div>
                          </CardContent>
                        </Card>
                        <Card className="text-center">
                          <CardContent className="pt-5 sm:pt-6">
                            <FileText className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-green-500" />
                            <div className="text-xl sm:text-2xl font-bold">{loadingStats ? '...' : stats.files}</div>
                            <div className="text-[11px] sm:text-xs text-muted-foreground">Archivos</div>
                          </CardContent>
                        </Card>
                        <Card className="text-center">
                          <CardContent className="pt-5 sm:pt-6">
                            <Shield className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-primary" />
                            <div className="text-sm sm:text-xl font-bold">{loadingStats ? '...' : formatStorage(stats.storage)}</div>
                            <div className="text-[11px] sm:text-xs text-muted-foreground">Storage</div>
                          </CardContent>
                        </Card>
                        <Card className="text-center">
                          <CardContent className="pt-5 sm:pt-6">
                            <Clock className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-orange-500" />
                            <div className="text-xl sm:text-2xl font-bold">{loadingStats ? '...' : stats.daysActive}</div>
                            <div className="text-[11px] sm:text-xs text-muted-foreground">Días</div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    {/* Personal Information */}
                    <Card>
                      <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="text-base sm:text-lg">Tus datos</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Información personal</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="nombre">Nombre</Label>
                            <Input 
                              id="nombre" 
                              defaultValue={profile?.display_name?.split(' ')[0] || ''} 
                              placeholder="Nombre"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="apellido">Apellido</Label>
                            <Input 
                              id="apellido" 
                              defaultValue={profile?.display_name?.split(' ')[1] || ''} 
                              placeholder="Apellido"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input 
                            id="email" 
                            defaultValue={profile?.username || ''} 
                            disabled
                            className="bg-muted"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="telefono">Teléfono</Label>
                          <Input id="telefono" placeholder="+57 300 123 4567" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="situacion">Situación Laboral</Label>
                          <Input id="situacion" placeholder="Abogado independiente o de estudio jurídico" />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Security */}
                    <Card>
                      <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="text-base sm:text-lg">Seguridad</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Gestiona tu seguridad y contraseña</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                        <Button variant="outline" className="w-full h-10 sm:h-11">
                          <Lock className="h-4 w-4 mr-2" />
                          Cambiar contraseña
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Organización (integrado) */}
                    <Card>
                      <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="text-base sm:text-lg">Mi Organización</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Gestiona la información de tu organización</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
                        <div className="space-y-2">
                          <Label>Nombre de la Organización</Label>
                          <Input placeholder="Estudio Jurídico XYZ" />
                        </div>
                        <div className="space-y-2">
                          <Label>Descripción</Label>
                          <Input placeholder="Descripción de la organización" />
                        </div>
                        <Button className="w-full">Guardar cambios</Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="text-base sm:text-lg">Equipo</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Gestiona miembros de tu equipo</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-8 text-muted-foreground">
                          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No hay miembros en tu equipo</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Cerrar sesión al final en móvil */}
                    <div className="md:hidden pt-2">
                      <Button
                        variant="destructive"
                        size="lg"
                        className="w-full"
                        onClick={handleSignOut}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Cerrar sesión
                      </Button>
                    </div>
                  </div>
                )}

                {/* Contenido de organización integrado en Mi cuenta */}

                {/* APARIENCIA Section */}
                {activeSection === 'apariencia' && (
                  <div className="space-y-6">
                    {/* Theme Mode Toggle - Primero */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Tema</CardTitle>
                        <CardDescription>Cambiar entre modo oscuro y claro</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between rounded-md px-2 py-2 bg-muted/50">
                          <span className="text-sm">Modo oscuro/claro</span>
                          <ThemeSwitcher />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Shader Selector - Segundo */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Estilo de Esfera</CardTitle>
                        <CardDescription>Selecciona el efecto visual de la esfera 3D</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ShaderSelector
                          selectedShader={selectedShader}
                          onSelectShader={async (id) => {
                            setSelectedShader(id);
                            if (typeof window !== 'undefined') {
                              localStorage.setItem('selectedShader', id.toString());
                              // Dispatch custom event to notify other components
                              window.dispatchEvent(new CustomEvent('shaderChanged', { detail: id }));
                            }
                            // Guardar en backend
                            try {
                              await fetch('/api/user/update-theme', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ selectedShader: id })
                              });
                            } catch (error) {
                              console.error('Error saving shader preference:', error);
                            }
                          }}
                        />
                      </CardContent>
                    </Card>

                    {/* Color Palette Selector - Tercero */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Tema de Colores</CardTitle>
                        <CardDescription>Selecciona un color para personalizar tu interfaz</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ColorPaletteSelector
                          selectedPalette={selectedPalette}
                          onPaletteChange={handlePaletteChange}
                        />
                        {saving && (
                          <div className="mt-4 text-sm text-muted-foreground">
                            Guardando...
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Contextos del Asistente - Último (movido aquí) */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Contextos del Asistente</CardTitle>
                        <CardDescription>Personaliza cómo responde el asistente</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Contexto Personal</Label>
                          <textarea
                            className="w-full min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                            defaultValue={profile?.profile_context || ''}
                            placeholder="Describe tu especialidad, estilo de respuesta o cualquier información relevante para el asistente..."
                          />
                        </div>
                        <Button className="w-full">Guardar contexto</Button>
                      </CardContent>
                    </Card>

                    {/* Preview eliminado por solicitud */}
                  </div>
                )}

                {/* CONTEXTOS Section */}
                {activeSection === 'contextos' && (
                  <div className="space-y-6">
                    {/* Gestión de Suscripción */}
                    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/billing')}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="text-green-500">
                            <CreditCard className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">Suscripción</h4>
                            <p className="text-sm text-muted-foreground">Gestiona tu plan y métodos de pago</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Soporte */}
                    <Card className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="text-orange-500">
                            <HelpCircle className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">Soporte</h4>
                            <p className="text-sm text-muted-foreground">Encuentra ayuda y documentación</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

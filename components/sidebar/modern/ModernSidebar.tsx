'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, FolderOpen, Mic, X, Lock } from 'lucide-react'
import { FC, ElementType, useContext, useMemo, useEffect, useState } from 'react'
import { ALIContext } from '@/context/context'
import { ContentType } from '@/types'
import { ModernProfileCard } from './ModernProfileCard'
import { cn } from '@/lib/utils'
import { SidebarDataList } from '../sidebar-data-list'
import { Button } from '@/components/ui/button'
import { WorkspaceSwitcher } from '@/components/utility/workspace-switcher'
import { useProfilePlan } from '@/lib/hooks/use-profile-plan'
// Billing components removed - plan access now handled via profile
import { useChatHandler } from '@/components/chat/chat-hooks/use-chat-handler'

interface ModernSidebarProps {
  contentType: ContentType
  showSidebar: boolean
  onContentTypeChange?: (type: ContentType) => void
  onClose?: () => void
}

const HEADER_GRADIENT_CLASSES =
  'relative overflow-hidden px-5 py-3'

// Animaciones mejoradas con efecto flotante
const sidebarVariants = {
  open: {
    x: 0,
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 35,
      mass: 0.8,
      staggerChildren: 0.07,
      delayChildren: 0.1
    }
  },
  closed: {
    x: -30,
    opacity: 0,
    scale: 0.95,
    filter: 'blur(4px)',
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 40,
      staggerChildren: 0.03,
      staggerDirection: -1
    }
  }
}

// Variantes para los elementos internos con animación escalonada
const itemVariants = {
  open: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 30
    }
  },
  closed: {
    x: -10,
    opacity: 0,
    transition: {
      duration: 0.15
    }
  }
}

export const ModernSidebar: FC<ModernSidebarProps> = ({
  contentType,
  showSidebar,
  onContentTypeChange,
  onClose
}) => {
  const { chats, collections, folders, transcriptions } =
    useContext(ALIContext)
  
  // Plan access control - simplified using profile
  const { 
    isLoading: planLoading,
    hasActivePlan,
    isStudentPlan,
    isProfessionalPlan,
    canShowProcesses,
    canShowTranscriptions,
    canShowWorkspaceSwitcher,
    planDisplayName
  } = useProfilePlan()
  
  const { handleNewChat } = useChatHandler()
    
  const [isMobile, setIsMobile] = useState(false)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  // Manejar swipe left para cerrar en móviles
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return
    setTouchStart(e.touches[0].clientX)
  }
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isMobile || !touchStart || !onClose) return
    
    const touchEnd = e.changedTouches[0].clientX
    const diff = touchStart - touchEnd
    
    // Si el swipe es hacia la izquierda más de 50px, cerrar
    if (diff > 50) {
      onClose()
    }
    setTouchStart(null)
  }

  const data = useMemo(() => {
    switch (contentType) {
      case 'chats':
        return chats
      case 'collections':
        return collections
      case 'transcriptions':
        return transcriptions || []
      default:
        return []
    }
  }, [chats, collections, transcriptions, contentType])

  const contentTypeFolders = useMemo(
    () => folders.filter(folder => folder.type === contentType),
    [folders, contentType]
  )

  // Define nav items with plan access control
  // For student plan: completely hide processes and transcriptions
  // For pro plan: show all items
  const navItems: Array<{
    key: ContentType
    label: string
    count: number
    icon: ElementType
    locked: boolean
    hidden: boolean
    upgradeFeature?: 'processes' | 'transcriptions'
  }> = useMemo(() => {
    const items: Array<{
      key: ContentType
      label: string
      count: number
      icon: ElementType
      locked: boolean
      hidden: boolean
      upgradeFeature?: 'processes' | 'transcriptions'
    }> = [
    { 
      key: 'chats', 
      label: 'Chats', 
      count: chats.length, 
      icon: MessageSquare,
        locked: false,
        hidden: false
    },
    { 
      key: 'collections', 
      label: 'Procesos', 
      count: collections.length, 
      icon: FolderOpen,
        locked: false, // No longer showing locked state, just hidden
        hidden: !canShowProcesses, // Hide for student plan
      upgradeFeature: 'processes' as const
    },
    { 
      key: 'transcriptions', 
      label: 'Transcripciones', 
      count: (transcriptions || []).length, 
      icon: Mic,
        locked: false, // No longer showing locked state, just hidden
        hidden: !canShowTranscriptions, // Hide for student plan
      upgradeFeature: 'transcriptions' as const
    }
    ];
    
    return items;
  }, [chats.length, collections.length, transcriptions, canShowProcesses, canShowTranscriptions])

  const handleAliClick = () => {
    handleNewChat()
    // Cerrar sidebar después de crear chat (siempre, no solo en móvil)
    onClose?.()
  }

  const handleSelectContentType = (type: ContentType) => {
    // Si ya está seleccionado el tipo "chats", crear un nuevo chat
    if (type === 'chats' && type === contentType) {
      handleNewChat()
      // Cerrar sidebar después de crear chat (siempre, no solo en móvil)
      onClose?.()
      return
    }
    
    if (type === contentType) return
    
    onContentTypeChange?.(type)
    // Cerrar sidebar en móviles después de seleccionar
    if (isMobile) {
      onClose?.()
    }
  }

  return (
    <AnimatePresence mode="wait">
      {showSidebar && (
        <motion.div
          key="modern-sidebar"
          initial="closed"
          animate="open"
          exit="closed"
          variants={sidebarVariants}
          className={cn(
            "absolute inset-2 flex flex-col",
            "rounded-2xl",
            "bg-background/80 backdrop-blur-xl backdrop-saturate-150",
            "border border-white/10 dark:border-white/5",
            "shadow-[0_8px_40px_-12px_rgba(0,0,0,0.25)]",
            "dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)]",
            "overflow-hidden"
          )}
          style={{
            transformOrigin: 'left center'
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Gradiente decorativo superior */}
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/8 via-primary/3 to-transparent pointer-events-none" />
          
          {/* Header con logo */}
          <motion.div 
            variants={itemVariants}
            className={HEADER_GRADIENT_CLASSES}
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between gap-2 mb-3">
                <motion.div 
                  className="flex-1 flex items-center justify-center cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                  onClick={handleAliClick}
                >
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent text-center tracking-tight">ALI</h2>
                </motion.div>
                {/* Botón de cerrar solo en móviles */}
                {isMobile && onClose && (
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onClose}
                      className="md:hidden h-9 w-9 rounded-xl bg-foreground/5 backdrop-blur-sm border border-white/10 text-foreground hover:bg-destructive/90 hover:text-destructive-foreground hover:border-destructive/50 transition-all duration-200"
                      aria-label="Cerrar menú"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </motion.div>
                )}
              </div>
              {/* WorkspaceSwitcher - Only show for plans that support multiple workspaces */}
              {canShowWorkspaceSwitcher && (
              <motion.div 
                className="w-full"
                variants={itemVariants}
              >
                <WorkspaceSwitcher showSettingsButton={false} />
              </motion.div>
              )}
            </div>
          </motion.div>

          {/* Separador con gradiente */}
          <div className="mx-4 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

          {/* Navegación */}
          <motion.div 
            variants={itemVariants}
            className="px-4 py-4"
          >
            <nav className="space-y-1.5">
              {navItems
                .filter(item => !item.hidden) // Filter out hidden items for student plan
                .map((item, index) => {
                const IconComponent = item.icon
                const isActive = item.key === contentType
                const isLocked = item.locked
                return (
                  <motion.button
                    key={item.key}
                    type="button"
                    onClick={() => handleSelectContentType(item.key)}
                    variants={itemVariants}
                    whileHover={{ 
                      scale: 1.02,
                      x: 4,
                      transition: { type: 'spring', stiffness: 400, damping: 20 }
                    }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                        : isLocked
                          ? 'text-muted-foreground/60 hover:bg-foreground/5'
                          : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'
                    )}
                  >
                    <motion.div
                      animate={isActive ? { rotate: [0, -10, 10, 0] } : {}}
                      transition={{ duration: 0.4 }}
                      className="relative"
                    >
                      <IconComponent className={cn(
                        'w-4 h-4', 
                        isActive ? 'text-primary-foreground' : isLocked ? 'text-muted-foreground/60' : 'text-muted-foreground'
                      )} />
                      {isLocked && (
                        <Lock className="absolute -bottom-1 -right-1 w-2.5 h-2.5 text-amber-500" />
                      )}
                    </motion.div>
                    <span className="flex-1 text-left">{item.label}</span>
                    {isLocked ? (
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-400 border border-amber-500/30">
                        PRO
                      </span>
                    ) : (
                      <motion.span
                        animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ duration: 0.3 }}
                        className={cn(
                          'min-w-[28px] rounded-lg px-2 py-1 text-center text-xs font-semibold leading-none',
                          isActive
                            ? 'bg-primary-foreground/20 text-primary-foreground'
                            : 'bg-foreground/5 text-muted-foreground'
                        )}
                      >
                        {item.count}
                      </motion.span>
                    )}
                  </motion.button>
                )
              })}
            </nav>
          </motion.div>

          {/* Separador */}
          <div className="mx-4 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

          {/* Lista de contenido */}
          <motion.div 
            variants={itemVariants}
            className="flex-1 min-h-0 overflow-y-auto px-4 py-3 scrollbar-thin scrollbar-thumb-border/50 scrollbar-track-transparent hover:scrollbar-thumb-border/80"
          >
            <SidebarDataList
              contentType={contentType}
              data={data as any}
              folders={contentTypeFolders}
            />
          </motion.div>

          {/* Separador inferior */}
          <div className="mx-4 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

          {/* Profile Card */}
          <motion.div variants={itemVariants}>
            <ModernProfileCard />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

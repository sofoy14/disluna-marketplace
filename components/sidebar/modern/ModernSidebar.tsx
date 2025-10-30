'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, FolderOpen, Mic, X } from 'lucide-react'
import { FC, ElementType, useContext, useMemo, useEffect, useState } from 'react'
import { ChatbotUIContext } from '@/context/context'
import { ContentType } from '@/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ModernProfileCard } from './ModernProfileCard'
import { cn } from '@/lib/utils'
import { SidebarDataList } from '../sidebar-data-list'
import { Button } from '@/components/ui/button'
import { WorkspaceSwitcher } from '@/components/utility/workspace-switcher'

interface ModernSidebarProps {
  contentType: ContentType
  showSidebar: boolean
  onContentTypeChange?: (type: ContentType) => void
  onClose?: () => void
}

const HEADER_GRADIENT_CLASSES =
  'relative overflow-hidden border-b border-border px-4 py-1'

const sidebarVariants = {
  open: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30
    }
  },
  closed: {
    x: -20,
    opacity: 0,
    transition: {
      duration: 0.2
    }
  }
}

export const ModernSidebar: FC<ModernSidebarProps> = ({
  contentType,
  showSidebar,
  onContentTypeChange,
  onClose
}) => {
  const { chats, collections, folders } =
    useContext(ChatbotUIContext)
    
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
      default:
        return []
    }
  }, [chats, collections, contentType])

  const contentTypeFolders = useMemo(
    () => folders.filter(folder => folder.type === contentType),
    [folders, contentType]
  )

  const navItems: Array<{
    key: ContentType
    label: string
    count: number
    icon: ElementType
  }> = [
    { key: 'chats', label: 'Chats', count: chats.length, icon: MessageSquare },
    { key: 'collections', label: 'Procesos', count: collections.length, icon: FolderOpen },
    { key: 'transcriptions', label: 'Transcripciones', count: 0, icon: Mic }
  ]

  const handleSelectContentType = (type: ContentType) => {
    if (type === contentType) return
    onContentTypeChange?.(type)
    // Cerrar sidebar en móviles después de seleccionar
    if (isMobile) {
      onClose?.()
    }
  }

  return (
    <AnimatePresence>
      {showSidebar && (
        <motion.div
          key="modern-sidebar"
          initial="closed"
          animate="open"
          exit="closed"
          variants={sidebarVariants}
          className="flex h-full flex-col border-r border-border bg-background relative"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className={HEADER_GRADIENT_CLASSES}>
            <div className="relative z-10">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex-1 flex items-center justify-center">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent text-center">ALI</h2>
                </div>
                {/* Botón de cerrar solo en móviles - más prominente */}
                {isMobile && onClose && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="md:hidden h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border border-border text-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all"
                    aria-label="Cerrar menú"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                )}
              </div>
              {/* WorkspaceSwitcher - Botón Hogar */}
              <div className="w-full">
                <WorkspaceSwitcher showSettingsButton={false} />
              </div>
            </div>
          </div>

          <div className="px-4 py-3 border-b border-border">
            <nav className="space-y-1">
              {navItems.map(item => {
                const IconComponent = item.icon
                const isActive = item.key === contentType
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleSelectContentType(item.key)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    )}
                  >
                    <IconComponent className={cn('w-4 h-4', isActive ? 'text-primary-foreground' : 'text-muted-foreground')} />
                    <span className="flex-1 text-left">{item.label}</span>
                    <span
                      className={cn(
                        'min-w-[32px] rounded-full px-2 py-1 text-center text-xs font-semibold leading-none',
                        isActive
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {item.count}
                    </span>
                  </button>
                )
              })}
            </nav>
          </div>

          <ScrollArea className="flex-1 px-4">
            <div className="py-4">
              <SidebarDataList
                contentType={contentType}
                data={data as any}
                folders={contentTypeFolders}
              />
            </div>
          </ScrollArea>

          <ModernProfileCard />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

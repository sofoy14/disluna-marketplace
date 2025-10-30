"use client"

import { Sidebar } from "@/components/sidebar/sidebar"
import { SidebarSwitcher } from "@/components/sidebar/sidebar-switcher"
import { Button } from "@/components/ui/button"
import { Tabs } from "@/components/ui/tabs"
import useHotkey from "@/lib/hooks/use-hotkey"
import { cn } from "@/lib/utils"
import { ContentType } from "@/types"
import { IconChevronCompactRight } from "@tabler/icons-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { FC, useState, useEffect } from "react"
import { useSelectFileHandler } from "../chat/chat-hooks/use-select-file-handler"
import { CommandK } from "../utility/command-k"

export const SIDEBAR_WIDTH = 350

interface DashboardProps {
  children: React.ReactNode
}

export const Dashboard: FC<DashboardProps> = ({ children }) => {
  useHotkey("s", () => setShowSidebar(prevState => !prevState))

  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Determinar contentType basado en la ruta actual
  const getContentTypeFromPath = (): ContentType => {
    if (pathname?.includes("/transcriptions")) {
      return "transcriptions"
    }
    if (pathname?.includes("/chat")) {
      return "chats"
    }
    const tabValue = searchParams.get("tab") || "chats"
    return tabValue as ContentType
  }

  const { handleSelectDeviceFile } = useSelectFileHandler()

  const [contentType, setContentType] = useState<ContentType>(
    getContentTypeFromPath()
  )
  
  // Actualizar contentType cuando cambia la ruta
  useEffect(() => {
    if (pathname?.includes("/transcriptions")) {
      setContentType("transcriptions")
    } else if (pathname?.includes("/chat")) {
      setContentType("chats")
    } else {
      const tabValue = searchParams.get("tab") || "chats"
      setContentType(tabValue as ContentType)
    }
  }, [pathname, searchParams])
  const [showSidebar, setShowSidebar] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  
  // Detectar si es móvil
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const onFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()

    const files = event.dataTransfer.files
    const file = files[0]

    handleSelectDeviceFile(file)

    setIsDragging(false)
  }

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
  }

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  const handleToggleSidebar = () => {
    setShowSidebar(prevState => !prevState)
    localStorage.setItem("showSidebar", String(!showSidebar))
  }

  return (
    <div className="flex size-full">
      <CommandK />

      {/* Overlay para móviles - cierra al tocar fuera */}
      {isMobile && showSidebar && (
        <div
          className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 dark:bg-black/60"
          onClick={() => setShowSidebar(false)}
          onTouchStart={(e) => {
            // Cerrar al hacer swipe left en el overlay
            const touch = e.touches[0]
            if (touch.clientX < 50) {
              setShowSidebar(false)
            }
          }}
          aria-hidden="true"
        />
      )}

      <div
        className={cn(
          "duration-200 dark:border-none",
          isMobile 
            ? "fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:relative md:z-auto"
            : "relative",
          showSidebar && isMobile ? "translate-x-0" : isMobile ? "-translate-x-full" : "",
          showSidebar ? "border-r-2" : ""
        )}
        style={{
          // Sidebar
          width: isMobile && showSidebar ? `${SIDEBAR_WIDTH}px` : showSidebar ? `${SIDEBAR_WIDTH}px` : "0px",
          minWidth: showSidebar ? `${SIDEBAR_WIDTH}px` : "0px",
          maxWidth: showSidebar ? `${SIDEBAR_WIDTH}px` : "0px",
        }}
      >
        {showSidebar && (
          <Tabs
            className="flex h-full"
            value={contentType}
            onValueChange={tabValue => {
              const type = tabValue as ContentType
              setContentType(type)
              
              // Navegar a la ruta correcta según el tipo
              if (type === "transcriptions") {
                const basePath = pathname.split('/').slice(0, -1).join('/')
                router.push(`${basePath}/transcriptions`)
              } else if (type === "chats") {
                const basePath = pathname.split('/').slice(0, -1).join('/')
                router.push(`${basePath}/chat`)
              } else {
                router.replace(`${pathname}?tab=${tabValue}`)
              }
            }}
          >
            {/* SidebarSwitcher ocultado - ahora todo está en la ModernSidebar */}
            {/* <SidebarSwitcher onContentTypeChange={setContentType} /> */}

            <Sidebar 
              contentType={contentType} 
              showSidebar={showSidebar}
              onClose={() => setShowSidebar(false)}
              onContentTypeChange={(type) => {
                setContentType(type)
                
                // Navegar a la ruta correcta según el tipo de contenido
                if (type === "transcriptions") {
                  const basePath = pathname.split('/').slice(0, -1).join('/')
                  router.push(`${basePath}/transcriptions`)
                } else if (type === "chats") {
                  // Para chats, navegar a /chat en lugar de usar query params
                  const basePath = pathname.split('/').slice(0, -1).join('/')
                  router.push(`${basePath}/chat`)
                } else {
                  // Para otros tipos (collections, etc.), usar query params
                  const currentPath = pathname?.split('/').slice(0, -1).join('/') || pathname
                  router.replace(`${currentPath}?tab=${type}`)
                }
              }}
            />
          </Tabs>
        )}
      </div>

      <div
        className="relative flex w-screen min-w-[90%] grow flex-col sm:min-w-fit bg-gradient-to-br from-background via-background to-primary/20"
        onDrop={onFileDrop}
        onDragOver={onDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
      >
        {isDragging ? (
          <div className="flex h-full items-center justify-center bg-background/50 backdrop-blur-sm text-2xl text-foreground border-2 border-dashed border-primary rounded-lg">
            drop file here
          </div>
        ) : (
          children
        )}

        {/* Botón de toggle sidebar - más visible en móviles */}
        <Button
          className={cn(
            "absolute z-10 cursor-pointer transition-all duration-200",
            isMobile 
              ? "left-2 top-4 size-10 bg-background/80 backdrop-blur-sm border border-border shadow-lg"
              : showSidebar
              ? "left-[4px] top-[50%] size-[32px]"
              : "left-2 top-4 size-10 bg-background/80 backdrop-blur-sm border border-border shadow-sm"
          )}
          style={{
            transform: showSidebar ? "rotate(180deg)" : "rotate(0deg)"
          }}
          variant={isMobile || !showSidebar ? "outline" : "ghost"}
          size="icon"
          onClick={handleToggleSidebar}
          aria-label={showSidebar ? "Cerrar menú" : "Abrir menú"}
        >
          <IconChevronCompactRight size={isMobile || !showSidebar ? 20 : 24} />
        </Button>
      </div>
    </div>
  )
}

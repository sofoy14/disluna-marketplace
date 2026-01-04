"use client"

import { useContext, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ALIContext } from "@/context/context"
import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { ChatUI } from "@/components/chat/chat-ui"
import { WelcomeScreen } from "@/components/chat/welcome-screen"
import useHotkey from "@/lib/hooks/use-hotkey"

const CHAT_MODE_EVENT = "chat-mode-changed"
type ChatMode = "default" | "legal-writing"

export default function ChatPage() {
  const { chatMessages, selectedChat, isGenerating } = useContext(ALIContext)
  const { handleNewChat, handleFocusChatInput } = useChatHandler()
  const params = useParams()
  const [chatMode, setChatMode] = useState<ChatMode>("default")

  useHotkey("o", () => handleNewChat())
  useHotkey("l", () => handleFocusChatInput())

  useEffect(() => {
    if (typeof window === "undefined") return

    const updateChatMode = () => {
      const stored = localStorage.getItem("chatMode")
      setChatMode(stored === "legal-writing" ? "legal-writing" : "default")
    }

    updateChatMode()
    window.addEventListener(CHAT_MODE_EVENT, updateChatMode)
    return () => window.removeEventListener(CHAT_MODE_EVENT, updateChatMode)
  }, [])

  // Mostrar ChatUI si hay actividad de chat
  const showChatUI = params.chatid ||
    chatMessages.length > 0 ||
    selectedChat !== null ||
    isGenerating

  if (showChatUI) {
    return <ChatUI />
  }

  // Usar WelcomeScreen unificado con prop de modo
  return <WelcomeScreen mode={chatMode} />
}


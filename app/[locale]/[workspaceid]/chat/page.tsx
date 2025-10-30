"use client"

import { useContext, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ChatbotUIContext } from "@/context/context"
import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { ChatUI } from "@/components/chat/chat-ui"
import { WelcomeScreen } from "@/components/chat/welcome-screen"
import { LegalWritingScreen } from "@/components/chat/legal-writing-screen"
import useHotkey from "@/lib/hooks/use-hotkey"

const CHAT_MODE_EVENT = "chat-mode-changed"

type ChatMode = "default" | "legal-writing"

export default function ChatPage() {
  const { chatMessages, selectedChat } = useContext(ChatbotUIContext)
  const { handleNewChat, handleFocusChatInput } = useChatHandler()
  const params = useParams()

  const [chatMode, setChatMode] = useState<ChatMode>("default")

  useHotkey("o", () => handleNewChat())
  useHotkey("l", () => handleFocusChatInput())

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const updateChatMode = () => {
      const stored = localStorage.getItem("chatMode")
      setChatMode(stored === "legal-writing" ? "legal-writing" : "default")
    }

    updateChatMode()
    window.addEventListener(CHAT_MODE_EVENT, updateChatMode)

    return () => {
      window.removeEventListener(CHAT_MODE_EVENT, updateChatMode)
    }
  }, [])

  // Si hay un chatid en la URL o hay mensajes/seleccionado un chat, mostrar ChatUI
  const hasChatData = params.chatid || (chatMessages.length > 0 && selectedChat)

  if (hasChatData) {
    return <ChatUI />
  }

  // Si no hay datos de chat, mostrar welcome screen inmediatamente
  return chatMode === "legal-writing" ? <LegalWritingScreen /> : <WelcomeScreen />
}

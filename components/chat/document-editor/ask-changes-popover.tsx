"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Sparkles, ArrowUp } from "lucide-react"

interface AskChangesPopoverProps {
    onCheckChanges: (instruction: string) => void
    isProcessing?: boolean
}

export function AskChangesPopover({ onCheckChanges, isProcessing = false }: AskChangesPopoverProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [prompt, setPrompt] = useState("")

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!prompt.trim()) return

        onCheckChanges(prompt)
        setPrompt("")
        setIsOpen(false)
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="secondary"
                    size="sm"
                    className="bg-blue-600 text-white hover:bg-blue-700 h-7 text-xs gap-1.5 shadow-sm transition-all"
                >
                    <Sparkles size={12} />
                    Ask ALI for changes
                    <span className="opacity-70 text-[10px] ml-1 bg-blue-700/50 px-1 rounded hidden sm:inline-block">Ctrl+K</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 shadow-xl border-blue-200/20" align="start">
                <form onSubmit={handleSubmit} className="p-1 flex items-center gap-2">
                    <Input
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Ej: Hazlo más formal, añade una cláusula..."
                        className="border-0 focus-visible:ring-0 h-9 text-sm"
                        autoFocus
                    />
                    <Button
                        type="submit"
                        size="icon"
                        className="h-7 w-7 shrink-0 bg-blue-600 hover:bg-blue-700"
                        disabled={!prompt.trim() || isProcessing}
                    >
                        <ArrowUp size={14} />
                    </Button>
                </form>
            </PopoverContent>
        </Popover>
    )
}

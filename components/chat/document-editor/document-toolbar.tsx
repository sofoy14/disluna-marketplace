"use client"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Bold,
    Italic,
    List,
    ListOrdered,
    Undo,
    Redo,
    Heading1,
    Heading2,
    Heading3,
    Type
} from "lucide-react"
import { cn } from "@/lib/utils"

interface DocumentToolbarProps {
    onFormat: (command: string, value?: string) => void
    canUndo: boolean
    canRedo: boolean
    onUndo: () => void
    onRedo: () => void
    className?: string
}

export function DocumentToolbar({
    onFormat,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    className
}: DocumentToolbarProps) {
    return (
        <div className={cn("flex items-center gap-1 p-1 bg-muted/50 rounded-lg border", className)}>
            <div className="flex items-center gap-0.5 border-r pr-1 mr-1">
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-background/80"
                    onClick={onUndo}
                    disabled={!canUndo}
                    title="Deshacer (Ctrl+Z)"
                >
                    <Undo size={14} />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-background/80"
                    onClick={onRedo}
                    disabled={!canRedo}
                    title="Rehacer (Ctrl+Y)"
                >
                    <Redo size={14} />
                </Button>
            </div>

            {/* Headings Dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs hover:bg-background/80">
                        <Type size={14} />
                        <span className="hidden sm:inline">Texto</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => onFormat('formatBlock', 'p')}>
                        <Type className="mr-2 h-4 w-4" /> Texto Normal
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onFormat('formatBlock', 'h1')}>
                        <Heading1 className="mr-2 h-4 w-4" /> Título 1
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onFormat('formatBlock', 'h2')}>
                        <Heading2 className="mr-2 h-4 w-4" /> Título 2
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onFormat('formatBlock', 'h3')}>
                        <Heading3 className="mr-2 h-4 w-4" /> Título 3
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <div className="w-px h-4 bg-border mx-1" />

            <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-background/80"
                onClick={() => onFormat('bold')}
                title="Negrita (Ctrl+B)"
            >
                <Bold size={14} />
            </Button>

            <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-background/80"
                onClick={() => onFormat('italic')}
                title="Cursiva (Ctrl+I)"
            >
                <Italic size={14} />
            </Button>

            <div className="w-px h-4 bg-border mx-1" />

            <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-background/80"
                onClick={() => onFormat('insertUnorderedList')}
                title="Lista con viñetas"
            >
                <List size={14} />
            </Button>

            <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-background/80"
                onClick={() => onFormat('insertOrderedList')}
                title="Lista numerada"
            >
                <ListOrdered size={14} />
            </Button>
        </div>
    )
}

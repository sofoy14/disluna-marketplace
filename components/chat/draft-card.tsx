"use client"

import { useState, useEffect, useRef } from "react"
import { LegalDraft } from "@/types/draft"
import {
    Copy,
    Check,
    Download,
    Mail,
    FileText,
    Minimize2,
    Maximize2
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
    copyToClipboard,
    buildMailto,
    openGmail,
    openOutlook,
    downloadAsPDF,
    downloadAsWord
} from "@/lib/utils/draft-utils"
import { toast } from "sonner"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

interface DraftCardProps {
    draft: LegalDraft
    className?: string
    onChange?: (content: string) => void
}

export function DraftCard({ draft, className, onChange }: DraftCardProps) {
    const [content, setContent] = useState(draft.content_markdown)
    const [copied, setCopied] = useState(false)
    const [isExpanded, setIsExpanded] = useState(true)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Ajustar altura del textarea automáticamente
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto"
            textareaRef.current.style.height = textareaRef.current.scrollHeight + "px"
        }
    }, [content, isExpanded])

    // Notificar cambios al padre
    useEffect(() => {
        if (onChange) {
            onChange(content)
        }
    }, [content, onChange])

    const handleCopy = async () => {
        const success = await copyToClipboard(content)
        if (success) {
            setCopied(true)
            toast.success("Copiado al portapapeles")
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const handleEmailAction = (type: 'default' | 'gmail' | 'outlook') => {
        const subject = draft.title
        const body = content
        const to = draft.email?.to || ""

        if (type === 'gmail') {
            openGmail(subject, body, to)
        } else if (type === 'outlook') {
            openOutlook(subject, body, to)
        } else {
            const mailto = buildMailto(subject, body, to)
            if (mailto) window.open(mailto, '_blank')
            else {
                copyToClipboard(content)
                toast.error("Contenido muy largo. Copiado al portapapeles.")
            }
        }
    }

    const handleDownload = async (type: 'pdf' | 'docx') => {
        const title = draft.title || "documento"
        let success = false

        toast.loading(`Generando ${type.toUpperCase()}...`)

        if (type === 'pdf') {
            success = await downloadAsPDF(content, title)
        } else {
            success = await downloadAsWord(content, title)
        }

        toast.dismiss()
        if (success) toast.success(`Descargado como .${type}`)
        else toast.error("Error al descargar")
    }

    return (
        <div className={cn(
            "bg-card text-card-foreground rounded-xl border shadow-sm my-4 overflow-hidden flex flex-col transition-all duration-300",
            className
        )}>
            {/* Minimal Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-muted-foreground capitalize">
                        {draft.doc_type?.replace(/_/g, " ") || "Documento"}
                    </span>
                </div>

                <div className="flex gap-1 items-center">
                    {/* Copy Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={handleCopy}
                        title="Copiar texto"
                    >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                    </Button>

                    {/* Email Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                title="Enviar por correo"
                            >
                                <Mail size={16} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEmailAction('gmail')}>
                                <span className="mr-2 text-red-500">M</span> Gmail
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEmailAction('outlook')}>
                                <span className="mr-2 text-blue-500">O</span> Outlook
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEmailAction('default')}>
                                <Mail className="mr-2 h-4 w-4" /> App por defecto
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Download Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                title="Descargar"
                            >
                                <Download size={16} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDownload('pdf')}>
                                <FileText className="mr-2 h-4 w-4" /> PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload('docx')}>
                                <FileText className="mr-2 h-4 w-4" /> Word (.docx)
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Editable Content */}
            <div className={cn(
                "relative transition-all duration-300 ease-in-out",
                isExpanded ? "max-h-[800px]" : "max-h-[150px] overflow-hidden"
            )}>
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full p-5 bg-background font-mono text-sm resize-none focus:outline-none min-h-[150px]"
                    spellCheck={false}
                />

                {/* Fade overlay when collapsed */}
                {!isExpanded && (
                    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent pointer-events-none" />
                )}
            </div>

            {/* Expand/Collapse Footer */}
            <div
                className="py-1 cursor-pointer hover:bg-muted/50 transition-colors flex justify-center border-t"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {isExpanded ? (
                    <Minimize2 size={16} className="text-muted-foreground opacity-50" />
                ) : (
                    <Maximize2 size={16} className="text-muted-foreground opacity-50" />
                )}
            </div>
        </div>
    )
}

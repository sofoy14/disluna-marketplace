"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { LegalDraft } from "@/types/draft"
import { cn } from "@/lib/utils"
import {
    Maximize2,
    Minimize2,
    Check,
    Copy,
    Download,
    Mail,
    FileText
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { marked } from "marked"
import { useDocumentHistory } from "./use-document-history"
import { DocumentToolbar } from "./document-toolbar"
import { AskChangesPopover } from "./ask-changes-popover"
import {
    copyToClipboard,
    buildMailto,
    openGmail,
    openOutlook,
    downloadAsPDF,
    downloadAsWord
} from "@/lib/utils/draft-utils"

interface DocumentEditorProps {
    draft: LegalDraft
    className?: string
    onContentChange?: (content: string) => void
    onRequestChanges?: (instruction: string) => Promise<LegalDraft | void>
}

export function DocumentEditor({
    draft,
    className,
    onContentChange,
    onRequestChanges
}: DocumentEditorProps) {
    const [currentDraft, setCurrentDraft] = useState(draft)
    const [isExpanded, setIsExpanded] = useState(true)
    const [copied, setCopied] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [showToolbar, setShowToolbar] = useState(false)
    const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 })

    const editorRef = useRef<HTMLDivElement>(null)
    const toolbarRef = useRef<HTMLDivElement>(null)

    // Robust content extraction: Check if content_markdown is actually the raw JSON
    const extractContent = (rawContent: string | undefined | null) => {
        if (!rawContent) return "";

        let content = rawContent;
        // Check if it looks like a JSON object starting with { "type": "draft" ...
        if (content.trim().startsWith('{') && content.includes('"type": "draft"')) {
            try {
                const parsed = JSON.parse(content);
                if (parsed.content_markdown) {
                    content = parsed.content_markdown;
                }
            } catch (e) {
                console.error("Failed to re-parse raw content string", e);
            }
        }
        return marked.parse(content) as string;
    }

    // Convertir markdown inicial a HTML para el editor
    const initialHtml = extractContent(currentDraft.content_markdown)

    // Historial
    const {
        content: htmlContent,
        setContent: setHtmlContent,
        undo,
        redo,
        canUndo,
        canRedo
    } = useDocumentHistory(initialHtml)

    // Sincronizar cambios externos
    useEffect(() => {
        if (draft.content_markdown) {
            const newHtml = extractContent(draft.content_markdown)
            if (editorRef.current && Math.abs(editorRef.current.innerHTML.length - newHtml.length) > 10) {
                setHtmlContent(newHtml)
            }
        }
    }, [draft.content_markdown, setHtmlContent])

    // Manejar selección para mostrar barra de herramientas flotante
    useEffect(() => {
        const handleSelectionChange = () => {
            const selection = window.getSelection()
            if (!selection || selection.isCollapsed || !editorRef.current?.contains(selection.anchorNode)) {
                setShowToolbar(false)
                return
            }

            const range = selection.getRangeAt(0)
            const rect = range.getBoundingClientRect()
            const editorRect = editorRef.current.getBoundingClientRect()

            // Calcular posición relativa al editor
            // Posicionar arriba de la selección
            const top = rect.top - editorRect.top - 50
            const left = rect.left - editorRect.left

            setToolbarPosition({ top, left: Math.max(0, left) })
            setShowToolbar(true)
        }

        document.addEventListener('selectionchange', handleSelectionChange)
        return () => document.removeEventListener('selectionchange', handleSelectionChange)
    }, [])

    // Manejar cambios en el editor
    const handleInput = useCallback(() => {
        if (editorRef.current) {
            const newHtml = editorRef.current.innerHTML
            setHtmlContent(newHtml)
            const textContent = editorRef.current.innerText
            onContentChange?.(textContent)
        }
    }, [setHtmlContent, onContentChange])

    // Ejecutar comandos de formato
    const handleFormat = (command: string, value?: string) => {
        document.execCommand(command, false, value)
        editorRef.current?.focus()
        handleInput()
    }

    // Comandos de teclado
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z') {
                e.preventDefault()
                undo()
            } else if (e.key === 'y') {
                e.preventDefault()
                redo()
            } else if (e.key === 'b') {
                e.preventDefault()
                handleFormat('bold')
            } else if (e.key === 'i') {
                e.preventDefault()
                handleFormat('italic')
            }
        }
    }

    // Efecto para actualizar el contenido visual cuando cambia el estado del historial
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== htmlContent) {
            editorRef.current.innerHTML = htmlContent
        }
    }, [htmlContent])

    // Handlers de acciones (Copy, Email, Download)
    const handleCopy = async () => {
        const textToCopy = editorRef.current?.innerText || ""
        const success = await copyToClipboard(textToCopy)
        if (success) {
            setCopied(true)
            toast.success("Copiado al portapapeles")
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const handleEmailAction = (type: 'default' | 'gmail' | 'outlook') => {
        const subject = draft.title
        const body = editorRef.current?.innerText || ""
        const to = draft.email?.to || ""

        if (type === 'gmail') openGmail(subject, body, to)
        else if (type === 'outlook') openOutlook(subject, body, to)
        else {
            const mailto = buildMailto(subject, body, to)
            if (mailto) window.open(mailto, '_blank')
            else {
                copyToClipboard(body)
                toast.error("Contenido muy largo. Copiado al portapapeles.")
            }
        }
    }

    const handleDownload = async (type: 'pdf' | 'docx') => {
        const title = draft.title || "documento"
        const content = editorRef.current?.innerText || ""
        toast.loading(`Generando ${type.toUpperCase()}...`)
        const success = type === 'pdf'
            ? await downloadAsPDF(content, title)
            : await downloadAsWord(content, title)
        toast.dismiss()
        if (success) toast.success(`Descargado como .${type}`)
        else toast.error("Error al descargar")
    }

    const handleRequestChangesInternal = async (instruction: string) => {
        if (!onRequestChanges) return
        setIsProcessing(true)
        try {
            const newDraft = await onRequestChanges(instruction)
            if (newDraft) {
                setCurrentDraft(newDraft)
                if (newDraft.content_markdown) {
                    const newHtml = extractContent(newDraft.content_markdown)
                    setHtmlContent(newHtml)
                    if (editorRef.current) {
                        editorRef.current.innerHTML = newHtml
                    }
                    toast.success("Documento actualizado")
                }
            }
        } catch (error) {
            console.error(error)
            toast.error("Error solicitando cambios")
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <div className={cn(
            "bg-card text-card-foreground rounded-xl border shadow-sm my-4 flex flex-col transition-all duration-300 relative group",
            className
        )}>
            {/* Header: Title + Actions */}
            <div className="flex flex-col border-b bg-muted/30">
                <div className="flex items-center justify-between px-4 py-2">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <span className="text-sm font-semibold text-muted-foreground capitalize shrink-0">
                            {currentDraft.doc_type?.replace(/_/g, " ") || "Documento"}
                        </span>
                    </div>

                    <div className="flex gap-1 items-center">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={handleCopy}
                            title="Copiar texto"
                        >
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
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

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
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
            </div>

            {/* Editable Content */}
            <div className={cn(
                "relative transition-all duration-300 ease-in-out bg-background",
                isExpanded ? "min-h-[300px]" : "max-h-[200px] overflow-hidden"
            )}>
                {/* Floating Toolbar */}
                {showToolbar && (
                    <div
                        ref={toolbarRef}
                        className="absolute z-50 bg-popover text-popover-foreground border shadow-xl rounded-lg p-1 flex items-center gap-1 animate-in fade-in zoom-in-95 duration-200"
                        style={{
                            top: `${toolbarPosition.top}px`,
                            left: `${toolbarPosition.left}px`,
                            transform: 'translateY(-100%)' // Move up
                        }}
                        onMouseDown={(e) => e.preventDefault()} // Prevent losing focus
                    >
                        <DocumentToolbar
                            onFormat={handleFormat}
                            canUndo={canUndo}
                            canRedo={canRedo}
                            onUndo={undo}
                            onRedo={redo}
                            className="border-0 bg-transparent shadow-none"
                        />

                        {/* Ask ALI embedded in toolbar */}
                        {onRequestChanges && (
                            <>
                                <div className="w-px h-4 bg-border mx-1" />
                                <AskChangesPopover
                                    onCheckChanges={handleRequestChangesInternal}
                                    isProcessing={isProcessing}
                                />
                            </>
                        )}
                    </div>
                )}

                <div
                    ref={editorRef}
                    contentEditable
                    onInput={handleInput}
                    onKeyDown={handleKeyDown}
                    className="w-full p-6 outline-none prose prose-sm max-w-none dark:prose-invert font-mono min-h-[300px]"
                    spellCheck={false}
                    dangerouslySetInnerHTML={{ __html: initialHtml }}
                />

                {!isExpanded && (
                    <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none" />
                )}
            </div>

            {/* Footer */}
            <div
                className="py-1 cursor-pointer hover:bg-muted/50 transition-colors flex justify-center border-t bg-background/95 backdrop-blur"
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

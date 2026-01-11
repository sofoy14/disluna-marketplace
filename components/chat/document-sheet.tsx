"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { DocumentEditor } from "./document-editor"
import { useState } from "react"

interface DocumentSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  content: string
  onSave?: (content: string) => void
}

export function DocumentSheet({ open, onOpenChange, content, onSave }: DocumentSheetProps) {
  const [editorContent, setEditorContent] = useState(content)

  const handleContentChange = (newContent: string) => {
    setEditorContent(newContent)
    onSave?.(newContent)
  }

  // Adapter: Convert raw content string to LegalDraft object
  const draftAdapter: any = {
    type: "draft",
    doc_type: "otro",
    title: "Documento Generado",
    content_markdown: editorContent
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[60%] p-0 overflow-y-auto">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>Editor de Documento</SheetTitle>
          <SheetDescription>
            Edita y descarga el documento legal generado
          </SheetDescription>
        </SheetHeader>

        <div className="p-4">
          <DocumentEditor
            draft={draftAdapter}
            onContentChange={handleContentChange}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}


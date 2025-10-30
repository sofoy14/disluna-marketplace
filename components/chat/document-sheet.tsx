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

  const handleSave = (newContent: string) => {
    setEditorContent(newContent)
    onSave?.(newContent)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[60%] p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>Editor de Documento</SheetTitle>
          <SheetDescription>
            Edita y descarga el documento legal generado
          </SheetDescription>
        </SheetHeader>
        
        <div className="h-[calc(100vh-80px)]">
          <DocumentEditor 
            content={editorContent} 
            onSave={handleSave}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}


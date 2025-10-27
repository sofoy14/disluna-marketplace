"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { Button } from '@/components/ui/button'
import { Download, Save } from 'lucide-react'
import { exportToPDF, exportToDOCX } from '@/lib/document-export'
import { useState } from 'react'

interface DocumentEditorProps {
  content: string
  onSave?: (content: string) => void
}

export function DocumentEditor({ content, onSave }: DocumentEditorProps) {
  const [isEditing, setIsEditing] = useState(false)

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content,
    editable: isEditing,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[500px] p-4 focus:outline-none'
      }
    }
  })

  const handleSave = () => {
    if (editor && onSave) {
      onSave(editor.getHTML())
    }
    setIsEditing(false)
  }

  const handleDownloadPDF = async () => {
    if (editor) {
      const text = editor.getText()
      await exportToPDF(text, 'documento-legal.pdf')
    }
  }

  const handleDownloadDOCX = async () => {
    if (editor) {
      const text = editor.getText()
      await exportToDOCX(text, 'documento-legal.docx')
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Barra de herramientas */}
      <div className="border-b p-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            disabled={!isEditing}
          >
            <strong>B</strong>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            disabled={!isEditing}
          >
            <em>I</em>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            disabled={!isEditing}
          >
            <u>U</u>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
          >
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadDOCX}
          >
            <Download className="h-4 w-4 mr-2" />
            DOCX
          </Button>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              Editar
            </Button>
          ) : (
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </Button>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

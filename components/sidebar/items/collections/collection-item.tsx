import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { COLLECTION_DESCRIPTION_MAX, COLLECTION_NAME_MAX } from "@/db/limits"
import { Tables } from "@/supabase/types"
import { CollectionFile } from "@/types"
import { IconBooks, IconPaperclip, IconClock } from "@tabler/icons-react"
import { FC, useState } from "react"
import { SidebarItem } from "../all/sidebar-display-item"
import { CollectionFileSelect } from "./collection-file-select"
import { MoreVertical, Edit, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"

interface CollectionItemProps {
  collection: Tables<"collections">
}

export const CollectionItem: FC<CollectionItemProps> = ({ collection }) => {
  const [name, setName] = useState(collection.name)
  const [isTyping, setIsTyping] = useState(false)
  const [description, setDescription] = useState(collection.description)

  // Formatear fecha relativa
  const getFormattedDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
      
      if (diffInSeconds < 60) return "hace unos momentos"
      if (diffInSeconds < 3600) return `hace ${Math.floor(diffInSeconds / 60)} min`
      if (diffInSeconds < 86400) return `hace ${Math.floor(diffInSeconds / 3600)} h`
      if (diffInSeconds < 604800) return `hace ${Math.floor(diffInSeconds / 86400)} días`
      if (diffInSeconds < 2592000) return `hace ${Math.floor(diffInSeconds / 604800)} semanas`
      if (diffInSeconds < 31536000) return `hace ${Math.floor(diffInSeconds / 2592000)} meses`
      return `hace ${Math.floor(diffInSeconds / 31536000)} años`
    } catch {
      return "recientemente"
    }
  }

  // Obtener icono según categoría
  const getCategoryIcon = (name: string) => {
    const lowerName = name.toLowerCase()
    if (lowerName.includes("contrato") || lowerName.includes("contract")) return <IconBooks className="text-blue-500" />
    if (lowerName.includes("investigación") || lowerName.includes("jurisprudencia")) return <IconBooks className="text-purple-500" />
    if (lowerName.includes("litigio") || lowerName.includes("judicial")) return <IconBooks className="text-red-500" />
    if (lowerName.includes("cumplimiento") || lowerName.includes("compliance")) return <IconBooks className="text-green-500" />
    if (lowerName.includes("cliente") || lowerName.includes("consulta")) return <IconBooks className="text-orange-500" />
    return <IconBooks className="text-primary" />
  }

  // Obtener categoría
  const getCategory = () => {
    const text = (description || name).toLowerCase()
    if (text.includes("contrato") || text.includes("contract")) return "Contratos"
    if (text.includes("investigación") || text.includes("jurisprudencia")) return "Investigación"
    if (text.includes("litigio") || text.includes("judicial")) return "Litigios"
    if (text.includes("cumplimiento") || text.includes("compliance")) return "Cumplimiento"
    if (text.includes("cliente") || text.includes("consulta")) return "Cliente"
    return "General"
  }

  const handleFileSelect = (
    file: CollectionFile,
    setSelectedCollectionFiles: React.Dispatch<
      React.SetStateAction<CollectionFile[]>
    >
  ) => {
    setSelectedCollectionFiles(prevState => {
      const isFileAlreadySelected = prevState.find(
        selectedFile => selectedFile.id === file.id
      )

      if (isFileAlreadySelected) {
        return prevState.filter(selectedFile => selectedFile.id !== file.id)
      } else {
        return [...prevState, file]
      }
    })
  }

  return (
      <SidebarItem
      item={collection}
      isTyping={isTyping}
      contentType="collections"
      icon={<div className="flex-shrink-0">{getCategoryIcon(collection.name)}</div>}
      updateState={{
        name,
        description
      }}
      renderInputs={(renderState: {
        startingCollectionFiles: CollectionFile[]
        setStartingCollectionFiles: React.Dispatch<
          React.SetStateAction<CollectionFile[]>
        >
        selectedCollectionFiles: CollectionFile[]
        setSelectedCollectionFiles: React.Dispatch<
          React.SetStateAction<CollectionFile[]>
        >
      }) => {
        return (
          <>
            <div className="space-y-1">
              <Label>Archivos</Label>

              <CollectionFileSelect
                selectedCollectionFiles={
                  renderState.selectedCollectionFiles.length === 0
                    ? renderState.startingCollectionFiles
                    : [
                        ...renderState.startingCollectionFiles.filter(
                          startingFile =>
                            !renderState.selectedCollectionFiles.some(
                              selectedFile =>
                                selectedFile.id === startingFile.id
                            )
                        ),
                        ...renderState.selectedCollectionFiles.filter(
                          selectedFile =>
                            !renderState.startingCollectionFiles.some(
                              startingFile =>
                                startingFile.id === selectedFile.id
                            )
                        )
                      ]
                }
                onCollectionFileSelect={file =>
                  handleFileSelect(file, renderState.setSelectedCollectionFiles)
                }
              />
            </div>

            <div className="space-y-1">
              <Label>Nombre</Label>

              <Input
                placeholder="Nombre de la colección..."
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={COLLECTION_NAME_MAX}
              />
            </div>

            <div className="space-y-1">
              <Label>Descripción</Label>

              <Input
                placeholder="Descripción de la colección..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={COLLECTION_DESCRIPTION_MAX}
              />
            </div>
          </>
        )
      }}
    />
  )
}

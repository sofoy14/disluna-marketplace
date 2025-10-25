import { Tables } from "@/supabase/types"
import { ModelAnswer } from "./model-answer"

export interface BibliographyItem {
  id?: string
  title: string
  url: string
  type: string
  description?: string
}

export interface ChatMessage {
  message: Tables<"messages">
  fileItems: string[]
  bibliography?: BibliographyItem[]
  answer?: ModelAnswer
}

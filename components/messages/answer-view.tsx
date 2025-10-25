import { MessageMarkdown } from "./message-markdown"

interface AnswerViewProps {
  text: string
}

export const AnswerView = ({ text }: AnswerViewProps) => {
  if (!text || text.trim().length === 0) {
    return null
  }

  return <MessageMarkdown content={text} />
}


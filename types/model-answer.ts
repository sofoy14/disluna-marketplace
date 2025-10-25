"use strict"

export type NormalizedCitation = {
  id: string
  title: string
  url?: string
  source?: string
  type?: string
  description?: string
  issuedAt?: string
}

export type ModelAnswer = {
  text: string
  citations?: NormalizedCitation[]
}


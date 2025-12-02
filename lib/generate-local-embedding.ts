/**
 * Local embeddings module
 * 
 * ⚠️ DESHABILITADO EN PRODUCCIÓN
 * 
 * Este módulo usaba @xenova/transformers con onnxruntime-node, pero 
 * onnxruntime-node NO es compatible con Alpine Linux (usado en Docker).
 * 
 * En producción, todos los embeddings usan OpenAI (más confiable y económico).
 * 
 * Si necesitas embeddings locales en desarrollo:
 * 1. Descomenta el código original abajo
 * 2. Usa una imagen Docker basada en Debian/Ubuntu
 */

export async function generateLocalEmbedding(content: string): Promise<number[]> {
  // Local embeddings están deshabilitados en producción
  // El código que llama esta función ya redirige a OpenAI
  throw new Error(
    'Local embeddings are disabled. ' +
    'This application uses OpenAI embeddings for production reliability. ' +
    'The calling code should have redirected to OpenAI - if you see this error, ' +
    'check that embeddingsProvider is set to "openai".'
  )
}

/*
// CÓDIGO ORIGINAL (requiere onnxruntime-node compatible con glibc)
// No funciona en Alpine Linux

import { pipeline } from "@xenova/transformers"

export async function generateLocalEmbedding(content: string) {
  const generateEmbedding = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  )

  const output = await generateEmbedding(content, {
    pooling: "mean",
    normalize: true
  })

  const embedding = Array.from(output.data)
  return embedding
}
*/

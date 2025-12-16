import crypto from "crypto"

export interface WompiWebhookIdempotencyStore {
  has(key: string): Promise<boolean>
  mark(key: string): Promise<void>
}

export function computeWompiWebhookSignature(params: {
  payload: string
  secret: string
}): string {
  return crypto
    .createHmac("sha256", params.secret)
    .update(params.payload)
    .digest("hex")
}

export function verifyWompiWebhookSignature(params: {
  payload: string
  signature: string
  secret: string
}): boolean {
  const signature = params.signature?.trim()
  if (!signature) return false

  const expectedHex = computeWompiWebhookSignature({
    payload: params.payload,
    secret: params.secret
  })

  try {
    const provided = Buffer.from(signature, "hex")
    const expected = Buffer.from(expectedHex, "hex")
    if (provided.length !== expected.length) return false
    return crypto.timingSafeEqual(provided, expected)
  } catch {
    return false
  }
}

export function getWompiIdempotencyKey(event: any): string | null {
  const eventType = typeof event?.event === "string" ? event.event : undefined

  const transaction =
    event?.data?.transaction && typeof event.data.transaction === "object"
      ? event.data.transaction
      : event?.data && typeof event.data === "object"
        ? event.data
        : undefined

  const transactionId =
    typeof transaction?.id === "string" ? transaction.id : undefined
  const reference =
    typeof transaction?.reference === "string" ? transaction.reference : undefined
  const status =
    typeof transaction?.status === "string" ? transaction.status : undefined

  if (!eventType) return null
  if (!transactionId && !reference) return null

  return [eventType, transactionId, reference, status].filter(Boolean).join(":")
}

export async function shouldProcessWompiEvent(
  store: WompiWebhookIdempotencyStore,
  idempotencyKey: string
): Promise<boolean> {
  if (!idempotencyKey) return false

  const alreadyProcessed = await store.has(idempotencyKey)
  if (alreadyProcessed) return false

  await store.mark(idempotencyKey)
  return true
}


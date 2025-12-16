import {
  computeWompiWebhookSignature,
  getWompiIdempotencyKey,
  shouldProcessWompiEvent,
  verifyWompiWebhookSignature
} from "@/src/integrations/wompi/webhook"

describe("Wompi webhook contract", () => {
  test("verifies signature with shared secret (HMAC-SHA256 hex)", () => {
    const secret = "test-secret"
    const payload = JSON.stringify({
      event: "transaction.updated",
      data: { transaction: { id: "tx_123", reference: "INV-1", status: "APPROVED" } }
    })

    const signature = computeWompiWebhookSignature({ payload, secret })

    expect(
      verifyWompiWebhookSignature({ payload, secret, signature })
    ).toBe(true)

    expect(
      verifyWompiWebhookSignature({
        payload,
        secret,
        signature: signature.replace(/^.{4}/, "dead")
      })
    ).toBe(false)
  })

  test("derives a stable idempotency key from event", () => {
    const event = {
      event: "transaction.updated",
      data: {
        transaction: { id: "tx_123", reference: "INV-1", status: "APPROVED" }
      }
    }

    expect(getWompiIdempotencyKey(event)).toBe(
      "transaction.updated:tx_123:INV-1:APPROVED"
    )
  })

  test("idempotency store prevents double-processing", async () => {
    const seen = new Set<string>()
    const store = {
      has: async (key: string) => seen.has(key),
      mark: async (key: string) => {
        seen.add(key)
      }
    }

    await expect(shouldProcessWompiEvent(store, "k1")).resolves.toBe(true)
    await expect(shouldProcessWompiEvent(store, "k1")).resolves.toBe(false)
  })
})


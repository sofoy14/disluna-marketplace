import type { SupabaseClient } from "@supabase/supabase-js"

export type WompiWebhookEventStatus =
  | "received"
  | "processing"
  | "processed"
  | "failed"

export interface WompiWebhookEventRow {
  id: string
  idempotency_key: string
  status: WompiWebhookEventStatus
  attempt_count: number
  updated_at: string
  processed_at: string | null
}

export async function getWompiWebhookEventByKey(
  supabase: SupabaseClient<any>,
  idempotencyKey: string
): Promise<WompiWebhookEventRow | null> {
  const { data, error } = await supabase
    .from("wompi_webhook_events")
    .select("id,idempotency_key,status,attempt_count,updated_at,processed_at")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load webhook event: ${error.message}`)
  }

  return (data as WompiWebhookEventRow | null) ?? null
}

export async function upsertWompiWebhookEventProcessing(params: {
  supabase: SupabaseClient<any>
  idempotencyKey: string
  payload: any
  signature: string | null
  eventType: string | null
  wompiTransactionId: string | null
  reference: string | null
  status: string | null
}): Promise<WompiWebhookEventRow> {
  const existing = await getWompiWebhookEventByKey(params.supabase, params.idempotencyKey)

  if (!existing) {
    const { data, error } = await params.supabase
      .from("wompi_webhook_events")
      .insert({
        idempotency_key: params.idempotencyKey,
        status: "processing",
        attempt_count: 1,
        payload: params.payload,
        signature: params.signature,
        event_type: params.eventType,
        wompi_transaction_id: params.wompiTransactionId,
        reference: params.reference
      })
      .select("id,idempotency_key,status,attempt_count,updated_at,processed_at")
      .single()

    if (error) {
      throw new Error(`Failed to create webhook event: ${error.message}`)
    }

    return data as WompiWebhookEventRow
  }

  const { data, error } = await params.supabase
    .from("wompi_webhook_events")
    .update({
      status: "processing",
      attempt_count: (existing.attempt_count || 0) + 1,
      payload: params.payload,
      signature: params.signature,
      event_type: params.eventType,
      wompi_transaction_id: params.wompiTransactionId,
      reference: params.reference,
      last_error: null
    })
    .eq("id", existing.id)
    .select("id,idempotency_key,status,attempt_count,updated_at,processed_at")
    .single()

  if (error) {
    throw new Error(`Failed to update webhook event: ${error.message}`)
  }

  return data as WompiWebhookEventRow
}

export async function markWompiWebhookEventProcessed(
  supabase: SupabaseClient<any>,
  idempotencyKey: string
): Promise<void> {
  const existing = await getWompiWebhookEventByKey(supabase, idempotencyKey)
  if (!existing) return

  const { error } = await supabase
    .from("wompi_webhook_events")
    .update({
      status: "processed",
      processed_at: new Date().toISOString()
    })
    .eq("id", existing.id)

  if (error) {
    throw new Error(`Failed to mark webhook event processed: ${error.message}`)
  }
}

export async function markWompiWebhookEventFailed(params: {
  supabase: SupabaseClient<any>
  idempotencyKey: string
  errorMessage: string
}): Promise<void> {
  const existing = await getWompiWebhookEventByKey(params.supabase, params.idempotencyKey)
  if (!existing) return

  const { error } = await params.supabase
    .from("wompi_webhook_events")
    .update({
      status: "failed",
      last_error: params.errorMessage
    })
    .eq("id", existing.id)

  if (error) {
    throw new Error(`Failed to mark webhook event failed: ${error.message}`)
  }
}


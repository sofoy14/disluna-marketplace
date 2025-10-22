// db/billing.ts
import { supabase } from "@/lib/supabase/robust-client"
import { TablesInsert, TablesUpdate } from "@/supabase/types"

// Plans
export const getPlans = async () => {
  const { data: plans, error } = await supabase
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("amount_in_cents", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return plans
}

export const getPlanById = async (planId: string) => {
  const { data: plan, error } = await supabase
    .from("plans")
    .select("*")
    .eq("id", planId)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return plan
}

// Payment Sources
export const getPaymentSourcesByUserId = async (userId: string) => {
  const { data: sources, error } = await supabase
    .from("payment_sources")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return sources
}

export const getPaymentSourcesByWorkspaceId = async (workspaceId: string) => {
  const { data: sources, error } = await supabase
    .from("payment_sources")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return sources
}

export const createPaymentSource = async (
  paymentSource: TablesInsert<"payment_sources">
) => {
  const { data: createdSource, error } = await supabase
    .from("payment_sources")
    .insert([paymentSource])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return createdSource
}

export const updatePaymentSource = async (
  sourceId: string,
  updates: TablesUpdate<"payment_sources">
) => {
  const { data: updatedSource, error } = await supabase
    .from("payment_sources")
    .update(updates)
    .eq("id", sourceId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return updatedSource
}

export const getPaymentSourceById = async (sourceId: string) => {
  const { data: source, error } = await supabase
    .from("payment_sources")
    .select("*")
    .eq("id", sourceId)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return source
}

// Subscriptions
export const getSubscriptionsByWorkspaceId = async (workspaceId: string) => {
  const { data: subscriptions, error } = await supabase
    .from("subscriptions")
    .select(`
      *,
      plans(*),
      payment_sources(*)
    `)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return subscriptions
}

export const getActiveSubscriptionsByWorkspaceId = async (workspaceId: string) => {
  const { data: subscriptions, error } = await supabase
    .from("subscriptions")
    .select(`
      *,
      plans(*),
      payment_sources(*)
    `)
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return subscriptions
}

export const createSubscription = async (
  subscription: TablesInsert<"subscriptions">
) => {
  const { data: createdSubscription, error } = await supabase
    .from("subscriptions")
    .insert([subscription])
    .select(`
      *,
      plans(*),
      payment_sources(*)
    `)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return createdSubscription
}

export const updateSubscription = async (
  subscriptionId: string,
  updates: TablesUpdate<"subscriptions">
) => {
  const { data: updatedSubscription, error } = await supabase
    .from("subscriptions")
    .update(updates)
    .eq("id", subscriptionId)
    .select(`
      *,
      plans(*),
      payment_sources(*)
    `)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return updatedSubscription
}

export const getSubscriptionById = async (subscriptionId: string) => {
  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select(`
      *,
      plans(*),
      payment_sources(*)
    `)
    .eq("id", subscriptionId)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return subscription
}

// Invoices
export const getInvoicesBySubscriptionId = async (subscriptionId: string) => {
  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("subscription_id", subscriptionId)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return invoices
}

export const getInvoicesByWorkspaceId = async (workspaceId: string) => {
  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return invoices
}

export const createInvoice = async (
  invoice: TablesInsert<"invoices">
) => {
  const { data: createdInvoice, error } = await supabase
    .from("invoices")
    .insert([invoice])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return createdInvoice
}

export const updateInvoice = async (
  invoiceId: string,
  updates: TablesUpdate<"invoices">
) => {
  const { data: updatedInvoice, error } = await supabase
    .from("invoices")
    .update(updates)
    .eq("id", invoiceId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return updatedInvoice
}

export const getInvoiceById = async (invoiceId: string) => {
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(`
      *,
      subscriptions(*)
    `)
    .eq("id", invoiceId)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return invoice
}

// Transactions
export const createTransaction = async (
  transaction: TablesInsert<"transactions">
) => {
  const { data: createdTransaction, error } = await supabase
    .from("transactions")
    .insert([transaction])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return createdTransaction
}

export const updateTransaction = async (
  transactionId: string,
  updates: TablesUpdate<"transactions">
) => {
  const { data: updatedTransaction, error } = await supabase
    .from("transactions")
    .update(updates)
    .eq("id", transactionId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return updatedTransaction
}

export const getTransactionByWompiId = async (wompiId: string) => {
  const { data: transaction, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("wompi_id", wompiId)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return transaction
}

export const upsertTransaction = async (
  transaction: TablesInsert<"transactions">
) => {
  const { data: upsertedTransaction, error } = await supabase
    .from("transactions")
    .upsert(transaction, { onConflict: 'wompi_id' })
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return upsertedTransaction
}

// Billing queries for cron jobs
export const getSubscriptionsDueToday = async () => {
  const today = new Date().toISOString().split('T')[0];
  
  const { data: subscriptions, error } = await supabase
    .from("subscriptions")
    .select(`
      *,
      plans(*),
      payment_sources(*)
    `)
    .eq("status", "active")
    .gte("current_period_end", `${today}T00:00:00`)
    .lte("current_period_end", `${today}T23:59:59`)

  if (error) {
    throw new Error(error.message)
  }

  return subscriptions
}

export const getFailedInvoicesForRetry = async () => {
  const today = new Date().toISOString();
  
  const { data: invoices, error } = await supabase
    .from("invoices")
    .select(`
      *,
      subscriptions(*)
    `)
    .eq("status", "failed")
    .lte("next_retry_at", today)
    .lt("attempt_count", 3)

  if (error) {
    throw new Error(error.message)
  }

  return invoices
}

export const getSuspendedInvoices = async () => {
  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("subscription_id")
    .eq("status", "failed")
    .gte("attempt_count", 3)

  if (error) {
    throw new Error(error.message)
  }

  return invoices
}



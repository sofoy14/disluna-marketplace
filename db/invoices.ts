// db/invoices.ts
// Acceso a datos de facturas

import { supabase } from "@/lib/supabase/robust-client"
import type { SupabaseClient } from "@supabase/supabase-js"

export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'failed' | 'void';

export interface Invoice {
  id: string;
  subscription_id?: string;
  workspace_id?: string;
  plan_id?: string;
  amount_in_cents: number;
  currency: string;
  status: InvoiceStatus;
  period_start: string;
  period_end: string;
  reference?: string; // Reference para Wompi
  wompi_transaction_id?: string;
  attempt_count: number;
  next_retry_at?: string;
  paid_at?: string;
  created_at: string;
  updated_at?: string;
  // Relaciones
  subscriptions?: {
    user_id: string;
    plan_id: string;
    workspace_id: string;
    payment_source_id?: string;
    payment_sources?: {
      wompi_id: string;
      type: string;
      status: string;
      customer_email: string;
    };
  };
  plans?: {
    name: string;
    amount_in_cents: number;
    billing_period: string;
  };
}

const INVOICE_SELECT = `
  *,
  subscriptions:subscription_id (
    user_id,
    plan_id,
    workspace_id,
    payment_source_id,
    payment_sources:payment_source_id (
      wompi_id,
      type,
      status,
      customer_email
    )
  ),
  plans:plan_id (
    name,
    amount_in_cents,
    billing_period
  )
`;

function getDbClient(client?: SupabaseClient<any>) {
  return client || supabase
}

export const getInvoicesByWorkspaceId = async (
  workspaceId: string,
  limit: number = 50,
  offset: number = 0,
  client?: SupabaseClient<any>
): Promise<Invoice[]> => {
  const supabaseClient = getDbClient(client)
  const { data: invoices, error } = await supabaseClient
    .from("invoices")
    .select(INVOICE_SELECT)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Error fetching invoices: ${error.message}`);
  }

  return invoices || [];
};

export const getInvoiceById = async (
  invoiceId: string,
  client?: SupabaseClient<any>
): Promise<Invoice | null> => {
  const supabaseClient = getDbClient(client)
  const { data: invoice, error } = await supabaseClient
    .from("invoices")
    .select(INVOICE_SELECT)
    .eq("id", invoiceId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Invoice not found: ${error?.message || 'Unknown error'}`);
  }

  return invoice;
};

export const getInvoiceByReference = async (
  reference: string,
  client?: SupabaseClient<any>
): Promise<Invoice | null> => {
  const supabaseClient = getDbClient(client)
  const { data: invoice, error } = await supabaseClient
    .from("invoices")
    .select(INVOICE_SELECT)
    .eq("reference", reference)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Error fetching invoice by reference: ${error.message}`);
  }

  return invoice;
};

export const getFailedInvoicesForRetry = async (
  client?: SupabaseClient<any>
): Promise<Invoice[]> => {
  const supabaseClient = getDbClient(client)
  const { data: invoices, error } = await supabaseClient
    .from("invoices")
    .select(INVOICE_SELECT)
    .eq("status", "failed")
    .lt("attempt_count", 3)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Error fetching failed invoices: ${error.message}`);
  }

  return invoices || [];
};

export const getSuspendedInvoices = async (
  client?: SupabaseClient<any>
): Promise<Invoice[]> => {
  const supabaseClient = getDbClient(client)
  const { data: invoices, error } = await supabaseClient
    .from("invoices")
    .select(INVOICE_SELECT)
    .eq("status", "failed")
    .gte("attempt_count", 3)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Error fetching suspended invoices: ${error.message}`);
  }

  return invoices || [];
};

export const getPendingInvoiceBySubscription = async (
  subscriptionId: string,
  client?: SupabaseClient<any>
): Promise<Invoice | null> => {
  const supabaseClient = getDbClient(client)
  const { data: invoice, error } = await supabaseClient
    .from("invoices")
    .select(INVOICE_SELECT)
    .eq("subscription_id", subscriptionId)
    .in("status", ["draft", "pending"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Error fetching pending invoice: ${error.message}`);
  }

  return invoice;
};

export const createInvoice = async (
  invoice: Partial<Invoice>,
  client?: SupabaseClient<any>
): Promise<Invoice> => {
  const supabaseClient = getDbClient(client)
  const { data: createdInvoice, error } = await supabaseClient
    .from("invoices")
    .insert([invoice])
    .select(INVOICE_SELECT)
    .single();

  if (error) {
    throw new Error(`Error creating invoice: ${error.message}`);
  }

  return createdInvoice;
};

export const updateInvoice = async (
  invoiceId: string,
  updates: Partial<Invoice>,
  client?: SupabaseClient<any>
): Promise<Invoice> => {
  const supabaseClient = getDbClient(client)
  const { data: updatedInvoice, error } = await supabaseClient
    .from("invoices")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", invoiceId)
    .select(INVOICE_SELECT)
    .single();

  if (error) {
    throw new Error(`Error updating invoice: ${error.message}`);
  }

  return updatedInvoice;
};

export const markInvoiceAsPaid = async (
  invoiceId: string,
  wompiTransactionId: string,
  client?: SupabaseClient<any>
): Promise<Invoice> => {
  return updateInvoice(invoiceId, {
    status: 'paid',
    paid_at: new Date().toISOString(),
    wompi_transaction_id: wompiTransactionId
  }, client);
};

export const markInvoiceAsFailed = async (
  invoiceId: string,
  attemptCount: number,
  client?: SupabaseClient<any>
): Promise<Invoice> => {
  return updateInvoice(invoiceId, {
    status: 'failed',
    attempt_count: attemptCount
  }, client);
};

export const markInvoiceAsPending = async (
  invoiceId: string,
  client?: SupabaseClient<any>
): Promise<Invoice> => {
  return updateInvoice(invoiceId, { status: 'pending' }, client);
};

export const voidInvoice = async (
  invoiceId: string,
  client?: SupabaseClient<any>
): Promise<Invoice> => {
  return updateInvoice(invoiceId, { status: 'void' }, client);
};

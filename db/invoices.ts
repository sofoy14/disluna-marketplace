// db/invoices.ts
import { supabase } from "@/lib/supabase/robust-client"
import { TablesInsert, TablesUpdate } from "@/supabase/types"

export interface Invoice {
  id: string;
  subscription_id: string;
  workspace_id: string;
  amount_in_cents: number;
  status: 'pending' | 'paid' | 'failed' | 'canceled';
  period_start: string;
  period_end: string;
  attempt_count: number;
  paid_at?: string;
  wompi_transaction_id?: string;
  created_at: string;
  updated_at: string;
  subscriptions?: {
    user_id: string;
    plan_id: string;
    payment_source_id?: string;
    payment_sources?: {
      wompi_id: string;
      type: string;
      status: string;
      customer_email: string;
    };
    plans?: {
      name: string;
      amount_in_cents: number;
    };
  };
}

export const getInvoicesByWorkspaceId = async (
  workspaceId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Invoice[]> => {
  const { data: invoices, error } = await supabase
    .from("invoices")
    .select(`
      *,
      subscriptions:subscription_id (
        user_id,
        plan_id,
        payment_source_id,
        payment_sources:payment_source_id (
          wompi_id,
          type,
          status,
          customer_email
        ),
        plans:plan_id (
          name,
          amount_in_cents
        )
      )
    `)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Error fetching invoices: ${error.message}`);
  }

  return invoices || [];
};

export const getInvoiceById = async (invoiceId: string): Promise<Invoice> => {
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(`
      *,
      subscriptions:subscription_id (
        user_id,
        plan_id,
        payment_source_id,
        payment_sources:payment_source_id (
          wompi_id,
          type,
          status,
          customer_email
        ),
        plans:plan_id (
          name,
          amount_in_cents
        )
      )
    `)
    .eq("id", invoiceId)
    .single();

  if (error || !invoice) {
    throw new Error(`Invoice not found: ${error?.message || 'Unknown error'}`);
  }

  return invoice;
};

export const getFailedInvoicesForRetry = async (): Promise<Invoice[]> => {
  const { data: invoices, error } = await supabase
    .from("invoices")
    .select(`
      *,
      subscriptions:subscription_id (
        user_id,
        plan_id,
        payment_source_id,
        payment_sources:payment_source_id (
          wompi_id,
          type,
          status,
          customer_email
        ),
        plans:plan_id (
          name,
          amount_in_cents
        )
      )
    `)
    .eq("status", "failed")
    .lt("attempt_count", 3)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Error fetching failed invoices: ${error.message}`);
  }

  return invoices || [];
};

export const getSuspendedInvoices = async (): Promise<Invoice[]> => {
  const { data: invoices, error } = await supabase
    .from("invoices")
    .select(`
      *,
      subscriptions:subscription_id (
        user_id,
        plan_id,
        payment_source_id,
        payment_sources:payment_source_id (
          wompi_id,
          type,
          status,
          customer_email
        ),
        plans:plan_id (
          name,
          amount_in_cents
        )
      )
    `)
    .eq("status", "failed")
    .eq("attempt_count", 3)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Error fetching suspended invoices: ${error.message}`);
  }

  return invoices || [];
};

export const createInvoice = async (invoice: TablesInsert<"invoices">): Promise<Invoice> => {
  const { data: createdInvoice, error } = await supabase
    .from("invoices")
    .insert([invoice])
    .select(`
      *,
      subscriptions:subscription_id (
        user_id,
        plan_id,
        payment_source_id,
        payment_sources:payment_source_id (
          wompi_id,
          type,
          status,
          customer_email
        ),
        plans:plan_id (
          name,
          amount_in_cents
        )
      )
    `)
    .single();

  if (error) {
    throw new Error(`Error creating invoice: ${error.message}`);
  }

  return createdInvoice;
};

export const updateInvoice = async (
  invoiceId: string,
  invoice: TablesUpdate<"invoices">
): Promise<Invoice> => {
  const { data: updatedInvoice, error } = await supabase
    .from("invoices")
    .update(invoice)
    .eq("id", invoiceId)
    .select(`
      *,
      subscriptions:subscription_id (
        user_id,
        plan_id,
        payment_source_id,
        payment_sources:payment_source_id (
          wompi_id,
          type,
          status,
          customer_email
        ),
        plans:plan_id (
          name,
          amount_in_cents
        )
      )
    `)
    .single();

  if (error) {
    throw new Error(`Error updating invoice: ${error.message}`);
  }

  return updatedInvoice;
};

export const markInvoiceAsPaid = async (
  invoiceId: string,
  wompiTransactionId: string
): Promise<Invoice> => {
  return updateInvoice(invoiceId, {
    status: 'paid',
    paid_at: new Date().toISOString(),
    wompi_transaction_id: wompiTransactionId
  });
};

export const markInvoiceAsFailed = async (
  invoiceId: string,
  attemptCount: number
): Promise<Invoice> => {
  return updateInvoice(invoiceId, {
    status: 'failed',
    attempt_count: attemptCount
  });
};






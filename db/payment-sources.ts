// db/payment-sources.ts
import { supabase } from "@/lib/supabase/robust-client"
import { TablesInsert, TablesUpdate } from "@/supabase/types"
import type { SupabaseClient } from "@supabase/supabase-js"

export interface PaymentSource {
  id: string;
  workspace_id: string;
  user_id: string;
  wompi_id: string;
  type: 'CARD' | 'NEQUI' | 'PSE';
  status: string;
  customer_email: string;
  last_four?: string;
  expires_at?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

function getDbClient(client?: SupabaseClient<any>) {
  return client || supabase
}

export const getPaymentSourcesByWorkspaceId = async (
  workspaceId: string,
  client?: SupabaseClient<any>
): Promise<PaymentSource[]> => {
  const supabaseClient = getDbClient(client)
  const { data: paymentSources, error } = await supabaseClient
    .from("payment_sources")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Error fetching payment sources: ${error.message}`);
  }

  return paymentSources || [];
};

export const getPaymentSourcesByUserId = async (
  userId: string,
  client?: SupabaseClient<any>
): Promise<PaymentSource[]> => {
  const supabaseClient = getDbClient(client)
  const { data: paymentSources, error } = await supabaseClient
    .from("payment_sources")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Error fetching payment sources: ${error.message}`);
  }

  return paymentSources || [];
};

export const getDefaultPaymentSource = async (
  workspaceId: string,
  client?: SupabaseClient<any>
): Promise<PaymentSource | null> => {
  const supabaseClient = getDbClient(client)
  const { data: paymentSource, error } = await supabaseClient
    .from("payment_sources")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("is_default", true)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw new Error(`Error fetching default payment source: ${error.message}`);
  }

  return paymentSource;
};

export const createPaymentSource = async (
  paymentSource: TablesInsert<"payment_sources">,
  client?: SupabaseClient<any>
): Promise<PaymentSource> => {
  const supabaseClient = getDbClient(client)
  const { data: createdPaymentSource, error } = await supabaseClient
    .from("payment_sources")
    .insert([paymentSource])
    .select("*")
    .single();

  if (error) {
    throw new Error(`Error creating payment source: ${error.message}`);
  }

  return createdPaymentSource;
};

export const updatePaymentSource = async (
  paymentSourceId: string,
  paymentSource: TablesUpdate<"payment_sources">,
  client?: SupabaseClient<any>
): Promise<PaymentSource> => {
  const supabaseClient = getDbClient(client)
  const { data: updatedPaymentSource, error } = await supabaseClient
    .from("payment_sources")
    .update(paymentSource)
    .eq("id", paymentSourceId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Error updating payment source: ${error.message}`);
  }

  return updatedPaymentSource;
};

export const setDefaultPaymentSource = async (
  paymentSourceId: string,
  client?: SupabaseClient<any>
): Promise<PaymentSource> => {
  const supabaseClient = getDbClient(client)
  // First, get the payment source to get workspace_id
  const { data: paymentSource, error: fetchError } = await supabaseClient
    .from("payment_sources")
    .select("workspace_id")
    .eq("id", paymentSourceId)
    .single();

  if (fetchError || !paymentSource) {
    throw new Error(`Payment source not found: ${fetchError?.message || 'Unknown error'}`);
  }

  // Unset all other default payment sources for this workspace
  const { error: unsetError } = await supabaseClient
    .from("payment_sources")
    .update({ is_default: false })
    .eq("workspace_id", paymentSource.workspace_id)
    .neq("id", paymentSourceId);

  if (unsetError) {
    throw new Error(`Error unsetting default payment sources: ${unsetError.message}`);
  }

  // Set this payment source as default
  return updatePaymentSource(paymentSourceId, { is_default: true }, supabaseClient);
};

export const deletePaymentSource = async (
  paymentSourceId: string,
  client?: SupabaseClient<any>
): Promise<boolean> => {
  const supabaseClient = getDbClient(client)
  const { error } = await supabaseClient
    .from("payment_sources")
    .delete()
    .eq("id", paymentSourceId);

  if (error) {
    throw new Error(`Error deleting payment source: ${error.message}`);
  }

  return true;
};

export const getPaymentSourceByWompiId = async (
  wompiId: string,
  client?: SupabaseClient<any>
): Promise<PaymentSource | null> => {
  const supabaseClient = getDbClient(client)
  const { data: paymentSource, error } = await supabaseClient
    .from("payment_sources")
    .select("*")
    .eq("wompi_id", wompiId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw new Error(`Error fetching payment source by Wompi ID: ${error.message}`);
  }

  return paymentSource;
};




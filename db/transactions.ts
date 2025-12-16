// db/transactions.ts
import { supabase } from "@/lib/supabase/robust-client"
import { TablesInsert, TablesUpdate } from "@/supabase/types"
import type { SupabaseClient } from "@supabase/supabase-js"

export interface Transaction {
  id: string;
  invoice_id: string;
  workspace_id: string;
  wompi_id: string;
  amount_in_cents: number;
  status: string;
  payment_method_type: string;
  reference: string;
  status_message?: string;
  raw_payload: any;
  created_at: string;
  updated_at: string;
}

function getDbClient(client?: SupabaseClient<any>) {
  return client || supabase
}

export const getTransactionsByWorkspaceId = async (
  workspaceId: string,
  limit: number = 50,
  offset: number = 0,
  client?: SupabaseClient<any>
): Promise<Transaction[]> => {
  const supabaseClient = getDbClient(client)
  const { data: transactions, error } = await supabaseClient
    .from("transactions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Error fetching transactions: ${error.message}`);
  }

  return transactions || [];
};

export const getTransactionById = async (
  transactionId: string,
  client?: SupabaseClient<any>
): Promise<Transaction> => {
  const supabaseClient = getDbClient(client)
  const { data: transaction, error } = await supabaseClient
    .from("transactions")
    .select("*")
    .eq("id", transactionId)
    .single();

  if (error || !transaction) {
    throw new Error(`Transaction not found: ${error?.message || 'Unknown error'}`);
  }

  return transaction;
};

export const getTransactionByWompiId = async (
  wompiId: string,
  client?: SupabaseClient<any>
): Promise<Transaction | null> => {
  const supabaseClient = getDbClient(client)
  const { data: transaction, error } = await supabaseClient
    .from("transactions")
    .select("*")
    .eq("wompi_id", wompiId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw new Error(`Error fetching transaction by Wompi ID: ${error.message}`);
  }

  return transaction;
};

export const getTransactionsByInvoiceId = async (
  invoiceId: string,
  client?: SupabaseClient<any>
): Promise<Transaction[]> => {
  const supabaseClient = getDbClient(client)
  const { data: transactions, error } = await supabaseClient
    .from("transactions")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Error fetching transactions by invoice: ${error.message}`);
  }

  return transactions || [];
};

export const createTransaction = async (
  transaction: TablesInsert<"transactions">,
  client?: SupabaseClient<any>
): Promise<Transaction> => {
  const supabaseClient = getDbClient(client)
  const { data: createdTransaction, error } = await supabaseClient
    .from("transactions")
    .insert([transaction])
    .select("*")
    .single();

  if (error) {
    throw new Error(`Error creating transaction: ${error.message}`);
  }

  return createdTransaction;
};

export const updateTransaction = async (
  transactionId: string,
  transaction: TablesUpdate<"transactions">,
  client?: SupabaseClient<any>
): Promise<Transaction> => {
  const supabaseClient = getDbClient(client)
  const { data: updatedTransaction, error } = await supabaseClient
    .from("transactions")
    .update(transaction)
    .eq("id", transactionId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Error updating transaction: ${error.message}`);
  }

  return updatedTransaction;
};

export const updateTransactionByWompiId = async (
  wompiId: string,
  transaction: TablesUpdate<"transactions">,
  client?: SupabaseClient<any>
): Promise<Transaction> => {
  const supabaseClient = getDbClient(client)
  const { data: updatedTransaction, error } = await supabaseClient
    .from("transactions")
    .update(transaction)
    .eq("wompi_id", wompiId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Error updating transaction by Wompi ID: ${error.message}`);
  }

  return updatedTransaction;
};





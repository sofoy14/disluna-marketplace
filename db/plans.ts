// db/plans.ts
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { TablesInsert, TablesUpdate } from "@/supabase/types"

export interface Plan {
  id: string;
  name: string;
  description: string;
  amount_in_cents: number;
  currency: string;
  interval: string;
  features: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const getPlans = async (): Promise<Plan[]> => {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  
  const { data: plans, error } = await supabase
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("amount_in_cents", { ascending: true });

  if (error) {
    console.error('Error fetching plans:', error);
    throw new Error(`Error fetching plans: ${error.message}`);
  }

  return plans || [];
};

export const getPlanById = async (planId: string): Promise<Plan> => {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  
  const { data: plan, error } = await supabase
    .from("plans")
    .select("*")
    .eq("id", planId)
    .eq("is_active", true)
    .single();

  if (error || !plan) {
    throw new Error(`Plan not found: ${error?.message || 'Unknown error'}`);
  }

  return plan;
};

export const createPlan = async (plan: TablesInsert<"plans">): Promise<Plan> => {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  
  const { data: createdPlan, error } = await supabase
    .from("plans")
    .insert([plan])
    .select("*")
    .single();

  if (error) {
    throw new Error(`Error creating plan: ${error.message}`);
  }

  return createdPlan;
};

export const updatePlan = async (
  planId: string,
  plan: TablesUpdate<"plans">
): Promise<Plan> => {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  
  const { data: updatedPlan, error } = await supabase
    .from("plans")
    .update(plan)
    .eq("id", planId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Error updating plan: ${error.message}`);
  }

  return updatedPlan;
};

export const deletePlan = async (planId: string): Promise<boolean> => {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  
  const { error } = await supabase
    .from("plans")
    .update({ is_active: false })
    .eq("id", planId);

  if (error) {
    throw new Error(`Error deleting plan: ${error.message}`);
  }

  return true;
};


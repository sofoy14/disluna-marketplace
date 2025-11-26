// db/subscriptions.ts
// Acceso a datos de suscripciones

import { supabase } from "@/lib/supabase/robust-client"
import { BillingPeriod, Plan, calculatePeriodEnd } from "./plans"

export type SubscriptionStatus = 'pending' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete';

export interface Subscription {
  id: string;
  workspace_id: string;
  user_id?: string;
  plan_id: string;
  payment_source_id?: string;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  billing_day?: number;
  trial_end?: string;
  cancel_at_period_end: boolean;
  canceled_at?: string;
  wompi_reference?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at?: string;
  // Relaciones
  plans?: {
    name: string;
    description: string;
    amount_in_cents: number;
    billing_period: BillingPeriod;
    features: string[];
    query_limit: number;
  };
  payment_sources?: {
    wompi_id: string;
    type: string;
    status: string;
    customer_email: string;
    last_four?: string;
    expires_at?: string;
  };
}

const SUBSCRIPTION_SELECT = `
  *,
  plans:plan_id (
    name,
    description,
    amount_in_cents,
    billing_period,
    features,
    query_limit
  ),
  payment_sources:payment_source_id (
    wompi_id,
    type,
    status,
    customer_email,
    last_four,
    expires_at
  )
`;

export const getSubscriptionByWorkspaceId = async (workspaceId: string): Promise<Subscription | null> => {
  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select(SUBSCRIPTION_SELECT)
    .eq("workspace_id", workspaceId)
    .in("status", ["active", "trialing", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Error fetching subscription: ${error.message}`);
  }

  return subscription;
};

export const getSubscriptionByUserId = async (userId: string): Promise<Subscription | null> => {
  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select(SUBSCRIPTION_SELECT)
    .eq("user_id", userId)
    .in("status", ["active", "trialing", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Error fetching subscription: ${error.message}`);
  }

  return subscription;
};

export const getSubscriptionByReference = async (reference: string): Promise<Subscription | null> => {
  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select(SUBSCRIPTION_SELECT)
    .eq("wompi_reference", reference)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Error fetching subscription by reference: ${error.message}`);
  }

  return subscription;
};

export const getPendingSubscription = async (workspaceId: string): Promise<Subscription | null> => {
  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select(SUBSCRIPTION_SELECT)
    .eq("workspace_id", workspaceId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Error fetching pending subscription: ${error.message}`);
  }

  return subscription;
};

export const getSubscriptionsDueToday = async (): Promise<Subscription[]> => {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const { data: subscriptions, error } = await supabase
    .from("subscriptions")
    .select(SUBSCRIPTION_SELECT)
    .eq("status", "active")
    .eq("cancel_at_period_end", false)
    .gte("current_period_end", startOfDay.toISOString())
    .lt("current_period_end", endOfDay.toISOString());

  if (error) {
    throw new Error(`Error fetching subscriptions due today: ${error.message}`);
  }

  return subscriptions || [];
};

export const getSubscriptionById = async (subscriptionId: string): Promise<Subscription | null> => {
  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select(SUBSCRIPTION_SELECT)
    .eq("id", subscriptionId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Error fetching subscription: ${error.message}`);
  }

  return subscription;
};

export const createSubscription = async (
  subscription: Partial<Subscription>
): Promise<Subscription> => {
  const { data: createdSubscription, error } = await supabase
    .from("subscriptions")
    .insert([subscription])
    .select(SUBSCRIPTION_SELECT)
    .single();

  if (error) {
    throw new Error(`Error creating subscription: ${error.message}`);
  }

  return createdSubscription;
};

export const updateSubscription = async (
  subscriptionId: string,
  updates: Partial<Subscription>
): Promise<Subscription> => {
  const { data: updatedSubscription, error } = await supabase
    .from("subscriptions")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", subscriptionId)
    .select(SUBSCRIPTION_SELECT)
    .single();

  if (error) {
    throw new Error(`Error updating subscription: ${error.message}`);
  }

  return updatedSubscription;
};

export const activateSubscription = async (
  subscriptionId: string,
  paymentSourceId?: string
): Promise<Subscription> => {
  const updates: Partial<Subscription> = { status: 'active' };
  if (paymentSourceId) {
    updates.payment_source_id = paymentSourceId;
  }
  return updateSubscription(subscriptionId, updates);
};

export const cancelSubscription = async (subscriptionId: string): Promise<Subscription> => {
  return updateSubscription(subscriptionId, {
    cancel_at_period_end: true,
    canceled_at: new Date().toISOString()
  });
};

export const reactivateSubscription = async (subscriptionId: string): Promise<Subscription> => {
  return updateSubscription(subscriptionId, {
    cancel_at_period_end: false,
    canceled_at: undefined
  });
};

export const extendSubscriptionPeriod = async (
  subscriptionId: string,
  plan: Plan
): Promise<Subscription> => {
  const subscription = await getSubscriptionById(subscriptionId);
  if (!subscription) {
    throw new Error('Subscription not found');
  }

  const newPeriodStart = new Date(subscription.current_period_end);
  const newPeriodEnd = calculatePeriodEnd(plan, newPeriodStart);

  return updateSubscription(subscriptionId, {
    current_period_start: newPeriodStart.toISOString(),
    current_period_end: newPeriodEnd.toISOString()
  });
};

// Verifica si un usuario tiene acceso al chatbot
export const hasActiveSubscription = async (userId: string): Promise<boolean> => {
  const subscription = await getSubscriptionByUserId(userId);
  
  if (!subscription) return false;
  
  const now = new Date();
  const periodEnd = new Date(subscription.current_period_end);
  
  // Verificar estado y vigencia
  if (subscription.status === 'active' || subscription.status === 'trialing') {
    return periodEnd > now;
  }
  
  // past_due tiene 3 días de gracia
  if (subscription.status === 'past_due') {
    const gracePeriodDays = 3;
    const graceEnd = new Date(periodEnd);
    graceEnd.setDate(graceEnd.getDate() + gracePeriodDays);
    return graceEnd > now;
  }
  
  return false;
};

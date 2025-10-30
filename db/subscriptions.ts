// db/subscriptions.ts
import { supabase } from "@/lib/supabase/robust-client"
import { TablesInsert, TablesUpdate } from "@/supabase/types"

export interface Subscription {
  id: string;
  workspace_id: string;
  user_id: string;
  plan_id: string;
  payment_source_id?: string;
  status: 'active' | 'past_due' | 'canceled' | 'incomplete';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at?: string;
  created_at: string;
  updated_at: string;
  plans?: {
    name: string;
    description: string;
    amount_in_cents: number;
    features: string[];
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

export const getSubscriptionByWorkspaceId = async (workspaceId: string): Promise<Subscription | null> => {
  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select(`
      *,
      plans:plan_id (
        name,
        description,
        amount_in_cents,
        features
      ),
      payment_sources:payment_source_id (
        wompi_id,
        type,
        status,
        customer_email,
        last_four,
        expires_at
      )
    `)
    .eq("workspace_id", workspaceId)
    .in("status", ["active", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw new Error(`Error fetching subscription: ${error.message}`);
  }

  return subscription;
};

export const getSubscriptionsByUserId = async (userId: string): Promise<Subscription[]> => {
  const { data: subscriptions, error } = await supabase
    .from("subscriptions")
    .select(`
      *,
      plans:plan_id (
        name,
        description,
        amount_in_cents,
        features
      ),
      payment_sources:payment_source_id (
        wompi_id,
        type,
        status,
        customer_email,
        last_four,
        expires_at
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Error fetching subscriptions: ${error.message}`);
  }

  return subscriptions || [];
};

export const getSubscriptionsDueToday = async (): Promise<Subscription[]> => {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const { data: subscriptions, error } = await supabase
    .from("subscriptions")
    .select(`
      *,
      plans:plan_id (
        name,
        description,
        amount_in_cents,
        features
      ),
      payment_sources:payment_source_id (
        wompi_id,
        type,
        status,
        customer_email,
        last_four,
        expires_at
      )
    `)
    .eq("status", "active")
    .eq("cancel_at_period_end", false)
    .gte("current_period_end", startOfDay.toISOString())
    .lt("current_period_end", endOfDay.toISOString());

  if (error) {
    throw new Error(`Error fetching subscriptions due today: ${error.message}`);
  }

  return subscriptions || [];
};

export const createSubscription = async (subscription: TablesInsert<"subscriptions">): Promise<Subscription> => {
  const { data: createdSubscription, error } = await supabase
    .from("subscriptions")
    .insert([subscription])
    .select(`
      *,
      plans:plan_id (
        name,
        description,
        amount_in_cents,
        features
      ),
      payment_sources:payment_source_id (
        wompi_id,
        type,
        status,
        customer_email,
        last_four,
        expires_at
      )
    `)
    .single();

  if (error) {
    throw new Error(`Error creating subscription: ${error.message}`);
  }

  return createdSubscription;
};

export const updateSubscription = async (
  subscriptionId: string,
  subscription: TablesUpdate<"subscriptions">
): Promise<Subscription> => {
  const { data: updatedSubscription, error } = await supabase
    .from("subscriptions")
    .update(subscription)
    .eq("id", subscriptionId)
    .select(`
      *,
      plans:plan_id (
        name,
        description,
        amount_in_cents,
        features
      ),
      payment_sources:payment_source_id (
        wompi_id,
        type,
        status,
        customer_email,
        last_four,
        expires_at
      )
    `)
    .single();

  if (error) {
    throw new Error(`Error updating subscription: ${error.message}`);
  }

  return updatedSubscription;
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
    canceled_at: null
  });
};

export const extendSubscriptionPeriod = async (subscriptionId: string): Promise<Subscription> => {
  const subscription = await getSubscriptionByWorkspaceId(subscriptionId);
  if (!subscription) {
    throw new Error('Subscription not found');
  }

  const currentPeriodEnd = new Date(subscription.current_period_end);
  const newPeriodStart = new Date(currentPeriodEnd);
  const newPeriodEnd = new Date(currentPeriodEnd);
  newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

  return updateSubscription(subscriptionId, {
    current_period_start: newPeriodStart.toISOString(),
    current_period_end: newPeriodEnd.toISOString()
  });
};






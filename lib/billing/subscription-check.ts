// lib/billing/subscription-check.ts
// Utilidades para verificar el estado de suscripción de usuarios

import { getSupabaseServer } from '@/lib/supabase/server-client';

export interface SubscriptionStatus {
  hasAccess: boolean;
  status: 'active' | 'trialing' | 'past_due' | 'expired' | 'none';
  subscription?: {
    id: string;
    planName: string;
    periodEnd: Date;
    queryLimit: number;
  };
  message?: string;
}

/**
 * Verifica si un usuario tiene acceso al chatbot basado en su suscripción
 */
export async function checkSubscriptionAccess(userId: string): Promise<SubscriptionStatus> {
  try {
    const supabase = getSupabaseServer();
    // Consultar suscripción activa del usuario
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select(`
        id,
        status,
        current_period_end,
        cancel_at_period_end,
        plans:plan_id (
          name,
          query_limit
        )
      `)
      .eq('user_id', userId)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error checking subscription:', error);
      throw error;
    }

    // Sin suscripción
    if (!subscription) {
      return {
        hasAccess: false,
        status: 'none',
        message: 'No tienes una suscripción activa'
      };
    }

    const now = new Date();
    const periodEnd = new Date(subscription.current_period_end);
    const plan = subscription.plans as any;

    // Suscripción activa o en trial
    if (subscription.status === 'active' || subscription.status === 'trialing') {
      if (periodEnd > now) {
        return {
          hasAccess: true,
          status: subscription.status as 'active' | 'trialing',
          subscription: {
            id: subscription.id,
            planName: plan?.name || 'Plan',
            periodEnd,
            queryLimit: plan?.query_limit || 200
          }
        };
      }
      
      // Período expirado
      return {
        hasAccess: false,
        status: 'expired',
        message: 'Tu suscripción ha expirado'
      };
    }

    // Suscripción past_due - dar período de gracia de 3 días
    if (subscription.status === 'past_due') {
      const gracePeriodDays = 3;
      const graceEnd = new Date(periodEnd);
      graceEnd.setDate(graceEnd.getDate() + gracePeriodDays);

      if (graceEnd > now) {
        return {
          hasAccess: true,
          status: 'past_due',
          subscription: {
            id: subscription.id,
            planName: plan?.name || 'Plan',
            periodEnd,
            queryLimit: plan?.query_limit || 200
          },
          message: 'Tu pago está pendiente. Por favor actualiza tu método de pago.'
        };
      }

      return {
        hasAccess: false,
        status: 'past_due',
        message: 'Tu suscripción ha sido suspendida por falta de pago'
      };
    }

    return {
      hasAccess: false,
      status: 'none',
      message: 'Estado de suscripción desconocido'
    };

  } catch (error) {
    console.error('Error in checkSubscriptionAccess:', error);
    // En caso de error, permitir acceso temporalmente para no bloquear usuarios
    return {
      hasAccess: true,
      status: 'active',
      message: 'Error verificando suscripción'
    };
  }
}

/**
 * Verifica si la feature de billing está habilitada
 */
export function isBillingEnabled(): boolean {
  return process.env.NEXT_PUBLIC_BILLING_ENABLED === 'true';
}

/**
 * Helper para usar en middleware/API routes
 */
export async function requireActiveSubscription(userId: string): Promise<{
  allowed: boolean;
  redirectTo?: string;
  message?: string;
}> {
  // Si billing no está habilitado, permitir acceso
  if (!isBillingEnabled()) {
    return { allowed: true };
  }

  const status = await checkSubscriptionAccess(userId);

  if (status.hasAccess) {
    return { allowed: true };
  }

  return {
    allowed: false,
    redirectTo: '/precios',
    message: status.message
  };
}


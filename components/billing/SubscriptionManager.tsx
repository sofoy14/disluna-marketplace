// components/billing/SubscriptionManager.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreditCard, 
  Calendar, 
  DollarSign, 
  AlertCircle,
  CheckCircle,
  Clock,
  Settings
} from 'lucide-react';
import { formatCurrency } from '@/lib/wompi/utils';

interface Subscription {
  id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  billing_day: number;
  cancel_at_period_end: boolean;
  canceled_at?: string;
  plans: {
    id: string;
    name: string;
    description: string;
    amount_in_cents: number;
    features: string[];
  };
  payment_sources: {
    id: string;
    type: string;
    brand?: string;
    last_four?: string;
    status: string;
  };
}

interface SubscriptionManagerProps {
  workspaceId: string;
  onUpdatePaymentMethod: () => void;
  onChangePlan: () => void;
}

export function SubscriptionManager({ 
  workspaceId, 
  onUpdatePaymentMethod, 
  onChangePlan 
}: SubscriptionManagerProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, [workspaceId]);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getAuthToken();
      const response = await fetch('/api/billing/subscriptions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscription');
      }

      const data = await response.json();
      setSubscription(data.subscription);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription) return;

    try {
      setCanceling(true);
      const token = await getAuthToken();
      
      const response = await fetch(`/api/billing/subscriptions/${subscription.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      await fetchSubscription(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cancelar suscripción');
    } finally {
      setCanceling(false);
    }
  };

  const getAuthToken = async (): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'past_due':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'canceled':
        return <Clock className="h-5 w-5 text-gray-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'active': 'default',
      'past_due': 'destructive',
      'canceled': 'outline',
      'trialing': 'secondary'
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {status === 'active' ? 'Activa' : 
         status === 'past_due' ? 'Vencida' :
         status === 'canceled' ? 'Cancelada' :
         status === 'trialing' ? 'Prueba' : status}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold">No hay suscripción activa</h3>
            <p className="text-muted-foreground">
              Selecciona un plan para comenzar a usar nuestros servicios.
            </p>
            <Button onClick={onChangePlan}>
              Ver Planes Disponibles
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estado de la Suscripción */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              {getStatusIcon(subscription.status)}
              Suscripción Actual
            </span>
            {getStatusBadge(subscription.status)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold">{subscription.plans.name}</h4>
              <p className="text-sm text-muted-foreground">
                {subscription.plans.description}
              </p>
              <p className="text-lg font-bold mt-2">
                {formatCurrency(subscription.plans.amount_in_cents)}/mes
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Próximo cobro: {formatDate(subscription.current_period_end)}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {subscription.payment_sources.type === 'CARD' 
                    ? `${subscription.payment_sources.brand} •••• ${subscription.payment_sources.last_four}`
                    : `Nequi •••• ${subscription.payment_sources.last_four}`
                  }
                </span>
              </div>
            </div>
          </div>

          {subscription.cancel_at_period_end && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Tu suscripción será cancelada el {formatDate(subscription.current_period_end)}. 
                Podrás seguir usando el servicio hasta esa fecha.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Características del Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Características Incluidas</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {subscription.plans.features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Acciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Gestionar Suscripción
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={onUpdatePaymentMethod}>
              <CreditCard className="h-4 w-4 mr-2" />
              Actualizar Método de Pago
            </Button>
            
            <Button variant="outline" onClick={onChangePlan}>
              <DollarSign className="h-4 w-4 mr-2" />
              Cambiar Plan
            </Button>
            
            {subscription.status === 'active' && !subscription.cancel_at_period_end && (
              <Button 
                variant="destructive" 
                onClick={handleCancelSubscription}
                disabled={canceling}
              >
                {canceling ? 'Cancelando...' : 'Cancelar Suscripción'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}






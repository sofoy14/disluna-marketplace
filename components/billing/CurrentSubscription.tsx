// components/billing/CurrentSubscription.tsx
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Crown, 
  Calendar, 
  CreditCard, 
  AlertTriangle,
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { formatCurrency } from '@/lib/wompi/format';

interface Subscription {
  id: string;
  status: 'active' | 'past_due' | 'canceled' | 'incomplete';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at?: string;
  plans?: {
    name: string;
    description: string;
    amount_in_cents: number;
    features: string[];
  };
  payment_sources?: {
    type: string;
    last_four?: string;
    expires_at?: string;
  };
}

interface CurrentSubscriptionProps {
  subscription: Subscription | null;
  onCancelSubscription?: () => void;
  onReactivateSubscription?: () => void;
  isLoading?: boolean;
}

export function CurrentSubscription({ 
  subscription, 
  onCancelSubscription, 
  onReactivateSubscription,
  isLoading = false 
}: CurrentSubscriptionProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Activa</Badge>;
      case 'past_due':
        return <Badge className="bg-red-100 text-red-800">Vencida</Badge>;
      case 'canceled':
        return <Badge className="bg-gray-100 text-gray-800">Cancelada</Badge>;
      case 'incomplete':
        return <Badge className="bg-yellow-100 text-yellow-800">Incompleta</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'past_due':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'canceled':
        return <XCircle className="w-5 h-5 text-gray-600" />;
      case 'incomplete':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const getPaymentMethodName = (type: string) => {
    switch (type) {
      case 'CARD':
        return 'Tarjeta de Crédito';
      case 'NEQUI':
        return 'Nequi';
      case 'PSE':
        return 'PSE';
      default:
        return type;
    }
  };

  const formatExpiryDate = (expiresAt: string) => {
    try {
      const date = new Date(expiresAt);
      return date.toLocaleDateString('es-CO', { 
        month: '2-digit', 
        year: '2-digit' 
      });
    } catch {
      return 'N/A';
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription || !onCancelSubscription) return;
    
    if (!confirm('¿Estás seguro de que quieres cancelar tu suscripción? Podrás seguir usando el servicio hasta el final del período actual.')) {
      return;
    }

    setActionLoading('cancel');
    try {
      await onCancelSubscription();
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivateSubscription = async () => {
    if (!subscription || !onReactivateSubscription) return;
    
    setActionLoading('reactivate');
    try {
      await onReactivateSubscription();
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
          <span>Cargando suscripción...</span>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <Crown className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Sin Suscripción Activa
            </h3>
            <p className="text-gray-600">
              No tienes una suscripción activa. Selecciona un plan para comenzar.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5" />
              Suscripción Actual
            </CardTitle>
            <CardDescription>
              Detalles de tu suscripción actual
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(subscription.status)}
            {getStatusBadge(subscription.status)}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Plan Details */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold text-lg mb-2">
            {subscription.plans?.name || 'Plan'}
          </h4>
          <p className="text-gray-600 mb-3">
            {subscription.plans?.description || 'Descripción del plan'}
          </p>
          <div className="text-2xl font-bold text-green-600">
            {subscription.plans?.amount_in_cents 
              ? formatCurrency(subscription.plans.amount_in_cents)
              : 'N/A'
            }
            <span className="text-sm text-gray-500 ml-1">/mes</span>
          </div>
        </div>

        {/* Billing Period */}
        <div className="space-y-3">
          <h5 className="font-medium text-gray-900">Período de Facturación</h5>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>
              {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
            </span>
          </div>
          
          {subscription.cancel_at_period_end && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Suscripción Cancelada</span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                Tu suscripción será cancelada al final del período actual ({formatDate(subscription.current_period_end)})
              </p>
            </div>
          )}
        </div>

        {/* Payment Method */}
        {subscription.payment_sources && (
          <div className="space-y-3">
            <h5 className="font-medium text-gray-900">Método de Pago</h5>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CreditCard className="w-4 h-4" />
              <span>
                {getPaymentMethodName(subscription.payment_sources.type)}
                {subscription.payment_sources.last_four && (
                  <span className="ml-1">
                    •••• {subscription.payment_sources.last_four}
                  </span>
                )}
                {subscription.payment_sources.expires_at && (
                  <span className="ml-1">
                    (Expira: {formatExpiryDate(subscription.payment_sources.expires_at)})
                  </span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          {subscription.cancel_at_period_end ? (
            <Button
              onClick={handleReactivateSubscription}
              disabled={actionLoading === 'reactivate'}
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading === 'reactivate' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Reactivando...
                </>
              ) : (
                'Reactivar Suscripción'
              )}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={handleCancelSubscription}
              disabled={actionLoading === 'cancel'}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              {actionLoading === 'cancel' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Cancelando...
                </>
              ) : (
                'Cancelar Suscripción'
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}






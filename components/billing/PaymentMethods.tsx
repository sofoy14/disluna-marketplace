// components/billing/PaymentMethods.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Trash2, 
  Star, 
  Plus,
  Loader2,
  AlertCircle 
} from 'lucide-react';

interface PaymentSource {
  id: string;
  wompi_id: string;
  type: 'CARD' | 'NEQUI' | 'PSE';
  status: string;
  customer_email: string;
  last_four?: string;
  expires_at?: string;
  is_default: boolean;
  created_at: string;
}

interface PaymentMethodsProps {
  workspaceId: string;
  onAddPaymentMethod?: () => void;
}

export function PaymentMethods({ workspaceId, onAddPaymentMethod }: PaymentMethodsProps) {
  const [paymentSources, setPaymentSources] = useState<PaymentSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchPaymentSources();
  }, [workspaceId]);

  const fetchPaymentSources = async () => {
    try {
      const response = await fetch(`/api/billing/payment-sources?workspace_id=${workspaceId}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error fetching payment sources');
      }

      setPaymentSources(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetDefault = async (paymentSourceId: string) => {
    setActionLoading(paymentSourceId);
    try {
      const response = await fetch('/api/billing/payment-sources', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_source_id: paymentSourceId,
          action: 'set_default'
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error setting default payment method');
      }

      // Update local state
      setPaymentSources(prev => 
        prev.map(ps => ({
          ...ps,
          is_default: ps.id === paymentSourceId
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (paymentSourceId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este método de pago?')) {
      return;
    }

    setActionLoading(paymentSourceId);
    try {
      const response = await fetch(`/api/billing/payment-sources?id=${paymentSourceId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error deleting payment method');
      }

      // Update local state
      setPaymentSources(prev => prev.filter(ps => ps.id !== paymentSourceId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setActionLoading(null);
    }
  };

  const getPaymentMethodIcon = (type: string) => {
    switch (type) {
      case 'CARD':
        return <CreditCard className="w-5 h-5" />;
      case 'NEQUI':
        return <div className="w-5 h-5 bg-green-500 rounded text-white text-xs flex items-center justify-center font-bold">N</div>;
      case 'PSE':
        return <div className="w-5 h-5 bg-blue-500 rounded text-white text-xs flex items-center justify-center font-bold">P</div>;
      default:
        return <CreditCard className="w-5 h-5" />;
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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
          <span>Cargando métodos de pago...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchPaymentSources} variant="outline">
              Reintentar
            </Button>
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
              <CreditCard className="w-5 h-5" />
              Métodos de Pago
            </CardTitle>
            <CardDescription>
              Gestiona tus métodos de pago para suscripciones
            </CardDescription>
          </div>
          <Button onClick={onAddPaymentMethod} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Agregar
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {paymentSources.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay métodos de pago
            </h3>
            <p className="text-gray-600 mb-4">
              Agrega un método de pago para gestionar tu suscripción
            </p>
            <Button onClick={onAddPaymentMethod}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Método de Pago
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {paymentSources.map((paymentSource) => (
              <div
                key={paymentSource.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  {getPaymentMethodIcon(paymentSource.type)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {getPaymentMethodName(paymentSource.type)}
                      </span>
                      {paymentSource.is_default && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="w-3 h-3 mr-1" />
                          Predeterminado
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {paymentSource.type === 'CARD' && paymentSource.last_four
                        ? `•••• ${paymentSource.last_four}`
                        : paymentSource.customer_email
                      }
                      {paymentSource.expires_at && (
                        <span className="ml-2">
                          Expira: {formatExpiryDate(paymentSource.expires_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {!paymentSource.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(paymentSource.id)}
                      disabled={actionLoading === paymentSource.id}
                    >
                      {actionLoading === paymentSource.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Predeterminado'
                      )}
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(paymentSource.id)}
                    disabled={actionLoading === paymentSource.id}
                    className="text-red-600 hover:text-red-700"
                  >
                    {actionLoading === paymentSource.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}






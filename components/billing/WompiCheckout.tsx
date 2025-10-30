// components/billing/WompiCheckout.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CreditCard } from 'lucide-react';

interface CheckoutData {
  checkout_url: string;
  checkout_data: Record<string, string>;
  plan: {
    id: string;
    name: string;
    description: string;
    amount_in_cents: number;
    features: string[];
  };
}

interface WompiCheckoutProps {
  planId: string;
  workspaceId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function WompiCheckout({ planId, workspaceId, onSuccess, onError }: WompiCheckoutProps) {
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    generateCheckoutData();
  }, [planId, workspaceId]);

  const generateCheckoutData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan_id: planId,
          workspace_id: workspaceId,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error generating checkout data');
      }

      setCheckoutData(result.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckout = () => {
    if (!checkoutData) return;

    // Create form and submit to Wompi
    const form = document.createElement('form');
    form.method = 'GET';
    form.action = checkoutData.checkout_url;
    form.target = '_blank';

    // Add all checkout data as hidden inputs
    Object.entries(checkoutData.checkout_data).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);

    onSuccess?.();
  };

  if (isLoading) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
          <p className="text-gray-600">Preparando checkout...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="py-8">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <CreditCard className="w-12 h-12 mx-auto mb-2" />
              <h3 className="text-lg font-semibold">Error</h3>
            </div>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={generateCheckoutData} variant="outline">
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!checkoutData) {
    return null;
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <CreditCard className="w-6 h-6" />
          Confirmar Pago
        </CardTitle>
        <CardDescription>
          Serás redirigido a Wompi para completar el pago
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">{checkoutData.plan.name}</h4>
          <p className="text-sm text-gray-600 mb-2">{checkoutData.plan.description}</p>
          <div className="text-lg font-bold text-green-600">
            {new Intl.NumberFormat('es-CO', {
              style: 'currency',
              currency: 'COP',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(checkoutData.plan.amount_in_cents / 100)}
          </div>
        </div>

        <div className="text-xs text-gray-500 text-center">
          Al hacer clic en "Pagar con Wompi", serás redirigido a una página segura para completar tu pago.
        </div>

        <Button 
          onClick={handleCheckout}
          className="w-full bg-blue-600 hover:bg-blue-700"
          size="lg"
        >
          Pagar con Wompi
        </Button>
      </CardContent>
    </Card>
  );
}






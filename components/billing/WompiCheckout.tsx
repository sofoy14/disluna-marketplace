// components/billing/WompiCheckout.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CreditCard, Smartphone } from 'lucide-react';

interface CheckoutData {
  public_key: string;
  currency: string;
  amount_in_cents: number;
  reference: string;
  signature: string;
  redirect_url: string;
  customer_data: {
    email: string;
    full_name: string;
  };
  plan: {
    id: string;
    name: string;
    description: string;
    original_amount: number;
    special_offer: boolean;
  };
  invoice_id: string;
}

interface WompiCheckoutProps {
  planId: string;
  customerEmail: string;
  customerName: string;
  specialOffer?: boolean;
  onSuccess?: (checkoutData: CheckoutData) => void;
}

export function WompiCheckout({ 
  planId, 
  customerEmail, 
  customerName, 
  specialOffer = false,
  onSuccess 
}: WompiCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreateCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan_id: planId,
          customer_email: customerEmail,
          customer_name: customerName,
          special_offer: specialOffer
        })
      });

      if (!response.ok) {
        throw new Error('Error creating checkout');
      }

      const data = await response.json();
      setCheckoutData(data.checkout_data);
      
      if (onSuccess) {
        onSuccess(data.checkout_data);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = () => {
    if (!checkoutData) return;

    // Crear formulario para Web Checkout de Wompi
    const form = document.createElement('form');
    form.action = 'https://checkout.wompi.co/p/';
    form.method = 'GET';
    form.style.display = 'none';

    // Parámetros obligatorios
    const params = {
      'public-key': checkoutData.public_key,
      'currency': checkoutData.currency,
      'amount-in-cents': checkoutData.amount_in_cents.toString(),
      'reference': checkoutData.reference,
      'signature:integrity': checkoutData.signature,
      'redirect-url': checkoutData.redirect_url,
      'customer-data:email': checkoutData.customer_data.email,
      'customer-data:full-name': checkoutData.customer_data.full_name
    };

    // Agregar campos ocultos
    Object.entries(params).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });

    // Agregar formulario al DOM y enviarlo
    document.body.appendChild(form);
    form.submit();
  };

  if (checkoutData) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center">
            Confirmar Pago
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold">{checkoutData.plan.name}</h3>
            <p className="text-sm text-gray-600">{checkoutData.plan.description}</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Precio original:</span>
              <span className="text-sm line-through">
                ${(checkoutData.plan.original_amount / 1000).toLocaleString()} COP
              </span>
            </div>
            
            {checkoutData.plan.special_offer && (
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-green-600">Descuento especial:</span>
                <span className="text-sm text-green-600">
                  -${((checkoutData.plan.original_amount - checkoutData.amount_in_cents) / 1000).toLocaleString()} COP
                </span>
              </div>
            )}
            
            <div className="flex justify-between items-center font-semibold">
              <span>Total a pagar:</span>
              <span className="text-lg text-green-600">
                ${(checkoutData.amount_in_cents / 1000).toLocaleString()} COP
              </span>
            </div>
          </div>

          <div className="text-center text-sm text-gray-600">
            <p>Serás redirigido a Wompi para completar el pago de forma segura</p>
          </div>

          <Button 
            onClick={handlePayment}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            size="lg"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Pagar con Wompi
          </Button>

          <div className="text-center text-xs text-gray-500">
            <p>Pago procesado por Wompi • 100% seguro</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">
          {specialOffer ? 'Oferta Especial' : 'Seleccionar Plan'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {specialOffer && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <h3 className="text-lg font-semibold text-green-800">
              ¡Primer mes por solo $1 USD!
            </h3>
            <p className="text-sm text-green-600">
              Después del primer mes, el precio regular se aplicará automáticamente
            </p>
          </div>
        )}

        <div className="text-center">
          <p className="text-sm text-gray-600 mb-4">
            Haz clic en el botón para generar tu enlace de pago seguro
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <Button 
          onClick={handleCreateCheckout}
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generando enlace de pago...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Generar Enlace de Pago
            </>
          )}
        </Button>

        <div className="text-center text-xs text-gray-500">
          <p>Pago seguro procesado por Wompi</p>
        </div>
      </CardContent>
    </Card>
  );
}






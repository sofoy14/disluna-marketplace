// app/[locale]/payment/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Smartphone, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

interface Plan {
  id: string;
  name: string;
  description: string;
  amount_in_cents: number;
  currency: string;
  features: string[];
}

interface SpecialOffer {
  id: string;
  name: string;
  discount_value: number;
  plan_id: string;
}

const cardSchema = z.object({
  number: z.string().min(16, 'Número de tarjeta inválido'),
  exp_month: z.string().min(2, 'Mes inválido'),
  exp_year: z.string().min(2, 'Año inválido'),
  cvc: z.string().min(3, 'CVC inválido'),
  card_holder: z.string().min(5, 'Nombre del titular requerido'),
});

const nequiSchema = z.object({
  phone_number: z.string().min(10, 'Número de teléfono inválido'),
});

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get('plan_id');
  
  const [plan, setPlan] = useState<Plan | null>(null);
  const [specialOffer, setSpecialOffer] = useState<SpecialOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [acceptanceToken, setAcceptanceToken] = useState<string>('');
  const [acceptPersonalAuth, setAcceptPersonalAuth] = useState<string>('');

  const cardForm = useForm<z.infer<typeof cardSchema>>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      number: '',
      exp_month: '',
      exp_year: '',
      cvc: '',
      card_holder: '',
    },
  });

  const nequiForm = useForm<z.infer<typeof nequiSchema>>({
    resolver: zodResolver(nequiSchema),
    defaultValues: {
      phone_number: '',
    },
  });

  useEffect(() => {
    if (planId) {
      fetchPlanAndOffer();
      fetchAcceptanceTokens();
    }
  }, [planId]);

  const fetchPlanAndOffer = async () => {
    try {
      // Obtener plan
      const planResponse = await fetch('/api/billing/plans');
      const planData = await planResponse.json();
      const selectedPlan = planData.plans.find((p: Plan) => p.id === planId);
      setPlan(selectedPlan);

      // Obtener oferta especial
      const offerResponse = await fetch('/api/billing/special-offers');
      const offerData = await offerResponse.json();
      const activeOffer = offerData.offers?.find((o: SpecialOffer) => o.plan_id === planId);
      setSpecialOffer(activeOffer);

    } catch (error) {
      console.error('Error fetching plan and offer:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAcceptanceTokens = async () => {
    try {
      const response = await fetch('/api/billing/acceptance-token');
      const data = await response.json();
      setAcceptanceToken(data.acceptance_token);
      setAcceptPersonalAuth(data.accept_personal_auth);
    } catch (error) {
      console.error('Error fetching acceptance tokens:', error);
    }
  };

  const handleCardPayment = async (data: z.infer<typeof cardSchema>) => {
    setProcessing(true);
    
    try {
      // 1. Tokenizar tarjeta
      const tokenResponse = await fetch('https://sandbox.wompi.co/v1/tokens/cards', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: data.number.replace(/\s/g, ''),
          exp_month: data.exp_month,
          exp_year: data.exp_year,
          cvc: data.cvc,
          card_holder: data.card_holder,
        }),
      });

      const tokenData = await tokenResponse.json();
      
      if (tokenData.status !== 'CREATED') {
        throw new Error('Error tokenizando tarjeta');
      }

      // 2. Crear payment source
      const paymentSourceResponse = await fetch('/api/billing/payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: tokenData.data.id,
          type: 'CARD',
          customer_email: 'usuario@example.com', // Obtener del usuario autenticado
          acceptance_token: acceptanceToken,
          accept_personal_auth: acceptPersonalAuth,
        }),
      });

      const paymentSourceData = await paymentSourceResponse.json();
      
      if (!paymentSourceResponse.ok) {
        throw new Error(paymentSourceData.error || 'Error creando payment source');
      }

      // 3. Crear suscripción
      await createSubscription(paymentSourceData.payment_source.id);

    } catch (error) {
      console.error('Error processing card payment:', error);
      alert('Error procesando el pago: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleNequiPayment = async (data: z.infer<typeof nequiSchema>) => {
    setProcessing(true);
    
    try {
      // 1. Tokenizar Nequi
      const tokenResponse = await fetch('https://sandbox.wompi.co/v1/tokens/nequi', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: data.phone_number,
        }),
      });

      const tokenData = await tokenResponse.json();
      
      if (!tokenData.data || tokenData.data.status !== 'PENDING') {
        throw new Error('Error tokenizando Nequi');
      }

      // 2. Crear payment source
      const paymentSourceResponse = await fetch('/api/billing/payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: tokenData.data.id,
          type: 'NEQUI',
          customer_email: 'usuario@example.com', // Obtener del usuario autenticado
          acceptance_token: acceptanceToken,
          accept_personal_auth: acceptPersonalAuth,
        }),
      });

      const paymentSourceData = await paymentSourceResponse.json();
      
      if (!paymentSourceResponse.ok) {
        throw new Error(paymentSourceData.error || 'Error creando payment source');
      }

      // 3. Crear suscripción
      await createSubscription(paymentSourceData.payment_source.id);

    } catch (error) {
      console.error('Error processing Nequi payment:', error);
      alert('Error procesando el pago: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const createSubscription = async (paymentSourceId: string) => {
    try {
      const subscriptionResponse = await fetch('/api/billing/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan_id: planId,
          payment_source_id: paymentSourceId,
          special_offer: !!specialOffer,
        }),
      });

      const subscriptionData = await subscriptionResponse.json();
      
      if (!subscriptionResponse.ok) {
        throw new Error(subscriptionData.error || 'Error creando suscripción');
      }

      // Redirigir al dashboard
      router.push('/dashboard?subscription=success');

    } catch (error) {
      console.error('Error creating subscription:', error);
      alert('Error creando suscripción: ' + error.message);
    }
  };

  const calculatePrice = () => {
    if (!plan) return 0;
    
    if (specialOffer) {
      return Math.max(100, plan.amount_in_cents - specialOffer.discount_value);
    }
    
    return plan.amount_in_cents;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando información de pago...</p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Plan no encontrado</h1>
          <Button onClick={() => router.push('/select-plan')}>
            Volver a seleccionar plan
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Button 
            variant="outline" 
            onClick={() => router.push('/select-plan')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a seleccionar plan
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Completar Pago
          </h1>
          <p className="text-gray-600">
            Configura tu método de pago para activar tu suscripción
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Resumen del Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Resumen del Plan</span>
                {specialOffer && (
                  <Badge className="bg-green-100 text-green-800">
                    Oferta Especial
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                  <p className="text-gray-600">{plan.description}</p>
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span>Precio original:</span>
                    <span className="line-through text-gray-500">
                      ${(plan.amount_in_cents / 1000).toLocaleString()} COP
                    </span>
                  </div>
                  
                  {specialOffer && (
                    <div className="flex justify-between items-center text-green-600">
                      <span>Descuento especial:</span>
                      <span>
                        -${(specialOffer.discount_value / 1000).toLocaleString()} COP
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center font-bold text-lg border-t pt-2">
                    <span>Total a pagar:</span>
                    <span className="text-green-600">
                      ${(calculatePrice() / 1000).toLocaleString()} COP
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Métodos de Pago */}
          <Card>
            <CardHeader>
              <CardTitle>Método de Pago</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="card" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="card" className="flex items-center">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Tarjeta
                  </TabsTrigger>
                  <TabsTrigger value="nequi" className="flex items-center">
                    <Smartphone className="w-4 h-4 mr-2" />
                    Nequi
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="card">
                  <form onSubmit={cardForm.handleSubmit(handleCardPayment)} className="space-y-4">
                    <div>
                      <Label htmlFor="number">Número de Tarjeta</Label>
                      <Input
                        id="number"
                        placeholder="4242424242424242"
                        {...cardForm.register('number')}
                      />
                      {cardForm.formState.errors.number && (
                        <p className="text-red-500 text-sm mt-1">
                          {cardForm.formState.errors.number.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="exp_month">Mes</Label>
                        <Input
                          id="exp_month"
                          placeholder="12"
                          {...cardForm.register('exp_month')}
                        />
                      </div>
                      <div>
                        <Label htmlFor="exp_year">Año</Label>
                        <Input
                          id="exp_year"
                          placeholder="28"
                          {...cardForm.register('exp_year')}
                        />
                      </div>
                      <div>
                        <Label htmlFor="cvc">CVC</Label>
                        <Input
                          id="cvc"
                          placeholder="123"
                          {...cardForm.register('cvc')}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="card_holder">Nombre del Titular</Label>
                      <Input
                        id="card_holder"
                        placeholder="Juan Pérez"
                        {...cardForm.register('card_holder')}
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={processing}
                    >
                      {processing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        'Pagar con Tarjeta'
                      )}
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="nequi">
                  <form onSubmit={nequiForm.handleSubmit(handleNequiPayment)} className="space-y-4">
                    <div>
                      <Label htmlFor="phone_number">Número de Teléfono Nequi</Label>
                      <Input
                        id="phone_number"
                        placeholder="3001234567"
                        {...nequiForm.register('phone_number')}
                      />
                      {nequiForm.formState.errors.phone_number && (
                        <p className="text-red-500 text-sm mt-1">
                          {nequiForm.formState.errors.phone_number.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Importante:</strong> Después de ingresar tu número, 
                        recibirás una notificación en tu app Nequi para aprobar el pago.
                      </p>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={processing}
                    >
                      {processing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        'Pagar con Nequi'
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}






// app/[locale]/billing/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser-client';

interface Plan {
  id: string;
  name: string;
  description: string;
  amount_in_cents: number;
  currency: string;
  interval: string;
  features: string[];
}

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      // Obtener usuario actual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        router.push('/login');
        return;
      }

      // Obtener workspace del usuario
      const { data: workspaces, error: workspaceError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_home', true)
        .single();

      if (workspaceError || !workspaces) {
        console.error('Error fetching workspace:', workspaceError);
        return;
      }

      setWorkspaceId(workspaces.id);

      // Fetch plans
      const plansResponse = await fetch('/api/billing/plans');
      if (plansResponse.ok) {
        const plansData = await plansResponse.json();
        setPlans(plansData.data || []);
      }

      // Fetch current subscription
      const subscriptionResponse = await fetch(`/api/billing/subscriptions?workspace_id=${workspaces.id}`);
      if (subscriptionResponse.ok) {
        const subscriptionData = await subscriptionResponse.json();
        setCurrentSubscription(subscriptionData.data);
      }
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (amountInCents: number, currency: string) => {
    const amount = amountInCents / 100;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency === 'COP' ? 'COP' : 'USD'
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Activa</Badge>;
      case 'past_due':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Vencida</Badge>;
      case 'canceled':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Facturación</h1>
          <p className="mt-2 text-gray-600">
            Gestiona tu suscripción y métodos de pago
          </p>
        </div>

        {/* Estado actual de la suscripción */}
        {currentSubscription ? (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Suscripción Actual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{currentSubscription.plan?.name || 'Plan Básico'}</h3>
                  <p className="text-gray-600">{currentSubscription.plan?.description || 'Plan gratuito'}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Próximo cobro: {currentSubscription.current_period_end ? 
                      new Date(currentSubscription.current_period_end).toLocaleDateString('es-CO') : 
                      'No programado'
                    }
                  </p>
                </div>
                <div className="text-right">
                  {getStatusBadge(currentSubscription.status)}
                  <p className="text-lg font-semibold mt-2">
                    {currentSubscription.plan?.amount_in_cents ? 
                      formatPrice(currentSubscription.plan.amount_in_cents, currentSubscription.plan.currency) : 
                      'Gratuito'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Sin Suscripción Activa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Actualmente estás usando el plan gratuito. Selecciona un plan para acceder a más funciones.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Planes disponibles */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Planes Disponibles</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className={`relative ${currentSubscription?.plan_id === plan.id ? 'ring-2 ring-blue-500' : ''}`}>
                {currentSubscription?.plan_id === plan.id && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-500 text-white">Plan Actual</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="text-3xl font-bold text-gray-900">
                    {formatPrice(plan.amount_in_cents, plan.currency)}
                    <span className="text-sm font-normal text-gray-500">/{plan.interval}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full" 
                    variant={currentSubscription?.plan_id === plan.id ? "outline" : "default"}
                    disabled={currentSubscription?.plan_id === plan.id}
                    onClick={async () => {
                      if (currentSubscription?.plan_id !== plan.id && workspaceId) {
                        try {
                          // Iniciar proceso de checkout con Wompi
                          const response = await fetch('/api/billing/checkout', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              plan_id: plan.id,
                              workspace_id: workspaceId
                            })
                          });

                          if (response.ok) {
                            const checkoutData = await response.json();
                            
                            // Crear formulario para redirigir a Wompi
                            const form = document.createElement('form');
                            form.method = 'GET'; // Wompi Web Checkout usa GET
                            form.action = checkoutData.checkout_url;
                            
                            // Agregar campos hidden
                            Object.entries(checkoutData.form_data).forEach(([key, value]) => {
                              const input = document.createElement('input');
                              input.type = 'hidden';
                              input.name = key;
                              input.value = value as string;
                              form.appendChild(input);
                            });
                            
                            document.body.appendChild(form);
                            form.submit();
                          } else {
                            const error = await response.json();
                            alert(`Error al iniciar el checkout: ${error.message || 'Error desconocido'}`);
                          }
                        } catch (error) {
                          console.error('Error en checkout:', error);
                          alert('Error al procesar el pago. Inténtalo de nuevo.');
                        }
                      }
                    }}
                  >
                    {currentSubscription?.plan_id === plan.id ? 'Plan Actual' : 'Suscribirse'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Información sobre métodos de pago */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <CreditCard className="h-5 w-5" />
              Métodos de Pago Aceptados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-blue-700">
              Aceptamos tarjetas de crédito y débito, PSE, Nequi y otros métodos de pago seguros a través de Wompi.
              Todos los pagos son procesados de forma segura y encriptada.
            </p>
          </CardContent>
        </Card>

        {/* Botón para volver al chat */}
        <div className="mt-8 text-center">
          <Button 
            onClick={() => router.back()}
            variant="outline"
          >
            Volver al Chat
          </Button>
        </div>
      </div>
    </div>
  );
}
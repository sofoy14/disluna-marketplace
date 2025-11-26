// app/[locale]/billing/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Crown,
  Loader2,
  ArrowLeft,
  Sparkles,
  Star,
  Zap
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser-client';

interface Plan {
  id: string;
  name: string;
  description: string;
  amount_in_cents: number;
  currency: string;
  billing_period: 'monthly' | 'yearly';
  features: string[];
  query_limit: number;
  sort_order: number;
  first_month_price?: number;
  has_first_month_promo?: boolean;
}

interface Subscription {
  id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  plan_id: string;
  plans?: {
    name: string;
    description: string;
    amount_in_cents: number;
    billing_period: string;
  };
}

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [alert, setAlert] = useState<string | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    // Leer alerta de URL
    const alertParam = searchParams.get('alert');
    if (alertParam) {
      setAlert(alertParam);
    }
    
    fetchBillingData();
  }, [searchParams]);

  const fetchBillingData = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        router.push('/login');
        return;
      }

      // Obtener workspace
      const { data: workspaces } = await supabase
        .from('workspaces')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_home', true)
        .single();

      if (workspaces) {
        setWorkspaceId(workspaces.id);
      }

      // Obtener planes
      const plansResponse = await fetch('/api/billing/plans');
      if (plansResponse.ok) {
        const plansData = await plansResponse.json();
        if (plansData.success) {
          setPlans(plansData.data);
        }
      }

      // Obtener suscripción actual
      if (workspaces?.id) {
        const subscriptionResponse = await fetch(`/api/billing/subscriptions?workspace_id=${workspaces.id}`);
        if (subscriptionResponse.ok) {
          const subscriptionData = await subscriptionResponse.json();
          if (subscriptionData.success && subscriptionData.data) {
            setCurrentSubscription(subscriptionData.data);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (amountInCents: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amountInCents / 100);
  };

  const handleSubscribe = async (planId: string) => {
    if (!workspaceId) {
      alert('Error: No se encontró el workspace');
      return;
    }

    setProcessingPlanId(planId);

    try {
      const response = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: planId,
          workspace_id: workspaceId
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Error al iniciar suscripción');
      }

      // Crear formulario y redirigir a Wompi
      const form = document.createElement('form');
      form.method = 'GET';
      form.action = result.data.checkout_url;

      Object.entries(result.data.checkout_data).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value as string;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();

    } catch (error) {
      console.error('Error initiating subscription:', error);
      alert(error instanceof Error ? error.message : 'Error al procesar el pago');
    } finally {
      setProcessingPlanId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Activa</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Prueba</Badge>;
      case 'past_due':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertCircle className="w-3 h-3 mr-1" />Pago pendiente</Badge>;
      case 'canceled':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getAlertMessage = () => {
    switch (alert) {
      case 'subscription_required':
        return { type: 'warning', message: 'Necesitas una suscripción activa para acceder al chatbot' };
      case 'subscription_expired':
        return { type: 'error', message: 'Tu suscripción ha expirado. Renueva para continuar usando el servicio' };
      case 'payment_required':
        return { type: 'warning', message: 'Tienes un pago pendiente. Por favor actualiza tu método de pago' };
      default:
        return null;
    }
  };

  const alertInfo = getAlertMessage();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Cargando planes...</p>
        </div>
      </div>
    );
  }

  // Separar planes por período
  const monthlyPlan = plans.find(p => p.billing_period === 'monthly');
  const yearlyPlan = plans.find(p => p.billing_period === 'yearly');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Oferta de lanzamiento
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Elige tu Plan
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Accede a tu asistente legal inteligente con IA avanzada
          </p>
        </div>

        {/* Alert */}
        {alertInfo && (
          <div className={`mb-8 p-4 rounded-xl ${
            alertInfo.type === 'error' 
              ? 'bg-red-50 border border-red-200 text-red-800' 
              : 'bg-amber-50 border border-amber-200 text-amber-800'
          }`}>
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">{alertInfo.message}</span>
            </div>
          </div>
        )}

        {/* Suscripción actual */}
        {currentSubscription && currentSubscription.status === 'active' && (
          <Card className="mb-10 border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <Crown className="h-6 w-6" />
                Tu Suscripción Actual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">{currentSubscription.plans?.name || 'Plan'}</h3>
                  <p className="text-slate-600">{currentSubscription.plans?.description}</p>
                  <p className="text-sm text-slate-500 mt-2">
                    Válido hasta: {new Date(currentSubscription.current_period_end).toLocaleDateString('es-CO', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div className="text-right">
                  {getStatusBadge(currentSubscription.status)}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Planes */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Plan Mensual */}
          {monthlyPlan && (
            <Card className="relative border-2 border-indigo-300 shadow-xl hover:shadow-2xl transition-all duration-300 bg-white overflow-hidden">
              {/* Badge destacado */}
              <div className="absolute -top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <Badge className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-1.5 text-sm shadow-lg">
                  <Star className="w-4 h-4 mr-1 fill-current" />
                  Más Popular
                </Badge>
              </div>

              <CardHeader className="text-center pt-10 pb-4">
                <CardTitle className="text-2xl font-bold text-slate-900">
                  {monthlyPlan.name}
                </CardTitle>
                <CardDescription className="text-slate-600">
                  {monthlyPlan.description}
                </CardDescription>

                {/* Precio */}
                <div className="mt-6 space-y-2">
                  {monthlyPlan.has_first_month_promo && (
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-lg text-slate-400 line-through">
                        ${formatPrice(monthlyPlan.amount_in_cents)}
                      </span>
                      <Badge className="bg-green-100 text-green-700 font-semibold">
                        Primer mes
                      </Badge>
                    </div>
                  )}
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-extrabold text-slate-900">
                      ${formatPrice(monthlyPlan.first_month_price || monthlyPlan.amount_in_cents)}
                    </span>
                    <span className="text-lg text-slate-500">COP</span>
                  </div>
                  <p className="text-sm text-slate-500">
                    Luego ${formatPrice(monthlyPlan.amount_in_cents)}/mes
                  </p>
                </div>
              </CardHeader>

              <CardContent className="pt-2">
                <ul className="space-y-3 mb-8">
                  {monthlyPlan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSubscribe(monthlyPlan.id)}
                  disabled={currentSubscription?.plan_id === monthlyPlan.id || processingPlanId !== null}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-200"
                  size="lg"
                >
                  {processingPlanId === monthlyPlan.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : currentSubscription?.plan_id === monthlyPlan.id ? (
                    'Plan Actual'
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Comenzar por $4.000
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Plan Anual */}
          {yearlyPlan && (
            <Card className="relative border-2 border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 bg-white overflow-hidden">
              {/* Badge de ahorro */}
              <div className="absolute -top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <Badge className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-1.5 text-sm shadow-lg">
                  💰 Ahorra 10%
                </Badge>
              </div>

              <CardHeader className="text-center pt-10 pb-4">
                <CardTitle className="text-2xl font-bold text-slate-900">
                  {yearlyPlan.name}
                </CardTitle>
                <CardDescription className="text-slate-600">
                  {yearlyPlan.description}
                </CardDescription>

                {/* Precio */}
                <div className="mt-6 space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg text-slate-400 line-through">
                      ${formatPrice(5800000 * 12)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-extrabold text-slate-900">
                      ${formatPrice(yearlyPlan.amount_in_cents)}
                    </span>
                    <span className="text-lg text-slate-500">COP</span>
                  </div>
                  <p className="text-sm text-green-600 font-medium">
                    Equivale a ${formatPrice(Math.round(yearlyPlan.amount_in_cents / 12))}/mes
                  </p>
                </div>
              </CardHeader>

              <CardContent className="pt-2">
                <ul className="space-y-3 mb-8">
                  {yearlyPlan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSubscribe(yearlyPlan.id)}
                  disabled={currentSubscription?.plan_id === yearlyPlan.id || processingPlanId !== null}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                  size="lg"
                >
                  {processingPlanId === yearlyPlan.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : currentSubscription?.plan_id === yearlyPlan.id ? (
                    'Plan Actual'
                  ) : (
                    'Suscribirse Anualmente'
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Info de seguridad */}
        <div className="mt-12 text-center">
          <div className="inline-flex flex-wrap justify-center gap-6 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Pago seguro con Wompi
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Cancela cuando quieras
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Sin compromisos
            </div>
          </div>
        </div>

        {/* Botón volver */}
        <div className="mt-10 text-center">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>
    </div>
  );
}

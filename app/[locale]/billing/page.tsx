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
  Zap,
  X,
  MessageSquare,
  FolderOpen,
  Mic,
  Building2,
  TrendingUp
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser-client';
import { motion } from 'framer-motion';

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
  plan_type?: 'basic' | 'pro' | 'enterprise';
  max_output_tokens_monthly?: number;
  max_processes?: number;
  max_transcription_hours?: number;
  has_multiple_workspaces?: boolean;
  has_processes?: boolean;
  has_transcriptions?: boolean;
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
    plan_type?: string;
  };
}

interface UsageData {
  tokens_used: number;
  tokens_limit: number;
  processes_used: number;
  processes_limit: number;
  transcription_seconds_used: number;
  transcription_limit: number;
}

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [alert, setAlert] = useState<string | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
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

        // Obtener uso actual
        try {
          const usageResponse = await fetch(`/api/billing/usage?workspace_id=${workspaces.id}`);
          if (usageResponse.ok) {
            const usageResult = await usageResponse.json();
            if (usageResult.success) {
              setUsageData(usageResult.data);
            }
          }
        } catch (e) {
          console.log('Usage data not available');
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

  // Filter plans to show basic and pro
  const basicPlan = plans.find(p => p.plan_type === 'basic') || {
    id: 'basic',
    name: 'Plan Básico',
    description: 'Ideal para abogados que buscan asistencia IA',
    amount_in_cents: 2900000,
    currency: 'COP',
    billing_period: 'monthly' as const,
    plan_type: 'basic' as const,
    max_output_tokens_monthly: 2000000,
    max_processes: 0,
    max_transcription_hours: 0,
    has_multiple_workspaces: false,
    has_processes: false,
    has_transcriptions: false,
    features: [],
    query_limit: 0,
    sort_order: 1
  };

  const proPlan = plans.find(p => p.plan_type === 'pro') || {
    id: 'pro',
    name: 'Plan PRO',
    description: 'La solución completa para profesionales del derecho',
    amount_in_cents: 6800000,
    currency: 'COP',
    billing_period: 'monthly' as const,
    plan_type: 'pro' as const,
    max_output_tokens_monthly: -1,
    max_processes: 7,
    max_transcription_hours: 5,
    has_multiple_workspaces: true,
    has_processes: true,
    has_transcriptions: true,
    features: [],
    query_limit: 0,
    sort_order: 2
  };

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

  const currentPlanType = currentSubscription?.plans?.plan_type;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Gestiona tu suscripción
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Facturación y Planes
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Administra tu suscripción y consulta tu uso
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

        {/* Suscripción actual y uso */}
        {currentSubscription && currentSubscription.status === 'active' && (
          <div className="mb-10 space-y-6">
            <Card className="border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg">
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

            {/* Usage Stats */}
            {usageData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-indigo-600" />
                    Tu uso este mes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Tokens */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Tokens de chat</span>
                        <span className="font-medium">
                          {usageData.tokens_limit === -1 
                            ? `${(usageData.tokens_used / 1000000).toFixed(2)}M usados`
                            : `${(usageData.tokens_used / 1000000).toFixed(2)}M / ${(usageData.tokens_limit / 1000000).toFixed(0)}M`
                          }
                        </span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            usageData.tokens_limit === -1 
                              ? 'bg-gradient-to-r from-purple-500 to-purple-600 w-1/4'
                              : usageData.tokens_used / usageData.tokens_limit > 0.9 
                                ? 'bg-red-500'
                                : 'bg-gradient-to-r from-blue-500 to-blue-600'
                          }`}
                          style={{ 
                            width: usageData.tokens_limit === -1 
                              ? '25%' 
                              : `${Math.min((usageData.tokens_used / usageData.tokens_limit) * 100, 100)}%` 
                          }}
                        />
                      </div>
                      {usageData.tokens_limit === -1 && (
                        <p className="text-xs text-purple-600">Ilimitado</p>
                      )}
                    </div>

                    {/* Procesos */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Procesos</span>
                        <span className="font-medium">
                          {usageData.processes_limit === 0 
                            ? 'No disponible'
                            : `${usageData.processes_used} / ${usageData.processes_limit}`
                          }
                        </span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            usageData.processes_limit === 0 
                              ? 'bg-slate-300 w-0'
                              : 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                          }`}
                          style={{ 
                            width: usageData.processes_limit === 0 
                              ? '0%' 
                              : `${Math.min((usageData.processes_used / usageData.processes_limit) * 100, 100)}%` 
                          }}
                        />
                      </div>
                    </div>

                    {/* Transcripción */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Transcripción</span>
                        <span className="font-medium">
                          {usageData.transcription_limit === 0 
                            ? 'No disponible'
                            : `${(usageData.transcription_seconds_used / 3600).toFixed(1)}h / ${usageData.transcription_limit}h`
                          }
                        </span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            usageData.transcription_limit === 0 
                              ? 'bg-slate-300 w-0'
                              : 'bg-gradient-to-r from-pink-500 to-pink-600'
                          }`}
                          style={{ 
                            width: usageData.transcription_limit === 0 
                              ? '0%' 
                              : `${Math.min((usageData.transcription_seconds_used / (usageData.transcription_limit * 3600)) * 100, 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Planes */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">
            {currentSubscription ? 'Cambiar de Plan' : 'Elige tu Plan'}
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Plan Básico */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
            >
              <Card className={`relative h-full border-2 shadow-lg bg-white overflow-hidden ${
                currentPlanType === 'basic' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-blue-200'
              }`}>
                {currentPlanType === 'basic' && (
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-blue-600 text-white">Plan Actual</Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pt-8 pb-4">
                  <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl">{basicPlan.name}</CardTitle>
                  <CardDescription className="text-slate-600">{basicPlan.description}</CardDescription>
                  
                  <div className="mt-4">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold text-slate-900">
                        ${formatPrice(basicPlan.amount_in_cents)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">COP / mes</p>
                  </div>
                </CardHeader>

                {/* Highlights */}
                <div className="mx-6 mb-4 p-3 rounded-xl bg-slate-50 grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="text-[10px] uppercase text-slate-500">Chat IA</p>
                      <p className="text-xs font-semibold">2M tokens</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-[10px] uppercase text-slate-500">Workspace</p>
                      <p className="text-xs font-semibold">1</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-slate-300" />
                    <div>
                      <p className="text-[10px] uppercase text-slate-500">Procesos</p>
                      <p className="text-xs font-semibold text-slate-400">—</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-slate-300" />
                    <div>
                      <p className="text-[10px] uppercase text-slate-500">Transcripción</p>
                      <p className="text-xs font-semibold text-slate-400">—</p>
                    </div>
                  </div>
                </div>

                <CardContent className="pt-0">
                  <ul className="space-y-2 mb-6 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-600">Chat con asistente legal IA</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-600">Hasta 2 millones de tokens/mes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-600">Análisis de normativa colombiana</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <X className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-400 line-through">Procesos legales</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <X className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-400 line-through">Transcripción de audio</span>
                    </li>
                  </ul>

                  <Button
                    onClick={() => handleSubscribe(basicPlan.id)}
                    disabled={currentPlanType === 'basic' || processingPlanId !== null}
                    variant="outline"
                    className="w-full border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
                    size="lg"
                  >
                    {processingPlanId === basicPlan.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Procesando...
                      </>
                    ) : currentPlanType === 'basic' ? (
                      'Plan Actual'
                    ) : currentPlanType === 'pro' ? (
                      'Cambiar a Básico'
                    ) : (
                      'Elegir Plan Básico'
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Plan PRO */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className={`relative h-full border-2 shadow-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white overflow-hidden ${
                currentPlanType === 'pro' ? 'border-purple-500 ring-2 ring-purple-300' : 'border-purple-400'
              }`}>
                {/* Background effects */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl" />
                
                {/* Badges */}
                {currentPlanType === 'pro' ? (
                  <div className="absolute top-3 right-3 z-10">
                    <Badge className="bg-purple-600 text-white">Plan Actual</Badge>
                  </div>
                ) : (
                  <div className="absolute -top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                    <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-4 py-1.5 shadow-lg border-0">
                      <Star className="w-3.5 h-3.5 mr-1 fill-current" />
                      Recomendado
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pt-10 pb-4 relative z-10">
                  <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-700">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl text-white">{proPlan.name}</CardTitle>
                  <CardDescription className="text-slate-300">{proPlan.description}</CardDescription>
                  
                  <div className="mt-4">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold text-white">
                        ${formatPrice(proPlan.amount_in_cents)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400">COP / mes</p>
                  </div>
                </CardHeader>

                {/* Highlights */}
                <div className="mx-6 mb-4 p-3 rounded-xl bg-white/5 grid grid-cols-2 gap-2 relative z-10">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-purple-400" />
                    <div>
                      <p className="text-[10px] uppercase text-slate-500">Chat IA</p>
                      <p className="text-xs font-semibold text-white">Ilimitado</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-amber-400" />
                    <div>
                      <p className="text-[10px] uppercase text-slate-500">Workspaces</p>
                      <p className="text-xs font-semibold text-white">∞</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-emerald-400" />
                    <div>
                      <p className="text-[10px] uppercase text-slate-500">Procesos</p>
                      <p className="text-xs font-semibold text-white">7</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-pink-400" />
                    <div>
                      <p className="text-[10px] uppercase text-slate-500">Transcripción</p>
                      <p className="text-xs font-semibold text-white">5 horas</p>
                    </div>
                  </div>
                </div>

                <CardContent className="pt-0 relative z-10">
                  <ul className="space-y-2 mb-6 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-300">Chat IA ilimitado</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-300">Múltiples workspaces</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-300">7 procesos legales incluidos</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-300">5 horas de transcripción</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-300">Soporte prioritario 24/7</span>
                    </li>
                  </ul>

                  <Button
                    onClick={() => handleSubscribe(proPlan.id)}
                    disabled={currentPlanType === 'pro' || processingPlanId !== null}
                    className="w-full bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 text-white shadow-lg"
                    size="lg"
                  >
                    {processingPlanId === proPlan.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Procesando...
                      </>
                    ) : currentPlanType === 'pro' ? (
                      'Plan Actual'
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        {currentPlanType === 'basic' ? 'Actualizar a PRO' : 'Elegir Plan PRO'}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
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

// app/[locale]/billing/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  TrendingUp,
  GraduationCap,
  Briefcase,
  Percent,
  Gift
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

interface SpecialOffer {
  id: string;
  name: string;
  discount_value: number;
  discount_type: string;
  plan_id: string;
}

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [specialOffers, setSpecialOffers] = useState<SpecialOffer[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [alert, setAlert] = useState<string | null>(null);
  const [isYearly, setIsYearly] = useState(false);
  
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

      // Get workspace
      const { data: workspaces } = await supabase
        .from('workspaces')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_home', true)
        .single();

      if (workspaces) {
        setWorkspaceId(workspaces.id);
      }

      // Fetch plans
      const plansResponse = await fetch('/api/billing/plans');
      if (plansResponse.ok) {
        const plansData = await plansResponse.json();
        if (plansData.success) {
          setPlans(plansData.data);
        }
      }

      // Fetch special offers
      const offersResponse = await fetch('/api/billing/offers');
      if (offersResponse.ok) {
        const offersData = await offersResponse.json();
        if (offersData.success) {
          setSpecialOffers(offersData.data || []);
        }
      }

      // Get current subscription
      if (workspaces?.id) {
        const subscriptionResponse = await fetch(`/api/billing/subscriptions?workspace_id=${workspaces.id}`);
        if (subscriptionResponse.ok) {
          const subscriptionData = await subscriptionResponse.json();
          if (subscriptionData.success && subscriptionData.data) {
            setCurrentSubscription(subscriptionData.data);
          }
        }

        // Get usage data
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

      // Create form and redirect to Wompi
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
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"><CheckCircle className="w-3 h-3 mr-1" />Activa</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><Clock className="w-3 h-3 mr-1" />Prueba</Badge>;
      case 'past_due':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30"><AlertCircle className="w-3 h-3 mr-1" />Pago pendiente</Badge>;
      case 'canceled':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><AlertCircle className="w-3 h-3 mr-1" />Cancelada</Badge>;
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

  // Get plans by type and billing period
  const getPlan = (planType: 'pro' | 'basic', billingPeriod: 'monthly' | 'yearly') => {
    return plans.find(p => p.plan_type === planType && p.billing_period === billingPeriod);
  };

  // Get special offer for a plan
  const getOfferForPlan = (planId: string) => {
    return specialOffers.find(o => o.plan_id === planId);
  };

  const currentBillingPeriod = isYearly ? 'yearly' : 'monthly';
  
  const professionalPlan = getPlan('pro', currentBillingPeriod);
  const studentPlan = getPlan('basic', currentBillingPeriod);
  
  const professionalOffer = professionalPlan ? getOfferForPlan(professionalPlan.id) : null;

  // Calculate monthly equivalent for yearly plans
  const getMonthlyEquivalent = (yearlyAmount: number) => {
    return Math.round(yearlyAmount / 12);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-violet-500 mx-auto mb-4" />
          <p className="text-slate-400 font-medium">Cargando planes...</p>
        </div>
      </div>
    );
  }

  const currentPlanType = currentSubscription?.plans?.plan_type;
  const currentPlanId = currentSubscription?.plan_id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-500/20 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-fuchsia-500/20 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-violet-500/20 text-violet-300 border border-violet-500/30 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Gestiona tu suscripción
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Facturación y <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Planes</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Administra tu suscripción y consulta tu uso
          </p>
        </div>

        {/* Alert */}
        {alertInfo && (
          <div className={`mb-8 p-4 rounded-xl border ${
            alertInfo.type === 'error' 
              ? 'bg-red-500/10 border-red-500/30 text-red-400' 
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          }`}>
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">{alertInfo.message}</span>
            </div>
          </div>
        )}

        {/* Current Subscription and Usage */}
        {currentSubscription && currentSubscription.status === 'active' && (
          <div className="mb-10 space-y-6">
            <Card className="border-2 border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-400">
                  <Crown className="h-6 w-6" />
                  Tu Suscripción Actual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{currentSubscription.plans?.name || 'Plan'}</h3>
                    <p className="text-slate-400">{currentSubscription.plans?.description}</p>
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
              <Card className="bg-slate-900/80 backdrop-blur-xl border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <TrendingUp className="h-5 w-5 text-violet-500" />
                    Tu uso este mes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Tokens */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Tokens de chat</span>
                        <span className="font-medium text-white">
                          {usageData.tokens_limit === -1 
                            ? `${(usageData.tokens_used / 1000000).toFixed(2)}M usados`
                            : `${(usageData.tokens_used / 1000000).toFixed(2)}M / ${(usageData.tokens_limit / 1000000).toFixed(0)}M`
                          }
                        </span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            usageData.tokens_limit === -1 
                              ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 w-1/4'
                              : usageData.tokens_used / usageData.tokens_limit > 0.9 
                                ? 'bg-red-500'
                                : 'bg-gradient-to-r from-violet-500 to-fuchsia-500'
                          }`}
                          style={{ 
                            width: usageData.tokens_limit === -1 
                              ? '25%' 
                              : `${Math.min((usageData.tokens_used / usageData.tokens_limit) * 100, 100)}%` 
                          }}
                        />
                      </div>
                      {usageData.tokens_limit === -1 && (
                        <p className="text-xs text-violet-400">Ilimitado</p>
                      )}
                    </div>

                    {/* Processes */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Procesos</span>
                        <span className="font-medium text-white">
                          {usageData.processes_limit === 0 
                            ? 'No disponible'
                            : `${usageData.processes_used} / ${usageData.processes_limit}`
                          }
                        </span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            usageData.processes_limit === 0 
                              ? 'bg-slate-700 w-0'
                              : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                          }`}
                          style={{ 
                            width: usageData.processes_limit === 0 
                              ? '0%' 
                              : `${Math.min((usageData.processes_used / usageData.processes_limit) * 100, 100)}%` 
                          }}
                        />
                      </div>
                    </div>

                    {/* Transcription */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Transcripción</span>
                        <span className="font-medium text-white">
                          {usageData.transcription_limit === 0 
                            ? 'No disponible'
                            : `${(usageData.transcription_seconds_used / 3600).toFixed(1)}h / ${usageData.transcription_limit}h`
                          }
                        </span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            usageData.transcription_limit === 0 
                              ? 'bg-slate-700 w-0'
                              : 'bg-gradient-to-r from-pink-500 to-rose-500'
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

        {/* Plans */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            {currentSubscription ? 'Cambiar de Plan' : 'Elige tu Plan'}
          </h2>

          {/* Billing Period Toggle */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className={`text-sm font-medium transition-colors ${!isYearly ? 'text-white' : 'text-slate-400'}`}>
              Mensual
            </span>
            <div className="relative">
              <Switch
                checked={isYearly}
                onCheckedChange={setIsYearly}
                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-violet-600 data-[state=checked]:to-fuchsia-600"
              />
            </div>
            <span className={`text-sm font-medium transition-colors flex items-center gap-2 ${isYearly ? 'text-white' : 'text-slate-400'}`}>
              Anual
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                <Percent className="w-3 h-3 mr-1" />
                30% OFF
              </Badge>
            </span>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Professional Plan */}
            {professionalPlan && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0 }}
              >
                <Card className={`relative h-full border-2 shadow-2xl bg-gradient-to-br from-slate-900 via-violet-950/50 to-slate-900 overflow-hidden ${
                  currentPlanId === professionalPlan.id ? 'border-violet-500 ring-2 ring-violet-400/30' : 'border-violet-500/50'
                }`}>
                  {/* Background effects */}
                  <div className="absolute -top-24 -right-24 w-48 h-48 bg-violet-500/20 rounded-full blur-3xl" />
                  <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-fuchsia-500/20 rounded-full blur-3xl" />
                  
                  {/* Badges */}
                  {currentPlanId === professionalPlan.id ? (
                    <div className="absolute top-3 right-3 z-10">
                      <Badge className="bg-violet-600 text-white">Plan Actual</Badge>
                    </div>
                  ) : (
                    <div className="absolute -top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-1.5 shadow-lg border-0">
                        <Star className="w-3.5 h-3.5 mr-1 fill-current" />
                        Recomendado
                      </Badge>
                    </div>
                  )}

                  {/* First Month Offer Badge */}
                  {!isYearly && professionalOffer && currentPlanId !== professionalPlan.id && (
                    <div className="absolute top-3 right-3 z-10">
                      <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-3 py-1 shadow-lg border-0">
                        <Gift className="w-3 h-3 mr-1" />
                        1er mes $0.99 USD
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center pt-10 pb-4 relative z-10">
                    <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg shadow-violet-500/30">
                      <Briefcase className="w-7 h-7 text-white" />
                    </div>
                    <CardTitle className="text-xl text-white">{professionalPlan.name}</CardTitle>
                    <CardDescription className="text-slate-400">{professionalPlan.description}</CardDescription>
                    
                    <div className="mt-4">
                      {!isYearly && professionalOffer && currentPlanId !== professionalPlan.id ? (
                        <div className="space-y-1">
                          <div className="flex items-baseline justify-center gap-2">
                            <span className="text-4xl font-bold text-white">
                              $3.960
                            </span>
                            <span className="text-lg text-slate-500 line-through">
                              ${formatPrice(professionalPlan.amount_in_cents)}
                            </span>
                          </div>
                          <p className="text-sm text-emerald-400">COP primer mes</p>
                          <p className="text-xs text-slate-500">Luego ${formatPrice(professionalPlan.amount_in_cents)} COP/mes</p>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="text-4xl font-bold text-white">
                              ${formatPrice(professionalPlan.amount_in_cents)}
                            </span>
                          </div>
                          <p className="text-sm text-slate-400">
                            COP / {isYearly ? 'año' : 'mes'}
                          </p>
                          {isYearly && (
                            <p className="text-xs text-emerald-400 mt-1">
                              Equivale a ${formatPrice(getMonthlyEquivalent(professionalPlan.amount_in_cents))} COP/mes
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  {/* Highlights */}
                  <div className="mx-6 mb-4 p-3 rounded-xl bg-white/5 grid grid-cols-2 gap-2 relative z-10">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-violet-400" />
                      <div>
                        <p className="text-[10px] uppercase text-slate-500">Chat IA</p>
                        <p className="text-xs font-semibold text-white">Ilimitado</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-amber-400" />
                      <div>
                        <p className="text-[10px] uppercase text-slate-500">Workspaces</p>
                        <p className="text-xs font-semibold text-white">Múltiples</p>
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
                      onClick={() => handleSubscribe(professionalPlan.id)}
                      disabled={currentPlanId === professionalPlan.id || processingPlanId !== null}
                      className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700 text-white shadow-lg shadow-violet-500/25"
                      size="lg"
                    >
                      {processingPlanId === professionalPlan.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Procesando...
                        </>
                      ) : currentPlanId === professionalPlan.id ? (
                        'Plan Actual'
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          {currentPlanType === 'basic' ? 'Actualizar a Profesional' : 
                           !isYearly && professionalOffer ? 'Comenzar por $0.99 USD' : 'Elegir Plan Profesional'}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Student Plan */}
            {studentPlan && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className={`relative h-full border-2 shadow-xl bg-slate-900/80 backdrop-blur-xl overflow-hidden ${
                  currentPlanId === studentPlan.id ? 'border-cyan-500 ring-2 ring-cyan-400/30' : 'border-slate-700'
                }`}>
                  {currentPlanId === studentPlan.id && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-cyan-600 text-white">Plan Actual</Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pt-8 pb-4">
                    <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30">
                      <GraduationCap className="w-7 h-7 text-white" />
                    </div>
                    <CardTitle className="text-xl text-white">{studentPlan.name}</CardTitle>
                    <CardDescription className="text-slate-400">{studentPlan.description}</CardDescription>
                    
                    <div className="mt-4">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-bold text-white">
                          ${formatPrice(studentPlan.amount_in_cents)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">
                        COP / {isYearly ? 'año' : 'mes'}
                      </p>
                      {isYearly && (
                        <p className="text-xs text-emerald-400 mt-1">
                          Equivale a ${formatPrice(getMonthlyEquivalent(studentPlan.amount_in_cents))} COP/mes
                        </p>
                      )}
                    </div>
                  </CardHeader>

                  {/* Highlights */}
                  <div className="mx-6 mb-4 p-3 rounded-xl bg-slate-800/50 grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-cyan-400" />
                      <div>
                        <p className="text-[10px] uppercase text-slate-500">Chat IA</p>
                        <p className="text-xs font-semibold text-white">3M tokens</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-500" />
                      <div>
                        <p className="text-[10px] uppercase text-slate-500">Workspace</p>
                        <p className="text-xs font-semibold text-white">1</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-slate-600" />
                      <div>
                        <p className="text-[10px] uppercase text-slate-500">Procesos</p>
                        <p className="text-xs font-semibold text-slate-500">—</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mic className="w-4 h-4 text-slate-600" />
                      <div>
                        <p className="text-[10px] uppercase text-slate-500">Transcripción</p>
                        <p className="text-xs font-semibold text-slate-500">—</p>
                      </div>
                    </div>
                  </div>

                  <CardContent className="pt-0">
                    <ul className="space-y-2 mb-6 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-300">Chat con asistente legal IA</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-300">Hasta 3 millones de tokens/mes</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-300">Análisis de normativa colombiana</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <X className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-500 line-through">Procesos legales</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <X className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-500 line-through">Transcripción de audio</span>
                      </li>
                    </ul>

                    <Button
                      onClick={() => handleSubscribe(studentPlan.id)}
                      disabled={currentPlanId === studentPlan.id || processingPlanId !== null}
                      variant="outline"
                      className="w-full border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-400"
                      size="lg"
                    >
                      {processingPlanId === studentPlan.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Procesando...
                        </>
                      ) : currentPlanId === studentPlan.id ? (
                        'Plan Actual'
                      ) : currentPlanType === 'pro' ? (
                        'Cambiar a Estudiantil'
                      ) : (
                        'Elegir Plan Estudiantil'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>

        {/* Security info */}
        <div className="mt-12 text-center">
          <div className="inline-flex flex-wrap justify-center gap-6 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Pago seguro con Wompi
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              Cancela cuando quieras
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              Sin compromisos
            </div>
          </div>
        </div>

        {/* Back button */}
        <div className="mt-10 text-center">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>
    </div>
  );
}

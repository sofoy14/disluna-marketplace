// app/[locale]/precios/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  CheckCircle, 
  Loader2, 
  Star,
  Zap,
  X,
  MessageSquare,
  FolderOpen,
  Mic,
  Building2,
  GraduationCap,
  Briefcase,
  Shield
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShaderCanvas } from '@/components/shader-canvas';

interface Plan {
  id: string;
  name: string;
  description: string;
  amount_in_cents: number;
  currency: string;
  billing_period: 'monthly' | 'yearly';
  features: string[];
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

interface SpecialOffer {
  id: string;
  name: string;
  discount_value: number;
  discount_type: string;
  plan_id: string;
}

// Glass Card Component (idéntico a onboarding)
function GlassCard({ 
  children, 
  className = "", 
  highlighted = false,
  hoverEffect = true 
}: { 
  children: React.ReactNode;
  className?: string;
  highlighted?: boolean;
  hoverEffect?: boolean;
}) {
  return (
    <div className={`
      relative overflow-hidden rounded-3xl
      ${highlighted 
        ? 'bg-violet-950/40 border border-violet-500/30' 
        : 'bg-white/[0.03] border border-white/[0.08]'
      }
      backdrop-blur-xl shadow-2xl
      ${hoverEffect ? 'transition-all duration-500 hover:border-violet-500/40 hover:bg-white/[0.05] hover:shadow-violet-500/10 hover:-translate-y-1' : ''}
      ${className}
    `}>
      {/* Top highlight line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      {/* Inner glow for highlighted cards */}
      {highlighted && (
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-fuchsia-500/5 pointer-events-none" />
      )}
      {children}
    </div>
  );
}

export default function PreciosPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  
  // Billing period toggle
  const [isYearly, setIsYearly] = useState(false);
  
  // Plans and offers
  const [plans, setPlans] = useState<Plan[]>([]);
  const [specialOffers, setSpecialOffers] = useState<SpecialOffer[]>([]);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  // Check for error params on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const error = searchParams.get('error');
      const details = searchParams.get('details');
      
      if (error) {
        const errorMessages: Record<string, string> = {
          'missing_params': 'Parámetros faltantes. Por favor intenta de nuevo.',
          'wompi_config': 'Error de configuración del sistema de pagos.',
          'plan_not_found': 'El plan seleccionado no está disponible.',
          'workspace_not_found': 'No se encontró tu workspace.',
          'user_not_found': 'No se encontró información del usuario.',
          'subscription_create': 'Error al crear la suscripción.',
          'subscription_update': 'Error al actualizar la suscripción.',
          'server_error': 'Error del servidor. Por favor intenta más tarde.'
        };
        
        const errorText = errorMessages[error] || `Error: ${error}`;
        setMessage({ 
          type: 'error', 
          text: details ? `${errorText} (${details})` : errorText 
        });
        
        // Clean URL
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    fetchPricingData();
  }, []);

  const fetchPricingData = async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        router.push('/login');
        return;
      }

      // Get workspace
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_home', true)
        .single();

      if (workspace) {
        setWorkspaceId(workspace.id);
      }

      // Fetch plans
      await fetchPlansAndOffers();

      // Get current subscription
      if (workspace?.id) {
        const subscriptionResponse = await fetch(`/api/billing/subscriptions?workspace_id=${workspace.id}`);
        if (subscriptionResponse.ok) {
          const subscriptionData = await subscriptionResponse.json();
          if (subscriptionData.success && subscriptionData.data) {
            setCurrentSubscription(subscriptionData.data);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching pricing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlansAndOffers = async () => {
    try {
      // Fetch plans
      const plansResponse = await fetch('/api/billing/plans');
      const plansData = await plansResponse.json();
      
      if (plansData.success) {
        setPlans(plansData.data);
      }

      // Fetch special offers (para verificar, pero NO los usaremos en /precios)
      const offersResponse = await fetch('/api/billing/offers');
      if (offersResponse.ok) {
        const offersData = await offersResponse.json();
        if (offersData.success) {
          setSpecialOffers(offersData.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const handleSubscribe = async (planId: string) => {
    setProcessingPlanId(planId);
    setMessage(null);

    console.log('[Precios] handleSubscribe called with planId:', planId);
    console.log('[Precios] Current workspaceId state:', workspaceId);

    // Verificar que tenemos workspace_id
    if (!workspaceId) {
      console.error('[Precios] No workspace_id available!');
      setMessage({ type: 'error', text: 'No se encontró tu workspace. Por favor recarga la página.' });
      setProcessingPlanId(null);
      return;
    }

    // Use direct navigation to checkout-redirect endpoint (same as onboarding)
    const checkoutUrl = `/api/billing/checkout-redirect?plan_id=${encodeURIComponent(planId)}&workspace_id=${encodeURIComponent(workspaceId)}`;
    
    console.log('[Precios] Redirecting to checkout endpoint:', checkoutUrl);
    
    // Direct navigation - browser will follow the HTTP redirect to Wompi
    window.location.href = checkoutUrl;
  };

  // Helper functions for plans
  const formatPrice = (amountInCents: number) => {
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amountInCents / 100);
  };

  const currentBillingPeriod = isYearly ? 'yearly' : 'monthly';
  
  const getPlan = (type: 'basic' | 'pro', period: 'monthly' | 'yearly') => {
    return plans.find(p => p.plan_type === type && p.billing_period === period);
  };

  const professionalPlan = getPlan('pro', currentBillingPeriod);
  const studentPlan = getPlan('basic', currentBillingPeriod);

  const getMonthlyEquivalent = (yearlyAmount: number) => {
    return Math.round(yearlyAmount / 12);
  };

  const currentPlanId = currentSubscription?.plan_id;
  const currentPlanType = currentSubscription?.plans?.plan_type;

  // Loading state (idéntico a onboarding)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/20 via-transparent to-violet-950/10" />
        
        <div className="text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <ShaderCanvas size={120} shaderId={1} />
            <div className="absolute inset-0 bg-violet-500/20 blur-3xl rounded-full -z-10 animate-pulse" />
          </motion.div>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-violet-300/60 font-light mt-6 tracking-wide"
          >
            Cargando...
          </motion.p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      {/* Subtle ambient background (idéntico a onboarding) */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-violet-900/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-violet-800/5 rounded-full blur-[120px]" />
      </div>
      
      {/* Grid pattern overlay (idéntico a onboarding) */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          {/* Orb (mismo que landing/login) */}
          <motion.div 
            className="flex justify-center mb-6"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <ShaderCanvas size={100} shaderId={1} />
          </motion.div>

          {/* Welcome Text (idéntico a onboarding) */}
          <motion.div 
            className="text-center mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-2xl md:text-3xl font-light text-white mb-3 tracking-tight">
              Bienvenido al <span className="text-violet-400 font-normal">Asistente Legal</span>
            </h1>
            <p className="text-violet-300/50 font-light">
              Presente e inteligente
            </p>
            <p className="text-white/60 mt-4 font-light">
              Selecciona el plan que mejor se ajuste a ti
            </p>
          </motion.div>

          {message && (
            <Alert className={`mb-6 max-w-md mx-auto border ${
              message.type === 'success' 
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' 
                : 'border-red-500/30 bg-red-500/10 text-red-400'
            }`}>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          {/* Billing Period Toggle (idéntico a onboarding) */}
          <motion.div 
            className="flex items-center justify-center gap-4 mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <span className={`text-sm font-light transition-colors ${!isYearly ? 'text-white' : 'text-white/40'}`}>
              Mensual
            </span>
            <Switch
              checked={isYearly}
              onCheckedChange={setIsYearly}
              className="data-[state=checked]:bg-violet-600"
            />
            <span className={`text-sm font-light transition-colors flex items-center gap-2 ${isYearly ? 'text-white' : 'text-white/40'}`}>
              Anual
              <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-xs font-light">
                30% OFF
              </Badge>
            </span>
          </motion.div>

          {/* Plans Grid (idéntico a onboarding) */}
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Professional Plan */}
            {professionalPlan && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <GlassCard highlighted className="h-full relative">
                  {/* Recommended Badge */}
                  {currentPlanId !== professionalPlan.id && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <Badge className="bg-violet-600 text-white px-4 py-1 text-xs font-light border-0 shadow-lg shadow-violet-500/30">
                        <Star className="w-3 h-3 mr-1.5 fill-current" />
                        Recomendado
                      </Badge>
                    </div>
                  )}

                  {/* Current Plan Badge */}
                  {currentPlanId === professionalPlan.id && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <Badge className="bg-emerald-600 text-white px-4 py-1 text-xs font-light border-0 shadow-lg shadow-emerald-500/30">
                        Plan Actual
                      </Badge>
                    </div>
                  )}

                  <div className="p-8 pt-10">
                    {/* Icon & Title */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20">
                        <Briefcase className="w-6 h-6 text-violet-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-medium text-white">{professionalPlan.name}</h3>
                        <p className="text-sm text-violet-300/50 font-light">{professionalPlan.description}</p>
                      </div>
                    </div>

                    {/* Price - SIN DESCUENTOS en /precios */}
                    <div className="mb-6">
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-light text-white">${formatPrice(professionalPlan.amount_in_cents)}</span>
                          <span className="text-white/40 font-light">COP</span>
                        </div>
                        <p className="text-sm text-white/40 font-light">/ {isYearly ? 'año' : 'mes'}</p>
                        {isYearly && (
                          <p className="text-xs text-violet-400/80 font-light mt-1">
                            Equivale a ${formatPrice(getMonthlyEquivalent(professionalPlan.amount_in_cents))} COP/mes
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Highlights Grid */}
                    <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] mb-6">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-violet-400" />
                        <div>
                          <p className="text-[10px] uppercase text-white/30 tracking-wider">Chat IA</p>
                          <p className="text-sm font-medium text-white">Ilimitado</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-violet-400" />
                        <div>
                          <p className="text-[10px] uppercase text-white/30 tracking-wider">Workspaces</p>
                          <p className="text-sm font-medium text-white">Múltiples</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-violet-400" />
                        <div>
                          <p className="text-[10px] uppercase text-white/30 tracking-wider">Procesos</p>
                          <p className="text-sm font-medium text-white">7</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mic className="w-4 h-4 text-violet-400" />
                        <div>
                          <p className="text-[10px] uppercase text-white/30 tracking-wider">Transcripción</p>
                          <p className="text-sm font-medium text-white">5 horas</p>
                        </div>
                      </div>
                    </div>

                    {/* Features List */}
                    <ul className="space-y-3 mb-8">
                      {[
                        'Chat con asistente legal IA ilimitado',
                        'Análisis de normativa colombiana',
                        'Múltiples espacios de trabajo',
                        '7 procesos legales incluidos',
                        '5 horas de transcripción de audio',
                        'Soporte prioritario 24/7'
                      ].map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <CheckCircle className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-white/70 font-light">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <Button
                      onClick={() => handleSubscribe(professionalPlan.id)}
                      disabled={processingPlanId !== null || currentPlanId === professionalPlan.id}
                      className="w-full h-12 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium transition-all duration-300 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30"
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
                          {currentPlanType === 'basic' ? 'Actualizar a Profesional' : 'Elegir Plan Profesional'}
                        </>
                      )}
                    </Button>
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {/* Student Plan */}
            {studentPlan && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <GlassCard className="h-full relative">
                  {/* Current Plan Badge */}
                  {currentPlanId === studentPlan.id && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <Badge className="bg-emerald-600 text-white px-4 py-1 text-xs font-light border-0 shadow-lg shadow-emerald-500/30">
                        Plan Actual
                      </Badge>
                    </div>
                  )}

                  <div className="p-8 pt-10">
                    {/* Icon & Title */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="p-3 rounded-2xl bg-white/[0.05] border border-white/[0.08]">
                        <GraduationCap className="w-6 h-6 text-white/60" />
                      </div>
                      <div>
                        <h3 className="text-xl font-medium text-white">{studentPlan.name}</h3>
                        <p className="text-sm text-white/40 font-light">{studentPlan.description}</p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-light text-white">${formatPrice(studentPlan.amount_in_cents)}</span>
                        <span className="text-white/40 font-light">COP</span>
                      </div>
                      <p className="text-sm text-white/40 font-light">/ {isYearly ? 'año' : 'mes'}</p>
                      {isYearly && (
                        <p className="text-xs text-violet-400/80 font-light mt-1">
                          Equivale a ${formatPrice(getMonthlyEquivalent(studentPlan.amount_in_cents))} COP/mes
                        </p>
                      )}
                    </div>

                    {/* Highlights Grid */}
                    <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] mb-6">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-white/40" />
                        <div>
                          <p className="text-[10px] uppercase text-white/20 tracking-wider">Chat IA</p>
                          <p className="text-sm font-medium text-white/70">3M tokens</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-white/20" />
                        <div>
                          <p className="text-[10px] uppercase text-white/20 tracking-wider">Workspace</p>
                          <p className="text-sm font-medium text-white/70">1</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-white/20" />
                        <div>
                          <p className="text-[10px] uppercase text-white/20 tracking-wider">Procesos</p>
                          <p className="text-sm font-medium text-white/30">—</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mic className="w-4 h-4 text-white/20" />
                        <div>
                          <p className="text-[10px] uppercase text-white/20 tracking-wider">Transcripción</p>
                          <p className="text-sm font-medium text-white/30">—</p>
                        </div>
                      </div>
                    </div>

                    {/* Features List */}
                    <ul className="space-y-3 mb-8">
                      {[
                        { text: 'Chat con asistente legal IA', included: true },
                        { text: 'Hasta 3 millones de tokens/mes', included: true },
                        { text: 'Análisis de normativa colombiana', included: true },
                        { text: 'Búsqueda de jurisprudencia', included: true },
                        { text: 'Procesos legales', included: false },
                        { text: 'Transcripción de audio', included: false }
                      ].map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          {feature.included ? (
                            <CheckCircle className="w-4 h-4 text-white/40 flex-shrink-0 mt-0.5" />
                          ) : (
                            <X className="w-4 h-4 text-white/20 flex-shrink-0 mt-0.5" />
                          )}
                          <span className={`text-sm font-light ${feature.included ? 'text-white/60' : 'text-white/30 line-through'}`}>
                            {feature.text}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <Button
                      onClick={() => handleSubscribe(studentPlan.id)}
                      disabled={processingPlanId !== null || currentPlanId === studentPlan.id}
                      variant="outline"
                      className="w-full h-12 bg-transparent border-white/10 text-white/70 hover:bg-white/5 hover:border-white/20 hover:text-white rounded-xl font-medium transition-all duration-300"
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
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </div>

          {/* Trust badges (idéntico a onboarding) */}
          <motion.div 
            className="flex flex-wrap justify-center gap-6 text-xs text-white/30 mt-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-violet-400/50" />
              <span className="font-light">Pago seguro con Wompi</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-violet-400/50" />
              <span className="font-light">Cancela cuando quieras</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-violet-400/50" />
              <span className="font-light">Soporte en español</span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

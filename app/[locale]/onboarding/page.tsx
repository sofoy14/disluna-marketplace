// app/[locale]/onboarding/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  CheckCircle, 
  User, 
  Loader2, 
  ArrowRight,
  ArrowLeft,
  CreditCard,
  Sparkles,
  Star,
  Zap,
  X,
  Crown,
  MessageSquare,
  FolderOpen,
  Mic,
  Building2,
  GraduationCap,
  Briefcase,
  Percent,
  Gift
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

type OnboardingStep = 'loading' | 'profile_setup' | 'plan_selection';

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

interface SpecialOffer {
  id: string;
  name: string;
  discount_value: number;
  discount_type: string;
  plan_id: string;
}

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('loading');
  const [isLoading, setIsLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  
  // Billing period toggle
  const [isYearly, setIsYearly] = useState(false);
  
  // Profile form data
  const [profileData, setProfileData] = useState({
    display_name: '',
    username: ''
  });

  // Plans and offers
  const [plans, setPlans] = useState<Plan[]>([]);
  const [specialOffers, setSpecialOffers] = useState<SpecialOffer[]>([]);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    
    const initializePage = async () => {
      try {
        const supabase = createClient();
        
        // First, try to get the session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
        }
        
        // If no session, wait a moment and try again (for OAuth redirect)
        if (!session) {
          // Wait for potential OAuth redirect to complete
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          
          if (!retrySession) {
            console.log('No session after retry, redirecting to login');
            if (isMounted) router.push('/login');
            return;
          }
        }
        
        // Get fresh user data
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          console.log('No user found, redirecting to login');
          if (isMounted) router.push('/login');
          return;
        }

        // Check if email is verified (skip for OAuth users)
        if (!user.email_confirmed_at && user.app_metadata?.provider === 'email') {
          if (isMounted) router.push('/auth/verify-email');
          return;
        }

        // Get workspace
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_home', true)
          .single();

        if (workspace && isMounted) {
          setWorkspaceId(workspace.id);
        }

        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_step, email_verified, onboarding_completed, display_name, username, has_onboarded')
          .eq('user_id', user.id)
          .single();

        // Check if user has active subscription - if so, go to chat
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('id, status')
          .eq('user_id', user.id)
          .in('status', ['active', 'trialing'])
          .maybeSingle();

        if (subscription && workspace) {
          // User has active subscription, go to chat
          await supabase
            .from('profiles')
            .update({ onboarding_completed: true, onboarding_step: 'completed' })
            .eq('user_id', user.id);
          
          if (isMounted) router.push(`/${workspace.id}/chat`);
          return;
        }

        // Pre-fill profile data if exists
        if (profile?.display_name && isMounted) {
          setProfileData(prev => ({
            ...prev,
            display_name: profile.display_name || '',
            username: profile.username || ''
          }));
        }

        // Fetch plans
        await fetchPlansAndOffers();

        if (!isMounted) return;

        // Determine which step to show
        // If user has display_name (from OAuth or previous setup), go to plan selection
        if (profile?.display_name || profile?.has_onboarded || profile?.onboarding_step === 'plan_selection') {
          setCurrentStep('plan_selection');
        } else {
          setCurrentStep('profile_setup');
        }
        
        setPageLoading(false);
      } catch (error) {
        console.error('Error initializing onboarding:', error);
        if (isMounted) {
          setPageLoading(false);
          setCurrentStep('profile_setup');
        }
      }
    };

    initializePage();
    
    return () => {
      isMounted = false;
    };
  }, [router]);

  const fetchPlansAndOffers = async () => {
    try {
      // Fetch plans
      const plansResponse = await fetch('/api/billing/plans');
      const plansData = await plansResponse.json();
      
      if (plansData.success) {
        setPlans(plansData.data);
      }

      // Fetch special offers
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

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: profileData.display_name,
          username: profileData.username,
          onboarding_step: 'plan_selection',
          has_onboarded: true
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setCurrentStep('plan_selection');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al guardar el perfil' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    setProcessingPlanId(planId);
    setMessage(null);

    try {
      const response = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar la suscripción');
      }

      // Redirect to Wompi checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (data.wompiData) {
        // Create form and submit to Wompi
        const form = document.createElement('form');
        form.method = 'GET';
        form.action = data.wompiData.checkoutUrl;
        
        Object.entries(data.wompiData).forEach(([key, value]) => {
          if (key !== 'checkoutUrl' && value) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = String(value);
            form.appendChild(input);
          }
        });

        document.body.appendChild(form);
        form.submit();
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al procesar el pago' });
      setProcessingPlanId(null);
    }
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

  const getOfferForPlan = (planId: string) => {
    return specialOffers.find(o => o.plan_id === planId);
  };

  const professionalPlan = getPlan('pro', currentBillingPeriod);
  const studentPlan = getPlan('basic', currentBillingPeriod);
  const professionalOffer = professionalPlan ? getOfferForPlan(professionalPlan.id) : null;

  const getMonthlyEquivalent = (yearlyAmount: number) => {
    return Math.round(yearlyAmount / 12);
  };

  // Loading state
  if (pageLoading || currentStep === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-violet-500 mx-auto mb-4" />
          <p className="text-slate-400 font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-950 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-500/20 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-fuchsia-500/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Bienvenido a tu <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Asistente Legal</span>
            </h1>
            <p className="text-slate-400">
              {currentStep === 'profile_setup' ? 'Configura tu perfil para comenzar' : 'Selecciona el plan que mejor se ajuste a ti'}
            </p>
          </motion.div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center space-x-4 mb-8">
          {[
            { key: 'profile_setup', label: 'Perfil', icon: User },
            { key: 'plan_selection', label: 'Plan', icon: CreditCard }
          ].map((step, index) => {
            const Icon = step.icon;
            const isActive = step.key === currentStep;
            const isCompleted = currentStep === 'plan_selection' && step.key === 'profile_setup';
            
            return (
              <div key={step.key} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                  isActive 
                    ? 'border-violet-500 bg-violet-500 text-white' 
                    : isCompleted 
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-slate-600 bg-slate-800 text-slate-400'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <span className={`ml-2 text-sm font-medium hidden sm:inline ${
                  isActive ? 'text-violet-400' : isCompleted ? 'text-emerald-400' : 'text-slate-500'
                }`}>
                  {step.label}
                </span>
                {index < 1 && (
                  <div className={`w-12 h-0.5 mx-4 ${
                    isCompleted ? 'bg-emerald-500' : 'bg-slate-700'
                  }`} />
                )}
              </div>
            );
          })}
        </div>

        {message && (
          <Alert className={`mb-6 ${
            message.type === 'success' 
              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' 
              : 'border-red-500/50 bg-red-500/10 text-red-400'
          }`}>
            <AlertDescription>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Step 1: Profile Setup */}
        <AnimatePresence mode="wait">
          {currentStep === 'profile_setup' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="max-w-md mx-auto bg-slate-900/80 backdrop-blur-xl border-slate-800 shadow-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <User className="w-5 h-5 text-violet-500" />
                    Configura tu Perfil
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Completa tu información para personalizar tu experiencia
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileSubmit} className="space-y-5">
                    <div>
                      <Label htmlFor="display_name" className="text-slate-300">Nombre Completo</Label>
                      <Input
                        id="display_name"
                        value={profileData.display_name}
                        onChange={(e) => setProfileData({...profileData, display_name: e.target.value})}
                        placeholder="Tu nombre completo"
                        required
                        className="mt-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-violet-500 focus:ring-violet-500"
                      />
                    </div>

                    <div>
                      <Label htmlFor="username" className="text-slate-300">Nombre de Usuario</Label>
                      <Input
                        id="username"
                        value={profileData.username}
                        onChange={(e) => setProfileData({...profileData, username: e.target.value.toLowerCase().replace(/\s/g, '_')})}
                        placeholder="tu_usuario"
                        required
                        className="mt-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-violet-500 focus:ring-violet-500"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Este será tu identificador único
                      </p>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shadow-lg shadow-violet-500/25" 
                      disabled={isLoading || !profileData.display_name || !profileData.username}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          Continuar
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Plan Selection */}
          {currentStep === 'plan_selection' && (
            <motion.div
              key="plans"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <Badge className="bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-violet-300 border-violet-500/30 mb-4">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Elige tu plan
                </Badge>
              </div>

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

              <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {/* Professional Plan */}
                {professionalPlan && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0 }}
                  >
                    <Card className="relative h-full border-2 border-violet-500/50 shadow-2xl bg-gradient-to-br from-slate-900 via-violet-950/50 to-slate-900 overflow-hidden">
                      {/* Background effects */}
                      <div className="absolute -top-24 -right-24 w-48 h-48 bg-violet-500/20 rounded-full blur-3xl" />
                      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-fuchsia-500/20 rounded-full blur-3xl" />
                      
                      {/* Badge */}
                      <div className="absolute -top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                        <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-1.5 shadow-lg border-0">
                          <Star className="w-3.5 h-3.5 mr-1 fill-current" />
                          Recomendado
                        </Badge>
                      </div>

                      {/* First Month Offer Badge */}
                      {!isYearly && professionalOffer && (
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
                          {!isYearly && professionalOffer ? (
                            <div className="space-y-1">
                              <div className="flex items-baseline justify-center gap-2">
                                <span className="text-4xl font-bold text-white">$3.960</span>
                                <span className="text-lg text-slate-500 line-through">${formatPrice(professionalPlan.amount_in_cents)}</span>
                              </div>
                              <p className="text-sm text-emerald-400">COP primer mes</p>
                              <p className="text-xs text-slate-500">Luego ${formatPrice(professionalPlan.amount_in_cents)} COP/mes</p>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-baseline justify-center gap-1">
                                <span className="text-4xl font-bold text-white">${formatPrice(professionalPlan.amount_in_cents)}</span>
                              </div>
                              <p className="text-sm text-slate-400">COP / {isYearly ? 'año' : 'mes'}</p>
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
                            <span className="text-slate-300">Chat con asistente legal IA ilimitado</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <span className="text-slate-300">Análisis de normativa colombiana</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <span className="text-slate-300">Múltiples espacios de trabajo</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <span className="text-slate-300">7 procesos legales incluidos</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <span className="text-slate-300">5 horas de transcripción de audio</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <span className="text-slate-300">Soporte prioritario 24/7</span>
                          </li>
                        </ul>

                        <Button
                          onClick={() => handleSubscribe(professionalPlan.id)}
                          disabled={processingPlanId !== null}
                          className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700 text-white shadow-lg shadow-violet-500/25"
                          size="lg"
                        >
                          {processingPlanId === professionalPlan.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Procesando...
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4 mr-2" />
                              {!isYearly && professionalOffer ? 'Comenzar por $0.99 USD' : 'Elegir Plan Profesional'}
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
                    <Card className="relative h-full border-2 border-slate-700 shadow-xl bg-slate-900/80 backdrop-blur-xl overflow-hidden">
                      <CardHeader className="text-center pt-8 pb-4">
                        <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30">
                          <GraduationCap className="w-7 h-7 text-white" />
                        </div>
                        <CardTitle className="text-xl text-white">{studentPlan.name}</CardTitle>
                        <CardDescription className="text-slate-400">{studentPlan.description}</CardDescription>
                        
                        <div className="mt-4">
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="text-4xl font-bold text-white">${formatPrice(studentPlan.amount_in_cents)}</span>
                          </div>
                          <p className="text-sm text-slate-400">COP / {isYearly ? 'año' : 'mes'}</p>
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
                            <CheckCircle className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                            <span className="text-slate-300">Búsqueda de jurisprudencia</span>
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
                          disabled={processingPlanId !== null}
                          variant="outline"
                          className="w-full border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-400"
                          size="lg"
                        >
                          {processingPlanId === studentPlan.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Procesando...
                            </>
                          ) : (
                            'Elegir Plan Estudiantil'
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap justify-center gap-4 text-xs text-slate-500 mt-8">
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                  Pago seguro con Wompi
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                  Cancela cuando quieras
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                  Soporte en español
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

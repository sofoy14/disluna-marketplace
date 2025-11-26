// app/[locale]/onboarding/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  User, 
  Loader2, 
  ArrowRight,
  ArrowLeft,
  CreditCard,
  Sparkles,
  Star,
  Zap
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

type OnboardingStep = 'profile_setup' | 'plan_selection';

interface Plan {
  id: string;
  name: string;
  description: string;
  amount_in_cents: number;
  currency: string;
  billing_period: 'monthly' | 'yearly';
  features: string[];
  first_month_price?: number;
  has_first_month_promo?: boolean;
}

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('profile_setup');
  const [isLoading, setIsLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  
  // Profile form data
  const [profileData, setProfileData] = useState({
    display_name: '',
    username: ''
  });

  // Plans
  const [plans, setPlans] = useState<Plan[]>([]);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    checkOnboardingStatus();
    fetchPlans();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      // Check if email is verified
      if (!user.email_confirmed_at) {
        router.push('/auth/verify-email');
        return;
      }

      // Get workspace
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_home', true)
        .single();

      if (workspace) {
        setWorkspaceId(workspace.id);
      }

      // Get user profile to check onboarding step
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_step, email_verified, onboarding_completed, display_name, username')
        .eq('user_id', user.id)
        .single();

      // Check if user has active subscription - if so, go to chat
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('id, status')
        .eq('workspace_id', workspace?.id)
        .eq('status', 'active')
        .single();

      if (subscription) {
        // User has active subscription, mark onboarding complete and go to chat
        await supabase
          .from('profiles')
          .update({ onboarding_completed: true, onboarding_step: 'completed' })
          .eq('user_id', user.id);
        
        router.push(`/${workspace?.id}/chat`);
        return;
      }

      // Pre-fill profile data if exists
      if (profile?.display_name) {
        setProfileData(prev => ({
          ...prev,
          display_name: profile.display_name || '',
          username: profile.username || ''
        }));
      }

      // Set current step based on profile data
      if (profile?.onboarding_step === 'plan_selection' || profile?.display_name) {
        setCurrentStep('plan_selection');
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    } finally {
      setPageLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/billing/plans');
      const data = await response.json();
      
      if (data.success) {
        setPlans(data.data);
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
          onboarding_step: 'plan_selection'
        })
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      setCurrentStep('plan_selection');

    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error actualizando perfil'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    if (!workspaceId) {
      setMessage({ type: 'error', text: 'Error: No se encontró el workspace' });
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
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al procesar el pago'
      });
    } finally {
      setProcessingPlanId(null);
    }
  };

  const formatPrice = (amountInCents: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amountInCents / 100);
  };

  // Separar planes
  const monthlyPlan = plans.find(p => p.billing_period === 'monthly');
  const yearlyPlan = plans.find(p => p.billing_period === 'yearly');

  const renderStepIndicator = () => {
    const steps = [
      { key: 'profile_setup', label: 'Perfil', icon: User },
      { key: 'plan_selection', label: 'Plan', icon: CreditCard }
    ];

    return (
      <div className="flex items-center justify-center space-x-4 mb-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.key === currentStep;
          const isCompleted = steps.findIndex(s => s.key === currentStep) > index;
          
          return (
            <div key={step.key} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                isActive 
                  ? 'border-indigo-600 bg-indigo-600 text-white' 
                  : isCompleted 
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-slate-300 bg-white text-slate-400'
              }`}>
                {isCompleted ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
              <span className={`ml-2 text-sm font-medium hidden sm:inline ${
                isActive ? 'text-indigo-600' : isCompleted ? 'text-green-600' : 'text-slate-400'
              }`}>
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-12 h-0.5 mx-4 ${
                  isCompleted ? 'bg-green-600' : 'bg-slate-200'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            Bienvenido a tu Asistente Legal
          </h1>
          <p className="text-slate-600">
            Configuremos tu cuenta en unos simples pasos
          </p>
        </div>

        {renderStepIndicator()}

        {message && (
          <Alert className={`mb-6 ${
            message.type === 'success' 
              ? 'border-green-200 bg-green-50 text-green-800' 
              : 'border-red-200 bg-red-50 text-red-800'
          }`}>
            <AlertDescription>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Step 1: Profile Setup */}
        {currentStep === 'profile_setup' && (
          <Card className="max-w-md mx-auto shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" />
                Configura tu Perfil
              </CardTitle>
              <CardDescription>
                Completa tu información para personalizar tu experiencia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-5">
                <div>
                  <Label htmlFor="display_name">Nombre Completo</Label>
                  <Input
                    id="display_name"
                    value={profileData.display_name}
                    onChange={(e) => setProfileData({...profileData, display_name: e.target.value})}
                    placeholder="Tu nombre completo"
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="username">Nombre de Usuario</Label>
                  <Input
                    id="username"
                    value={profileData.username}
                    onChange={(e) => setProfileData({...profileData, username: e.target.value.toLowerCase().replace(/\s/g, '_')})}
                    placeholder="tu_usuario"
                    required
                    className="mt-1"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Este será tu identificador único
                  </p>
                </div>

                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={isLoading}>
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
        )}

        {/* Step 2: Plan Selection */}
        {currentStep === 'plan_selection' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Badge className="bg-indigo-100 text-indigo-700 mb-4">
                <Sparkles className="w-3 h-3 mr-1" />
                Oferta de lanzamiento
              </Badge>
              <h2 className="text-2xl font-bold text-slate-900">
                Elige tu Plan
              </h2>
              <p className="text-slate-600 mt-2">
                Accede a todas las funcionalidades del asistente legal
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* Plan Mensual */}
              {monthlyPlan && (
                <Card className="relative border-2 border-indigo-300 shadow-xl bg-white overflow-hidden">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <Badge className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-3 py-1 shadow-lg">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      Popular
                    </Badge>
                  </div>

                  <CardHeader className="text-center pt-8 pb-2">
                    <CardTitle className="text-xl">{monthlyPlan.name}</CardTitle>
                    <div className="mt-4">
                      {monthlyPlan.has_first_month_promo && (
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <span className="text-slate-400 line-through text-sm">
                            ${formatPrice(monthlyPlan.amount_in_cents)}
                          </span>
                          <Badge className="bg-green-100 text-green-700 text-xs">
                            Primer mes
                          </Badge>
                        </div>
                      )}
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-bold">
                          ${formatPrice(monthlyPlan.first_month_price || monthlyPlan.amount_in_cents)}
                        </span>
                        <span className="text-slate-500">COP</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Luego ${formatPrice(monthlyPlan.amount_in_cents)}/mes
                      </p>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <ul className="space-y-2 mb-6 text-sm">
                      {monthlyPlan.features.slice(0, 4).map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-slate-600">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={() => handleSubscribe(monthlyPlan.id)}
                      disabled={processingPlanId !== null}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                    >
                      {processingPlanId === monthlyPlan.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Procesando...
                        </>
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
                <Card className="relative border-2 border-slate-200 shadow-lg bg-white overflow-hidden">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <Badge className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-3 py-1 shadow-lg">
                      💰 -10%
                    </Badge>
                  </div>

                  <CardHeader className="text-center pt-8 pb-2">
                    <CardTitle className="text-xl">{yearlyPlan.name}</CardTitle>
                    <div className="mt-4">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <span className="text-slate-400 line-through text-sm">
                          ${formatPrice(5800000 * 12)}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-bold">
                          ${formatPrice(yearlyPlan.amount_in_cents)}
                        </span>
                        <span className="text-slate-500">COP</span>
                      </div>
                      <p className="text-xs text-green-600 mt-1">
                        ${formatPrice(Math.round(yearlyPlan.amount_in_cents / 12))}/mes
                      </p>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <ul className="space-y-2 mb-6 text-sm">
                      {yearlyPlan.features.slice(0, 4).map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-slate-600">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={() => handleSubscribe(yearlyPlan.id)}
                      disabled={processingPlanId !== null}
                      variant="outline"
                      className="w-full border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white"
                    >
                      {processingPlanId === yearlyPlan.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        'Suscribirse Anualmente'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Back button */}
            <div className="text-center mt-6">
              <Button 
                variant="ghost" 
                onClick={() => setCurrentStep('profile_setup')}
                className="text-slate-600"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al perfil
              </Button>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap justify-center gap-4 text-xs text-slate-500 mt-8">
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                Pago seguro con Wompi
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                Cancela cuando quieras
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

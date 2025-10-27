// app/[locale]/onboarding/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  User, 
  Loader2, 
  ArrowRight,
  ArrowLeft,
  Crown,
  CreditCard
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

type OnboardingStep = 'profile_setup' | 'plan_selection' | 'payment_setup' | 'completed';

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('profile_setup');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Profile form data
  const [profileData, setProfileData] = useState({
    display_name: '',
    bio: '',
    username: ''
  });

  // Plan selection
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [plans, setPlans] = useState<any[]>([]);

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

      // Get user profile to check onboarding step
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_step, email_verified, onboarding_completed')
        .eq('user_id', user.id)
        .single();

      if (profile?.onboarding_completed) {
        // User already completed onboarding, redirect to chat
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_home', true)
          .single();

        if (workspace) {
          router.push(`/${workspace.id}/chat`);
        }
        return;
      }

      // Set current step based on profile data
      if (profile?.onboarding_step) {
        setCurrentStep(profile.onboarding_step as OnboardingStep);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
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
          bio: profileData.bio,
          username: profileData.username,
          onboarding_step: 'plan_selection'
        })
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      setCurrentStep('plan_selection');
      setMessage({
        type: 'success',
        text: 'Perfil actualizado exitosamente'
      });

    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error actualizando perfil'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanSelection = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleContinueToPayment = () => {
    if (selectedPlan) {
      setCurrentStep('payment_setup');
    }
  };

  const handleSkipPayment = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Mark onboarding as completed
      await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          onboarding_step: 'completed'
        })
        .eq('user_id', user.id);

      // Redirect to chat
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_home', true)
        .single();

      if (workspace) {
        router.push(`/${workspace.id}/chat`);
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: 'profile_setup', label: 'Perfil', icon: User },
      { key: 'plan_selection', label: 'Plan', icon: Crown },
      { key: 'payment_setup', label: 'Pago', icon: CreditCard },
      { key: 'completed', label: 'Completado', icon: CheckCircle }
    ];

    return (
      <div className="flex items-center justify-center space-x-4 mb-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.key === currentStep;
          const isCompleted = steps.findIndex(s => s.key === currentStep) > index;
          
          return (
            <div key={step.key} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                isActive 
                  ? 'border-blue-600 bg-blue-600 text-white' 
                  : isCompleted 
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-gray-300 bg-white text-gray-500'
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`ml-2 text-sm font-medium ${
                isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
              }`}>
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-8 h-0.5 mx-4 ${
                  isCompleted ? 'bg-green-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderProfileSetup = () => (
    <Card>
      <CardHeader>
        <CardTitle>Configura tu Perfil</CardTitle>
        <CardDescription>
          Completa tu información personal para comenzar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <Label htmlFor="display_name">Nombre Completo</Label>
            <Input
              id="display_name"
              value={profileData.display_name}
              onChange={(e) => setProfileData({...profileData, display_name: e.target.value})}
              placeholder="Tu nombre completo"
              required
            />
          </div>

          <div>
            <Label htmlFor="username">Nombre de Usuario</Label>
            <Input
              id="username"
              value={profileData.username}
              onChange={(e) => setProfileData({...profileData, username: e.target.value})}
              placeholder="tu_usuario"
              required
            />
          </div>

          <div>
            <Label htmlFor="bio">Biografía (Opcional)</Label>
            <Textarea
              id="bio"
              value={profileData.bio}
              onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
              placeholder="Cuéntanos sobre ti..."
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
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
  );

  const renderPlanSelection = () => (
    <Card>
      <CardHeader>
        <CardTitle>Elige tu Plan</CardTitle>
        <CardDescription>
          Selecciona el plan que mejor se adapte a tus necesidades
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedPlan === plan.id
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handlePlanSelection(plan.id)}
            >
              <h3 className="font-semibold text-lg">{plan.name}</h3>
              <p className="text-gray-600 text-sm mb-2">{plan.description}</p>
              <div className="text-2xl font-bold text-blue-600">
                ${(plan.amount_in_cents / 100).toLocaleString()} COP
              </div>
              <ul className="mt-3 space-y-1">
                {plan.features.map((feature: string, index: number) => (
                  <li key={index} className="text-sm text-gray-600 flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex justify-between mt-6">
          <Button 
            variant="outline" 
            onClick={() => setCurrentStep('profile_setup')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Anterior
          </Button>
          
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={handleSkipPayment}
            >
              Saltar por ahora
            </Button>
            <Button 
              onClick={handleContinueToPayment}
              disabled={!selectedPlan}
            >
              Continuar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderPaymentSetup = () => (
    <Card>
      <CardHeader>
        <CardTitle>Configuración de Pago</CardTitle>
        <CardDescription>
          Configura tu método de pago para activar tu suscripción
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center space-y-4">
          <p className="text-gray-600">
            Serás redirigido a Wompi para configurar tu método de pago de forma segura.
          </p>
          
          <Button 
            className="w-full"
            onClick={() => {
              // Redirect to billing page with selected plan
              router.push(`/billing?plan_id=${selectedPlan}`);
            }}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Configurar Método de Pago
          </Button>

          <Button 
            variant="outline" 
            onClick={handleSkipPayment}
            className="w-full"
          >
            Saltar por ahora
          </Button>
        </div>

        <div className="flex justify-start mt-6">
          <Button 
            variant="outline" 
            onClick={() => setCurrentStep('plan_selection')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Anterior
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Bienvenido a tu Asistente Legal
          </h1>
          <p className="mt-2 text-gray-600">
            Configuremos tu cuenta paso a paso
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

        {currentStep === 'profile_setup' && renderProfileSetup()}
        {currentStep === 'plan_selection' && renderPlanSelection()}
        {currentStep === 'payment_setup' && renderPaymentSetup()}
      </div>
    </div>
  );
}
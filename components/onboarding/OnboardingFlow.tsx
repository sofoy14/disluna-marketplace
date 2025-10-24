// components/onboarding/OnboardingFlow.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, CreditCard, User, Settings } from 'lucide-react';
// import { WompiCheckout } from '@/components/billing/WompiCheckout'; // ELIMINADO - Sistema de billing removido

interface OnboardingFlowProps {
  planId: string;
  planName: string;
  onComplete: () => void;
}

interface UserProfile {
  email: string;
  fullName: string;
  company?: string;
  phone?: string;
}

interface PaymentMethod {
  id: string;
  type: 'CARD' | 'NEQUI';
  last_four?: string;
  brand?: string;
}

export function OnboardingFlow({ planId, planName, onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [profile, setProfile] = useState<UserProfile>({
    email: '',
    fullName: '',
    company: '',
    phone: ''
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [username, setUsername] = useState('');
  const [isCreatingSubscription, setIsCreatingSubscription] = useState(false);
  const [subscriptionCreated, setSubscriptionCreated] = useState(false);

  const steps = [
    { id: 1, title: 'Perfil', icon: User, description: 'Información básica' },
    { id: 2, title: 'Pago', icon: CreditCard, description: 'Método de pago' },
    { id: 3, title: 'Configuración', icon: Settings, description: 'Configuración final' }
  ];

  const progress = (currentStep / steps.length) * 100;

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar campos requeridos
    if (!profile.email || !profile.fullName) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    // Aquí podrías crear el perfil del usuario
    console.log('Creating profile:', profile);
    setCurrentStep(2);
  };

  const handlePaymentMethodAdded = (method: PaymentMethod) => {
    setPaymentMethod(method);
    setCurrentStep(3);
  };

  const handleCreateSubscription = async () => {
    if (!paymentMethod) {
      alert('Por favor selecciona un método de pago');
      return;
    }

    setIsCreatingSubscription(true);

    try {
      // Crear suscripción con oferta especial
      const response = await fetch('/api/billing/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}` // Ajustar según tu sistema de auth
        },
        body: JSON.stringify({
          plan_id: planId,
          payment_source_id: paymentMethod.id,
          special_offer: true // Indicar que aplica oferta especial
        })
      });

      if (response.ok) {
        setSubscriptionCreated(true);
        setTimeout(() => {
          onComplete();
        }, 2000);
      } else {
        throw new Error('Error creating subscription');
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      alert('Error al crear la suscripción. Por favor intenta de nuevo.');
    } finally {
      setIsCreatingSubscription(false);
    }
  };

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      alert('Por favor ingresa un nombre de usuario');
      return;
    }

    // Aquí podrías actualizar el perfil con el username
    console.log('Setting username:', username);
    handleCreateSubscription();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bienvenido a {planName}
          </h1>
          <p className="text-gray-600">
            Completa estos pasos para comenzar tu experiencia
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            {steps.map((step) => (
              <div key={step.id} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep >= step.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {currentStep > step.id ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                <div className="ml-2 hidden sm:block">
                  <p className={`text-sm font-medium ${
                    currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-400">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {React.createElement(steps[currentStep - 1].icon, { className: "w-5 h-5 mr-2" })}
              {steps[currentStep - 1].title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Step 1: Profile */}
            {currentStep === 1 && (
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    placeholder="tu@email.com"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="fullName">Nombre completo *</Label>
                  <Input
                    id="fullName"
                    value={profile.fullName}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                    placeholder="Juan Pérez"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="company">Empresa (opcional)</Label>
                  <Input
                    id="company"
                    value={profile.company || ''}
                    onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                    placeholder="Mi Empresa S.A.S"
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">Teléfono (opcional)</Label>
                  <Input
                    id="phone"
                    value={profile.phone || ''}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="+57 300 123 4567"
                  />
                </div>
                
                <Button type="submit" className="w-full">
                  Continuar
                </Button>
              </form>
            )}

            {/* Step 2: Payment */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Procesar Pago</h3>
                  <p className="text-gray-600 mb-4">
                    Serás redirigido a Wompi para completar el pago de forma segura
                  </p>
                </div>
                
                {/* ELIMINADO - Sistema de billing removido
                <WompiCheckout
                  planId={planId}
                  customerEmail={profile.email}
                  customerName={profile.fullName}
                  specialOffer={true}
                  onSuccess={() => setCurrentStep(3)}
                />
                */}
                <div className="text-center p-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-600 mb-4">
                    Sistema de facturación temporalmente deshabilitado
                  </p>
                  <Button onClick={() => setCurrentStep(3)}>
                    Continuar sin pago
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Configuration */}
            {currentStep === 3 && (
              <div className="space-y-6">
                {subscriptionCreated ? (
                  <div className="text-center">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-green-600 mb-2">
                      ¡Suscripción Creada Exitosamente!
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Tu primer mes por $1 USD ha sido procesado. 
                      Bienvenido a tu nueva experiencia.
                    </p>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">
                      Redirigiendo a tu dashboard...
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleUsernameSubmit} className="space-y-4">
                    <div className="text-center mb-6">
                      <h3 className="text-lg font-semibold mb-2">Configuración Final</h3>
                      <p className="text-gray-600">
                        Casi terminamos. Solo necesitamos algunos detalles finales.
                      </p>
                    </div>
                    
                    <div>
                      <Label htmlFor="username">Nombre de usuario *</Label>
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="juan.perez"
                        required
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Este será tu identificador único en la plataforma
                      </p>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Resumen de tu suscripción:</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Plan: {planName}</li>
                        <li>• Primer mes: $1 USD</li>
                        <li>• Método de pago: {paymentMethod?.type === 'CARD' ? 'Tarjeta' : 'Nequi'}</li>
                        <li>• Renovación automática mensual</li>
                      </ul>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={isCreatingSubscription}
                    >
                      {isCreatingSubscription ? 'Creando suscripción...' : 'Finalizar configuración'}
                    </Button>
                  </form>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

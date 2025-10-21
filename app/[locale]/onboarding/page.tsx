// app/[locale]/onboarding/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PricingSection } from '@/components/pricing/PricingSection';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  description: string;
  amount_in_cents: number;
  currency: string;
  features: string[];
}

export default function OnboardingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cargar planes desde la API
    const fetchPlans = async () => {
      try {
        const response = await fetch('/api/billing/plans');
        const data = await response.json();
        setPlans(data.plans);
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();

    // Si hay un planId en la URL, seleccionarlo automáticamente
    const planId = searchParams.get('plan');
    if (planId && plans.length > 0) {
      const plan = plans.find(p => p.id === planId);
      if (plan) {
        setSelectedPlan(plan);
      }
    }
  }, [searchParams, plans.length]);

  const handleSelectPlan = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      setSelectedPlan(plan);
    }
  };

  const handleOnboardingComplete = () => {
    // Redirigir al dashboard o página principal
    router.push('/dashboard');
  };

  const handleBackToPlans = () => {
    setSelectedPlan(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Si hay un plan seleccionado, mostrar el flujo de onboarding
  if (selectedPlan) {
    return (
      <OnboardingFlow
        planId={selectedPlan.id}
        planName={selectedPlan.name}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  // Mostrar selección de planes
  return (
    <div className="min-h-screen bg-white">
      {/* Header con navegación */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={() => router.push('/')}
                className="flex items-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al inicio
              </Button>
            </div>
            <div className="text-sm text-gray-500">
              Paso 1 de 3: Selecciona tu plan
            </div>
          </div>
        </div>
      </div>

      {/* Sección de precios */}
      <PricingSection
        plans={plans}
        onSelectPlan={handleSelectPlan}
      />

      {/* Información adicional */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-green-600 font-bold text-xl">$</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">Primer mes $1 USD</h3>
                <p className="text-gray-600 text-sm">
                  Comienza con nuestra oferta especial y descubre todas las funcionalidades
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-blue-600 font-bold text-xl">✓</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">Sin compromiso</h3>
                <p className="text-gray-600 text-sm">
                  Cancela en cualquier momento sin penalizaciones ni preguntas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-purple-600 font-bold text-xl">⚡</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">Configuración rápida</h3>
                <p className="text-gray-600 text-sm">
                  Solo 3 pasos para comenzar: perfil, pago y configuración
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-400">
            Pago seguro procesado por Wompi • Soporte 24/7 • Garantía de satisfacción
          </p>
        </div>
      </div>
    </div>
  );
}







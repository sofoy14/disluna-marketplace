// app/[locale]/select-plan/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Star, Zap, Crown } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  description: string;
  amount_in_cents: number;
  currency: string;
  features: string[];
  is_popular?: boolean;
}

export default function SelectPlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [specialOffer, setSpecialOffer] = useState<any>(null);

  useEffect(() => {
    fetchPlans();
    fetchSpecialOffer();
  }, []);

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

  const fetchSpecialOffer = async () => {
    try {
      const response = await fetch('/api/billing/special-offers');
      const data = await response.json();
      if (data.offers && data.offers.length > 0) {
        setSpecialOffer(data.offers[0]);
      }
    } catch (error) {
      console.error('Error fetching special offer:', error);
    }
  };

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleContinue = () => {
    if (!selectedPlan) return;
    
    // Redirigir a la página de pago con el plan seleccionado
    router.push(`/payment?plan_id=${selectedPlan}`);
  };

  const getPlanIcon = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'básico':
        return <CheckCircle className="w-6 h-6 text-blue-600" />;
      case 'profesional':
        return <Star className="w-6 h-6 text-purple-600" />;
      case 'empresarial':
        return <Crown className="w-6 h-6 text-gold-600" />;
      default:
        return <Zap className="w-6 h-6 text-gray-600" />;
    }
  };

  const formatPrice = (amountInCents: number, planId: string) => {
    const isSpecialOffer = specialOffer && specialOffer.plan_id === planId;
    const originalPrice = amountInCents / 1000;
    
    if (isSpecialOffer) {
      const discountedPrice = Math.max(100, amountInCents - specialOffer.discount_value) / 1000;
      return (
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            ${discountedPrice.toLocaleString()} COP
          </div>
          <div className="text-sm text-gray-500 line-through">
            ${originalPrice.toLocaleString()} COP
          </div>
          <Badge className="mt-1 bg-green-100 text-green-800">
            Primer mes especial
          </Badge>
        </div>
      );
    }
    
    return (
      <div className="text-center">
        <div className="text-2xl font-bold">
          ${originalPrice.toLocaleString()} COP
        </div>
        <div className="text-sm text-gray-500">por mes</div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando planes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Selecciona tu Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Elige el plan que mejor se adapte a las necesidades de tu firma legal
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            const isSpecialOfferPlan = specialOffer && specialOffer.plan_id === plan.id;
            
            return (
              <Card 
                key={plan.id} 
                className={`relative cursor-pointer transition-all duration-200 ${
                  isSelected 
                    ? 'ring-2 ring-blue-500 shadow-lg scale-105' 
                    : 'hover:shadow-lg hover:scale-102'
                } ${isSpecialOfferPlan ? 'border-green-200' : ''}`}
                onClick={() => handlePlanSelect(plan.id)}
              >
                {isSpecialOfferPlan && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-green-500 text-white px-4 py-1">
                      ¡Oferta Especial!
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-4">
                    {getPlanIcon(plan.name)}
                  </div>
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <p className="text-gray-600 mt-2">{plan.description}</p>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="mb-6">
                    {formatPrice(plan.amount_in_cents, plan.id)}
                  </div>
                  
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className={`w-full ${
                      isSelected 
                        ? 'bg-blue-600 hover:bg-blue-700' 
                        : 'bg-gray-600 hover:bg-gray-700'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlanSelect(plan.id);
                    }}
                  >
                    {isSelected ? 'Seleccionado' : 'Seleccionar'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Button 
            onClick={handleContinue}
            disabled={!selectedPlan}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
          >
            Continuar al Pago
          </Button>
        </div>
      </div>
    </div>
  );
}






// components/billing/PlanSelector.tsx
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star } from 'lucide-react';
import { formatCurrency } from '@/lib/wompi/utils';

interface Plan {
  id: string;
  name: string;
  description: string;
  amount_in_cents: number;
  features: string[];
}

interface PlanSelectorProps {
  plans: Plan[];
  currentPlanId?: string;
  onSelectPlan: (planId: string) => void;
  isLoading?: boolean;
}

export function PlanSelector({ plans, currentPlanId, onSelectPlan, isLoading = false }: PlanSelectorProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const handlePlanSelect = (planId: string) => {
    setSelectedPlanId(planId);
    onSelectPlan(planId);
  };

  const getPopularPlanIndex = () => {
    // Plan Profesional (index 1) is the most popular
    return 1;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
      {plans.map((plan, index) => {
        const isPopular = index === getPopularPlanIndex();
        const isCurrentPlan = currentPlanId === plan.id;
        const isSelected = selectedPlanId === plan.id;
        
        return (
          <Card 
            key={plan.id} 
            className={`relative transition-all duration-200 ${
              isPopular 
                ? 'border-2 border-blue-500 shadow-xl scale-105' 
                : isSelected 
                  ? 'border-2 border-green-500 shadow-lg' 
                  : 'border border-gray-200 hover:shadow-md'
            }`}
          >
            {isPopular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-blue-500 text-white px-4 py-1 gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  Más Popular
                </Badge>
              </div>
            )}
            
            {isCurrentPlan && (
              <div className="absolute -top-4 right-4">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Plan Actual
                </Badge>
              </div>
            )}
            
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl font-bold text-gray-900">
                {plan.name}
              </CardTitle>
              <CardDescription className="text-gray-600 mt-2">
                {plan.description}
              </CardDescription>
              
              <div className="mt-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-4xl font-bold text-green-600">
                    {formatCurrency(plan.amount_in_cents)}
                  </span>
                  <span className="text-lg text-gray-500">COP</span>
                </div>
                <div className="text-sm text-gray-500">
                  por mes
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-x-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button
                onClick={() => handlePlanSelect(plan.id)}
                disabled={isCurrentPlan || isLoading}
                className={`w-full ${
                  isCurrentPlan 
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                    : isPopular 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-gray-900 hover:bg-gray-800'
                }`}
                size="lg"
              >
                {isCurrentPlan ? 'Plan Actual' : isLoading ? 'Procesando...' : 'Suscribirse'}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}






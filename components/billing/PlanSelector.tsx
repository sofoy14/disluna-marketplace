// components/billing/PlanSelector.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Star, Zap } from 'lucide-react';
import { formatCurrency } from '@/lib/wompi/utils';

interface Plan {
  id: string;
  name: string;
  description: string;
  amount_in_cents: number;
  features: string[];
  is_active: boolean;
}

interface PlanSelectorProps {
  onSelectPlan: (planId: string) => void;
  currentPlanId?: string;
  loading?: boolean;
}

export function PlanSelector({ onSelectPlan, currentPlanId, loading }: PlanSelectorProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [fetchingPlans, setFetchingPlans] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/billing/plans');
      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans || []);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setFetchingPlans(false);
    }
  };

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
    onSelectPlan(planId);
  };

  const getPlanIcon = (planName: string) => {
    if (planName.toLowerCase().includes('básico')) {
      return <CheckCircle className="h-6 w-6 text-blue-500" />;
    } else if (planName.toLowerCase().includes('profesional')) {
      return <Star className="h-6 w-6 text-purple-500" />;
    } else if (planName.toLowerCase().includes('empresarial')) {
      return <Zap className="h-6 w-6 text-yellow-500" />;
    }
    return <CheckCircle className="h-6 w-6 text-gray-500" />;
  };

  const isPopular = (planName: string) => {
    return planName.toLowerCase().includes('profesional');
  };

  const isCurrentPlan = (planId: string) => {
    return currentPlanId === planId;
  };

  if (fetchingPlans) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold">Elige tu Plan</h2>
        <p className="text-muted-foreground mt-2">
          Selecciona el plan que mejor se adapte a tus necesidades
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card 
            key={plan.id} 
            className={`relative transition-all duration-200 ${
              selectedPlan === plan.id 
                ? 'ring-2 ring-primary shadow-lg' 
                : 'hover:shadow-md'
            } ${
              isPopular(plan.name) 
                ? 'border-primary' 
                : ''
            }`}
          >
            {isPopular(plan.name) && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">
                  Más Popular
                </Badge>
              </div>
            )}
            
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-2">
                {getPlanIcon(plan.name)}
              </div>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <p className="text-muted-foreground text-sm">
                {plan.description}
              </p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold">
                  {formatCurrency(plan.amount_in_cents)}
                </div>
                <div className="text-sm text-muted-foreground">por mes</div>
              </div>

              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button 
                className="w-full" 
                variant={isPopular(plan.name) ? "default" : "outline"}
                onClick={() => handleSelectPlan(plan.id)}
                disabled={loading || isCurrentPlan(plan.id)}
              >
                {isCurrentPlan(plan.id) 
                  ? 'Plan Actual' 
                  : loading 
                    ? 'Procesando...' 
                    : 'Seleccionar Plan'
                }
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>
          Todos los planes incluyen soporte técnico y actualizaciones automáticas.
        </p>
        <p className="mt-1">
          Puedes cambiar o cancelar tu plan en cualquier momento.
        </p>
      </div>
    </div>
  );
}






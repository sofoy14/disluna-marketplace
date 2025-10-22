// components/pricing/PricingSection.tsx
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  description: string;
  amount_in_cents: number;
  currency: string;
  features: string[];
}

interface PricingSectionProps {
  plans: Plan[];
  onSelectPlan: (planId: string) => void;
}

export function PricingSection({ plans, onSelectPlan }: PricingSectionProps) {
  const convertToUSD = (copAmount: number) => {
    // Conversión aproximada COP a USD (1 USD ≈ 4000 COP)
    return Math.round(copAmount / 4000);
  };

  const getOriginalPrice = (plan: Plan) => {
    return convertToUSD(plan.amount_in_cents);
  };

  const getFirstMonthPrice = () => {
    return 1; // $1 USD para el primer mes
  };

  return (
    <div className="py-16 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Elige tu plan perfecto
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Comienza con nuestra oferta especial
          </p>
          
          {/* Oferta especial destacada */}
          <div className="inline-flex items-center bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-full text-lg font-semibold shadow-lg mb-8">
            <Star className="w-5 h-5 mr-2" />
            ¡Primer mes por solo $1 USD!
            <Star className="w-5 h-5 ml-2" />
          </div>
          
          <p className="text-sm text-gray-500">
            Después del primer mes, el precio regular se aplicará automáticamente
          </p>
        </div>

        {/* Planes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => {
            const isPopular = index === 1; // Plan Profesional es el más popular
            const originalPrice = getOriginalPrice(plan);
            
            return (
              <Card 
                key={plan.id} 
                className={`relative ${isPopular ? 'border-2 border-blue-500 shadow-xl scale-105' : 'border border-gray-200'}`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-500 text-white px-4 py-1">
                      Más Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="text-gray-600 mt-2">
                    {plan.description}
                  </CardDescription>
                  
                  {/* Precios */}
                  <div className="mt-6">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="text-4xl font-bold text-green-600">
                        ${getFirstMonthPrice()}
                      </span>
                      <span className="text-lg text-gray-500">USD</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      Primer mes
                    </div>
                    <div className="mt-2 text-sm text-gray-400 line-through">
                      Después: ${originalPrice} USD/mes
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    onClick={() => onSelectPlan(plan.id)}
                    className={`w-full ${isPopular ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-900 hover:bg-gray-800'} text-white py-3 text-lg font-semibold`}
                  >
                    Comenzar por $1 USD
                  </Button>
                  
                  <p className="text-xs text-gray-500 text-center mt-3">
                    Cancelación en cualquier momento
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {/* Nota adicional */}
        <div className="text-center mt-12">
          <p className="text-sm text-gray-500">
            Todos los planes incluyen soporte técnico y actualizaciones automáticas
          </p>
        </div>
      </div>
    </div>
  );
}



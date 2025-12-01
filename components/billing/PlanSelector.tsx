// components/billing/PlanSelector.tsx
"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Crown, Sparkles, MessageSquare, FolderOpen, Mic, Building2 } from 'lucide-react';
import { formatCurrency } from '@/lib/wompi/utils';

interface Plan {
  id: string;
  name: string;
  description: string;
  amount_in_cents: number;
  features: string[];
  plan_type?: string;
  max_output_tokens_monthly?: number;
  max_processes?: number;
  max_transcription_hours?: number;
  has_multiple_workspaces?: boolean;
  has_processes?: boolean;
  has_transcriptions?: boolean;
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

  // Find PRO plan by plan_type
  const isPro = (plan: Plan) => plan.plan_type === 'pro';
  
  // Filter to only show active plans with correct types
  const activePlans = plans.filter(p => 
    p.plan_type === 'basic' || p.plan_type === 'pro'
  ).sort((a, b) => (a.plan_type === 'basic' ? -1 : 1));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
      {activePlans.map((plan, index) => {
        const isProPlan = isPro(plan);
        const isCurrentPlan = currentPlanId === plan.id;
        const isSelected = selectedPlanId === plan.id;
        
        return (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card 
              className={`relative overflow-hidden transition-all duration-300 h-full ${
                isProPlan 
                  ? 'border-2 border-indigo-500 shadow-xl shadow-indigo-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950' 
                  : isSelected 
                    ? 'border-2 border-emerald-500 shadow-lg' 
                    : 'border border-border hover:shadow-md hover:border-primary/30'
              }`}
            >
              {/* Decorative background for PRO */}
              {isProPlan && (
                <>
                  <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
                  <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl" />
                  <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl" />
                </>
              )}

              {isProPlan && (
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-4 py-1.5 gap-1.5 shadow-lg">
                    <Crown className="w-3.5 h-3.5 fill-current" />
                    Recomendado
                  </Badge>
                </div>
              )}
              
              {isCurrentPlan && (
                <div className="absolute -top-1 right-4">
                  <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Plan Actual
                  </Badge>
                </div>
              )}
              
              <CardHeader className={`text-center pb-6 pt-8 relative z-10 ${isProPlan ? 'text-white' : ''}`}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  {isProPlan ? (
                    <Sparkles className="w-6 h-6 text-amber-400" />
                  ) : (
                    <MessageSquare className="w-6 h-6 text-primary" />
                  )}
                  <CardTitle className={`text-2xl font-bold ${isProPlan ? 'text-white' : 'text-foreground'}`}>
                    {plan.name}
                  </CardTitle>
                </div>
                <CardDescription className={`mt-2 ${isProPlan ? 'text-slate-300' : 'text-muted-foreground'}`}>
                  {plan.description}
                </CardDescription>
                
                <div className="mt-6">
                  <div className="flex items-baseline justify-center gap-1 mb-1">
                    <span className={`text-4xl font-bold ${isProPlan ? 'text-white' : 'text-foreground'}`}>
                      ${Math.round(plan.amount_in_cents / 100).toLocaleString('es-CO')}
                    </span>
                  </div>
                  <div className={`text-sm ${isProPlan ? 'text-slate-400' : 'text-muted-foreground'}`}>
                    COP / mes
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0 relative z-10">
                {/* Key Features Summary */}
                <div className={`grid grid-cols-2 gap-3 mb-6 p-4 rounded-xl ${
                  isProPlan ? 'bg-white/5' : 'bg-muted/50'
                }`}>
                  <div className="flex items-center gap-2">
                    <MessageSquare className={`w-4 h-4 ${isProPlan ? 'text-indigo-400' : 'text-primary'}`} />
                    <span className={`text-xs ${isProPlan ? 'text-slate-300' : 'text-muted-foreground'}`}>
                      {plan.max_output_tokens_monthly === -1 ? 'Tokens ilimitados' : '2M tokens/mes'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FolderOpen className={`w-4 h-4 ${plan.has_processes ? (isProPlan ? 'text-emerald-400' : 'text-emerald-500') : 'text-muted-foreground/50'}`} />
                    <span className={`text-xs ${isProPlan ? 'text-slate-300' : 'text-muted-foreground'}`}>
                      {plan.has_processes ? `${plan.max_processes} procesos` : 'Sin procesos'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mic className={`w-4 h-4 ${plan.has_transcriptions ? (isProPlan ? 'text-purple-400' : 'text-purple-500') : 'text-muted-foreground/50'}`} />
                    <span className={`text-xs ${isProPlan ? 'text-slate-300' : 'text-muted-foreground'}`}>
                      {plan.has_transcriptions ? `${plan.max_transcription_hours}h transcripción` : 'Sin transcripción'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className={`w-4 h-4 ${plan.has_multiple_workspaces ? (isProPlan ? 'text-amber-400' : 'text-amber-500') : 'text-muted-foreground/50'}`} />
                    <span className={`text-xs ${isProPlan ? 'text-slate-300' : 'text-muted-foreground'}`}>
                      {plan.has_multiple_workspaces ? 'Multi workspace' : '1 workspace'}
                    </span>
                  </div>
                </div>

                {/* Features List */}
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-x-3">
                      <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        isProPlan ? 'text-emerald-400' : 'text-emerald-500'
                      }`} />
                      <span className={`text-sm ${isProPlan ? 'text-slate-300' : 'text-muted-foreground'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                
                <Button
                  onClick={() => handlePlanSelect(plan.id)}
                  disabled={isCurrentPlan || isLoading}
                  className={`w-full ${
                    isCurrentPlan 
                      ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                      : isProPlan 
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 shadow-lg shadow-indigo-500/25' 
                        : 'bg-primary hover:bg-primary/90'
                  }`}
                  size="lg"
                >
                  {isCurrentPlan ? 'Plan Actual' : isLoading ? 'Procesando...' : 'Suscribirse'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}






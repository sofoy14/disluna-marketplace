// components/pricing/PricingSection.tsx
"use client"

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Star, Crown, MessageSquare, FolderOpen, Mic, Building2, Sparkles, ArrowRight } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  description: string;
  amount_in_cents: number;
  currency: string;
  features: string[];
  plan_type?: string;
  max_output_tokens_monthly?: number;
  max_processes?: number;
  max_transcription_hours?: number;
  has_multiple_workspaces?: boolean;
  has_processes?: boolean;
  has_transcriptions?: boolean;
}

interface PricingSectionProps {
  plans?: Plan[];
  onSelectPlan: (planId: string) => void;
}

// Default plans if none provided
const defaultPlans = [
  {
    id: "basic",
    name: "Plan Básico",
    description: "Ideal para abogados que buscan asistencia IA en sus consultas diarias",
    amount_in_cents: 2000000, // $20.000 COP
    currency: "COP",
    plan_type: "basic",
    max_output_tokens_monthly: 2000000,
    max_processes: 0,
    max_transcription_hours: 0,
    has_multiple_workspaces: false,
    has_processes: false,
    has_transcriptions: false,
    features: [
      "Chat con asistente legal IA",
      "Hasta 2 millones de tokens/mes",
      "Análisis de normativa colombiana",
      "Búsqueda inteligente de jurisprudencia",
      "Soporte por email",
      "1 espacio de trabajo"
    ]
  },
  {
    id: "pro",
    name: "Plan PRO",
    description: "La solución completa para profesionales del derecho que necesitan todo",
    amount_in_cents: 5000000, // $50.000 COP
    currency: "COP",
    plan_type: "pro",
    max_output_tokens_monthly: -1,
    max_processes: 7,
    max_transcription_hours: 5,
    has_multiple_workspaces: true,
    has_processes: true,
    has_transcriptions: true,
    features: [
      "Chat con asistente legal IA ilimitado",
      "Tokens de chat ilimitados",
      "Análisis de normativa colombiana",
      "Búsqueda inteligente de jurisprudencia",
      "Soporte prioritario 24/7",
      "Múltiples espacios de trabajo",
      "7 procesos legales incluidos",
      "5 horas de transcripción de audio"
    ]
  }
];

export function PricingSection({ plans: providedPlans, onSelectPlan }: PricingSectionProps) {
  // Use provided plans or defaults
  const plans = providedPlans && providedPlans.length > 0 ? providedPlans : defaultPlans;
  
  // Filter to only show basic and pro plans
  const displayPlans = plans.filter(p => 
    p.plan_type === 'basic' || p.plan_type === 'pro'
  ).sort((a, b) => (a.plan_type === 'basic' ? -1 : 1));

  // If no matching plans, use defaults
  const finalPlans = displayPlans.length > 0 ? displayPlans : defaultPlans;

  const formatPrice = (cents: number) => {
    return `$${Math.round(cents / 100).toLocaleString('es-CO')}`;
  };

  const getFeaturesList = (plan: Plan) => {
    // Build features list based on plan capabilities
    const features = [];
    
    if (plan.plan_type === 'pro') {
      features.push({ name: "Chat con asistente legal IA ilimitado", included: true });
      features.push({ name: "Tokens de chat ilimitados", included: true });
    } else {
      features.push({ name: "Chat con asistente legal IA", included: true });
      features.push({ name: "Hasta 2 millones de tokens/mes", included: true });
    }
    
    features.push({ name: "Análisis de normativa colombiana", included: true });
    features.push({ name: "Búsqueda inteligente de jurisprudencia", included: true });
    features.push({ name: plan.plan_type === 'pro' ? "Soporte prioritario 24/7" : "Soporte por email", included: true });
    features.push({ name: plan.has_multiple_workspaces ? "Múltiples espacios de trabajo" : "1 espacio de trabajo", included: true });
    features.push({ name: `${plan.max_processes || 0} procesos legales incluidos`, included: !!plan.has_processes });
    features.push({ name: `${plan.max_transcription_hours || 0} horas de transcripción`, included: !!plan.has_transcriptions });
    
    return features;
  };

  return (
    <div className="py-16 bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 px-4 py-1.5">
            <Sparkles className="w-4 h-4 mr-1" />
            Precios simples y transparentes
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Elige el plan perfecto para tu práctica
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Dos planes diseñados para abogados colombianos. Sin costos ocultos, cancela cuando quieras.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {finalPlans.map((plan, index) => {
            const isPro = plan.plan_type === 'pro';
            const features = getFeaturesList(plan);
            
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className={`relative h-full overflow-hidden transition-all duration-300 ${
                    isPro 
                      ? 'border-2 border-primary shadow-2xl shadow-primary/20 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white' 
                      : 'border hover:shadow-lg hover:border-primary/30'
                  }`}
                >
                  {/* Decorative background for PRO */}
                  {isPro && (
                    <>
                      <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
                      <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl" />
                      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl" />
                    </>
                  )}

                  {/* Popular badge */}
                  {isPro && (
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 z-20">
                      <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-4 py-1.5 gap-1.5 shadow-lg border-0">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        Más Popular
                      </Badge>
                    </div>
                  )}

                  <CardHeader className={`text-center pt-10 pb-6 relative z-10`}>
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <div className={`p-2.5 rounded-xl ${
                        isPro 
                          ? 'bg-gradient-to-br from-indigo-500 to-purple-600' 
                          : 'bg-primary/10'
                      }`}>
                        {isPro ? (
                          <Crown className="w-6 h-6 text-white" />
                        ) : (
                          <MessageSquare className="w-6 h-6 text-primary" />
                        )}
                      </div>
                    </div>
                    
                    <CardTitle className={`text-2xl font-bold ${isPro ? 'text-white' : ''}`}>
                      {plan.name}
                    </CardTitle>
                    <CardDescription className={`mt-2 ${isPro ? 'text-slate-300' : ''}`}>
                      {plan.description}
                    </CardDescription>
                    
                    <div className="mt-6">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className={`text-5xl font-bold ${isPro ? 'text-white' : ''}`}>
                          {formatPrice(plan.amount_in_cents)}
                        </span>
                      </div>
                      <p className={`text-sm mt-1 ${isPro ? 'text-slate-400' : 'text-muted-foreground'}`}>
                        COP / mes
                      </p>
                    </div>
                  </CardHeader>

                  {/* Key highlights */}
                  <div className={`mx-6 mb-6 p-4 rounded-xl grid grid-cols-2 gap-3 relative z-10 ${
                    isPro ? 'bg-white/5' : 'bg-muted/50'
                  }`}>
                    <div className="flex items-center gap-2">
                      <MessageSquare className={`w-4 h-4 ${isPro ? 'text-indigo-400' : 'text-primary'}`} />
                      <div>
                        <p className={`text-[10px] uppercase tracking-wide ${isPro ? 'text-slate-500' : 'text-muted-foreground'}`}>
                          Chat IA
                        </p>
                        <p className={`text-sm font-semibold ${isPro ? 'text-white' : ''}`}>
                          {plan.max_output_tokens_monthly === -1 ? 'Ilimitado' : '2M tokens'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <FolderOpen className={`w-4 h-4 ${plan.has_processes ? (isPro ? 'text-emerald-400' : 'text-emerald-500') : 'text-muted-foreground/50'}`} />
                      <div>
                        <p className={`text-[10px] uppercase tracking-wide ${isPro ? 'text-slate-500' : 'text-muted-foreground'}`}>
                          Procesos
                        </p>
                        <p className={`text-sm font-semibold ${isPro ? 'text-white' : ''}`}>
                          {plan.has_processes ? plan.max_processes : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mic className={`w-4 h-4 ${plan.has_transcriptions ? (isPro ? 'text-purple-400' : 'text-purple-500') : 'text-muted-foreground/50'}`} />
                      <div>
                        <p className={`text-[10px] uppercase tracking-wide ${isPro ? 'text-slate-500' : 'text-muted-foreground'}`}>
                          Transcripción
                        </p>
                        <p className={`text-sm font-semibold ${isPro ? 'text-white' : ''}`}>
                          {plan.has_transcriptions ? `${plan.max_transcription_hours}h` : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className={`w-4 h-4 ${plan.has_multiple_workspaces ? (isPro ? 'text-amber-400' : 'text-amber-500') : 'text-muted-foreground/50'}`} />
                      <div>
                        <p className={`text-[10px] uppercase tracking-wide ${isPro ? 'text-slate-500' : 'text-muted-foreground'}`}>
                          Workspaces
                        </p>
                        <p className={`text-sm font-semibold ${isPro ? 'text-white' : ''}`}>
                          {plan.has_multiple_workspaces ? '∞' : '1'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <CardContent className="pt-0 relative z-10">
                    <ul className="space-y-3">
                      {features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-x-3">
                          {feature.included ? (
                            <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                              isPro ? 'text-emerald-400' : 'text-emerald-500'
                            }`} />
                          ) : (
                            <X className="w-5 h-5 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
                          )}
                          <span className={`text-sm ${
                            feature.included 
                              ? (isPro ? 'text-slate-300' : '') 
                              : 'text-muted-foreground/60 line-through'
                          }`}>
                            {feature.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <div className="p-6 pt-4 relative z-10">
                    <Button
                      onClick={() => onSelectPlan(plan.id)}
                      className={`w-full gap-2 ${
                        isPro 
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 shadow-lg shadow-indigo-500/25' 
                          : ''
                      }`}
                      variant={isPro ? "default" : "outline"}
                      size="lg"
                    >
                      {isPro ? 'Comenzar con PRO' : 'Comenzar con Básico'}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                    <p className={`text-xs text-center mt-3 ${isPro ? 'text-slate-500' : 'text-muted-foreground'}`}>
                      Sin permanencia · Cancela cuando quieras
                    </p>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
        
        {/* Footer note */}
        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            Todos los planes incluyen actualizaciones automáticas y acceso a nuevas funcionalidades
          </p>
        </div>
      </div>
    </div>
  );
}

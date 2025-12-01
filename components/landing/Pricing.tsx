"use client"

import { Check, X, Star, Crown, MessageSquare, FolderOpen, Mic, Building2, Sparkles, ArrowRight, Shield } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import LayoutEffect from "./LayoutEffect"
import SectionWrapper from "./SectionWrapper"
import { motion } from "framer-motion"

export default function Pricing() {
  const plans = [
    {
      id: "basic",
      name: "Plan Básico",
      price: "$29.000",
      priceValue: 29000,
      period: "/mes",
      description: "Ideal para abogados que buscan asistencia IA en sus consultas diarias",
      icon: MessageSquare,
      popular: false,
      features: [
        { name: "Chat con asistente legal IA", included: true },
        { name: "Hasta 2 millones de tokens/mes", included: true },
        { name: "Análisis de normativa colombiana", included: true },
        { name: "Búsqueda inteligente de jurisprudencia", included: true },
        { name: "Soporte por email", included: true },
        { name: "1 espacio de trabajo", included: true },
        { name: "Procesos legales (expedientes)", included: false },
        { name: "Transcripción de audiencias", included: false },
        { name: "Múltiples espacios de trabajo", included: false },
      ],
      cta: "Comenzar con Básico",
      ctaVariant: "outline" as const,
      highlights: [
        { icon: MessageSquare, label: "Chat IA", value: "2M tokens" },
        { icon: Building2, label: "Workspace", value: "1" },
      ]
    },
    {
      id: "pro",
      name: "Plan PRO",
      price: "$68.000",
      priceValue: 68000,
      period: "/mes",
      description: "La solución completa para profesionales del derecho que necesitan todo",
      icon: Crown,
      popular: true,
      features: [
        { name: "Chat con asistente legal IA ilimitado", included: true },
        { name: "Tokens de chat ilimitados", included: true },
        { name: "Análisis de normativa colombiana", included: true },
        { name: "Búsqueda inteligente de jurisprudencia", included: true },
        { name: "Soporte prioritario", included: true },
        { name: "Múltiples espacios de trabajo", included: true },
        { name: "7 procesos legales incluidos", included: true },
        { name: "5 horas de transcripción de audio", included: true },
        { name: "Análisis de documentos avanzado", included: true },
      ],
      cta: "Comenzar con PRO",
      ctaVariant: "default" as const,
      highlights: [
        { icon: MessageSquare, label: "Chat IA", value: "Ilimitado" },
        { icon: FolderOpen, label: "Procesos", value: "7" },
        { icon: Mic, label: "Transcripción", value: "5 horas" },
        { icon: Building2, label: "Workspaces", value: "∞" },
      ]
    }
  ]

  return (
    <SectionWrapper>
      <div id="pricing" className="custom-screen py-8">
        <LayoutEffect
          className="duration-1000 delay-300"
          isInviewState={{
            trueState: "opacity-100",
            falseState: "opacity-0",
          }}
        >
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-12">
            <Badge className="mb-4 px-4 py-1.5">
              <Sparkles className="w-4 h-4 mr-1" />
              Precios simples y transparentes
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
              Elige el plan perfecto para tu práctica
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Dos planes diseñados para abogados colombianos. Sin costos ocultos, cancela cuando quieras.
            </p>
          </div>
        </LayoutEffect>

        <LayoutEffect
          className="duration-1000 delay-500"
          isInviewState={{
            trueState: "opacity-100",
            falseState: "opacity-0",
          }}
        >
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => {
              const IconComponent = plan.icon
              const isPro = plan.popular
              
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15 }}
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
                          <IconComponent className={`w-6 h-6 ${isPro ? 'text-white' : 'text-primary'}`} />
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
                            {plan.price}
                          </span>
                        </div>
                        <p className={`text-sm mt-1 ${isPro ? 'text-slate-400' : 'text-muted-foreground'}`}>
                          COP {plan.period}
                        </p>
                      </div>
                    </CardHeader>

                    {/* Key highlights */}
                    <div className={`mx-6 mb-6 p-4 rounded-xl grid grid-cols-2 gap-3 relative z-10 ${
                      isPro ? 'bg-white/5' : 'bg-muted/50'
                    }`}>
                      {plan.highlights.map((highlight, idx) => {
                        const HIcon = highlight.icon
                        return (
                          <div key={idx} className="flex items-center gap-2">
                            <HIcon className={`w-4 h-4 ${
                              isPro ? 'text-indigo-400' : 'text-primary'
                            }`} />
                            <div>
                              <p className={`text-[10px] uppercase tracking-wide ${
                                isPro ? 'text-slate-500' : 'text-muted-foreground'
                              }`}>
                                {highlight.label}
                              </p>
                              <p className={`text-sm font-semibold ${
                                isPro ? 'text-white' : ''
                              }`}>
                                {highlight.value}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <CardContent className="pt-0 relative z-10">
                      <ul className="space-y-3">
                        {plan.features.map((feature, idx) => (
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

                    <CardFooter className="flex flex-col gap-4 pt-6 relative z-10">
                      <Button
                        asChild
                        className={`w-full gap-2 ${
                          isPro 
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 shadow-lg shadow-indigo-500/25' 
                            : ''
                        }`}
                        variant={plan.ctaVariant}
                        size="lg"
                      >
                        <Link href={`/login?plan=${plan.id}`}>
                          {plan.cta}
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </Button>
                      <p className={`text-xs text-center ${isPro ? 'text-slate-500' : 'text-muted-foreground'}`}>
                        Sin permanencia • Cancela cuando quieras
                      </p>
                    </CardFooter>
                  </Card>
                </motion.div>
              )
            })}
          </div>

          {/* Trust badges */}
          <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-500" />
              Pago seguro con Wompi
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              Facturación mensual
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              Soporte en español 24/7
            </div>
          </div>

          {/* Comparison note */}
          <div className="mt-8 text-center">
            <p className="text-muted-foreground text-sm">
              ¿No estás seguro? El <strong>Plan PRO</strong> incluye todo lo que necesitas para gestionar 
              tus casos legales de manera integral.
            </p>
          </div>
        </LayoutEffect>
      </div>
    </SectionWrapper>
  )
}

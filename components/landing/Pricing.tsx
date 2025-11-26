"use client"

import { Check, Star, Sparkles } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import LayoutEffect from "./LayoutEffect"
import SectionWrapper from "./SectionWrapper"
import { useState } from "react"

export default function Pricing() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')

  const plans = {
    monthly: {
      name: "Plan Mensual",
      regularPrice: "$58.000",
      promoPrice: "$4.000",
      promoLabel: "Primer mes",
      period: "/mes",
      description: "Acceso completo al asistente legal",
      features: [
        "Chat ilimitado con IA legal especializada",
        "Análisis de documentos legales",
        "Consultas sobre legislación colombiana",
        "Búsqueda inteligente de jurisprudencia",
        "Redacción asistida de documentos",
        "Soporte prioritario",
      ],
      cta: "Comenzar por $4.000",
      highlight: "⭐ Primer mes especial",
      popular: true,
    },
    yearly: {
      name: "Plan Anual",
      regularPrice: "$696.000",
      promoPrice: "$626.400",
      promoLabel: "Ahorra 10%",
      period: "/año",
      description: "Ahorra con facturación anual",
      features: [
        "Todo lo del plan mensual",
        "10% de descuento anual",
        "Facturación única al año",
        "Ahorro de $69.600",
        "Soporte prioritario",
        "Sin preocupaciones mensuales",
      ],
      cta: "Suscribirse Anualmente",
      highlight: "💰 Mejor valor",
      popular: false,
    }
  }

  const currentPlan = plans[billingPeriod]

  return (
    <SectionWrapper>
      <div id="pricing" className="custom-screen">
        <LayoutEffect
          className="duration-1000 delay-300"
          isInviewState={{
            trueState: "opacity-100",
            falseState: "opacity-0",
          }}
        >
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold">
              Un solo plan, todo incluido
            </h2>
            <p className="text-lg text-muted-foreground">
              Acceso completo a todas las funcionalidades del asistente legal inteligente
            </p>
          </div>
        </LayoutEffect>

        {/* Toggle Mensual/Anual */}
        <LayoutEffect
          className="duration-1000 delay-400"
          isInviewState={{
            trueState: "opacity-100",
            falseState: "opacity-0",
          }}
        >
          <div className="flex justify-center mt-8">
            <div className="bg-muted p-1 rounded-lg inline-flex">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                  billingPeriod === 'monthly'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Mensual
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors relative ${
                  billingPeriod === 'yearly'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Anual
                <Badge className="absolute -top-2 -right-2 text-xs px-1.5 py-0.5 bg-green-500">
                  -10%
                </Badge>
              </button>
            </div>
          </div>
        </LayoutEffect>

        <LayoutEffect
          className="duration-1000 delay-500"
          isInviewState={{
            trueState: "opacity-100",
            falseState: "opacity-0",
          }}
        >
          <div className="mt-12 max-w-lg mx-auto">
            <Card className="relative border-primary border-2 shadow-2xl">
              {/* Highlight Badge */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <Badge className="gap-1 px-4 py-1.5 text-sm">
                  <Sparkles className="w-4 h-4" />
                  {currentPlan.highlight}
                </Badge>
              </div>

              <CardHeader className="text-center pt-8">
                <CardTitle className="text-2xl">{currentPlan.name}</CardTitle>
                <CardDescription className="text-base">{currentPlan.description}</CardDescription>
                
                <div className="mt-6 space-y-2">
                  {billingPeriod === 'monthly' && (
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-lg text-muted-foreground line-through">
                        {currentPlan.regularPrice}
                      </span>
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        {currentPlan.promoLabel}
                      </Badge>
                    </div>
                  )}
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold">
                      {billingPeriod === 'monthly' ? currentPlan.promoPrice : currentPlan.promoPrice}
                    </span>
                    <span className="text-xl text-muted-foreground">COP</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {billingPeriod === 'monthly' 
                      ? `Luego ${currentPlan.regularPrice}/mes`
                      : currentPlan.promoLabel
                    }
                  </p>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                <ul className="space-y-4">
                  {currentPlan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-x-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="flex flex-col gap-4">
                <Button
                  asChild
                  className="w-full"
                  size="lg"
                >
                  <Link href={`/login?plan=${billingPeriod}`}>
                    {currentPlan.cta}
                  </Link>
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Cancela cuando quieras. Sin compromisos.
                </p>
              </CardFooter>
            </Card>

            {/* Trust badges */}
            <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Check className="w-4 h-4 text-green-500" />
                Pago seguro con Wompi
              </div>
              <div className="flex items-center gap-1">
                <Check className="w-4 h-4 text-green-500" />
                Cancela cuando quieras
              </div>
              <div className="flex items-center gap-1">
                <Check className="w-4 h-4 text-green-500" />
                Soporte en español
              </div>
            </div>
          </div>
        </LayoutEffect>
      </div>
    </SectionWrapper>
  )
}

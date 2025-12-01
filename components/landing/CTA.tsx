"use client"

import Link from "next/link"
import { ArrowRight, Crown, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import LayoutEffect from "./LayoutEffect"
import SectionWrapper from "./SectionWrapper"

export default function CTA() {
  return (
    <SectionWrapper>
      <div className="custom-screen">
        <LayoutEffect
          className="duration-1000 delay-300"
          isInviewState={{
            trueState: "opacity-100 scale-100",
            falseState: "opacity-0 scale-95",
          }}
        >
          <Card className="relative overflow-hidden border-2 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950">
            {/* Decorative elements */}
            <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
            
            <div className="relative px-6 py-16 sm:px-12 sm:py-20 z-10">
              <div className="max-w-2xl mx-auto text-center space-y-6">
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1">
                  <Crown className="w-3.5 h-3.5" />
                  Oferta Especial
                </Badge>
                
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
                  ¿Listo para revolucionar tu práctica legal?
                </h2>
                <p className="text-lg text-slate-300">
                  Elige entre nuestro Plan Básico a <strong className="text-white">$29.000/mes</strong> o 
                  el Plan PRO a <strong className="text-amber-400">$68.000/mes</strong> con todas las funciones incluidas.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Button 
                    size="lg" 
                    asChild 
                    className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 border-0"
                  >
                    <Link href="/login?plan=pro">
                      <Sparkles className="w-5 h-5" />
                      Comenzar con PRO
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    asChild 
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    <Link href="#pricing">Ver Todos los Planes</Link>
                  </Button>
                </div>
                
                <p className="text-sm text-slate-400">
                  Sin permanencia • Cancela cuando quieras • Pago seguro con Wompi
                </p>
              </div>
            </div>
          </Card>
        </LayoutEffect>
      </div>
    </SectionWrapper>
  )
}

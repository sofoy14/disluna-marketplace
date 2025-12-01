// components/landing/CTASection.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, CheckCircle, Crown, MessageSquare, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface CTASectionProps {
  className?: string;
}

export function CTASection({ className = '' }: CTASectionProps) {
  return (
    <div className={`py-16 bg-gradient-to-b from-background to-muted/30 ${className}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Header */}
        <div className="mb-12">
          <h2 className="text-4xl font-bold mb-4">
            ¿Listo para transformar tu práctica legal?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Únete a miles de abogados que ya están usando IA para ser más eficientes
          </p>
        </div>

        {/* Plans summary */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Basic Plan Card */}
          <Card className="border hover:border-primary/30 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-center gap-2 mb-4">
                <MessageSquare className="w-6 h-6 text-primary" />
                <span className="text-xl font-bold">Plan Básico</span>
              </div>
              
              <div className="text-3xl font-bold mb-2">
                $29.000 <span className="text-lg font-normal text-muted-foreground">COP/mes</span>
              </div>
              
              <p className="text-muted-foreground mb-4 text-sm">
                Chat con IA legal especializada y 2 millones de tokens mensuales
              </p>
              
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                <div className="flex items-center gap-1 text-sm">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>Chat IA</span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>2M tokens</span>
                </div>
              </div>
              
              <Link href="/login?plan=basic">
                <Button variant="outline" className="w-full">
                  Comenzar con Básico
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* PRO Plan Card */}
          <Card className="border-2 border-primary shadow-xl relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950">
            <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl" />
            
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Crown className="w-6 h-6 text-amber-400" />
                <span className="text-xl font-bold text-white">Plan PRO</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
              
              <div className="text-3xl font-bold text-white mb-2">
                $68.000 <span className="text-lg font-normal text-slate-400">COP/mes</span>
              </div>
              
              <p className="text-slate-300 mb-4 text-sm">
                Todo incluido: procesos, transcripciones y tokens ilimitados
              </p>
              
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                <div className="flex items-center gap-1 text-sm text-slate-300">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Ilimitado</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-slate-300">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>7 procesos</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-slate-300">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>5h audio</span>
                </div>
              </div>
              
              <Link href="/login?plan=pro">
                <Button className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 border-0">
                  Comenzar con PRO
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Beneficios adicionales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-blue-600 dark:text-blue-400 font-bold text-xl">⚡</span>
            </div>
            <h4 className="font-semibold mb-2">Configuración Rápida</h4>
            <p className="text-sm text-muted-foreground">
              Solo 3 pasos para comenzar: perfil, pago y configuración
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-green-600 dark:text-green-400 font-bold text-xl">🔒</span>
            </div>
            <h4 className="font-semibold mb-2">Pago Seguro</h4>
            <p className="text-sm text-muted-foreground">
              Procesado por Wompi con los más altos estándares de seguridad
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-purple-600 dark:text-purple-400 font-bold text-xl">🎯</span>
            </div>
            <h4 className="font-semibold mb-2">Sin Compromiso</h4>
            <p className="text-sm text-muted-foreground">
              Cancela en cualquier momento sin penalizaciones
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

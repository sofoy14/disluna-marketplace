// components/landing/CTASection.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, CheckCircle, Zap } from 'lucide-react';
import Link from 'next/link';

interface CTASectionProps {
  className?: string;
}

export function CTASection({ className = '' }: CTASectionProps) {
  return (
    <div className={`py-16 bg-gradient-to-b from-gray-50 to-white ${className}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Header */}
        <div className="mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            ¿Listo para transformar tu práctica legal?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Únete a miles de abogados que ya están usando IA para ser más eficientes
          </p>
        </div>

        {/* Oferta especial destacada */}
        <Card className="mb-12 border-2 border-green-500 shadow-xl">
          <CardContent className="p-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Zap className="w-6 h-6 text-green-500" />
              <span className="text-2xl font-bold text-green-600">
                OFERTA DE LANZAMIENTO
              </span>
              <Zap className="w-6 h-6 text-green-500" />
            </div>
            
            <h3 className="text-3xl font-bold text-gray-900 mb-2">
              Primer mes por solo $1 USD
            </h3>
            
            <p className="text-gray-600 mb-6">
              Después del primer mes, el precio regular se aplicará automáticamente
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm text-gray-600">Sin compromiso</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm text-gray-600">Cancela cuando quieras</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm text-gray-600">Configuración en 3 pasos</span>
              </div>
            </div>
            
            <Link href="/login">
              <Button 
                size="lg" 
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg font-semibold"
              >
                Comenzar por $1 USD
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            
            <p className="text-xs text-gray-500 mt-4">
              Pago seguro procesado por Wompi
            </p>
          </CardContent>
        </Card>

        {/* Beneficios adicionales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-blue-600 font-bold text-xl">⚡</span>
            </div>
            <h4 className="font-semibold mb-2">Configuración Rápida</h4>
            <p className="text-sm text-gray-600">
              Solo 3 pasos para comenzar: perfil, pago y configuración
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-green-600 font-bold text-xl">🔒</span>
            </div>
            <h4 className="font-semibold mb-2">Pago Seguro</h4>
            <p className="text-sm text-gray-600">
              Procesado por Wompi con los más altos estándares de seguridad
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-purple-600 font-bold text-xl">🎯</span>
            </div>
            <h4 className="font-semibold mb-2">Sin Compromiso</h4>
            <p className="text-sm text-gray-600">
              Cancela en cualquier momento sin penalizaciones
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

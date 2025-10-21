// components/landing/SpecialOfferBanner.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface SpecialOfferBannerProps {
  className?: string;
}

export function SpecialOfferBanner({ className = '' }: SpecialOfferBannerProps) {
  return (
    <div className={`bg-gradient-to-r from-green-500 via-emerald-600 to-teal-600 text-white py-8 px-4 ${className}`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Star className="w-6 h-6 text-yellow-300" />
              <Badge variant="secondary" className="bg-yellow-300 text-green-800 font-bold">
                OFERTA ESPECIAL
              </Badge>
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-1">
                ¡Primer mes por solo $1 USD!
              </h3>
              <p className="text-green-100 text-sm">
                Comienza tu experiencia premium con nuestra oferta de lanzamiento
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-green-100">Ahorra hasta</div>
              <div className="text-3xl font-bold">$149 USD</div>
              <div className="text-xs text-green-200">en tu primer mes</div>
            </div>
            
            <Link href="/onboarding">
              <Button 
                size="lg" 
                className="bg-white text-green-600 hover:bg-green-50 font-semibold px-6 py-3"
              >
                Comenzar Ahora
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-sm text-green-100">
            ⏰ Oferta válida por tiempo limitado • Sin compromiso • Cancela cuando quieras
          </p>
        </div>
      </div>
    </div>
  );
}







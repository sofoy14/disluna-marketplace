// components/landing/SpecialOfferBanner.tsx
import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Crown, MessageSquare, Sparkles } from 'lucide-react';

interface SpecialOfferBannerProps {
  className?: string;
}

export function SpecialOfferBanner({ className = '' }: SpecialOfferBannerProps) {
  return (
    <div className={`bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white py-6 px-4 ${className}`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-300" />
              <Badge variant="secondary" className="bg-white/20 text-white font-bold border-0">
                2 PLANES DISPONIBLES
              </Badge>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-1">
                Elige el plan perfecto para ti
              </h3>
              <p className="text-indigo-100 text-sm">
                Desde $29.000 COP/mes • Sin compromisos • Cancela cuando quieras
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-200" />
                <span className="text-white">Plan Básico <span className="text-indigo-200">$29.000</span></span>
              </div>
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-300" />
                <span className="text-white">Plan PRO <span className="text-amber-300">$68.000</span></span>
              </div>
            </div>
            
            <Link href="#pricing">
              <Button 
                size="lg" 
                className="bg-white text-indigo-600 hover:bg-indigo-50 font-semibold px-6"
              >
                Ver Planes
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

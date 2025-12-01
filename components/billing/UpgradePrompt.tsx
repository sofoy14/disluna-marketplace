// components/billing/UpgradePrompt.tsx
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crown, 
  Lock, 
  Sparkles, 
  FolderOpen, 
  Mic, 
  Building2,
  X,
  ArrowRight,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type FeatureType = 'processes' | 'transcriptions' | 'workspaces' | 'tokens';

interface UpgradePromptProps {
  feature: FeatureType;
  isOpen: boolean;
  onClose: () => void;
}

const featureInfo: Record<FeatureType, {
  icon: React.ElementType;
  title: string;
  description: string;
  benefits: string[];
}> = {
  processes: {
    icon: FolderOpen,
    title: 'Procesos Legales',
    description: 'Organiza y gestiona tus casos legales con procesos dedicados',
    benefits: [
      '7 procesos legales incluidos',
      'Organización de documentos por caso',
      'Seguimiento de expedientes',
      'Análisis contextual por proceso'
    ]
  },
  transcriptions: {
    icon: Mic,
    title: 'Transcripciones de Audio',
    description: 'Convierte audiencias y grabaciones en texto editable',
    benefits: [
      '5 horas de transcripción mensual',
      'Transcripción de audiencias',
      'Análisis automático del contenido',
      'Exportación a documentos'
    ]
  },
  workspaces: {
    icon: Building2,
    title: 'Múltiples Espacios de Trabajo',
    description: 'Separa tus proyectos y clientes en espacios dedicados',
    benefits: [
      'Espacios de trabajo ilimitados',
      'Organización por cliente o proyecto',
      'Configuración independiente',
      'Mayor productividad'
    ]
  },
  tokens: {
    icon: Sparkles,
    title: 'Tokens Ilimitados',
    description: 'Sin límites en tus conversaciones con el asistente legal',
    benefits: [
      'Conversaciones ilimitadas',
      'Análisis extensos de documentos',
      'Consultas sin restricciones',
      'Soporte prioritario'
    ]
  }
};

export function UpgradePrompt({ feature, isOpen, onClose }: UpgradePromptProps) {
  const router = useRouter();
  const info = featureInfo[feature];
  const Icon = info.icon;

  const handleUpgrade = () => {
    onClose();
    router.push('/billing?upgrade=pro');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950">
        <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
        
        {/* Decorative gradient orbs */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
        >
          <DialogHeader className="text-center pb-2">
            {/* Lock badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.1 }}
              className="mx-auto mb-4 relative"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <Icon className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shadow-lg">
                <Lock className="w-3 h-3 text-white" />
              </div>
            </motion.div>

            <DialogTitle className="text-xl font-bold text-white">
              {info.title}
            </DialogTitle>
            <DialogDescription className="text-slate-400 mt-1">
              {info.description}
            </DialogDescription>
          </DialogHeader>

          {/* Benefits list */}
          <div className="my-6 space-y-3">
            {info.benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-emerald-400" />
                </div>
                <span className="text-sm text-slate-300">{benefit}</span>
              </motion.div>
            ))}
          </div>

          {/* Pro badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 rounded-xl p-4 border border-indigo-500/20 mb-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                <span className="font-semibold text-white">Plan PRO</span>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-white">$68,000</div>
                <div className="text-xs text-slate-400">COP/mes</div>
              </div>
            </div>
          </motion.div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
            >
              Más tarde
            </Button>
            <Button
              onClick={handleUpgrade}
              className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Actualizar
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

// Simple inline upgrade badge for sidebar items
export function UpgradeBadge({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="ml-auto px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-400 border border-amber-500/30 hover:from-amber-500/30 hover:to-amber-600/30 transition-colors"
    >
      PRO
    </button>
  );
}

// Token limit warning banner
export function TokenLimitWarning({ 
  tokensUsed, 
  tokensLimit,
  onUpgrade 
}: { 
  tokensUsed: number; 
  tokensLimit: number;
  onUpgrade: () => void;
}) {
  const percentage = (tokensUsed / tokensLimit) * 100;
  
  if (percentage < 80) return null;

  const isNearLimit = percentage >= 80 && percentage < 100;
  const isAtLimit = percentage >= 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mx-4 mb-4 p-3 rounded-lg border ${
        isAtLimit 
          ? 'bg-red-500/10 border-red-500/30' 
          : 'bg-amber-500/10 border-amber-500/30'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-1.5 rounded-lg ${
          isAtLimit ? 'bg-red-500/20' : 'bg-amber-500/20'
        }`}>
          <Sparkles className={`w-4 h-4 ${
            isAtLimit ? 'text-red-400' : 'text-amber-400'
          }`} />
        </div>
        <div className="flex-1">
          <p className={`text-sm font-medium ${
            isAtLimit ? 'text-red-300' : 'text-amber-300'
          }`}>
            {isAtLimit 
              ? '¡Límite de tokens alcanzado!' 
              : 'Estás cerca del límite de tokens'}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {isAtLimit 
              ? 'Actualiza para continuar usando el chat'
              : `Has usado ${Math.round(percentage)}% de tus tokens`}
          </p>
          <Button
            size="sm"
            onClick={onUpgrade}
            className="mt-2 h-7 text-xs bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
          >
            Actualizar a PRO
          </Button>
        </div>
      </div>
    </motion.div>
  );
}









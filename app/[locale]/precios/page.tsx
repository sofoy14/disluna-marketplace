// app/[locale]/precios/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  Loader2,
  Star,
  Zap,
  X,
  MessageSquare,
  FolderOpen,
  Mic,
  Building2,
  GraduationCap,
  Briefcase,
  Shield,
  HelpCircle,
  Coins,
  FileText,
  Search,
  Clock,
  Sparkles,
  CreditCard,
  Receipt,
  XIcon,
  Info,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ShaderCanvas } from '@/components/shader-canvas';
import {
  CREDIT_COSTS,
  TOPUP_PACKAGES,
  TOPUP_CREDIT_VALIDITY_MONTHS,
  PLAN_LIMITS,
  MOCK_WALLET,
  formatCOP,
  type TopUpPackage,
  type WalletBalance,
} from '@/lib/pricing';

// ============================================
// INTERFACES (sin cambios - compatibilidad backend)
// ============================================

interface Plan {
  id: string;
  name: string;
  description: string;
  amount_in_cents: number;
  currency: string;
  billing_period: 'monthly' | 'yearly';
  features: string[];
  plan_type?: 'basic' | 'pro' | 'enterprise';
  max_output_tokens_monthly?: number;
  max_processes?: number;
  max_transcription_hours?: number;
  has_multiple_workspaces?: boolean;
  has_processes?: boolean;
  has_transcriptions?: boolean;
}

interface Subscription {
  id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  plan_id: string;
  plans?: {
    name: string;
    description: string;
    amount_in_cents: number;
    billing_period: string;
    plan_type?: string;
  };
}

interface SpecialOffer {
  id: string;
  name: string;
  discount_value: number;
  discount_type: string;
  plan_id: string;
}

// ============================================
// COMPONENTE: GlassCard (existente - sin cambios)
// ============================================

function GlassCard({
  children,
  className = "",
  highlighted = false,
  hoverEffect = true,
}: {
  children: React.ReactNode;
  className?: string;
  highlighted?: boolean;
  hoverEffect?: boolean;
}) {
  return (
    <div className={`
      relative overflow-hidden rounded-3xl
      ${highlighted
        ? 'bg-violet-950/40 border border-violet-500/30'
        : 'bg-white/[0.03] border border-white/[0.08]'
      }
      backdrop-blur-xl shadow-2xl
      ${hoverEffect ? 'transition-all duration-500 hover:border-violet-500/40 hover:bg-white/[0.05] hover:shadow-violet-500/10 hover:-translate-y-1' : ''}
      ${className}
    `}>
      {/* Top highlight line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      {/* Inner glow for highlighted cards */}
      {highlighted && (
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-fuchsia-500/5 pointer-events-none" />
      )}
      {children}
    </div>
  );
}

// ============================================
// COMPONENTE: MetricItem (nuevo)
// ============================================

function MetricItem({
  icon: Icon,
  label,
  value,
  subtext,
  highlight = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtext?: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className={`p-1.5 rounded-lg ${highlight ? 'bg-violet-500/15' : 'bg-white/[0.05]'}`}>
        <Icon className={`w-3.5 h-3.5 ${highlight ? 'text-violet-400' : 'text-white/50'}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase text-white/40 tracking-wider leading-tight">{label}</p>
        <p className={`text-sm font-medium truncate ${highlight ? 'text-white' : 'text-white/80'}`}>
          {value}
        </p>
        {subtext && <p className="text-[10px] text-white/30">{subtext}</p>}
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE: ChatTooltip (nuevo)
// ============================================

function ChatTooltip({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[280px] bg-slate-900/95 border-white/10 text-white p-3 text-xs leading-relaxed"
        >
          <p>
            Uso razonable: pensado para trabajo diario. Para análisis intensivo de documentos
            y búsquedas web usa créditos.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================
// COMPONENTE: CreditsModal (nuevo)
// ============================================

function CreditsModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="text-xs text-violet-400/80 hover:text-violet-300 flex items-center gap-1.5 transition-colors underline underline-offset-2">
          <HelpCircle className="w-3.5 h-3.5" />
          ¿Qué son los créditos?
        </button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900/95 border-white/10 text-white max-w-md backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium flex items-center gap-2">
            <Coins className="w-5 h-5 text-violet-400" />
            ¿Qué son los créditos?
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm text-white/70">
          <p>
            Los créditos son la moneda interna de ALI para acciones intensivas que consumen
            más recursos de IA.
          </p>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
              <span>Tu suscripción incluye cupos mensuales para acciones básicas</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
              <span>Acciones intensivas (análisis de procesos, documentos grandes, búsquedas web) consumen créditos</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
              <span>Puedes recargar créditos en cualquier momento</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <p className="text-xs text-white/50 mb-1">Vigencia de créditos recargados</p>
            <p className="text-white font-medium">
              {TOPUP_CREDIT_VALIDITY_MONTHS} meses desde la compra
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// COMPONENTE: WalletIndicator (nuevo)
// ============================================

function WalletIndicator({ wallet }: { wallet: WalletBalance }) {
  const monthProgress = Math.round((wallet.monthCreditsUsed / wallet.monthCreditsTotal) * 100);

  return (
    <GlassCard className="p-4 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Coins className="w-4 h-4 text-violet-400" />
        <h3 className="text-sm font-medium text-white">Tu saldo de créditos</h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/10">
          TODO: Conectar con backend
        </span>
      </div>

      <div className="space-y-4">
        {/* Créditos del mes */}
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-white/60">Créditos del mes incluidos</span>
            <span className="text-white font-medium">
              {wallet.monthCreditsUsed} / {wallet.monthCreditsTotal}
            </span>
          </div>
          <Progress value={monthProgress} className="h-1.5 bg-white/10" />
          <p className="text-[10px] text-white/40 mt-1">
            Se reinician cada mes con tu suscripción
          </p>
        </div>

        {/* Créditos recargados */}
        {wallet.topupCreditsTotal > 0 && (
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-white/60">Créditos recargados</span>
              <span className="text-white font-medium">
                {wallet.topupCreditsUsed} / {wallet.topupCreditsTotal}
              </span>
            </div>
            <Progress
              value={(wallet.topupCreditsUsed / wallet.topupCreditsTotal) * 100}
              className="h-1.5 bg-white/10"
            />
            <p className="text-[10px] text-white/40 mt-1">
              Vigencia: {TOPUP_CREDIT_VALIDITY_MONTHS} meses
            </p>
          </div>
        )}

        {wallet.topupCreditsTotal === 0 && (
          <p className="text-xs text-white/40 italic">
            No tienes recargas activas. Compra créditos abajo para acciones adicionales.
          </p>
        )}
      </div>
    </GlassCard>
  );
}

// ============================================
// COMPONENTE: TopUpCard (nuevo)
// ============================================

function TopUpCard({
  pkg,
  onRecharge,
  isProcessing,
}: {
  pkg: TopUpPackage;
  onRecharge: (pkg: TopUpPackage) => void;
  isProcessing: boolean;
}) {
  return (
    <GlassCard
      hoverEffect
      highlighted={pkg.popular}
      className={`relative ${pkg.popular ? 'ring-1 ring-violet-500/30' : ''}`}
    >
      {pkg.badge && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
          <Badge className={`${pkg.popular ? 'bg-violet-600' : 'bg-white/10'} text-white px-3 py-0.5 text-[10px] font-light border-0`}>
            {pkg.badge}
          </Badge>
        </div>
      )}

      <div className="p-5 text-center">
        <p className="text-sm font-medium text-white mb-1">{pkg.name}</p>
        <div className="flex items-baseline justify-center gap-0.5 mb-2">
          <span className="text-2xl font-light text-white">${formatCOP(pkg.priceCOP)}</span>
          <span className="text-xs text-white/40">COP</span>
        </div>
        <div className="flex items-center justify-center gap-1.5 mb-4">
          <Coins className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-sm text-violet-300 font-medium">{pkg.credits} créditos</span>
        </div>
        <Button
          size="sm"
          onClick={() => onRecharge(pkg)}
          disabled={isProcessing}
          className={`w-full h-9 text-xs ${
            pkg.popular
              ? 'bg-violet-600 hover:bg-violet-500'
              : 'bg-white/5 hover:bg-white/10 border border-white/10'
          } text-white rounded-lg transition-all`}
        >
          {isProcessing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <CreditCard className="w-3.5 h-3.5 mr-1.5" />
              Recargar
            </>
          )}
        </Button>
      </div>
    </GlassCard>
  );
}

// ============================================
// COMPONENTE: CostPerActionTable (nuevo)
// ============================================

function CostPerActionTable() {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Info className="w-4 h-4 text-violet-400" />
        <h3 className="text-sm font-medium text-white">Costo por acción</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-2.5 text-xs font-medium text-white/50 uppercase tracking-wider">
                Acción
              </th>
              <th className="text-right py-2.5 text-xs font-medium text-white/50 uppercase tracking-wider">
                Créditos
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {CREDIT_COSTS.map((cost) => (
              <tr key={cost.action} className="group">
                <td className="py-3">
                  <div>
                    <p className="text-white/80 font-medium">{cost.action}</p>
                    <p className="text-xs text-white/40">{cost.description}</p>
                    {cost.unit && (
                      <p className="text-[10px] text-violet-400/70">{cost.unit}</p>
                    )}
                  </div>
                </td>
                <td className="py-3 text-right">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 text-white font-medium text-xs">
                    <Coins className="w-3 h-3 text-violet-400" />
                    {cost.credits}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

// ============================================
// COMPONENTE: PlanMetricsGrid (nuevo)
// ============================================

function PlanMetricsGrid({ planType, isPro }: { planType: 'basic' | 'pro'; isPro: boolean }) {
  const limits = PLAN_LIMITS[planType];

  return (
    <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] mb-6">
      {/* Procesos incluidos */}
      <MetricItem
        icon={FolderOpen}
        label="Procesos"
        value={limits.processesIncluded > 0 ? `${limits.processesIncluded} incluidos` : '—'}
        subtext={limits.processesIncluded > 0 ? 'por mes' : 'No incluido'}
        highlight={isPro && limits.processesIncluded > 0}
      />

      {/* Análisis de proceso */}
      <MetricItem
        icon={Sparkles}
        label="Análisis IA"
        value={limits.processAnalysisRuns > 0 ? `${limits.processAnalysisRuns} runs` : '—'}
        subtext={limits.processAnalysisRuns > 0 ? 'por mes' : 'Requiere créditos'}
        highlight={isPro && limits.processAnalysisRuns > 0}
      />

      {/* Documentos */}
      <MetricItem
        icon={FileText}
        label="Documentos"
        value={limits.documentsPerMonth > 0 ? `~${limits.documentsPerMonth} pág` : '—'}
        subtext={limits.documentsPerMonth > 0 ? 'análisis/mes' : 'Requiere créditos'}
        highlight={isPro && limits.documentsPerMonth > 0}
      />

      {/* Búsquedas web */}
      <MetricItem
        icon={Search}
        label="Búsquedas web"
        value={`${limits.webSearches} consultas`}
        subtext="jurídicas/mes"
        highlight={isPro}
      />

      {/* Transcripción */}
      <MetricItem
        icon={Mic}
        label="Transcripción"
        value={limits.transcriptionMinutes > 0 ? `${limits.transcriptionMinutes} min` : '—'}
        subtext={limits.transcriptionMinutes > 0 ? 'por mes' : 'Requiere créditos'}
        highlight={isPro && limits.transcriptionMinutes > 0}
      />

      {/* Chat IA - con tooltip */}
      <ChatTooltip>
        <div className="cursor-help">
          <MetricItem
            icon={MessageSquare}
            label="Chat IA"
            value={limits.chatDescription.includes('Incluido') ? 'Incluido' : limits.chatDescription}
            subtext={limits.chatDescription.includes('Incluido') ? 'uso razonable' : 'mensual'}
            highlight={isPro}
          />
        </div>
      </ChatTooltip>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function PreciosPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  // Billing period toggle
  const [isYearly, setIsYearly] = useState(false);

  // Plans and offers
  const [plans, setPlans] = useState<Plan[]>([]);
  const [specialOffers, setSpecialOffers] = useState<SpecialOffer[]>([]);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);

  // TODO: Connect with real backend
  const [wallet] = useState<WalletBalance>(MOCK_WALLET);
  const [processingTopUp, setProcessingTopUp] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  // Check for error params on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const error = searchParams.get('error');
      const details = searchParams.get('details');

      if (error) {
        const errorMessages: Record<string, string> = {
          missing_params: 'Parámetros faltantes. Por favor intenta de nuevo.',
          wompi_config: 'Error de configuración del sistema de pagos.',
          plan_not_found: 'El plan seleccionado no está disponible.',
          workspace_not_found: 'No se encontró tu workspace.',
          user_not_found: 'No se encontró información del usuario.',
          subscription_create: 'Error al crear la suscripción.',
          subscription_update: 'Error al actualizar la suscripción.',
          server_error: 'Error del servidor. Por favor intenta más tarde.',
        };

        const errorText = errorMessages[error] || `Error: ${error}`;
        setMessage({
          type: 'error',
          text: details ? `${errorText} (${details})` : errorText,
        });

        // Clean URL
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    fetchPricingData();
  }, []);

  const fetchPricingData = async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push('/login');
        return;
      }

      // Get workspace
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_home', true)
        .single();

      if (workspace) {
        setWorkspaceId(workspace.id);
      }

      // Fetch plans
      await fetchPlansAndOffers();

      // Get current subscription
      if (workspace?.id) {
        const subscriptionResponse = await fetch(
          `/api/billing/subscriptions?workspace_id=${workspace.id}`
        );
        if (subscriptionResponse.ok) {
          const subscriptionData = await subscriptionResponse.json();
          if (subscriptionData.success && subscriptionData.data) {
            setCurrentSubscription(subscriptionData.data);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching pricing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlansAndOffers = async () => {
    try {
      // Fetch plans
      const plansResponse = await fetch('/api/billing/plans');
      const plansData = await plansResponse.json();

      if (plansData.success) {
        setPlans(plansData.data);
      }

      // Fetch special offers
      const offersResponse = await fetch('/api/billing/offers');
      if (offersResponse.ok) {
        const offersData = await offersResponse.json();
        if (offersData.success) {
          setSpecialOffers(offersData.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const handleSubscribe = async (planId: string) => {
    setProcessingPlanId(planId);
    setMessage(null);

    if (!workspaceId) {
      setMessage({
        type: 'error',
        text: 'No se encontró tu workspace. Por favor recarga la página.',
      });
      setProcessingPlanId(null);
      return;
    }

    const checkoutUrl = `/api/billing/checkout-redirect?plan_id=${encodeURIComponent(planId)}&workspace_id=${encodeURIComponent(workspaceId)}`;
    window.location.href = checkoutUrl;
  };

  // TODO: Implement real top-up handler when backend is ready
  const handleTopUp = async (pkg: TopUpPackage) => {
    setProcessingTopUp(pkg.id);
    setMessage(null);

    console.warn('[TODO] Top-up not implemented yet:', {
      package: pkg,
      workspaceId,
      timestamp: new Date().toISOString(),
    });

    // Stub: Simulate processing
    setTimeout(() => {
      setMessage({
        type: 'success',
        text: `Recarga "${pkg.name}" lista para implementar. Revisa la consola para detalles.`,
      });
      setProcessingTopUp(null);
    }, 1000);
  };

  // Helper functions for plans
  const formatPrice = (amountInCents: number) => {
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amountInCents / 100);
  };

  const currentBillingPeriod = isYearly ? 'yearly' : 'monthly';

  const getPlan = (type: 'basic' | 'pro', period: 'monthly' | 'yearly') => {
    return plans.find((p) => p.plan_type === type && p.billing_period === period);
  };

  const professionalPlan = getPlan('pro', currentBillingPeriod);
  const studentPlan = getPlan('basic', currentBillingPeriod);

  const getMonthlyEquivalent = (yearlyAmount: number) => {
    return Math.round(yearlyAmount / 12);
  };

  const currentPlanId = currentSubscription?.plan_id;
  const currentPlanType = currentSubscription?.plans?.plan_type;

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full w-full bg-[#0a0a0f] flex items-center justify-center relative">
        <div className="fixed inset-0 bg-gradient-to-br from-violet-950/20 via-transparent to-violet-950/10 pointer-events-none" />

        <div className="text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <ShaderCanvas size={120} shaderId={1} />
            <div className="absolute inset-0 bg-violet-500/20 blur-3xl rounded-full -z-10 animate-pulse" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-violet-300/60 font-light mt-6 tracking-wide"
          >
            Cargando...
          </motion.p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full w-full bg-[#0a0a0f] relative">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-violet-900/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-violet-800/5 rounded-full blur-[120px]" />
      </div>

      <div
        className="fixed inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 w-full">
        <div className="w-full px-4 py-8 md:py-12 pb-20">
          {/* Orb */}
          <motion.div
            className="flex justify-center mb-6"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <ShaderCanvas size={100} shaderId={2} />
          </motion.div>

          {/* Welcome Text */}
          <motion.div
            className="text-center mb-10 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-2xl md:text-3xl font-light text-white mb-3 tracking-tight">
              Bienvenido al <span className="text-violet-400 font-normal">Asistente Legal</span>
            </h1>
            <p className="text-violet-300/50 font-light">Presente e inteligente</p>
            <p className="text-white/60 mt-4 font-light">
              Selecciona el plan que mejor se ajuste a ti
            </p>
          </motion.div>

          {message && (
            <Alert
              className={`mb-6 max-w-md mx-auto border ${
                message.type === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border-red-500/30 bg-red-500/10 text-red-400'
              }`}
            >
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          {/* Wallet Indicator */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="max-w-4xl mx-auto"
          >
            <WalletIndicator wallet={wallet} />
          </motion.div>

          {/* Billing Period Toggle + Credits Link */}
          <motion.div
            className="flex flex-col items-center gap-3 mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-center gap-4">
              <span
                className={`text-sm font-light transition-colors ${!isYearly ? 'text-white' : 'text-white/40'}`}
              >
                Mensual
              </span>
              <Switch
                checked={isYearly}
                onCheckedChange={setIsYearly}
                className="data-[state=checked]:bg-violet-600"
              />
              <span
                className={`text-sm font-light transition-colors flex items-center gap-2 ${isYearly ? 'text-white' : 'text-white/40'}`}
              >
                Anual
                <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-xs font-light">
                  30% OFF
                </Badge>
              </span>
            </div>
            <CreditsModal />
          </motion.div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
            {/* Professional Plan */}
            {professionalPlan && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <GlassCard highlighted className="h-full relative">
                  {/* Recommended Badge */}
                  {currentPlanId !== professionalPlan.id && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <Badge className="bg-violet-600 text-white px-4 py-1 text-xs font-light border-0 shadow-lg shadow-violet-500/30">
                        <Star className="w-3 h-3 mr-1.5 fill-current" />
                        Recomendado
                      </Badge>
                    </div>
                  )}

                  {/* Current Plan Badge */}
                  {currentPlanId === professionalPlan.id && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <Badge className="bg-emerald-600 text-white px-4 py-1 text-xs font-light border-0 shadow-lg shadow-emerald-500/30">
                        Plan Actual
                      </Badge>
                    </div>
                  )}

                  <div className="p-8 pt-10">
                    {/* Icon & Title */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20">
                        <Briefcase className="w-6 h-6 text-violet-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-medium text-white">{professionalPlan.name}</h3>
                        <p className="text-sm text-violet-300/50 font-light">
                          {professionalPlan.description}
                        </p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-6">
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-light text-white">
                            ${formatPrice(professionalPlan.amount_in_cents)}
                          </span>
                          <span className="text-white/40 font-light">COP</span>
                        </div>
                        <p className="text-sm text-white/40 font-light">
                          / {isYearly ? 'año' : 'mes'}
                        </p>
                        {isYearly && (
                          <p className="text-xs text-violet-400/80 font-light mt-1">
                            Equivale a ${formatPrice(getMonthlyEquivalent(professionalPlan.amount_in_cents))}{' '}
                            COP/mes
                          </p>
                        )}
                      </div>
                    </div>

                    {/* NEW: Metrics Grid */}
                    <PlanMetricsGrid planType="pro" isPro={true} />

                    {/* Features List */}
                    <ul className="space-y-3 mb-8">
                      {[
                        'Chat con asistente legal IA incluido',
                        'Análisis de normativa colombiana',
                        'Múltiples espacios de trabajo',
                        '7 procesos legales incluidos',
                        '300 minutos de transcripción',
                        'Soporte prioritario',
                      ].map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <CheckCircle className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-white/70 font-light">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <Button
                      onClick={() => handleSubscribe(professionalPlan.id)}
                      disabled={processingPlanId !== null || currentPlanId === professionalPlan.id}
                      className="w-full h-12 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium transition-all duration-300 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30"
                    >
                      {processingPlanId === professionalPlan.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Procesando...
                        </>
                      ) : currentPlanId === professionalPlan.id ? (
                        'Plan Actual'
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          {currentPlanType === 'basic'
                            ? 'Actualizar a Profesional'
                            : 'Elegir Plan Profesional'}
                        </>
                      )}
                    </Button>
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {/* Student Plan */}
            {studentPlan && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <GlassCard className="h-full relative">
                  {/* Current Plan Badge */}
                  {currentPlanId === studentPlan.id && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <Badge className="bg-emerald-600 text-white px-4 py-1 text-xs font-light border-0 shadow-lg shadow-emerald-500/30">
                        Plan Actual
                      </Badge>
                    </div>
                  )}

                  <div className="p-8 pt-10">
                    {/* Icon & Title */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="p-3 rounded-2xl bg-white/[0.05] border border-white/[0.08]">
                        <GraduationCap className="w-6 h-6 text-white/60" />
                      </div>
                      <div>
                        <h3 className="text-xl font-medium text-white">{studentPlan.name}</h3>
                        <p className="text-sm text-white/40 font-light">
                          {studentPlan.description}
                        </p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-light text-white">
                          ${formatPrice(studentPlan.amount_in_cents)}
                        </span>
                        <span className="text-white/40 font-light">COP</span>
                      </div>
                      <p className="text-sm text-white/40 font-light">
                        / {isYearly ? 'año' : 'mes'}
                      </p>
                      {isYearly && (
                        <p className="text-xs text-violet-400/80 font-light mt-1">
                          Equivale a ${formatPrice(getMonthlyEquivalent(studentPlan.amount_in_cents))}{' '}
                          COP/mes
                        </p>
                      )}
                    </div>

                    {/* NEW: Metrics Grid */}
                    <PlanMetricsGrid planType="basic" isPro={false} />

                    {/* Features List */}
                    <ul className="space-y-3 mb-8">
                      {[
                        { text: 'Chat con asistente legal IA (3M tokens)', included: true },
                        { text: 'Análisis de normativa colombiana', included: true },
                        { text: 'Búsqueda de jurisprudencia (10/mes)', included: true },
                        { text: '1 espacio de trabajo', included: true },
                        { text: 'Procesos legales', included: false },
                        { text: 'Transcripción de audio', included: false },
                      ].map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          {feature.included ? (
                            <CheckCircle className="w-4 h-4 text-white/40 flex-shrink-0 mt-0.5" />
                          ) : (
                            <X className="w-4 h-4 text-white/20 flex-shrink-0 mt-0.5" />
                          )}
                          <span
                            className={`text-sm font-light ${feature.included ? 'text-white/60' : 'text-white/30 line-through'}`}
                          >
                            {feature.text}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <Button
                      onClick={() => handleSubscribe(studentPlan.id)}
                      disabled={processingPlanId !== null || currentPlanId === studentPlan.id}
                      variant="outline"
                      className="w-full h-12 bg-transparent border-white/10 text-white/70 hover:bg-white/5 hover:border-white/20 hover:text-white rounded-xl font-medium transition-all duration-300"
                    >
                      {processingPlanId === studentPlan.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Procesando...
                        </>
                      ) : currentPlanId === studentPlan.id ? (
                        'Plan Actual'
                      ) : currentPlanType === 'pro' ? (
                        'Cambiar a Estudiantil'
                      ) : (
                        'Elegir Plan Estudiantil'
                      )}
                    </Button>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </div>

          {/* NEW: Top-Up Section */}
          <motion.div
            className="max-w-4xl mx-auto mt-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="text-center mb-6">
              <h2 className="text-xl font-medium text-white mb-2">Amplía tu plan</h2>
              <p className="text-sm text-white/50 max-w-lg mx-auto">
                Recarga créditos para análisis de procesos, documentos, búsquedas web y
                transcripción.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {TOPUP_PACKAGES.map((pkg) => (
                <TopUpCard
                  key={pkg.id}
                  pkg={pkg}
                  onRecharge={handleTopUp}
                  isProcessing={processingTopUp === pkg.id}
                />
              ))}
            </div>
          </motion.div>

          {/* NEW: Cost per Action Table */}
          <motion.div
            className="max-w-4xl mx-auto mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <CostPerActionTable />
          </motion.div>

          {/* Trust badges (actualizados) */}
          <motion.div
            className="flex flex-wrap justify-center gap-6 text-xs text-white/30 mt-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-violet-400/50" />
              <span className="font-light">Pago seguro con Wompi</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-violet-400/50" />
              <span className="font-light">Cancela cuando quieras</span>
            </div>
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-violet-400/50" />
              <span className="font-light">Factura disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400/50" />
              <span className="font-light">Soporte prioritario</span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

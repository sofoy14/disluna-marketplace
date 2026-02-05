/**
 * Configuración de Precios y Créditos para ALI
 * 
 * TODO: Conectar con backend cuando esté disponible
 * Estos valores son configurables sin cambiar código de UI
 */

// ============================================
// CONFIGURACIÓN DE CRÉDITOS POR ACCIÓN
// ============================================

export interface CreditCost {
  action: string;
  credits: number;
  description: string;
  unit?: string;
}

export const CREDIT_COSTS: CreditCost[] = [
  {
    action: 'Análisis de proceso',
    credits: 40,
    description: 'Análisis completo con IA de un proceso legal',
    unit: 'por proceso'
  },
  {
    action: 'Documento',
    credits: 15,
    description: 'Análisis de documento de hasta 10 páginas',
    unit: '10 páginas'
  },
  {
    action: 'Búsqueda web jurídica',
    credits: 8,
    description: 'Consulta en bases de datos jurídicas y web',
    unit: 'por consulta'
  },
  {
    action: 'Transcripción',
    credits: 20,
    description: 'Transcripción de audio/video a texto',
    unit: '30 min'
  },
];

// ============================================
// PAQUETES DE RECARGA (TOP-UP)
// ============================================

export interface TopUpPackage {
  id: string;
  name: string;
  priceCOP: number;
  credits: number;
  popular?: boolean;
  badge?: string;
}

export const TOPUP_PACKAGES: TopUpPackage[] = [
  {
    id: 'topup-s',
    name: 'Recarga S',
    priceCOP: 10000,
    credits: 120,
  },
  {
    id: 'topup-m',
    name: 'Recarga M',
    priceCOP: 30000,
    credits: 400,
    popular: true,
    badge: 'Mejor valor',
  },
  {
    id: 'topup-l',
    name: 'Recarga L',
    priceCOP: 60000,
    credits: 900,
  },
  {
    id: 'topup-xl',
    name: 'Recarga XL',
    priceCOP: 120000,
    credits: 2000,
  },
  {
    id: 'topup-firma',
    name: 'Recarga Firma',
    priceCOP: 250000,
    credits: 4500,
    badge: 'Para equipos',
  },
];

// Vigencia de créditos recargados (en meses)
export const TOPUP_CREDIT_VALIDITY_MONTHS = 12;

// ============================================
// LÍMITES DE PLANES (MOCK - TODO: Conectar con backend)
// ============================================

export interface PlanLimits {
  planType: 'basic' | 'pro';
  processesIncluded: number;
  processAnalysisRuns: number;
  documentsPerMonth: number;
  webSearches: number;
  transcriptionMinutes: number;
  chatDescription: string;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  pro: {
    planType: 'pro',
    processesIncluded: 7,
    processAnalysisRuns: 20,
    documentsPerMonth: 50, // páginas
    webSearches: 30,
    transcriptionMinutes: 300, // 5 horas
    chatDescription: 'Incluido (uso razonable)',
  },
  basic: {
    planType: 'basic',
    processesIncluded: 0,
    processAnalysisRuns: 0,
    documentsPerMonth: 0,
    webSearches: 10,
    transcriptionMinutes: 0,
    chatDescription: '3M tokens/mes',
  },
};

// ============================================
// WALLET / SALDO (MOCK - TODO: Conectar con backend)
// ============================================

export interface WalletBalance {
  monthCreditsUsed: number;
  monthCreditsTotal: number;
  topupCreditsUsed: number;
  topupCreditsTotal: number;
}

// Mock data para desarrollo
export const MOCK_WALLET: WalletBalance = {
  monthCreditsUsed: 45,
  monthCreditsTotal: 100,
  topupCreditsUsed: 0,
  topupCreditsTotal: 0,
};

// ============================================
// UTILIDADES
// ============================================

export function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function calculateCostInCOP(credits: number): number {
  // Precio promedio por crédito basado en paquetes
  const avgCreditValue = 75; // COP por crédito (aproximado)
  return credits * avgCreditValue;
}

export function getPlanLimits(planType: 'basic' | 'pro'): PlanLimits {
  return PLAN_LIMITS[planType] || PLAN_LIMITS.basic;
}

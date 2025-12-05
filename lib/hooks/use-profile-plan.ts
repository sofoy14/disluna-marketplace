// lib/hooks/use-profile-plan.ts
// Hook simplificado para acceso a plan basado en el perfil del usuario
// Este hook usa el perfil del contexto en lugar de hacer llamadas API adicionales

import { useContext, useMemo } from 'react'
import { ALIContext } from '@/context/context'

export type PlanType = 'none' | 'basic' | 'pro' | 'enterprise'

export interface ProfilePlanAccess {
  // Estado de carga
  isLoading: boolean
  
  // Tipo de plan
  planType: PlanType
  
  // Verificaciones de plan
  hasActivePlan: boolean
  isStudentPlan: boolean
  isProfessionalPlan: boolean
  
  // Acceso a funcionalidades (basado en plan_type)
  canShowProcesses: boolean
  canShowTranscriptions: boolean
  canShowWorkspaceSwitcher: boolean
  
  // Nombre del plan para mostrar
  planDisplayName: string
}

/**
 * Hook simplificado que lee el plan directamente del perfil del usuario
 * El plan_type se sincroniza automáticamente via trigger en Supabase
 */
export function useProfilePlan(): ProfilePlanAccess {
  const { profile } = useContext(ALIContext)
  
  return useMemo(() => {
    // Si no hay perfil, aún está cargando
    if (!profile) {
      return {
        isLoading: true,
        planType: 'none',
        hasActivePlan: false,
        isStudentPlan: false,
        isProfessionalPlan: false,
        canShowProcesses: false,
        canShowTranscriptions: false,
        canShowWorkspaceSwitcher: false,
        planDisplayName: 'Cargando...'
      }
    }
    
    const planType = (profile.plan_type || 'none') as PlanType
    
    // Determinar acceso basado en el tipo de plan
    const isStudentPlan = planType === 'basic'
    const isProfessionalPlan = planType === 'pro' || planType === 'enterprise'
    const hasActivePlan = planType !== 'none'
    
    // Funcionalidades por plan
    // - basic (estudiantil): solo chat
    // - pro/enterprise (profesional): todas las funcionalidades
    const canShowProcesses = isProfessionalPlan
    const canShowTranscriptions = isProfessionalPlan
    const canShowWorkspaceSwitcher = isProfessionalPlan
    
    // Nombre para mostrar
    const planDisplayName = getPlanDisplayName(planType)
    
    return {
      isLoading: false,
      planType,
      hasActivePlan,
      isStudentPlan,
      isProfessionalPlan,
      canShowProcesses,
      canShowTranscriptions,
      canShowWorkspaceSwitcher,
      planDisplayName
    }
  }, [profile])
}

function getPlanDisplayName(planType: PlanType): string {
  switch (planType) {
    case 'basic':
      return 'Plan Estudiantil'
    case 'pro':
      return 'Plan Profesional'
    case 'enterprise':
      return 'Plan Empresarial'
    case 'none':
    default:
      return 'Sin suscripción'
  }
}

// Re-exportar para compatibilidad
export default useProfilePlan


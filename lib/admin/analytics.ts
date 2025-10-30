// Funciones para calcular métricas de analytics

export interface UserMetrics {
  total: number
  active: number
  inactive: number
  newToday: number
  newThisWeek: number
  newThisMonth: number
}

export interface RevenueMetrics {
  total: number
  thisMonth: number
  thisYear: number
}

export interface SubscriptionMetrics {
  total: number
  active: number
  byPlan: Array<{
    planName: string
    count: number
  }>
}

export function calculateUserGrowth(users: any[]): UserMetrics {
  const now = new Date()
  const today = new Date(now.setHours(0, 0, 0, 0))
  const weekAgo = new Date(now.setDate(now.getDate() - 7))
  const monthAgo = new Date(now.setMonth(now.getMonth() - 1))

  return {
    total: users.length,
    active: users.filter(u => u.is_active).length,
    inactive: users.filter(u => !u.is_active).length,
    newToday: users.filter(u => new Date(u.created_at) >= today).length,
    newThisWeek: users.filter(u => new Date(u.created_at) >= weekAgo).length,
    newThisMonth: users.filter(u => new Date(u.created_at) >= monthAgo).length
  }
}

export function calculateRevenue(subscriptions: any[]): RevenueMetrics {
  // Esta función necesita ser implementada según la lógica de pagos
  return {
    total: 0,
    thisMonth: 0,
    thisYear: 0
  }
}

export function calculateSubscriptionMetrics(subscriptions: any[]): SubscriptionMetrics {
  const active = subscriptions.filter(s => s.status === 'active')
  
  return {
    total: subscriptions.length,
    active: active.length,
    byPlan: [] // Implementar lógica de agrupación por plan
  }
}


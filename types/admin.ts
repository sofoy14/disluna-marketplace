// Tipos para el panel de administración

export interface AdminUser {
  id: string
  email: string
  name: string
  role: string | null
  is_active: boolean
  created_at: string
  updated_at: string | null
  last_login?: string
  subscription?: {
    plan_id: string
    status: string
    current_period_end: string
  }
  profile?: {
    display_name: string
    username: string
    bio: string
    image_url: string
  }
  stats?: {
    chats: number
    files: number
    messages: number
    storage: number
    tokens: number
    storageBreakdown?: {
      files: number
      fileItems: number
      documents: number
      embeddings: number
      total: number
    }
  }
}

export interface AdminMetrics {
  total_users: number
  active_users: number
  inactive_users: number
  new_users_today: number
  new_users_this_week: number
  new_users_this_month: number
  total_revenue: number
  revenue_this_month: number
  active_subscriptions: number
  subscriptions_by_plan: {
    plan_name: string
    count: number
  }[]
  // Métricas de consumo
  total_chats?: number
  total_messages?: number
  total_files?: number
  total_storage?: number
  total_tokens?: number
}

export interface ConsumptionData {
  user_id: string
  user_email: string
  user_name: string
  total_tokens: number
  chats_count: number
  searches_count: number
  files_uploaded: number
  storage_used: number
  api_calls: number
  last_activity: string
}

export interface DatabaseTable {
  name: string
  schema: string
  rows: number
  size: string
}

export interface DatabaseQuery {
  table: string
  columns: string[]
  filters: {
    column: string
    operator: string
    value: string
  }[]
  orderBy: {
    column: string
    direction: 'ASC' | 'DESC'
  } | null
  limit: number
  offset: number
}

export interface AdminAction {
  id: string
  admin_email: string
  action_type: string
  resource_type: string
  resource_id: string | null
  details: Record<string, any>
  ip_address: string | null
  created_at: string
}

export interface SystemMetrics {
  timestamp: string
  active_users: number
  api_requests_per_minute: number
  average_latency_ms: number
  error_count: number
  warning_count: number
  memory_usage: number
  cpu_usage: number
}


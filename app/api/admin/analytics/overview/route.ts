import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { isAdmin } from "@/lib/admin/check-admin"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const adminSession = cookieStore.get("admin_session")

    if (adminSession?.value !== "true") {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      )
    }

    // Initialize standard client for user session (if needed later) or for RLS-protected queries using user context.
    const supabaseUserClient = createClient(cookieStore)

    // Initialize ADMIN client with Service Role Key for privileged operations (listUsers)
    // We cannot use the standard client because it uses the Anon Key (public) which shouldn't have permissions to listUsers.
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing")
    }

    // Manual client creation for admin
    const { createClient: createSupabaseClient } = require('@supabase/supabase-js')
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Obtener usuarios de auth.users usando el cliente admin
    const { data, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
    const users = data?.users as any[] || []

    if (usersError) {
      console.error("Error fetching users:", usersError)
      return NextResponse.json(
        { error: "Error al obtener usuarios", details: usersError.message },
        { status: 500 }
      )
    }

    console.log("Users found:", users?.length || 0)

    // Todos los usuarios activos por ahora
    const activeUsers = users?.length || 0
    const inactiveUsers = 0

    // Nuevos usuarios (hoy)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const newUsersToday = users?.filter(u =>
      new Date(u.created_at || '') >= today
    ).length || 0

    // Nuevos usuarios (esta semana)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const newUsersThisWeek = users?.filter(u =>
      new Date(u.created_at || '') >= weekAgo
    ).length || 0

    // Nuevos usuarios (este mes)
    const monthAgo = new Date()
    monthAgo.setMonth(monthAgo.getMonth() - 1)
    const newUsersThisMonth = users?.filter(u =>
      new Date(u.created_at || '') >= monthAgo
    ).length || 0

    // Suscripciones
    // Use the admin client (or user client depending on RLS) for table queries.
    // Since we are in an admin route, using admin client bypasses RLS which is simpler for admin dashboard
    // IF the RLS prevents reading other users' data.
    const supabase = supabaseAdmin
    const { data: subscriptions } = await supabase
      .from("subscriptions")
      .select("*")
      .then(res => res.error ? { data: [] } : res)

    const activeSubscriptions = subscriptions?.filter((s: any) => s.status === 'active').length || 0

    // Suscripciones por plan (Safe fetch)
    let plans: any[] = []
    const plansRes = await supabase.from("plans").select("id, name")
    if (!plansRes.error) {
      plans = plansRes.data || []
    }

    const subscriptionsByPlan = plans?.map((plan: any) => ({
      plan_name: plan.name,
      count: subscriptions?.filter((s: any) => s.plan_id === plan.id && s.status === 'active').length || 0
    })) || []

    // Obtener métricas de consumo real
    // Cast to any to avoid TS errors
    const { data: chats } = await supabase.from("chats").select("id").then(res => res.error ? { data: [] } : res)
    const { data: messages } = await supabase.from("messages").select("id").then(res => res.error ? { data: [] } : res)

    // Files - explicitly handle array for reduce
    const filesRes = await supabase.from("files").select("id, size, tokens")
    const files = (filesRes.error ? [] : filesRes.data) as any[]

    const totalStorage = files?.reduce((acc: number, f: any) => acc + (f.size || 0), 0) || 0
    const totalTokens = files?.reduce((acc: number, f: any) => acc + (f.tokens || 0), 0) || 0

    // Ingresos
    let invoices: any[] = []
    const invRes = await supabase.from("invoices").select("amount_in_cents, status, created_at")
    if (!invRes.error) {
      invoices = invRes.data || []
    }

    const totalRevenue = invoices?.filter(i => i.status === 'paid')
      .reduce((acc, i) => acc + (i.amount_in_cents || 0), 0) || 0

    const monthAgoRevenue = new Date()
    monthAgoRevenue.setMonth(monthAgoRevenue.getMonth() - 1)
    const revenueThisMonth = invoices?.filter(i =>
      i.status === 'paid' && new Date(i.created_at) >= monthAgoRevenue
    ).reduce((acc, i) => acc + (i.amount_in_cents || 0), 0) || 0

    const metrics = {
      total_users: users?.length || 0,
      active_users: activeUsers,
      inactive_users: inactiveUsers,
      new_users_today: newUsersToday,
      new_users_this_week: newUsersThisWeek,
      new_users_this_month: newUsersThisMonth,
      total_revenue: totalRevenue / 100, // Convertir centavos a dólares
      revenue_this_month: revenueThisMonth / 100,
      active_subscriptions: activeSubscriptions,
      subscriptions_by_plan: subscriptionsByPlan,
      // Nuevas métricas de consumo
      total_chats: chats?.length || 0,
      total_messages: messages?.length || 0,
      total_files: files?.length || 0,
      total_storage: totalStorage,
      total_tokens: totalTokens
    }

    return NextResponse.json(metrics)
  } catch (error) {
    console.error("Error fetching admin metrics:", error)
    return NextResponse.json(
      { error: "Error al obtener métricas", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}


import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { isAdmin } from "@/lib/admin/check-admin"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user || !isAdmin(user.email)) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      )
    }

    // Obtener usuarios de auth.users
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()

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
    const { data: subscriptions } = await supabase
      .from("subscriptions")
      .select("*")

    const activeSubscriptions = subscriptions?.filter(s => s.status === 'active').length || 0

    // Suscripciones por plan
    const { data: plans } = await supabase
      .from("plans")
      .select("id, name")

    const subscriptionsByPlan = plans?.map(plan => ({
      plan_name: plan.name,
      count: subscriptions?.filter(s => s.plan_id === plan.id && s.status === 'active').length || 0
    })) || []

    // Obtener métricas de consumo real
    const { data: chats } = await supabase
      .from("chats")
      .select("id, user_id")

    const { data: messages } = await supabase
      .from("messages")
      .select("id, user_id")

    const { data: files } = await supabase
      .from("files")
      .select("id, user_id, size, tokens")

    const totalStorage = files?.reduce((acc, f) => acc + (f.size || 0), 0) || 0
    const totalTokens = files?.reduce((acc, f) => acc + (f.tokens || 0), 0) || 0

    // Ingresos
    const { data: invoices } = await supabase
      .from("invoices")
      .select("amount_in_cents, status, created_at")

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


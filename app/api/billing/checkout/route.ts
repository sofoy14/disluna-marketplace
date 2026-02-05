// app/api/billing/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateCheckoutData } from '@/lib/wompi/utils';
import { validateWompiConfig, getWompiCheckoutUrl } from '@/lib/wompi/config';
import { getSupabaseServer } from '@/lib/supabase/server-client';
import { getSessionUser } from '@/lib/server/auth/session';
import { assertWorkspaceAccess } from '@/lib/server/workspaces/access';

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServer();
  try {
    // Verificar configuración de Wompi
    const validation = validateWompiConfig();
    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Configuración de Wompi incompleta',
          message: `Faltan campos: ${validation.missingFields.join(', ')}`,
          missingFields: validation.missingFields
        },
        { status: 400 }
      );
    }

    const { plan_id, workspace_id } = await req.json();

    if (!plan_id || !workspace_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: plan_id and workspace_id'
        },
        { status: 400 }
      );
    }

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const access = await assertWorkspaceAccess(supabase, workspace_id, user.id).catch(() => null);
    if (!access) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    if (access.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: 'Only workspace admins can start checkout' },
        { status: 403 }
      );
    }

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("*")
      .eq("id", plan_id)
      .eq("is_active", true)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        {
          success: false,
          error: 'Plan not found',
          message: planError?.message || 'Unknown error'
        },
        { status: 404 }
      );
    }

    // Get workspace details using service role client
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", workspace_id)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json(
        {
          success: false,
          error: 'Workspace not found',
          message: workspaceError?.message || 'Unknown error'
        },
        { status: 404 }
      );
    }

    // Get user profile for email and name
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', workspace.user_id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        {
          success: false,
          error: 'User profile not found',
          message: profileError?.message || 'Unknown error'
        },
        { status: 404 }
      );
    }

    // Get user email from auth
    const { data: authUserData, error: userError } = await supabase.auth.admin.getUserById(workspace.user_id);

    if (userError || !authUserData.user?.email) {
      return NextResponse.json(
        {
          success: false,
          error: 'User email not found',
          message: userError?.message || 'Unknown error'
        },
        { status: 404 }
      );
    }

    // Use production URL as default
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://aliado.pro';

    // Generate checkout data
    const checkoutData = generateCheckoutData({
      planId: plan.id,
      planName: plan.name,
      amountInCents: plan.amount_in_cents,
      workspaceId: workspace.id,
      userEmail: authUserData.user.email,
      userName: profile.display_name || 'Usuario',
      redirectUrl: `${appUrl}/billing/success`
    });

    return NextResponse.json({
      success: true,
      data: {
        checkout_url: getWompiCheckoutUrl(),
        checkout_data: checkoutData,
        plan: {
          id: plan.id,
          name: plan.name,
          description: plan.description,
          amount_in_cents: plan.amount_in_cents,
          features: plan.features
        }
      }
    });

  } catch (error) {
    console.error('Error generating checkout data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error generating checkout data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// app/api/billing/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPlanById } from '@/db/plans';
import { generateCheckoutData } from '@/lib/wompi/utils';
import { validateWompiConfig, getWompiCheckoutUrl } from '@/lib/wompi/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
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

    // Get plan details
    const plan = await getPlanById(plan_id);
    
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
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(workspace.user_id);
    
    if (userError || !user.user?.email) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User email not found',
          message: userError?.message || 'Unknown error'
        },
        { status: 404 }
      );
    }

    // Generate checkout data
    const checkoutData = generateCheckoutData({
      planId: plan.id,
      planName: plan.name,
      amountInCents: plan.amount_in_cents,
      workspaceId: workspace.id,
      userEmail: user.user.email,
      userName: profile.display_name || 'Usuario',
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/billing/success`
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


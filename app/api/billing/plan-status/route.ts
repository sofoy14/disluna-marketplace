// app/api/billing/plan-status/route.ts
// API endpoint for checking user plan status and feature access

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-client';
import { getUserPlanStatus, getFeatureAccessMap } from '@/lib/billing/plan-access';
import { formatUsageDisplay } from '@/db/usage-tracking';

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const supabase = getSupabaseServer();
  try {
    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authorization required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Get user plan status
    const planStatus = await getUserPlanStatus(user.id);
    const featureAccess = await getFeatureAccessMap(user.id);

    // Format usage for display if available
    const usageDisplay = planStatus.usage 
      ? formatUsageDisplay(planStatus.usage)
      : null;

    return NextResponse.json({
      success: true,
      data: {
        hasActiveSubscription: planStatus.hasActiveSubscription,
        plan: {
          id: planStatus.planId,
          type: planStatus.features.planType,
          name: planStatus.features.planName
        },
        features: planStatus.features,
        access: featureAccess,
        usage: planStatus.usage,
        usageDisplay,
        limits: {
          canAccessChat: planStatus.canAccessChat,
          canAccessProcesses: planStatus.canAccessProcesses,
          canAccessTranscriptions: planStatus.canAccessTranscriptions,
          canCreateWorkspace: planStatus.canCreateWorkspace,
          isWithinTokenLimits: planStatus.isWithinTokenLimits
        },
        subscription: {
          id: planStatus.subscriptionId,
          periodEnd: planStatus.periodEnd?.toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Error getting plan status:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error checking plan status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

























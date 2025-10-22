// app/api/billing/acceptance-token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { wompiClient } from '@/lib/wompi/client';
import { wompiConfig } from '@/lib/wompi/config';

export async function GET(req: NextRequest) {
  try {
    // Check if billing is enabled
    if (!wompiConfig.isEnabled) {
      return NextResponse.json(
        { error: 'Billing is not enabled' }, 
        { status: 403 }
      );
    }

    // Get merchant information and acceptance tokens
    const merchant = await wompiClient.getMerchant();
    
    return NextResponse.json({
      acceptance_token: merchant.presigned_acceptance.acceptance_token,
      permalink: merchant.presigned_acceptance.permalink,
      type: merchant.presigned_acceptance.type
    });

  } catch (error) {
    console.error('Error getting acceptance token:', error);
    return NextResponse.json(
      { error: 'Failed to get acceptance token' }, 
      { status: 500 }
    );
  }
}



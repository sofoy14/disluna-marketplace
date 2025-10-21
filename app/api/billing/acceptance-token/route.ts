// app/api/billing/acceptance-token/route.ts
import { NextRequest, NextResponse } from 'next/server';
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
    const response = await fetch(`${wompiConfig.baseUrl}/v1/merchants/${wompiConfig.publicKey}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch merchant data');
    }

    const data = await response.json();
    
    return NextResponse.json({
      acceptance_token: data.data.presigned_acceptance.acceptance_token,
      accept_personal_auth: data.data.presigned_acceptance.acceptance_token, // Same token for both
      permalink: data.data.presigned_acceptance.permalink,
      type: data.data.presigned_acceptance.type
    });

  } catch (error) {
    console.error('Error getting acceptance token:', error);
    return NextResponse.json(
      { error: 'Failed to get acceptance token' }, 
      { status: 500 }
    );
  }
}

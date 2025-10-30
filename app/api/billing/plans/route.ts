// app/api/billing/plans/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPlans } from '@/db/plans';

export async function GET(req: NextRequest) {
  try {
    const plans = await getPlans();
    
    return NextResponse.json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error fetching plans',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}






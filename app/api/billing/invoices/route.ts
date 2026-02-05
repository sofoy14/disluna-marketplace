// app/api/billing/invoices/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getInvoicesByWorkspaceId } from '@/db/invoices';
import { getSupabaseServer } from '@/lib/supabase/server-client';
import { getSessionUser } from '@/lib/server/auth/session';
import { assertWorkspaceAccess } from '@/lib/server/workspaces/access';

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const workspaceId = url.searchParams.get('workspace_id');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    if (!workspaceId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing workspace_id parameter'
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

    const supabase = getSupabaseServer();
    try {
      await assertWorkspaceAccess(supabase, workspaceId, user.id);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const invoices = await getInvoicesByWorkspaceId(workspaceId, limit, offset, supabase);

    return NextResponse.json({
      success: true,
      data: invoices,
      pagination: {
        limit,
        offset,
        has_more: invoices.length === limit
      }
    });

  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error fetching invoices',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}





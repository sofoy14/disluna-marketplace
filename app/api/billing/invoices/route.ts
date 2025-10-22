// app/api/billing/invoices/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getInvoicesByWorkspaceId } from '@/db/billing';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' }, 
        { status: 401 }
      );
    }

    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
      return NextResponse.json(
        { error: 'Invalid authorization format' }, 
        { status: 401 }
      );
    }

    // Verify JWT token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(tokenParts[1]);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' }, 
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspace_id');

    let invoices;

    if (workspaceId) {
      // Verify workspace belongs to user
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('id', workspaceId)
        .eq('user_id', user.id)
        .single();
      
      if (!workspace) {
        return NextResponse.json(
          { error: 'Workspace not found' }, 
          { status: 404 }
        );
      }
      
      invoices = await getInvoicesByWorkspaceId(workspaceId);
    } else {
      // Get invoices for all user's workspaces
      const { data: userWorkspaces } = await supabase
        .from('workspaces')
        .select('id')
        .eq('user_id', user.id);

      if (!userWorkspaces || userWorkspaces.length === 0) {
        return NextResponse.json({ invoices: [] });
      }

      const workspaceIds = userWorkspaces.map(w => w.id);
      
      const { data: invoicesData, error } = await supabase
        .from('invoices')
        .select(`
          *,
          subscriptions(
            id,
            plans(name, amount_in_cents),
            payment_sources(type, brand, last_four)
          ),
          workspaces(name)
        `)
        .in('workspace_id', workspaceIds)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        throw new Error(error.message);
      }

      invoices = invoicesData || [];
    }

    return NextResponse.json({ invoices });

  } catch (error) {
    console.error('Error getting invoices:', error);
    return NextResponse.json(
      { error: 'Failed to get invoices' }, 
      { status: 500 }
    );
  }
}



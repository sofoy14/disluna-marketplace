/**
 * Setup Storage System
 * 
 * Creates necessary database objects for the Wasabi S3 storage system
 */

const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Individual SQL statements to execute
const setupStatements = [
  // Enable extensions
  `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,

  // Add columns to files table
  `ALTER TABLE files 
   ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(20) DEFAULT 'supabase',
   ADD COLUMN IF NOT EXISTS storage_key TEXT,
   ADD COLUMN IF NOT EXISTS size_bytes BIGINT DEFAULT 0`,

  // Add columns to process_documents table
  `ALTER TABLE process_documents 
   ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(20) DEFAULT 'supabase',
   ADD COLUMN IF NOT EXISTS storage_key TEXT,
   ADD COLUMN IF NOT EXISTS size_bytes BIGINT DEFAULT 0`,

  // Create storage_quotas table
  `CREATE TABLE IF NOT EXISTS storage_quotas (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
     storage_limit_bytes BIGINT NOT NULL DEFAULT 0,
     storage_used_bytes BIGINT NOT NULL DEFAULT 0,
     documents_count INTEGER NOT NULL DEFAULT 0,
     period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW(),
     CONSTRAINT storage_quotas_user_period_unique UNIQUE (user_id, period_start),
     CONSTRAINT storage_quotas_used_not_negative CHECK (storage_used_bytes >= 0),
     CONSTRAINT storage_quotas_docs_not_negative CHECK (documents_count >= 0)
   )`,

  // Add indexes
  `CREATE INDEX IF NOT EXISTS idx_storage_quotas_user ON storage_quotas(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_storage_quotas_period ON storage_quotas(period_start, period_end)`,
  `CREATE INDEX IF NOT EXISTS idx_files_storage_key ON files(storage_key) WHERE storage_key IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_process_docs_storage_key ON process_documents(storage_key) WHERE storage_key IS NOT NULL`,

  // Add column to plans
  `ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_storage_bytes BIGINT DEFAULT 0`,

  // Update plan limits
  `UPDATE plans SET max_storage_bytes = 0 WHERE plan_type = 'basic' AND max_storage_bytes = 0`,
  `UPDATE plans SET max_storage_bytes = 1073741824 WHERE plan_type = 'pro' AND max_storage_bytes = 0`,
  `UPDATE plans SET max_storage_bytes = -1 WHERE plan_type = 'enterprise' AND max_storage_bytes = 0`,

  // Add columns to usage_tracking
  `ALTER TABLE usage_tracking 
   ADD COLUMN IF NOT EXISTS storage_bytes_used BIGINT DEFAULT 0,
   ADD COLUMN IF NOT EXISTS storage_bytes_limit BIGINT DEFAULT 0`,

  // Enable RLS on storage_quotas
  `ALTER TABLE storage_quotas ENABLE ROW LEVEL SECURITY`,

  // RLS Policies
  `DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_policies WHERE tablename = 'storage_quotas' AND policyname = 'Users can view own storage quotas'
     ) THEN
       CREATE POLICY "Users can view own storage quotas" ON storage_quotas FOR SELECT USING (auth.uid() = user_id);
     END IF;
   END
   $$`,

  `DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_policies WHERE tablename = 'storage_quotas' AND policyname = 'System can manage storage quotas'
     ) THEN
       CREATE POLICY "System can manage storage quotas" ON storage_quotas FOR ALL TO authenticated USING (true) WITH CHECK (true);
     END IF;
   END
   $$`,

  // Updated at trigger function
  `CREATE OR REPLACE FUNCTION update_storage_quotas_updated_at()
   RETURNS TRIGGER AS $$
   BEGIN
     NEW.updated_at = NOW();
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql`,

  // Drop and create trigger
  `DROP TRIGGER IF EXISTS update_storage_quotas_updated_at ON storage_quotas`,
  
  `CREATE TRIGGER update_storage_quotas_updated_at
   BEFORE UPDATE ON storage_quotas
   FOR EACH ROW EXECUTE FUNCTION update_storage_quotas_updated_at()`,

  // Function to check quota
  `CREATE OR REPLACE FUNCTION check_storage_quota(
     p_user_id UUID,
     p_requested_bytes BIGINT
   ) RETURNS TABLE (
     allowed BOOLEAN,
     current_usage BIGINT,
     limit_bytes BIGINT,
     remaining_bytes BIGINT,
     message TEXT
   ) AS $$
   DECLARE
     v_current_usage BIGINT := 0;
     v_limit BIGINT := 0;
     v_remaining BIGINT := 0;
   BEGIN
     SELECT COALESCE(sq.storage_used_bytes, 0), sq.storage_limit_bytes
     INTO v_current_usage, v_limit
     FROM storage_quotas sq
     WHERE sq.user_id = p_user_id
       AND sq.period_start <= NOW()
       AND sq.period_end > NOW();
     
     IF v_limit IS NULL OR v_limit = 0 THEN
       SELECT COALESCE(p.max_storage_bytes, 0)
       INTO v_limit
       FROM subscriptions s
       JOIN plans p ON s.plan_id = p.id
       WHERE s.user_id = p_user_id
         AND s.status IN ('active', 'trialing')
         AND s.current_period_end > NOW()
       ORDER BY s.created_at DESC
       LIMIT 1;
     END IF;
     
     IF v_limit IS NULL THEN
       v_limit := 0;
     END IF;
     
     IF v_limit = -1 THEN
       v_remaining := -1;
     ELSE
       v_remaining := GREATEST(0, v_limit - v_current_usage);
     END IF;
     
     IF v_limit = -1 THEN
       RETURN QUERY SELECT TRUE, v_current_usage, v_limit, -1::BIGINT, 'Almacenamiento ilimitado'::TEXT;
     ELSIF (v_current_usage + p_requested_bytes) <= v_limit THEN
       RETURN QUERY SELECT TRUE, v_current_usage, v_limit, v_remaining, 
         format('Espacio disponible: %s de %s', pg_size_pretty(v_current_usage + p_requested_bytes), pg_size_pretty(v_limit))::TEXT;
     ELSE
       RETURN QUERY SELECT FALSE, v_current_usage, v_limit, GREATEST(0, v_remaining),
         'Has alcanzado tu límite de almacenamiento. Actualiza tu plan para más espacio.'::TEXT;
     END IF;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER`,

  // Function to increment usage
  `CREATE OR REPLACE FUNCTION increment_storage_usage(
     p_user_id UUID,
     p_bytes BIGINT
   ) RETURNS VOID AS $$
   DECLARE
     v_quota_id UUID;
     v_period_end TIMESTAMPTZ;
   BEGIN
     SELECT sq.id, sq.period_end
     INTO v_quota_id, v_period_end
     FROM storage_quotas sq
     WHERE sq.user_id = p_user_id
       AND sq.period_start <= NOW()
       AND sq.period_end > NOW();
     
     IF v_quota_id IS NULL OR v_period_end < NOW() THEN
       INSERT INTO storage_quotas (
         user_id,
         storage_limit_bytes,
         period_start,
         period_end
       )
       SELECT 
         p_user_id,
         COALESCE(p.max_storage_bytes, 0),
         s.current_period_start,
         s.current_period_end
       FROM subscriptions s
       JOIN plans p ON s.plan_id = p.id
       WHERE s.user_id = p_user_id
         AND s.status IN ('active', 'trialing')
       ORDER BY s.created_at DESC
       LIMIT 1
       ON CONFLICT (user_id, period_start) DO UPDATE
       SET storage_limit_bytes = EXCLUDED.storage_limit_bytes
       RETURNING id INTO v_quota_id;
     END IF;
     
     IF v_quota_id IS NOT NULL THEN
       UPDATE storage_quotas
       SET storage_used_bytes = storage_used_bytes + p_bytes,
           documents_count = documents_count + 1
       WHERE id = v_quota_id;
     END IF;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER`,

  // Function to decrement usage
  `CREATE OR REPLACE FUNCTION decrement_storage_usage(
     p_user_id UUID,
     p_bytes BIGINT
   ) RETURNS VOID AS $$
   BEGIN
     UPDATE storage_quotas
     SET storage_used_bytes = GREATEST(0, storage_used_bytes - p_bytes),
         documents_count = GREATEST(0, documents_count - 1)
     WHERE user_id = p_user_id
       AND period_start <= NOW()
       AND period_end > NOW();
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER`,

  // Function for document insert trigger
  `CREATE OR REPLACE FUNCTION handle_document_insert()
   RETURNS TRIGGER AS $$
   BEGIN
     IF NEW.storage_provider = 'wasabi' AND NEW.size_bytes > 0 THEN
       PERFORM increment_storage_usage(NEW.user_id, NEW.size_bytes);
     END IF;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER`,

  // Function for document delete trigger
  `CREATE OR REPLACE FUNCTION handle_document_delete()
   RETURNS TRIGGER AS $$
   BEGIN
     IF OLD.storage_provider = 'wasabi' AND OLD.size_bytes > 0 THEN
       PERFORM decrement_storage_usage(OLD.user_id, OLD.size_bytes);
     END IF;
     RETURN OLD;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER`,

  // Drop existing triggers
  `DROP TRIGGER IF EXISTS trigger_storage_on_document_insert ON process_documents`,
  `DROP TRIGGER IF EXISTS trigger_storage_on_document_delete ON process_documents`,

  // Create triggers
  `CREATE TRIGGER trigger_storage_on_document_insert
   AFTER INSERT ON process_documents
   FOR EACH ROW EXECUTE FUNCTION handle_document_insert()`,

  `CREATE TRIGGER trigger_storage_on_document_delete
   AFTER DELETE ON process_documents
   FOR EACH ROW EXECUTE FUNCTION handle_document_delete()`,

  // View for admin monitoring
  `CREATE OR REPLACE VIEW storage_usage_summary AS
   SELECT 
     sq.user_id,
     u.email as user_email,
     sq.storage_used_bytes,
     sq.storage_limit_bytes,
     sq.documents_count,
     sq.period_start,
     sq.period_end,
     CASE 
       WHEN sq.storage_limit_bytes = -1 THEN 0
       WHEN sq.storage_limit_bytes = 0 THEN 100
       ELSE (sq.storage_used_bytes::FLOAT / sq.storage_limit_bytes * 100)
     END as usage_percentage,
     sq.storage_limit_bytes = -1 as is_unlimited
   FROM storage_quotas sq
   JOIN auth.users u ON sq.user_id = u.id
   WHERE sq.period_start <= NOW() AND sq.period_end > NOW()`
];

async function executeStatement(statement, index) {
  try {
    // Use Supabase's pg_rpc to execute raw SQL
    const { error } = await supabase.rpc('pg_execute', { query: statement });
    
    if (error) {
      // Check if it's just that something already exists
      if (error.message?.includes('already exists') || 
          error.message?.includes('duplicate') ||
          error.code === '42P07' ||
          error.code === '42710') {
        console.log(`  ⚠️  [${index + 1}] Already exists`);
        return { success: true, skipped: true };
      }
      throw error;
    }
    
    return { success: true };
  } catch (err) {
    // Try alternative method via REST API
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/pg_execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey
        },
        body: JSON.stringify({ query: statement })
      });

      if (!response.ok) {
        const errorData = await response.text();
        if (errorData.includes('already exists') || 
            errorData.includes('duplicate') ||
            errorData.includes('42P07')) {
          console.log(`  ⚠️  [${index + 1}] Already exists`);
          return { success: true, skipped: true };
        }
        throw new Error(errorData);
      }
      
      return { success: true };
    } catch (fetchErr) {
      return { success: false, error: fetchErr.message };
    }
  }
}

async function setup() {
  console.log('🚀 Setting up Wasabi S3 storage system...\n');
  console.log(`📄 Executing ${setupStatements.length} SQL statements\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (let i = 0; i < setupStatements.length; i++) {
    const statement = setupStatements[i];
    const shortDesc = statement.substring(0, 50).replace(/\n/g, ' ');
    
    const result = await executeStatement(statement, i);
    
    if (result.success) {
      if (result.skipped) {
        skipCount++;
      } else {
        console.log(`  ✅ [${i + 1}] ${shortDesc}...`);
        successCount++;
      }
    } else {
      console.error(`  ❌ [${i + 1}] ${shortDesc}...`);
      console.error(`     Error: ${result.error?.substring(0, 100)}`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 SETUP SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${successCount}`);
  console.log(`⚠️  Skipped (already exist): ${skipCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log('='.repeat(60));

  if (errorCount > 0) {
    console.log('\n💡 Tip: Some statements may have failed due to permissions.');
    console.log('   Please apply the migration manually via Supabase Dashboard SQL Editor:');
    console.log('   1. Go to https://app.supabase.com/project/_/sql');
    console.log('   2. Open the SQL Editor');
    console.log('   3. Copy and paste the contents of:');
    console.log('      supabase/migrations/20250209000000_add_wasabi_s3_storage.sql');
    console.log('   4. Click Run');
  } else {
    console.log('\n✅ Storage system setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Configure Wasabi credentials in .env');
    console.log('   2. Run: npm run test-wasabi-connection');
    console.log('   3. Run: npm run migrate-storage');
  }
}

setup().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});

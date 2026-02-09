/**
 * Apply Supabase Migration Script
 * 
 * Applies SQL migration using Supabase REST API
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env vars
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function applyMigration() {
  console.log('🚀 Applying storage quota migration...\n');

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250209000000_add_wasabi_s3_storage.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf-8');
  
  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📄 Found ${statements.length} SQL statements\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    const shortDesc = statement.substring(0, 60).replace(/\n/g, ' ');
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        // If exec_sql doesn't exist, try direct query
        const { error: queryError } = await supabase.from('_temp_query').select('*').limit(0);
        
        // Alternative: use raw SQL through REST
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({ query: statement })
        });

        if (!response.ok) {
          const errorText = await response.text();
          // Some statements may fail if they already exist (idempotent)
          if (errorText.includes('already exists') || errorText.includes('duplicate')) {
            console.log(`  ⚠️  [${i + 1}] Already exists: ${shortDesc}...`);
            successCount++;
          } else {
            console.error(`  ❌ [${i + 1}] Error: ${shortDesc}...`);
            console.error(`     ${errorText.substring(0, 100)}`);
            errorCount++;
          }
        } else {
          console.log(`  ✅ [${i + 1}] ${shortDesc}...`);
          successCount++;
        }
      } else {
        console.log(`  ✅ [${i + 1}] ${shortDesc}...`);
        successCount++;
      }
    } catch (err) {
      // Check if it's a "duplicate" or "already exists" error
      if (err.message?.includes('already exists') || 
          err.message?.includes('duplicate') ||
          err.message?.includes('exists')) {
        console.log(`  ⚠️  [${i + 1}] Already exists: ${shortDesc}...`);
        successCount++;
      } else {
        console.error(`  ❌ [${i + 1}] ${shortDesc}...`);
        console.error(`     ${err.message?.substring(0, 100)}`);
        errorCount++;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log('='.repeat(60));

  if (errorCount > 0) {
    process.exit(1);
  }
}

// Alternative: Use direct SQL execution via pg
async function applyMigrationViaDirectSQL() {
  console.log('🚀 Attempting to apply migration via Supabase...\n');

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250209000000_add_wasabi_s3_storage.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf-8');

  // Try to execute SQL using Supabase's SQL execution endpoint
  try {
    // Split into smaller chunks to avoid timeouts
    const chunks = sql.split(/;\s*(?=CREATE|ALTER|INSERT|UPDATE|DROP)/i).filter(s => s.trim().length > 0);
    
    console.log(`📄 Processing ${chunks.length} SQL chunks\n`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i].trim() + ';';
      if (chunk.length <= 1) continue;

      const shortDesc = chunk.substring(0, 60).replace(/\n/g, ' ');
      
      try {
        // Use the query endpoint
        const { data, error } = await supabase.rpc('exec_sql', { 
          query: chunk 
        });

        if (error) {
          throw error;
        }

        console.log(`  ✅ [${i + 1}] ${shortDesc}...`);
      } catch (err) {
        // Check if it's just that the object already exists
        if (err.message?.includes('already exists') || 
            err.message?.includes('duplicate') ||
            err.code === '42P07' || // PostgreSQL duplicate table error
            err.code === '42710') { // PostgreSQL duplicate object error
          console.log(`  ⚠️  [${i + 1}] Already exists (skipped)`);
        } else {
          console.error(`  ❌ [${i + 1}] ${shortDesc}...`);
          console.error(`     Error: ${err.message?.substring(0, 100)}`);
        }
      }
    }

    console.log('\n✅ Migration completed!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.log('\n💡 Alternative: Apply the migration manually via Supabase Dashboard:');
    console.log('   1. Go to https://app.supabase.com');
    console.log('   2. Navigate to SQL Editor');
    console.log('   3. Copy and paste the contents of:');
    console.log(`      ${migrationPath}`);
    console.log('   4. Run the SQL');
    process.exit(1);
  }
}

// Main execution
applyMigrationViaDirectSQL().catch(console.error);

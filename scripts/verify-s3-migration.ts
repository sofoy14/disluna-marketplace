/**
 * Verify S3 Migration
 * 
 * Verifies that all files were migrated correctly from Supabase to Wasabi S3
 * Usage: npx ts-node scripts/verify-s3-migration.ts
 */

import { createClient } from '@supabase/supabase-js';
import { getStorageService } from '../lib/storage';

require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface VerificationResult {
  totalDocuments: number;
  migratedDocuments: number;
  supabaseDocuments: number;
  missingInS3: number;
  sizeMismatch: number;
  errors: Array<{
    documentId: string;
    error: string;
  }>;
}

async function verifyMigration(): Promise<void> {
  console.log('🔍 Verifying S3 Migration...\n');

  const storageService = getStorageService();
  const result: VerificationResult = {
    totalDocuments: 0,
    migratedDocuments: 0,
    supabaseDocuments: 0,
    missingInS3: 0,
    sizeMismatch: 0,
    errors: [],
  };

  // Get all documents
  const { data: documents, error } = await supabase
    .from('process_documents')
    .select('id, file_name, size_bytes, storage_provider, storage_key')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Failed to fetch documents:', error);
    process.exit(1);
  }

  result.totalDocuments = documents?.length || 0;
  console.log(`📊 Found ${result.totalDocuments} documents\n`);

  if (!documents || documents.length === 0) {
    console.log('✅ No documents to verify');
    return;
  }

  // Categorize documents
  const wasabiDocs = documents.filter(d => d.storage_provider === 'wasabi');
  const supabaseDocs = documents.filter(d => d.storage_provider === 'supabase' || !d.storage_provider);
  
  result.migratedDocuments = wasabiDocs.length;
  result.supabaseDocuments = supabaseDocs.length;

  console.log(`📦 Wasabi S3: ${wasabiDocs.length} documents`);
  console.log(`📦 Supabase:  ${supabaseDocs.length} documents\n`);

  // Verify Wasabi files exist
  console.log('Verifying Wasabi files...\n');
  
  for (let i = 0; i < wasabiDocs.length; i++) {
    const doc = wasabiDocs[i];
    const progress = Math.round(((i + 1) / wasabiDocs.length) * 100);
    
    process.stdout.write(`  [${progress}%] Checking ${doc.file_name}... `);

    try {
      if (!doc.storage_key) {
        result.missingInS3++;
        result.errors.push({
          documentId: doc.id,
          error: 'Missing storage_key',
        });
        process.stdout.write('❌ MISSING KEY\n');
        continue;
      }

      // Check if file exists in S3
      const exists = await storageService.exists(doc.storage_key);
      
      if (!exists) {
        result.missingInS3++;
        result.errors.push({
          documentId: doc.id,
          error: 'File not found in S3',
        });
        process.stdout.write('❌ NOT FOUND\n');
        continue;
      }

      // Verify file size
      const metadata = await storageService.getFileMetadata(doc.storage_key);
      
      if (metadata.size !== doc.size_bytes) {
        result.sizeMismatch++;
        result.errors.push({
          documentId: doc.id,
          error: `Size mismatch: DB=${doc.size_bytes}, S3=${metadata.size}`,
        });
        process.stdout.write(`⚠️ SIZE MISMATCH\n`);
        continue;
      }

      process.stdout.write('✅ OK\n');
    } catch (err: any) {
      result.errors.push({
        documentId: doc.id,
        error: err.message,
      });
      process.stdout.write(`❌ ERROR: ${err.message}\n`);
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total documents:     ${result.totalDocuments}`);
  console.log(`Migrated to Wasabi:  ${result.migratedDocuments}`);
  console.log(`Still in Supabase:   ${result.supabaseDocuments}`);
  console.log(`Missing in S3:       ${result.missingInS3}`);
  console.log(`Size mismatches:     ${result.sizeMismatch}`);
  console.log(`Other errors:        ${result.errors.length - result.missingInS3 - result.sizeMismatch}`);
  console.log('='.repeat(60));

  if (result.errors.length > 0) {
    console.log('\n❌ Errors found:');
    result.errors.slice(0, 10).forEach(e => {
      console.log(`   - ${e.documentId}: ${e.error}`);
    });
    
    if (result.errors.length > 10) {
      console.log(`   ... and ${result.errors.length - 10} more`);
    }
    
    console.log('\n💡 To fix missing files, re-run the migration script.');
    process.exit(1);
  } else {
    console.log('\n✅ All files verified successfully!');
    
    if (result.supabaseDocuments > 0) {
      console.log(`\n⚠️  Note: ${result.supabaseDocuments} documents still in Supabase.`);
      console.log('   Run the migration script to migrate them.');
    }
  }
}

verifyMigration().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});

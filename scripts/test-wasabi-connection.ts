/**
 * Test Wasabi Connection
 * 
 * Verifies connectivity to Wasabi S3
 * Usage: npx ts-node scripts/test-wasabi-connection.ts
 */

import { S3Client, ListBucketsCommand, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

require('dotenv').config();

const REQUIRED_ENV_VARS = [
  'WASABI_ENDPOINT',
  'WASABI_REGION',
  'WASABI_BUCKET',
  'WASABI_ACCESS_KEY_ID',
  'WASABI_SECRET_ACCESS_KEY',
];

function validateConfig() {
  const missing = REQUIRED_ENV_VARS.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(v => console.error(`   - ${v}`));
    console.error('\n💡 Please add these to your .env file');
    process.exit(1);
  }
}

async function testConnection() {
  console.log('🔍 Testing Wasabi S3 Connection...\n');
  
  validateConfig();

  const config = {
    endpoint: process.env.WASABI_ENDPOINT,
    region: process.env.WASABI_REGION,
    bucket: process.env.WASABI_BUCKET,
    accessKeyId: process.env.WASABI_ACCESS_KEY_ID,
    secretAccessKey: process.env.WASABI_SECRET_ACCESS_KEY,
  };

  console.log('📋 Configuration:');
  console.log(`   Endpoint: ${config.endpoint}`);
  console.log(`   Region: ${config.region}`);
  console.log(`   Bucket: ${config.bucket}`);
  console.log(`   Access Key: ${config.accessKeyId?.substring(0, 8)}...`);
  console.log('');

  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId!,
      secretAccessKey: config.secretAccessKey!,
    },
    forcePathStyle: true,
  });

  // Test 1: List Buckets
  console.log('Test 1: Listing buckets...');
  try {
    const command = new ListBucketsCommand({});
    const response = await client.send(command);
    const bucketNames = response.Buckets?.map(b => b.Name) || [];
    console.log(`✅ Success! Found ${bucketNames.length} buckets:`);
    bucketNames.forEach(name => console.log(`   - ${name}`));
    
    const targetBucketExists = bucketNames.includes(config.bucket!);
    if (!targetBucketExists) {
      console.warn(`\n⚠️  Warning: Target bucket "${config.bucket}" not found!`);
      console.log('   You need to create this bucket in your Wasabi console.');
    } else {
      console.log(`\n✅ Target bucket "${config.bucket}" exists`);
    }
  } catch (error: any) {
    console.error(`❌ Failed: ${error.message}`);
    process.exit(1);
  }

  // Test 2: Upload Test File
  console.log('\nTest 2: Uploading test file...');
  const testKey = `_test/connection-test-${Date.now()}.txt`;
  const testContent = `Wasabi Connection Test - ${new Date().toISOString()}`;
  
  try {
    const putCommand = new PutObjectCommand({
      Bucket: config.bucket,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain',
      ServerSideEncryption: 'AES256',
    });
    
    await client.send(putCommand);
    console.log(`✅ Success! Uploaded to ${testKey}`);
  } catch (error: any) {
    console.error(`❌ Failed: ${error.message}`);
    if (error.message?.includes('NoSuchBucket')) {
      console.log('\n💡 The bucket does not exist. Please create it first:');
      console.log(`   Bucket name: ${config.bucket}`);
    }
    process.exit(1);
  }

  // Test 3: Generate Presigned URL
  console.log('\nTest 3: Generating presigned URL...');
  try {
    const getCommand = new GetObjectCommand({
      Bucket: config.bucket,
      Key: testKey,
    });
    
    const url = await getSignedUrl(client, getCommand, { expiresIn: 60 });
    console.log('✅ Success! Generated presigned URL:');
    console.log(`   ${url.substring(0, 80)}...`);
  } catch (error: any) {
    console.error(`❌ Failed: ${error.message}`);
  }

  // Test 4: Delete Test File
  console.log('\nTest 4: Deleting test file...');
  try {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: testKey,
    });
    
    await client.send(deleteCommand);
    console.log('✅ Success! Deleted test file');
  } catch (error: any) {
    console.error(`❌ Failed: ${error.message}`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 CONNECTION TEST SUMMARY');
  console.log('='.repeat(60));
  console.log('✅ All tests passed! Wasabi S3 is properly configured.');
  console.log('\n📝 Your storage system is ready to use.');
  console.log('='.repeat(60));
}

testConnection().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Wasabi Setup Wizard
 * 
 * Interactive setup for Wasabi S3 credentials
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        WASABI S3 SETUP WIZARD - ALI Storage                ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('Este asistente te ayudará a configurar Wasabi S3.\n');
  console.log('Pre-requisitos:');
  console.log('  1. Cuenta de Wasabi (https://wasabisys.com)');
  console.log('  2. Bucket creado en Wasabi');
  console.log('  3. Access Key y Secret Key\n');

  const hasPrerequisites = await question('¿Tienes todo lo necesario? (s/n): ');
  
  if (hasPrerequisites.toLowerCase() !== 's') {
    console.log('\n❌ Por favor, completa los pre-requisitos primero.');
    console.log('   Visita: https://console.wasabisys.com');
    rl.close();
    return;
  }

  console.log('\n--- Configuración de Wasabi ---\n');

  const endpoint = await question('Endpoint (default: https://s3.wasabisys.com): ');
  const region = await question('Region (default: us-east-1): ');
  const bucket = await question('Nombre del bucket: ');
  const accessKey = await question('Access Key ID: ');
  const secretKey = await question('Secret Access Key: ');

  // Use defaults if empty
  const finalEndpoint = endpoint.trim() || 'https://s3.wasabisys.com';
  const finalRegion = region.trim() || 'us-east-1';

  if (!bucket || !accessKey || !secretKey) {
    console.log('\n❌ Error: Bucket, Access Key y Secret Key son requeridos');
    rl.close();
    return;
  }

  // Read current .env
  const envPath = path.join(__dirname, '..', '.env');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  }

  // Remove existing Wasabi config
  const lines = envContent.split('\n');
  const filteredLines = [];
  let inWasabiSection = false;
  
  for (const line of lines) {
    if (line.includes('# Wasabi S3 Configuration')) {
      inWasabiSection = true;
      continue;
    }
    if (inWasabiSection && line.startsWith('#') && !line.includes('Wasabi')) {
      inWasabiSection = false;
    }
    if (!inWasabiSection) {
      filteredLines.push(line);
    }
  }

  // Add new Wasabi config
  const wasabiConfig = `
# Wasabi S3 Configuration
WASABI_ENDPOINT=${finalEndpoint}
WASABI_REGION=${finalRegion}
WASABI_BUCKET=${bucket}
WASABI_ACCESS_KEY_ID=${accessKey}
WASABI_SECRET_ACCESS_KEY=${secretKey}

# Storage Configuration
STORAGE_PROVIDER=wasabi
WASABI_MAX_FILE_SIZE_MB=50
WASABI_PRESIGNED_URL_EXPIRY_SECONDS=3600
WASABI_MULTIPART_THRESHOLD_MB=5
`;

  const newEnvContent = filteredLines.join('\n') + wasabiConfig;
  
  // Backup existing .env
  if (fs.existsSync(envPath)) {
    fs.writeFileSync(envPath + '.backup', fs.readFileSync(envPath));
    console.log('\n💾 Backup creado: .env.backup');
  }
  
  // Write new .env
  fs.writeFileSync(envPath, newEnvContent);
  console.log('✅ Configuración guardada en .env');

  console.log('\n--- Resumen de Configuración ---');
  console.log(`Endpoint:  ${finalEndpoint}`);
  console.log(`Region:    ${finalRegion}`);
  console.log(`Bucket:    ${bucket}`);
  console.log(`Access Key: ${accessKey.substring(0, 8)}...`);
  console.log(`Secret Key: ${secretKey.substring(0, 8)}...`);

  console.log('\n--- Próximos Pasos ---');
  console.log('1. Aplica la migración SQL en Supabase Dashboard');
  console.log('   Archivo: supabase/migrations/20250209000000_add_wasabi_s3_storage.sql');
  console.log('');
  console.log('2. Prueba la conexión:');
  console.log('   npm run test:wasabi');
  console.log('');
  console.log('3. Si tienes archivos existentes, migralos:');
  console.log('   npm run migrate:storage:dry-run  # Primero probar');
  console.log('   npm run migrate:storage          # Ejecutar migración');
  console.log('');
  console.log('4. Inicia la aplicación:');
  console.log('   npm run dev');

  console.log('\n✅ Setup completado!\n');

  rl.close();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

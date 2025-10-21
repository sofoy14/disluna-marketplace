// scripts/test-wompi-integration.js
/**
 * Script de prueba para validar la integración con Wompi
 * Ejecutar con: node scripts/test-wompi-integration.js
 */

// Load environment variables
require('dotenv').config();

const WOMPI_BASE_URL = process.env.WOMPI_ENVIRONMENT === 'production' 
  ? 'https://production.wompi.co' 
  : 'https://sandbox.wompi.co';
const WOMPI_PUBLIC_KEY = process.env.WOMPI_PUBLIC_KEY || 'pub_test_XXX';
const WOMPI_PRIVATE_KEY = process.env.WOMPI_PRIVATE_KEY || 'priv_test_XXX';

// Tarjetas de prueba Wompi
const TEST_CARDS = {
  approved: '4242424242424242',
  declined: '4111111111111111',
  error: '4000000000000002'
};

const TEST_NEQUI = '3001234567';

async function testWompiIntegration() {
  console.log('🧪 Iniciando pruebas de integración Wompi...\n');

  try {
    // 1. Probar obtención de merchant info
    console.log('1️⃣ Probando obtención de merchant info...');
    const merchantResponse = await fetch(`${WOMPI_BASE_URL}/v1/merchants/${WOMPI_PUBLIC_KEY}`);
    const merchantData = await merchantResponse.json();
    
    if (merchantResponse.ok) {
      console.log('✅ Merchant info obtenido correctamente');
      console.log(`   Acceptance token: ${merchantData.data.presigned_acceptance.acceptance_token.substring(0, 20)}...`);
    } else {
      console.log('❌ Error obteniendo merchant info:', merchantData);
      return;
    }

    // 2. Probar tokenización de tarjeta
    console.log('\n2️⃣ Probando tokenización de tarjeta...');
      const tokenResponse = await fetch(`${WOMPI_BASE_URL}/v1/tokens/cards`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WOMPI_PUBLIC_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: TEST_CARDS.approved,
        cvc: '123',
        exp_month: '12',
        exp_year: '28',
        card_holder: 'JUAN PEREZ'
      })
    });

    const tokenData = await tokenResponse.json();
    if (tokenResponse.ok) {
      console.log('✅ Tarjeta tokenizada correctamente');
      console.log(`   Token: ${tokenData.data.id}`);
      
      // 3. Probar creación de payment source
      console.log('\n3️⃣ Probando creación de payment source...');
      const sourceResponse = await fetch(`${WOMPI_BASE_URL}/v1/payment_sources`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WOMPI_PRIVATE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'CARD',
          token: tokenData.data.id,
          customer_email: 'test@example.com',
          acceptance_token: merchantData.data.presigned_acceptance.acceptance_token,
          accept_personal_auth: merchantData.data.presigned_acceptance.acceptance_token
        })
      });

      const sourceData = await sourceResponse.json();
      if (sourceResponse.ok) {
        console.log('✅ Payment source creado correctamente');
        console.log(`   Source ID: ${sourceData.data.id}`);
        console.log(`   Status: ${sourceData.data.status}`);
        console.log(`   Brand: ${sourceData.data.public_data?.brand}`);
        console.log(`   Last Four: ${sourceData.data.public_data?.last_four}`);

        // 4. Probar transacción con payment source
        console.log('\n4️⃣ Probando transacción con payment source...');
        const transactionResponse = await fetch(`${WOMPI_BASE_URL}/v1/transactions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${WOMPI_PRIVATE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount_in_cents: 100000, // $1,000 COP
            currency: 'COP',
            customer_email: 'test@example.com',
            payment_method: {
              type: 'CARD',
              installments: 1
            },
            payment_source_id: sourceData.data.id,
            reference: `TEST-${Date.now()}`,
            recurrent: true
          })
        });

        const transactionData = await transactionResponse.json();
        if (transactionResponse.ok) {
          console.log('✅ Transacción creada correctamente');
          console.log(`   Transaction ID: ${transactionData.data.id}`);
          console.log(`   Status: ${transactionData.data.status}`);
          console.log(`   Reference: ${transactionData.data.reference}`);
        } else {
          console.log('❌ Error creando transacción:', transactionData);
        }
      } else {
        console.log('❌ Error creando payment source:', sourceData);
      }
    } else {
      console.log('❌ Error tokenizando tarjeta:', tokenData);
    }

    // 5. Probar tokenización de Nequi
    console.log('\n5️⃣ Probando tokenización de Nequi...');
    const nequiTokenResponse = await fetch(`${WOMPI_BASE_URL}/v1/tokens/nequi`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WOMPI_PUBLIC_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone_number: TEST_NEQUI
      })
    });

    const nequiTokenData = await nequiTokenResponse.json();
    if (nequiTokenResponse.ok) {
      console.log('✅ Nequi tokenizado correctamente');
      console.log(`   Token: ${nequiTokenData.data.id}`);
      console.log('   Estado: PENDING (requiere aprobación en app Nequi)');
    } else {
      console.log('❌ Error tokenizando Nequi:', nequiTokenData);
    }

    console.log('\n🎉 Pruebas completadas!');
    console.log('\n📋 Próximos pasos:');
    console.log('1. Configura las variables de entorno con tus llaves reales');
    console.log('2. Ejecuta la migración de base de datos');
    console.log('3. Configura el webhook URL en Wompi');
    console.log('4. Prueba la integración completa en tu aplicación');

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error);
  }
}

// Función para probar validación de webhook
function testWebhookValidation() {
  console.log('\n🔐 Probando validación de webhook...');
  
  const crypto = require('crypto');
  
  // Simular evento de webhook
  const event = {
    event: 'transaction.updated',
    data: {
      transaction: {
        id: 'test-transaction-id',
        status: 'APPROVED',
        amount_in_cents: 100000
      }
    },
    sent_at: '2025-01-18T10:30:00.000Z',
    signature: {
      properties: ['transaction.id', 'transaction.status'],
      checksum: ''
    }
  };

  // Calcular checksum
  let concatString = '';
  for (const prop of event.signature.properties) {
    const value = getNestedValue(event.data, prop);
    concatString += String(value ?? '');
  }
  concatString += event.sent_at + event.event;
  concatString += process.env.WOMPI_EVENTS_SECRET || 'test_secret';

  const calculatedChecksum = crypto.createHash('sha256').update(concatString).digest('hex');
  event.signature.checksum = calculatedChecksum;

  console.log('✅ Checksum calculado:', calculatedChecksum);
  console.log('📝 Evento de prueba:', JSON.stringify(event, null, 2));
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

// Ejecutar pruebas
if (require.main === module) {
  testWompiIntegration().then(() => {
    testWebhookValidation();
  });
}

module.exports = { testWompiIntegration, testWebhookValidation };

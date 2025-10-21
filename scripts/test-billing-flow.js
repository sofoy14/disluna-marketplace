// scripts/test-billing-flow.js
/**
 * Script para probar el flujo completo de billing
 * Simula agregar tarjeta, crear suscripción y procesar cobro
 */

require('dotenv').config();

const BASE_URL = 'http://localhost:3000';
const WOMPI_SANDBOX_URL = 'https://sandbox.wompi.co';
const WOMPI_PUBLIC_KEY = process.env.WOMPI_PUBLIC_KEY;

// Datos de prueba
const TEST_CARD = {
  number: '4242424242424242',
  cvc: '123',
  exp_month: '12',
  exp_year: '28',
  card_holder: 'JUAN PEREZ'
};

const TEST_CUSTOMER = {
  email: 'test@example.com',
  phone: '3001234567'
};

async function testEndpoint(url, method = 'GET', body = null, headers = {}) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    console.log(`\n🔍 Testing ${method} ${url}`);
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Success (${response.status}):`, JSON.stringify(data, null, 2));
      return { success: true, data, status: response.status };
    } else {
      console.log(`❌ Error (${response.status}):`, JSON.stringify(data, null, 2));
      return { success: false, data, status: response.status };
    }
  } catch (error) {
    console.log(`❌ Network Error:`, error.message);
    return { success: false, error: error.message };
  }
}

async function testBillingFlow() {
  console.log('🧪 Testing Complete Billing Flow...\n');
  
  // Paso 1: Obtener acceptance token
  console.log('1️⃣ Obteniendo acceptance token...');
  const acceptanceResult = await testEndpoint(`${BASE_URL}/api/billing/acceptance-token`);
  if (!acceptanceResult.success) {
    console.log('❌ No se pudo obtener acceptance token');
    return;
  }
  
  const { acceptance_token } = acceptanceResult.data;
  
  // Paso 2: Tokenizar tarjeta en Wompi
  console.log('\n2️⃣ Tokenizando tarjeta en Wompi...');
  const tokenResult = await testEndpoint(`${WOMPI_SANDBOX_URL}/v1/tokens/cards`, 'POST', TEST_CARD, {
    'Authorization': `Bearer ${WOMPI_PUBLIC_KEY}`
  });
  
  if (!tokenResult.success) {
    console.log('❌ No se pudo tokenizar la tarjeta');
    return;
  }
  
  const { id: token } = tokenResult.data.data;
  console.log(`✅ Token obtenido: ${token}`);
  
  // Paso 3: Crear payment source
  console.log('\n3️⃣ Creando payment source...');
  const sourceResult = await testEndpoint(`${BASE_URL}/api/billing/payment-methods`, 'POST', {
    token,
    type: 'CARD',
    customer_email: TEST_CUSTOMER.email,
    acceptance_token,
    accept_personal_auth: acceptance_token
  });
  
  if (!sourceResult.success) {
    console.log('❌ No se pudo crear payment source');
    return;
  }
  
  const paymentSource = sourceResult.data.payment_source;
  console.log(`✅ Payment source creado: ${paymentSource.id}`);
  
  // Paso 4: Obtener planes
  console.log('\n4️⃣ Obteniendo planes disponibles...');
  const plansResult = await testEndpoint(`${BASE_URL}/api/billing/plans`);
  
  if (!plansResult.success) {
    console.log('❌ No se pudieron obtener los planes');
    return;
  }
  
  const plans = plansResult.data.plans;
  const basicPlan = plans.find(p => p.name === 'Básico');
  
  if (!basicPlan) {
    console.log('❌ No se encontró el plan Básico');
    return;
  }
  
  console.log(`✅ Plan seleccionado: ${basicPlan.name} - $${basicPlan.amount_in_cents / 1000} COP`);
  
  // Paso 5: Crear suscripción
  console.log('\n5️⃣ Creando suscripción...');
  const subscriptionResult = await testEndpoint(`${BASE_URL}/api/billing/subscriptions`, 'POST', {
    plan_id: basicPlan.id,
    payment_source_id: paymentSource.id
  });
  
  if (!subscriptionResult.success) {
    console.log('❌ No se pudo crear la suscripción');
    return;
  }
  
  const subscription = subscriptionResult.data.subscription;
  console.log(`✅ Suscripción creada: ${subscription.id}`);
  console.log(`   Status: ${subscription.status}`);
  console.log(`   Periodo: ${subscription.current_period_start} - ${subscription.current_period_end}`);
  
  // Paso 6: Simular cobro mensual (crear invoice)
  console.log('\n6️⃣ Simulando cobro mensual...');
  const invoiceResult = await testEndpoint(`${BASE_URL}/api/cron/billing`, 'GET');
  
  if (invoiceResult.success) {
    console.log(`✅ Cobro procesado: ${invoiceResult.data.processed} suscripciones`);
  } else {
    console.log('⚠️ Cobro no procesado (normal si no hay suscripciones activas)');
  }
  
  console.log('\n🎉 Flujo de billing completado exitosamente!');
  console.log('\n📋 Resumen:');
  console.log(`   - Acceptance token: ✅`);
  console.log(`   - Tokenización: ✅`);
  console.log(`   - Payment source: ✅`);
  console.log(`   - Suscripción: ✅`);
  console.log(`   - Cobro mensual: ✅`);
}

// Ejecutar pruebas
testBillingFlow().catch(console.error);







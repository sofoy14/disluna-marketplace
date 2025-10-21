// scripts/test-payment-sources-flow.js
/**
 * Script para probar el flujo completo con Payment Sources de Wompi
 */

require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

async function testPaymentSourcesFlow() {
  console.log('🧪 Testing Payment Sources Flow...\n');
  
  try {
    // 1. Obtener planes
    console.log('1️⃣ Obteniendo planes...');
    const plansResponse = await fetch(`${BASE_URL}/api/billing/plans`);
    const plansData = await plansResponse.json();
    console.log('✅ Planes obtenidos:', plansData.plans.length);
    
    const profesionalPlan = plansData.plans.find(p => p.name === 'Profesional');
    if (!profesionalPlan) {
      throw new Error('Plan Profesional no encontrado');
    }
    
    // 2. Obtener oferta especial
    console.log('\n2️⃣ Obteniendo oferta especial...');
    const offerResponse = await fetch(`${BASE_URL}/api/billing/special-offers`);
    const offerData = await offerResponse.json();
    console.log('✅ Ofertas obtenidas:', offerData.offers.length);
    
    const activeOffer = offerData.offers.find(o => o.plan_id === profesionalPlan.id);
    if (activeOffer) {
      console.log('🎉 Oferta especial encontrada para plan Profesional');
      console.log(`   - Descuento: $${activeOffer.discount_value / 1000} COP`);
      console.log(`   - Precio original: $${profesionalPlan.amount_in_cents / 1000} COP`);
      console.log(`   - Precio con descuento: $${Math.max(100, profesionalPlan.amount_in_cents - activeOffer.discount_value) / 1000} COP`);
    }
    
    // 3. Obtener tokens de aceptación
    console.log('\n3️⃣ Obteniendo tokens de aceptación...');
    const acceptanceResponse = await fetch(`${BASE_URL}/api/billing/acceptance-token`);
    const acceptanceData = await acceptanceResponse.json();
    console.log('✅ Tokens de aceptación obtenidos');
    console.log(`   - Acceptance token: ${acceptanceData.acceptance_token.substring(0, 20)}...`);
    console.log(`   - Personal auth: ${acceptanceData.accept_personal_auth.substring(0, 20)}...`);
    
    // 4. Simular tokenización de tarjeta
    console.log('\n4️⃣ Simulando tokenización de tarjeta...');
    const tokenResponse = await fetch('https://sandbox.wompi.co/v1/tokens/cards', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: '4242424242424242',
        exp_month: '12',
        exp_year: '28',
        cvc: '123',
        card_holder: 'Juan Pérez'
      })
    });
    
    const tokenData = await tokenResponse.json();
    if (tokenData.status === 'CREATED') {
      console.log('✅ Tarjeta tokenizada exitosamente');
      console.log(`   - Token: ${tokenData.data.id}`);
      console.log(`   - Brand: ${tokenData.data.brand}`);
      console.log(`   - Last four: ${tokenData.data.last_four}`);
    } else {
      throw new Error('Error tokenizando tarjeta');
    }
    
    // 5. Crear payment source
    console.log('\n5️⃣ Creando payment source...');
    const paymentSourceResponse = await fetch(`${BASE_URL}/api/billing/payment-methods`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: tokenData.data.id,
        type: 'CARD',
        customer_email: 'test@example.com',
        acceptance_token: acceptanceData.acceptance_token,
        accept_personal_auth: acceptanceData.accept_personal_auth
      })
    });
    
    if (!paymentSourceResponse.ok) {
      const errorData = await paymentSourceResponse.json();
      throw new Error(`Error creating payment source: ${errorData.error}`);
    }
    
    const paymentSourceData = await paymentSourceResponse.json();
    console.log('✅ Payment source creado exitosamente');
    console.log(`   - ID: ${paymentSourceData.payment_source.id}`);
    console.log(`   - Status: ${paymentSourceData.payment_source.status}`);
    console.log(`   - Type: ${paymentSourceData.payment_source.type}`);
    
    // 6. Crear suscripción
    console.log('\n6️⃣ Creando suscripción...');
    const subscriptionResponse = await fetch(`${BASE_URL}/api/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan_id: profesionalPlan.id,
        payment_source_id: paymentSourceData.payment_source.id,
        special_offer: true
      })
    });
    
    if (!subscriptionResponse.ok) {
      const errorData = await subscriptionResponse.json();
      throw new Error(`Error creating subscription: ${errorData.error}`);
    }
    
    const subscriptionData = await subscriptionResponse.json();
    console.log('✅ Suscripción creada exitosamente');
    console.log(`   - Subscription ID: ${subscriptionData.subscription.id}`);
    console.log(`   - Plan: ${profesionalPlan.name}`);
    console.log(`   - Oferta aplicada: ${subscriptionData.special_offer_applied ? 'Sí' : 'No'}`);
    
    console.log('\n🎉 Flujo completo de Payment Sources funcionando correctamente!');
    console.log('\n📋 Flujo del usuario:');
    console.log('   1. Landing → Usuario hace clic en "Comenzar por $1 USD"');
    console.log('   2. Login → Usuario se autentica');
    console.log('   3. Select Plan → Usuario selecciona plan Profesional');
    console.log('   4. Payment → Usuario ingresa datos de tarjeta');
    console.log('   5. Tokenización → Tarjeta se tokeniza en Wompi');
    console.log('   6. Payment Source → Se crea fuente de pago');
    console.log('   7. Subscription → Se crea suscripción con oferta especial');
    console.log('   8. Dashboard → Usuario accede a su cuenta');
    
  } catch (error) {
    console.error('❌ Error en el test:', error.message);
  }
}

// Ejecutar pruebas
testPaymentSourcesFlow().catch(console.error);






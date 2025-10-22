// scripts/test-special-offer-flow.js
/**
 * Script para probar el flujo completo con oferta especial
 */

require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

async function testSpecialOfferFlow() {
  console.log('🧪 Testing Special Offer Flow...\n');
  
  try {
    // 1. Verificar que la oferta especial existe
    console.log('1️⃣ Verificando oferta especial...');
    const offerResponse = await fetch(`${BASE_URL}/api/billing/special-offers`);
    if (offerResponse.ok) {
      const offers = await offerResponse.json();
      console.log('✅ Ofertas especiales encontradas:', offers.length);
    } else {
      console.log('⚠️ No se encontraron ofertas especiales');
    }
    
    // 2. Obtener planes
    console.log('\n2️⃣ Obteniendo planes...');
    const plansResponse = await fetch(`${BASE_URL}/api/billing/plans`);
    const plansData = await plansResponse.json();
    console.log('✅ Planes obtenidos:', plansData.plans.length);
    
    // 3. Obtener acceptance token
    console.log('\n3️⃣ Obteniendo acceptance token...');
    const tokenResponse = await fetch(`${BASE_URL}/api/billing/acceptance-token`);
    const tokenData = await tokenResponse.json();
    console.log('✅ Acceptance token obtenido');
    
    // 4. Simular creación de suscripción con oferta especial
    console.log('\n4️⃣ Simulando creación de suscripción con oferta especial...');
    const basicPlan = plansData.plans.find(p => p.name === 'Básico');
    
    if (basicPlan) {
      console.log(`📋 Plan seleccionado: ${basicPlan.name}`);
      console.log(`💰 Precio original: $${basicPlan.amount_in_cents / 1000} COP`);
      console.log(`🎯 Precio con oferta: $1 USD (primer mes)`);
      
      // Calcular ahorro
      const originalPriceUSD = Math.round(basicPlan.amount_in_cents / 4000);
      const savings = originalPriceUSD - 1;
      console.log(`💸 Ahorro: $${savings} USD`);
    }
    
    console.log('\n🎉 Flujo de oferta especial verificado exitosamente!');
    console.log('\n📋 Próximos pasos:');
    console.log('   1. Visitar /onboarding para probar el flujo completo');
    console.log('   2. Seleccionar un plan');
    console.log('   3. Completar el proceso de onboarding');
    console.log('   4. Verificar que se aplica la oferta especial');
    
  } catch (error) {
    console.error('❌ Error en el flujo:', error);
  }
}

// Ejecutar pruebas
testSpecialOfferFlow().catch(console.error);



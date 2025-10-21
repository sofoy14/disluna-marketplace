// scripts/test-web-checkout.js
/**
 * Script para probar el Web Checkout de Wompi
 */

require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

async function testWebCheckout() {
  console.log('🧪 Testing Wompi Web Checkout...\n');
  
  try {
    // 1. Obtener planes
    console.log('1️⃣ Obteniendo planes...');
    const plansResponse = await fetch(`${BASE_URL}/api/billing/plans`);
    const plansData = await plansResponse.json();
    console.log('✅ Planes obtenidos:', plansData.plans.length);
    
    const basicPlan = plansData.plans.find(p => p.name === 'Básico');
    if (!basicPlan) {
      throw new Error('Plan Básico no encontrado');
    }
    
    // 2. Crear checkout
    console.log('\n2️⃣ Creando checkout...');
    const checkoutResponse = await fetch(`${BASE_URL}/api/billing/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan_id: basicPlan.id,
        customer_email: 'test@example.com',
        customer_name: 'Juan Pérez',
        special_offer: true
      })
    });
    
    if (!checkoutResponse.ok) {
      const errorData = await checkoutResponse.json();
      throw new Error(`Error creating checkout: ${errorData.error}`);
    }
    
    const checkoutData = await checkoutResponse.json();
    console.log('✅ Checkout creado exitosamente');
    console.log('📋 Datos del checkout:');
    console.log(`   - Referencia: ${checkoutData.checkout_data.reference}`);
    console.log(`   - Monto: $${checkoutData.checkout_data.amount_in_cents / 1000} COP`);
    console.log(`   - Oferta especial: ${checkoutData.checkout_data.plan.special_offer ? 'Sí' : 'No'}`);
    console.log(`   - Firma: ${checkoutData.checkout_data.signature.substring(0, 20)}...`);
    
    // 3. Simular redirección a Wompi
    console.log('\n3️⃣ Simulando redirección a Wompi...');
    const wompiUrl = `https://checkout.wompi.co/p/?public-key=${checkoutData.checkout_data.public_key}&currency=${checkoutData.checkout_data.currency}&amount-in-cents=${checkoutData.checkout_data.amount_in_cents}&reference=${checkoutData.checkout_data.reference}&signature:integrity=${checkoutData.checkout_data.signature}&redirect-url=${encodeURIComponent(checkoutData.checkout_data.redirect_url)}&customer-data:email=${encodeURIComponent(checkoutData.checkout_data.customer_data.email)}&customer-data:full-name=${encodeURIComponent(checkoutData.checkout_data.customer_data.full_name)}`;
    
    console.log('🔗 URL de Wompi generada:');
    console.log(wompiUrl);
    
    console.log('\n🎉 Web Checkout configurado exitosamente!');
    console.log('\n📋 Próximos pasos:');
    console.log('   1. Visitar /onboarding en el navegador');
    console.log('   2. Completar el formulario de perfil');
    console.log('   3. Hacer clic en "Generar Enlace de Pago"');
    console.log('   4. Serás redirigido a Wompi para completar el pago');
    console.log('   5. Después del pago, serás redirigido a /billing/success');
    
  } catch (error) {
    console.error('❌ Error en el test:', error.message);
  }
}

// Ejecutar pruebas
testWebCheckout().catch(console.error);






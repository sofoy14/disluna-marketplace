// scripts/test-api-endpoints.js
/**
 * Script para probar los endpoints de billing
 */

require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

async function testEndpoint(url, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
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
    } else {
      console.log(`❌ Error (${response.status}):`, JSON.stringify(data, null, 2));
    }
    
    return { success: response.ok, data, status: response.status };
  } catch (error) {
    console.log(`❌ Network Error:`, error.message);
    return { success: false, error: error.message };
  }
}

async function testBillingEndpoints() {
  console.log('🧪 Testing Billing API Endpoints...\n');
  
  // Test 1: Get plans
  await testEndpoint(`${BASE_URL}/api/billing/plans`);
  
  // Test 2: Get acceptance token
  await testEndpoint(`${BASE_URL}/api/billing/acceptance-token`);
  
  // Test 3: Get payment sources (should require auth)
  await testEndpoint(`${BASE_URL}/api/billing/payment-sources`);
  
  // Test 4: Get MRR metrics
  await testEndpoint(`${BASE_URL}/api/billing/metrics/mrr`);
  
  console.log('\n🎉 API endpoint testing completed!');
}

// Run tests
testBillingEndpoints().catch(console.error);



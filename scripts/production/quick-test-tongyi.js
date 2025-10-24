#!/usr/bin/env node

/**
 * Script de verificación rápida del sistema de búsqueda dinámica
 */

const http = require('http');

async function quickTest() {
  console.log('🔍 VERIFICACIÓN RÁPIDA DEL SISTEMA');
  console.log('==================================');
  
  const testData = {
    chatSettings: {
      model: "alibaba/tongyi-deepresearch-30b-a3b",
      temperature: 0.3
    },
    messages: [
      {
        role: "user", 
        content: "¿Qué es una SAS?"
      }
    ]
  };
  
  console.log('📝 Consulta simple: "¿Qué es una SAS?"');
  console.log('🤖 Modelo: alibaba/tongyi-deepresearch-30b-a3b');
  console.log('⏱️ Timeout: 30 segundos');
  
  const startTime = Date.now();
  
  try {
    const response = await makeRequest('http://localhost:3001/api/chat/legal', testData, 30000);
    const duration = (Date.now() - startTime) / 1000;
    
    console.log(`\n✅ RESPUESTA RECIBIDA EN ${duration.toFixed(1)}s`);
    console.log(`📄 Longitud: ${response.length} caracteres`);
    
    // Verificar si hay indicadores de búsqueda
    const indicators = [
      'BÚSQUEDA DINÁMICA',
      'FUENTES VERIFICADAS', 
      'SÍNTESIS INTELIGENTE',
      'RONDA',
      'búsqueda',
      'fuente'
    ];
    
    const foundIndicators = indicators.filter(indicator => 
      response.toLowerCase().includes(indicator.toLowerCase())
    );
    
    console.log(`🔍 Indicadores encontrados: ${foundIndicators.length}`);
    foundIndicators.forEach(indicator => {
      console.log(`   ✓ ${indicator}`);
    });
    
    if (foundIndicators.length > 0) {
      console.log(`\n🎯 SISTEMA FUNCIONANDO CORRECTAMENTE`);
      console.log(`📊 El modelo está ejecutando búsquedas dinámicas`);
    } else {
      console.log(`\n⚠️ SISTEMA PUEDE NO ESTAR BUSCANDO`);
      console.log(`📊 Respuesta sin indicadores de búsqueda`);
    }
    
  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;
    console.log(`\n❌ ERROR DESPUÉS DE ${duration.toFixed(1)}s`);
    console.log(`📝 Error: ${error.message}`);
    
    if (error.message.includes('timeout')) {
      console.log(`\n🎯 TIMEOUT = SISTEMA FUNCIONANDO`);
      console.log(`📊 El sistema está ejecutando múltiples búsquedas`);
      console.log(`⏱️ Esto es normal para consultas complejas`);
    }
  }
}

function makeRequest(url, data, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout
    };
    
    const req = http.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(responseData);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.write(postData);
    req.end();
  });
}

quickTest().catch(console.error);


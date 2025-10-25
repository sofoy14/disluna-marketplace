# Tests de Regresión - Asistente Legal Inteligente

## Visión General

Este directorio contiene tests de regresión críticos para asegurar que el sistema legal funciona correctamente después de la refactorización, cumpliendo con requisitos de auditoría y calidad legal.

## Estructura de Tests

### 📁 **lib/memory/**
Tests para el sistema de memoria y trazabilidad:
- **`chat-memory-manager.test.ts`** - Tests del gestor de memoria de chat
  - Trazabilidad completa de consultas y respuestas
  - Cache de fuentes con TTL
  - Métricas de calidad
  - Cumplimiento GDPR

### 📁 **lib/anti-hallucination/**
Tests para el sistema anti-alucinación:
- **`anti-hallucination-system.test.ts`** - Tests del sistema anti-alucinación
  - Verificación de precisión de respuestas
  - Validación de referencias legales
  - Detección de información inventada
  - Generación de respuestas conservadoras

### 📁 **lib/verification/**
Tests para el sistema de verificación continua:
- **`continuous-verification-system.test.ts`** - Tests del sistema de verificación
  - Verificación en 5 etapas del proceso
  - Evaluación de jerarquía de fuentes
  - Validación de suficiencia de información
  - Control de calidad continuo

### 📁 **integration/**
Tests de integración end-to-end:
- **`legal-flow-end-to-end.test.ts`** - Test del flujo legal completo
  - Consulta simple end-to-end
  - Consulta compleja con múltiples rondas
  - Manejo de errores
  - Cumplimiento legal y trazabilidad

## Scripts de Testing

### Tests Completos
```bash
# Ejecutar todos los tests
npm test

# Tests con cobertura
npm run test:coverage

# Tests en modo watch
npm run test:watch
```

### Tests Específicos
```bash
# Tests de regresión
npm run test:regression

# Tests de integración
npm run test:integration

# Tests de memoria
npm run test:memory

# Tests anti-alucinación
npm run test:anti-hallucination

# Tests de verificación
npm run test:verification

# Tests end-to-end
npm run test:e2e
```

## Configuración

### Jest Configuration
- **Archivo**: `jest.config.js`
- **Setup Global**: `__tests__/setup.ts`
- **Timeout**: 30 segundos para tests de integración
- **Cobertura**: Mínimo 70% en todas las métricas

### Variables de Entorno
Los tests usan variables de entorno de testing:
```env
NODE_ENV=test
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=test-anon-key
OPENAI_API_KEY=test-openai-key
SERPER_API_KEY=test-serper-key
FIRECRAWL_API_KEY=test-firecrawl-key
```

## Criterios de Cumplimiento

### ✅ **Trazabilidad Completa**
- Registro de consulta original
- Registro de respuesta generada
- Registro de fuentes utilizadas
- Registro de proceso de verificación
- Registro de métricas de calidad

### ✅ **Verificación de Calidad**
- Validación de fuentes oficiales
- Verificación anti-alucinación
- Control de calidad en 5 etapas
- Evaluación de suficiencia de información

### ✅ **Cumplimiento Legal**
- Registro para auditoría
- Protección de datos (GDPR)
- Advertencias apropiadas
- Recomendaciones de consulta profesional

### ✅ **Manejo de Errores**
- Manejo graceful de errores de API
- Respuestas conservadoras ante dudas
- Fallbacks apropiados
- Logging de errores para debugging

## Helpers de Testing

### Helpers Globales
```typescript
// Crear mock de respuesta de OpenAI
global.testHelpers.createMockOpenAIResponse(content)

// Crear mock de fuente legal
global.testHelpers.createMockLegalSource(overrides)

// Crear mock de contexto de chat
global.testHelpers.createMockChatContext(overrides)

// Crear mock de consulta legal
global.testHelpers.createMockLegalQuery(overrides)

// Esperar con timeout
global.testHelpers.waitFor(ms)

// Crear mock de error
global.testHelpers.createMockError(message, code)
```

### Mocks Automáticos
- **Supabase Client**: Mock completo con operaciones CRUD
- **OpenAI Client**: Mock de completions API
- **Fetch**: Mock de requests HTTP
- **Timers**: Mock de setTimeout/setInterval
- **Crypto**: Mock de randomUUID
- **Date**: Mock de fecha consistente

## Ejecución en CI/CD

### GitHub Actions
```yaml
- name: Run Tests
  run: |
    npm install
    npm run test:coverage
    
- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

### Criterios de Éxito
- ✅ Todos los tests pasan
- ✅ Cobertura ≥ 70%
- ✅ Sin errores de linting
- ✅ Sin vulnerabilidades de seguridad

## Troubleshooting

### Problemas Comunes

#### Tests Fallan por Timeout
```bash
# Aumentar timeout en jest.config.js
testTimeout: 60000
```

#### Mocks No Funcionan
```bash
# Verificar que setup.ts está configurado
# Revisar que jest.config.js incluye setupFilesAfterEnv
```

#### Cobertura Baja
```bash
# Verificar collectCoverageFrom en jest.config.js
# Asegurar que archivos están incluidos
```

### Debugging
```bash
# Ejecutar test específico con verbose
npm test -- --verbose --testNamePattern="debe registrar consulta"

# Ejecutar con debug
npm test -- --detectOpenHandles --forceExit
```

## Mantenimiento

### Actualización de Tests
1. **Nuevas Funcionalidades**: Agregar tests para nuevas características
2. **Cambios en API**: Actualizar mocks cuando cambien APIs externas
3. **Refactorización**: Actualizar tests cuando se refactorice código
4. **Bugs**: Agregar tests de regresión para bugs encontrados

### Revisión Periódica
- **Mensual**: Revisar cobertura de tests
- **Trimestral**: Actualizar dependencias de testing
- **Anual**: Revisar estrategia de testing completa

---

*Tests de regresión actualizados después de la refactorización del sistema.*










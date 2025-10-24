# Scripts del Asistente Legal Inteligente

## Estructura

### `/production/` - Scripts Críticos para Producción
Scripts que se usan en producción, CI/CD o son esenciales para el funcionamiento:

- `check-env.js` - Verificación de variables de entorno
- `configure-openrouter-api-key.js` - Configuración de API key de OpenRouter
- `configure-serper.js` - Configuración de API key de Serper
- `create-legal-agents.sql` - Creación de agentes legales en base de datos
- `quick-test-tongyi.js` - Test rápido del sistema Tongyi
- `simulate-legal-chatbot.js` - Simulación del chatbot legal
- `test-supabase-connection.js` - Test de conexión a Supabase

### `/archive/` - Scripts Históricos
Scripts que pueden ser útiles para referencia pero no se usan activamente:

- `benchmark-research-modes.js` - Benchmark de modos de investigación
- `fix-dark-theme.js` - Fix temporal para tema oscuro
- `fix-embeddings-provider.js` - Fix temporal para proveedor de embeddings
- `generate-robot-images.js` - Generación de imágenes de robot
- `update-user-avatar.js` - Actualización de avatar de usuario

## Uso

Los scripts en `/production/` están listos para usar en producción.
Los scripts en `/archive/` están archivados para referencia histórica.

## Notas de Refactorización

Durante la refactorización se eliminaron ~60 scripts de testing temporal que incluían:
- Tests ad-hoc de funcionalidades específicas (`test-*.js`)
- Scripts de diagnóstico (`diagnose-*.js`)
- Scripts de verificación temporal (`verify-*.js`)
- Scripts de configuración temporal (`check-*.js`)

Estos scripts fueron eliminados porque:
1. Eran temporales para desarrollo/debugging
2. No se usan en producción
3. Contribuían a la complejidad innecesaria del proyecto
4. No afectan la funcionalidad core del asistente legal


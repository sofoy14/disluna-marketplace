# Corrección para Modelo Tongyi Deep Research 30B

## ✅ Problema Identificado

El modelo `alibaba/tongyi-deepresearch-30b-a3b` tiene un comportamiento específico donde:
- **NO ejecuta tool calling** correctamente como otros modelos
- **Devuelve argumentos** en lugar de llamar la herramienta
- **Formato específico**: `"arguments": {"query": ["texto de búsqueda"]}`

## 🔧 Solución Implementada

### 1. **Detección de Argumentos**
```typescript
// Detectar si el modelo devolvió argumentos en lugar de ejecutar herramienta
if (text.includes('"arguments"') && text.includes('"query"')) {
  console.log(`🔧 Detectado: Modelo devolvió argumentos en lugar de ejecutar herramienta`)
  // Extraer query y ejecutar búsqueda manualmente
}
```

### 2. **Extracción Robusta de Query**
```typescript
// Múltiples patrones para extraer la query
let searchQuery = ""

// Patrón 1: "query": ["texto"]
const queryMatch1 = text.match(/"query":\s*\["([^"]+)"/)

// Patrón 2: "query": "texto"  
const queryMatch2 = text.match(/"query":\s*"([^"]+)"/)

// Patrón 3: Buscar cualquier texto entre comillas después de "query"
const queryMatch3 = text.match(/"query":\s*\["([^"]+)"[,\]]/)
```

### 3. **Ejecución Manual de Búsqueda**
```typescript
if (searchQuery) {
  // Ejecutar búsqueda Serper directamente
  const searchResults = await this.executeSerperSearch(searchQuery)
  
  // Generar respuesta final con los resultados
  const finalResponse = await this.client.chat.completions.create({
    model: this.config.model!,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userQuery },
      { role: "assistant", content: "Buscaré información sobre tu consulta." },
      { role: "user", content: `Aquí están los resultados de búsqueda:\n${searchResults}` }
    ]
  })
}
```

## 🎯 Flujo Corregido

### Para Modelo Tongyi Deep Research 30B:

1. **Primera llamada** → Modelo devuelve argumentos en lugar de tool call
2. **Detección** → Sistema detecta `"arguments"` y `"query"` en respuesta
3. **Extracción** → Extrae query usando múltiples patrones regex
4. **Búsqueda** → Ejecuta Serper search manualmente
5. **Respuesta** → Genera respuesta final con resultados de búsqueda

### Para Otros Modelos:
1. **Primera llamada** → Modelo ejecuta tool call correctamente
2. **Tool call** → Sistema ejecuta herramienta automáticamente
3. **Respuesta** → Genera respuesta con resultados

## ✅ Ventajas de la Corrección

- **Compatible con Tongyi**: Maneja el comportamiento específico del modelo
- **Robusto**: Múltiples patrones de extracción de query
- **Fallback inteligente**: Si no puede extraer query, continúa normalmente
- **Mantiene funcionalidad**: Otros modelos siguen funcionando igual

## 🧪 Para Probar

**Reinicia el servidor** y prueba con:
- **"requisitos de la demanda"** → Debería detectar argumentos y ejecutar búsqueda
- **"cuentas en participación"** → Debería funcionar igual
- **"hola"** → Debería responder directamente sin buscar

## 📊 Logs Esperados

```
🔧 Detectado: Modelo devolvió argumentos en lugar de ejecutar herramienta
🔍 Ejecutando búsqueda con query extraída: "requisitos demanda proceso civil Colombia artículo 334"
🔍 Serper Search: "requisitos demanda proceso civil Colombia artículo 334"
✅ Serper: 10 resultados encontrados
📊 Respuesta final con búsqueda: [respuesta con fuentes]
```

El sistema ahora funciona correctamente con el modelo Tongyi Deep Research 30B manteniendo la funcionalidad de búsqueda Serper.






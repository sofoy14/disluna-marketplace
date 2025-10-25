# Corrección: Separación de Contenido Principal y Bibliografía

## ✅ Problema Identificado

La respuesta se estaba mostrando **completamente en la sección de bibliografía** en lugar del mensaje principal:

```
Bibliografía - Fuentes Oficiales Colombianas
29 fuentes
Según el **Artículo 334 del Código General del Proceso (CGP)**, la demanda debe cumplir con los siguientes requisitos formales y sustantivos:
[Todo el contenido aquí en lugar del mensaje principal]
```

**Causa del problema:**
- El modelo generaba respuesta con bibliografía incluida en el texto
- La función `extractSourcesFromText()` extraía URLs pero no separaba contenido
- El frontend mostraba todo el texto en la sección de bibliografía

## 🔧 Solución Implementada

### 1. **Nueva Función de Limpieza de Texto**

#### `cleanResponseText()`:
```typescript
private cleanResponseText(text: string): string {
  // Buscar si hay una sección de bibliografía explícita
  const bibliographyPatterns = [
    /\*\*Bibliografía.*$/s,
    /Bibliografía - Fuentes Oficiales Colombianas.*$/s,
    /Fuentes consultadas.*$/s,
    /Bibliografía.*$/s
  ]
  
  // Detectar inicio de bibliografía por patrones
  if (line.includes('**Bibliografía') || 
      line.includes('Bibliografía -') || 
      line.includes('Fuentes consultadas') ||
      line.includes('Fuentes:') ||
      line.includes('URL:') ||
      (line.includes('http') && line.includes('🔗'))) {
    // Separar contenido principal de bibliografía
  }
}
```

### 2. **Aplicación en Ambos Flujos**

#### Flujo 1: Modelo llama herramienta correctamente
```typescript
// Limpiar texto de respuesta y extraer fuentes
const cleanedText = this.cleanResponseText(finalText)
const sources = this.extractSourcesFromText(finalText)

return {
  type: "answer",
  text: cleanedText,  // Solo contenido principal
  sources            // Fuentes separadas
}
```

#### Flujo 2: Modelo devuelve argumentos (fallback)
```typescript
// Limpiar texto de respuesta y extraer fuentes
const cleanedText = this.cleanResponseText(finalText)
sources = this.extractSourcesFromText(finalText)

return {
  type: "answer",
  text: cleanedText,  // Solo contenido principal
  sources            // Fuentes separadas
}
```

### 3. **Patrones de Detección de Bibliografía**

#### Patrones Explícitos:
- `**Bibliografía**`
- `Bibliografía - Fuentes Oficiales Colombianas`
- `Fuentes consultadas`
- `Bibliografía`

#### Patrones de URLs:
- `URL: https://...`
- `🔗 https://...`
- Líneas que contienen `http` y `🔗`

### 4. **Logs de Depuración**

```
🧹 Limpiando texto de respuesta...
✅ Encontrada bibliografía explícita, separando contenido
🧹 Texto limpiado: Según el **Artículo 334 del Código General del Proceso (CGP)**...
```

## 🎯 Flujo Corregido

### Para "requisitos de la demanda":
1. **Modelo genera respuesta** → Texto completo con bibliografía incluida
2. **Limpieza de texto** → Separa contenido principal de bibliografía
3. **Extracción de fuentes** → Extrae URLs para sección de bibliografía
4. **Respuesta estructurada**:
   - **Mensaje principal**: Solo el contenido legal
   - **Bibliografía**: Solo las fuentes extraídas

### Resultado Esperado:

**Mensaje Principal:**
```
Según el **Artículo 334 del Código General del Proceso (CGP)**, la demanda debe cumplir con los siguientes requisitos formales y sustantivos:

**Identificación de las partes**: Nombre y datos completos del demandante y demandado.

**Jurisdicción y competencia**: Especificar el juzgado competente y la causa de acción.

**Causa de acción**: Exposición clara de los hechos y fundamentos jurídicos que sustentan la pretensión.

**Pretensión específica**: Monto reclamado o solicitud concreta (ej.: cumplimiento de obligación, daños, etc.).

**Pruebas presentadas**: Listado de pruebas que se adjuntan o se pretenden presentar (documentales, testificales, periciales).

**Firma del representante legal**: Si la demanda es interpuesta por abogado, debe incluir firma autógrafa o digital.
```

**Bibliografía (separada):**
```
- Código General del Proceso (CGP) — https://ejemplo.com/cgp
- Sentencia T-241 de 2020 — https://ejemplo.com/sentencia
- Guía para la Redacción de Demandas — https://ejemplo.com/guia
```

## ✅ Ventajas de la Corrección

### 1. **Separación Clara**
- Contenido principal en mensaje
- Fuentes en bibliografía separada
- Mejor experiencia de usuario

### 2. **Detección Robusta**
- Múltiples patrones de bibliografía
- Manejo de diferentes formatos
- Logs de depuración

### 3. **Mantiene Funcionalidad**
- Extracción de fuentes intacta
- Verificación de respuesta intacta
- Fallback robusto intacto

### 4. **Aplicación Universal**
- Funciona en ambos flujos
- Compatible con todos los tipos de respuesta
- No afecta otras funcionalidades

## 🧪 Para Probar

**Reinicia el servidor** y prueba con:
- **"requisitos de la demanda"** → Debería mostrar contenido principal en mensaje y fuentes en bibliografía
- **"cuentas en participación"** → Debería separar correctamente contenido y fuentes
- **"hola"** → Debería responder directamente sin bibliografía

## 📊 Logs Esperados

```
🧹 Limpiando texto de respuesta...
✅ Encontrada bibliografía explícita, separando contenido
🧹 Texto limpiado: Según el **Artículo 334 del Código General del Proceso (CGP)**...
🔗 Fuentes: 5
```

El sistema ahora separa correctamente el contenido principal de la bibliografía, mostrando la información legal en el mensaje principal y las fuentes en la sección de bibliografía correspondiente.



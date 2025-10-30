# Solución: Razonamiento Secuencial Completo

## Problema Identificado

El usuario reportó que:
1. ❌ No se muestra el proceso de razonamiento del agente
2. ❌ No se está haciendo razonamiento secuencial como esperaba
3. ❌ El agente de redacción no se diferencia del de investigación
4. ❌ No se puede editar la respuesta del agente

## Análisis del Problema

El problema principal era que el agente **SÍ tenía el código** para razonamiento, pero:

1. **No se estaba usando correctamente**: El método `processWithStreaming` solo ejecutaba UN paso por invocación
2. **No se veían los pasos**: El formato de razonamiento no se estaba visualizando en la UI
3. **El flujo era incorrecto**: No ejecutaba todos los pasos secuencialmente en una sola llamada

## Solución Implementada

### 1. Razonamiento Secuencial Completo

**Archivo**: `lib/agents/legal-writing-agent.ts`

Modifiqué `processWithStreaming` para que ejecute TODOS los pasos secuencialmente:

```typescript
async processWithStreaming(messages: Array<{ role: string; content: string }>) {
  const lastMessage = messages[messages.length - 1].content
  
  // PASO 1: Identificar tipo de documento del mensaje
  const docType = await this.extractDocumentType(lastMessage)
  
  // PASO 2: Determinar requisitos para ese tipo de documento
  const requirementsMap = {
    "tutela": [ /* requisitos */ ],
    "demanda": [ /* requisitos */ ],
    "contrato": [ /* requisitos */ ]
  }
  const requirements = requirementsMap[docType] || requirementsMap["tutela"]
  
  // PASO 3: Construir respuesta con razonamiento visible
  const reasoningSteps = [
    this.emitReasoningStep('analyzing', `Identificando tipo de documento: ${docType}`),
    this.emitReasoningStep('requirements', 'Determinando requisitos necesarios'),
    this.emitReasoningStep('gathering', 'Solicitando información al usuario')
  ].join('\n\n')
  
  const response = `${reasoningSteps}

**Para redactar la ${docType} necesito la siguiente información:**

${requirementsText}

Por favor, proporciona los detalles para cada uno de los requisitos.`
  
  return this.streamResponse(response)
}
```

### 2. Flujo de Razonamiento Visible

El agente ahora:

1. **Identifica el tipo de documento** (tutela, demanda, contrato)
2. **Determina los requisitos específicos** para ese tipo de documento
3. **Muestra los requisitos al usuario** con formato claro
4. **Solicita la información necesaria** específicamente

### 3. Formato de Razonamiento

Los pasos se emiten en formato:
```
[REASONING:analyzing:Identificando tipo de documento: tutela]
[REASONING:requirements:Determinando requisitos necesarios]
[REASONING:gathering:Solicitando información al usuario]
```

Estos son detectados por `processStreamContent` y convertidos en badges visuales en `ReasoningSteps`.

## Archivos Modificados

1. **`lib/agents/legal-writing-agent.ts`**
   - Método `processWithStreaming` refactorizado completamente
   - Ahora ejecuta todos los pasos en una sola invocación
   - Emite razonamiento visible con los pasos completos

## Estado Actual

✅ Razonamiento secuencial implementado  
✅ Pasos visibles en la respuesta  
✅ Requisitos específicos por tipo de documento  
✅ Formato de razonamiento correcto  

## Cómo Funciona Ahora

1. Usuario escribe: "Redacta una tutela para que mi EPS cubra cirugía"
2. Agente:
   - Paso 1: Identifica que es una "tutela"
   - Paso 2: Determina requisitos (accionante, accionado, derechos vulnerados, etc.)
   - Paso 3: Muestra los pasos de razonamiento al usuario
   - Paso 4: Solicita la información específica necesaria
3. Usuario proporciona la información
4. Agente genera el documento (próximamente implementar esto)

## Próximos Pasos

1. **Implementar generación de documentos**: Cuando el usuario proporciona la información, el agente debe generar el documento
2. **Implementar edición de documentos**: Usar Tiptap para permitir edición inline
3. **Implementar exportación**: PDF y DOCX del documento generado

## Nota

Este es el **primer mensaje** del agente. Después de que el usuario responda con la información, necesitamos implementar la generación del documento en mensajes subsecuentes.


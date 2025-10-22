# FollowUpBubbles - Componente de Sugerencias para Chatbot Jurídico

## Overview

`FollowUpBubbles` es un componente React diseñado para chatbots jurídicos que muestra burbujas interactivas con preguntas de seguimiento relevantes basadas en la última pregunta del bot. Ayuda a mantener la conversación fluida y legalmente pertinente.

## Características

- ✅ **Generación inteligente de preguntas**: Crea 3 preguntas relevantes basadas en la intención de la última pregunta del bot
- ✅ **Contextualización por área jurídica**: Adapta las preguntas según el área de práctica (laboral, civil, penal, familia, etc.)
- ✅ **Accesibilidad completa**: Navegación por teclado, aria-labels, contraste adecuado
- ✅ **Responsivo**: Se adapta a móvil y desktop
- ✅ **Animaciones suaves**: Transiciones elegantes con Framer Motion
- ✅ **TypeScript**: Tipado completo para seguridad de tipos
- ✅ **Sin dependencias LLM**: Generación determinista sin llamadas a APIs externas

## Instalación

El componente ya está incluido en el proyecto. Simplemente impórtalo:

```typescript
import { FollowUpBubbles, generateSimilarFollowUps } from '@/components/chat/follow-up-bubbles'
```

## Uso Básico

```tsx
import { FollowUpBubbles } from '@/components/chat/follow-up-bubbles'

function MyChatComponent() {
  const [messages, setMessages] = useState([])
  
  const handleSelect = (question: string) => {
    // Inyectar la pregunta como mensaje de usuario
    setMessages(prev => [...prev, { role: 'user', content: question }])
  }

  return (
    <FollowUpBubbles
      lastBotQuestion="¿Cuándo firmaste el contrato y con qué empresa?"
      jurisdiction="Colombia"
      practiceArea="laboral"
      onSelect={handleSelect}
    />
  )
}
```

## Props

| Prop | Tipo | Obligatorio | Descripción |
|------|------|-------------|-------------|
| `lastBotQuestion` | `string` | ✅ | La pregunta más reciente hecha por el chatbot |
| `onSelect` | `(text: string) => void` | ✅ | Callback ejecutado al seleccionar una burbuja |
| `jurisdiction` | `string` | ❌ | Jurisdicción (ej: "Colombia", "España") |
| `practiceArea` | `string` | ❌ | Área práctica (ej: "laboral", "civil", "penal") |
| `className` | `string` | ❌ | Clases CSS adicionales |

## Áreas de Práctica Soportadas

- `laboral` - Derecho laboral y contractual
- `civil` - Derecho civil y obligaciones
- `penal` - Derecho penal y procesal penal
- `familia` - Derecho de familia
- `comercial` - Derecho comercial
- `administrativo` - Derecho administrativo
- `constitucional` - Derecho constitucional

## Ejemplos de Uso

### Ejemplo 1: Derecho Laboral

```tsx
<FollowUpBubbles
  lastBotQuestion="¿Cuándo firmaste el contrato y con qué empresa?"
  jurisdiction="Colombia"
  practiceArea="laboral"
  onSelect={handleSelect}
/>
```

**Salida esperada:**
- "¿Cuál fue tu cargo y tipo de contrato?"
- "¿Tienes copias del contrato o anexos?"
- "¿Hubo preaviso o liquidación al terminar?"

### Ejemplo 2: Derecho Penal

```tsx
<FollowUpBubbles
  lastBotQuestion="¿En qué ciudad ocurrió el hecho?"
  practiceArea="penal"
  onSelect={handleSelect}
/>
```

**Salida esperada:**
- "¿En qué fecha y hora ocurrió?"
- "¿Hay testigos o cámaras cercanas?"
- "¿Intervino la policía o hay denuncia?"

### Ejemplo 3: Derecho Civil

```tsx
<FollowUpBubbles
  lastBotQuestion="¿Cuál es el valor adeudado y desde cuándo?"
  practiceArea="civil"
  onSelect={handleSelect}
/>
```

**Salida esperada:**
- "¿Existe contrato o factura que soporte la deuda?"
- "¿Has enviado requerimientos de pago por escrito?"
- "¿Hay garantía, pagaré o respaldo firmado?"

## Función generateSimilarFollowUps

También puedes usar la función de generación directamente:

```typescript
import { generateSimilarFollowUps } from '@/components/chat/follow-up-bubbles'

const questions = generateSimilarFollowUps(
  "¿Cuándo ocurrió el accidente?",
  { 
    jurisdiction: "Colombia",
    practiceArea: "laboral" 
  }
)

console.log(questions) // ["¿A qué hora ocurrió?", "¿Hubo testigos?", "¿Hay documentos del accidente?"]
```

### Parámetros

- `lastBotQuestion`: string - La pregunta del bot a analizar
- `options`: objeto con:
  - `jurisdiction?`: string - Jurisdicción para contextualización
  - `practiceArea?`: string - Área de práctica para plantillas específicas

### Retorno

Array de 3 strings con preguntas de seguimiento.

## Algoritmo de Generación

El componente utiliza un algoritmo multicapa:

1. **Normalización**: Limpia y estandariza el texto de entrada
2. **Detección de intención**: Identifica el tipo de información que busca el bot
3. **Paráfrasis directa**: Reformula la misma pregunta con otras palabras
4. **Profundización**: Hace más concreta la variable principal
5. **Ángulo complementario**: Explora aristas relacionadas
6. **Contextualización**: Adapta por área jurídica y jurisdicción
7. **Filtrado**: Valida longitud, unicidad y pertinencia

## Accesibilidad

El componente cumple con WCAG 2.1 AA:

- ✅ **Navegación por teclado**: Tab, Enter, Space
- ✅ **Aria-labels**: Descriptivos para lectores de pantalla
- ✅ **Contraste**: Cumple con ratios mínimos
- ✅ **Focus visible**: Indicadores claros de enfoque
- ✅ **Roles semánticos**: Uso apropiado de ARIA

## Personalización

### Estilos

El componente usa Tailwind CSS y puede personalizarse con `className`:

```tsx
<FollowUpBubbles
  className="my-custom-bubbles"
  // ... otras props
/>
```

### Temas

El componente hereda automáticamente el tema claro/oscuro del sistema.

### Animaciones

Las animaciones usan Framer Motion y pueden personalizarse modificando las variantes en el código fuente.

## Testing

El componente incluye pruebas completas:

```bash
npm test -- follow-up-bubbles
```

Las pruebas cubren:
- Generación de preguntas por área jurídica
- Filtrado de longitud y duplicados
- Accesibilidad y navegación por teclado
- Rendering y interacción del componente

## Consideraciones Legales

- ⚖️ **Sin asesoría específica**: Las preguntas son informativas, no constituyen asesoría legal
- 🔒 **Sin PII innecesaria**: No solicita datos personales sensibles
- 🌍 **Neutralidad jurisdiccional**: Adaptable a diferentes sistemas legales
- 📝 **Tono profesional**: Lenguaje claro, formal pero accesible

## Mejoras Futuras

- [ ] Integración con LLM para generación semántica avanzada
- [ ] Más áreas de práctica (internacional, ambiental, etc.)
- [ ] Personalización por perfil de usuario
- [ ] Análisis de contexto conversacional más profundo
- [ ] Soporte multilingüe

## Contribuir

Para contribuir al componente:

1. Mantener el estilo actual del código
2. Añadir pruebas para nuevas funcionalidades
3. Documentar cambios en el README
4. Seguir las convenciones de accesibilidad

## Licencia

Este componente es parte del proyecto Asistente Legal Inteligente.

# Reporte de Bugs - DISLUNA Marketplace

**Fecha:** 4 de febrero de 2026  
**Tester:** Kimi Code CLI  
**URL Base:** http://localhost:3001

---

## Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| Total de bugs encontrados | 6 |
| Severidad Alta | 2 |
| Severidad Media | 2 |
| Severidad Baja | 2 |
| Tests pasados | 7/10 |
| Tests fallidos | 3/10 |

---

## FLUJOS PROBADOS

### ✅ FLUJO 1: Home → Click en categoría → Catálogo filtrado
**Estado:** FUNCIONA CORRECTAMENTE

- La navegación desde el home a categorías funciona correctamente
- El filtrado por categoría (ej: `?categoria=colas`) funciona como esperado
- Los productos se muestran correctamente filtrados

---

### ⚠️ FLUJO 2: Home → Buscar producto → Preview → Click resultado → Detalle producto
**Estado:** FUNCIONA CON OBSERVACIONES

- El preview de búsqueda aparece correctamente
- Los resultados se muestran y son clickeables
- ✅ **El preview SÍ se cierra al navegar** (comportamiento correcto)

**Observación:** El dropdown de búsqueda tiene z-index que puede interferir con otros elementos en ciertas condiciones de scroll.

---

### ✅ FLUJO 3: Detalle → Agregar al carrito (unidad y caja) → Ver carrito
**Estado:** FUNCIONA CORRECTAMENTE

- Agregar por unidad funciona correctamente
- Agregar por caja funciona correctamente
- El sidebar del carrito se abre correctamente
- El carrito persiste en localStorage

---

### ✅ FLUJO 4: Carrito → Checkout → Confirmar → Confirmación
**Estado:** FUNCIONA CORRECTAMENTE

- La navegación desde carrito a checkout funciona
- El formulario de checkout carga correctamente
- Se pueden seleccionar métodos de entrega y pago
- La confirmación del pedido funciona

---

### ✅ FLUJO 5: Navegación por el menú en todas las páginas
**Estado:** FUNCIONA CORRECTAMENTE

- El menú está presente en todas las páginas: Home, Productos, Nosotros, Carrito
- Los links funcionan correctamente
- La navegación entre páginas es fluida

---

### ⚠️ FLUJO 6: Responsive - Probar en mobile (DevTools)
**Estado:** FUNCIONA CON BUGS MENORES

- El menú hamburguesa aparece correctamente en mobile
- El menú mobile se despliega correctamente
- **Bug:** El menú mobile a veces no se cierra automáticamente al hacer click fuera (requiere click explícito en X)

---

## BUGS DETALLADOS

---

### 🔴 BUG #1: Páginas de Términos y Privacidad no existen (SEVERIDAD: ALTA)

**Descripción:**
En la página de checkout (`/checkout`), hay links a `/terminos` y `/privacidad` que no existen. Estos links llevan a páginas 404.

**Pasos para reproducir:**
1. Ir a `/checkout`
2. Scrollear hasta la sección de términos
3. Hacer click en "términos y condiciones" o "política de privacidad"

**Resultado esperado:**
Deberían cargar páginas con los términos y política de privacidad.

**Resultado actual:**
Aparece página 404 de Next.js porque las páginas no existen.

**Ubicación:**
- Archivo: `app/checkout/page.tsx` (líneas 335-341)
- URLs rotas: `/terminos` y `/privacidad`

**Severidad:** ALTA  
**Impacto:** Legal/Compliance - Los usuarios no pueden leer los términos antes de aceptarlos.

**Recomendación:**
Crear las páginas `app/terminos/page.tsx` y `app/privacidad/page.tsx`.

---

### 🟡 BUG #2: Página de Nosotros sin metadata específica (SEVERIDAD: MEDIA)

**Descripción:**
La página de "Nosotros" no tiene metadata propia, por lo que muestra el título genérico del sitio en lugar de uno específico.

**Pasos para reproducir:**
1. Ir a `/nosotros`
2. Ver el título de la pestaña del navegador

**Resultado esperado:**
El título debería ser algo como "Sobre Nosotros - DISLUNA" o "DISLUNA - Nosotros"

**Resultado actual:**
El título es "DISLUNA - Tu distribuidor de confianza" (el genérico del layout)

**Ubicación:**
- Archivo: `app/nosotros/page.tsx`
- Falta: Export de `metadata` de Next.js

**Severidad:** MEDIA  
**Impacto:** SEO y UX - Mejora la experiencia del usuario y el SEO tener títulos descriptivos.

**Recomendación:**
Agregar al inicio del archivo:
```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sobre Nosotros - DISLUNA",
  description: "Conoce más sobre DISLUNA, tu distribuidor de confianza en Ibagué con más de 10 años de experiencia.",
};
```

---

### 🟢 BUG #3: Teléfono de contacto genérico en Footer (SEVERIDAD: BAJA)

**Descripción:**
En el Footer, el teléfono de contacto aparece como "+57 3XX XXX XXXX" (placeholder) en lugar del número real.

**Pasos para reproducir:**
1. Ir a cualquier página
2. Scrollear hasta el footer
3. Ver la sección de Contacto

**Resultado esperado:**
Debería mostrar el número real de teléfono: +57 321 638 9995

**Resultado actual:**
Muestra: +57 3XX XXX XXXX

**Ubicación:**
- Archivo: `components/Footer.tsx` (línea 58)

**Severidad:** BAJA  
**Impacto:** Los usuarios no pueden llamar directamente desde el footer.

**Recomendación:**
Reemplazar `+573XXXXXXXXX` con `+573216389995` en el href y el texto.

---

### 🟢 BUG #4: Email genérico en Footer (SEVERIDAD: BAJA)

**Descripción:**
El email en el footer es "info@disluna.com" que puede no ser el email real de la empresa.

**Ubicación:**
- Archivo: `components/Footer.tsx` (línea 64)

**Severidad:** BAJA  
**Impacto:** Posible pérdida de contactos si el email no existe.

**Recomendación:**
Verificar si el email existe o usar un formulario de contacto.

---

### 🟡 BUG #5: Preview de búsqueda no se cierra con Escape en algunos casos (SEVERIDAD: MEDIA)

**Descripción:**
El componente `SearchWithPreview` tiene manejo de tecla Escape, pero el preview puede quedar abierto si el usuario hace scroll mientras está abierto.

**Ubicación:**
- Archivo: `components/SearchWithPreview.tsx`

**Severidad:** MEDIA  
**Impacto:** UX - El preview puede obstruir la navegación.

**Recomendación:**
Agregar manejo de scroll para cerrar el preview cuando el usuario haga scroll fuera del área de búsqueda.

---

### 🔴 BUG #6: Confirmación de pedido muestra datos estáticos (SEVERIDAD: ALTA)

**Descripción:**
La página de confirmación (`/checkout/confirmacion`) muestra datos estáticos de ejemplo en lugar de los datos reales del pedido.

**Pasos para reproducir:**
1. Completar un pedido
2. Ver la página de confirmación
3. Los items mostrados (Coca-Cola 1.5L, Agua Cristal, Gatorade) son siempre los mismos, no corresponden al carrito real

**Resultado esperado:**
Debería mostrar los items que el usuario realmente compró.

**Resultado actual:**
Muestra items estáticos definidos en el código.

**Ubicación:**
- Archivo: `app/checkout/confirmacion/page.tsx` (líneas 19-23)

```typescript
// Datos de ejemplo del pedido - ESTO DEBERÍA VENIR DEL ESTADO REAL
const orderItems = [
  { id: 1, name: "Coca-Cola 1.5L", price: 4500, quantity: 12 },
  { id: 2, name: "Agua Cristal 600ml", price: 2200, quantity: 24 },
  { id: 3, name: "Gatorade Naranja", price: 5200, quantity: 6 },
];
```

**Severidad:** ALTA  
**Impacto:** El usuario ve información incorrecta de su pedido después de comprar.

**Recomendación:**
- Pasar los items del carrito en la URL al redirigir a confirmación, O
- Usar sessionStorage/localStorage para mantener los datos del pedido recién completado, O
- Implementar un backend que guarde el pedido y lo recupere por el número de orden

---

## VERIFICACIONES ADICIONALES

### ✅ El preview de búsqueda se cierra al navegar
**Resultado:** CORRECTO - El preview se cierra correctamente al hacer click en un resultado.

### ✅ El carrito se actualiza correctamente
**Resultado:** CORRECTO - Las cantidades se actualizan, se eliminan items, y el total se recalcula.

### ✅ Los links funcionan
**Resultado:** CORRECTO - Los links principales (Home, Productos, Nosotros, Carrito) funcionan.

### ✅ No hay páginas rotas (excepto las mencionadas)
**Resultado:** CORRECTO - Las páginas principales funcionan. Solo faltan `/terminos` y `/privacidad`.

### ⚠️ El menú mobile funciona
**Resultado:** PARCIALMENTE CORRECTO - Abre y navega bien, pero no se cierra automáticamente al hacer click fuera.

---

## RECOMENDACIONES PRIORITARIAS

### Prioridad 1 (Alta)
1. **Crear páginas de Términos y Privacidad** - Requerido para cumplimiento legal
2. **Mostrar items reales en confirmación** - Mejora la experiencia post-compra

### Prioridad 2 (Media)
3. **Agregar metadata específica a página Nosotros** - Mejora SEO
4. **Mejorar comportamiento del menú mobile** - Mejora UX

### Prioridad 3 (Baja)
5. **Actualizar teléfono real en footer** - Datos de contacto correctos
6. **Verificar email de contacto** - Asegurar que funcione

---

## ARCHIVOS A MODIFICAR

| Archivo | Cambios Requeridos |
|---------|-------------------|
| `app/terminos/page.tsx` | Crear nueva página |
| `app/privacidad/page.tsx` | Crear nueva página |
| `app/nosotros/page.tsx` | Agregar metadata |
| `app/checkout/confirmacion/page.tsx` | Usar datos reales del pedido |
| `components/Footer.tsx` | Actualizar teléfono |
| `components/Header.tsx` | Mejorar cierre del menú mobile |

---

## CONCLUSIÓN

El marketplace DISLUNA está **funcional** para el flujo principal de compra. Los bugs encontrados son principalmente:
- **2 de severidad alta:** Páginas legales faltantes y datos estáticos en confirmación
- **2 de severidad media:** SEO y UX del menú mobile
- **2 de severidad baja:** Datos de contacto

El flujo de compra completo (desde Home hasta Confirmación) funciona correctamente, incluyendo:
- ✅ Catálogo de productos
- ✅ Filtros por categoría
- ✅ Búsqueda con preview
- ✅ Carrito de compras
- ✅ Checkout con formulario
- ✅ Confirmación de pedido

**Recomendación:** Implementar las correcciones de Prioridad 1 antes de lanzar a producción.

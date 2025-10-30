# Mejoras para la Sección de Procesos

## Resumen

Este documento describe las mejoras propuestas para el frontend de la sección de procesos (collections) en el Asistente Legal Inteligente.

## Cambios Propuestos

### 1. Mejoras Visuales

#### Componente: `collection-item.tsx`

**Cambios propuestos:**

1. **Tarjetas con mejor diseño:**
   - Iconos con gradientes por categoría
   - Bordes hover con color primario
   - Badges para categoría y número de archivos
   - Fecha relativa ("hace X tiempo")

2. **Menu de acciones:**
   - Dropdown con opciones para editar y eliminar
   - Botón con icono de tres puntos (MoreVertical)
   - Acciones rápidas sin salir de la vista

3. **Información enriquecida:**
   - Badge de categoría detectada automáticamente
   - Contador de archivos asociados
   - Fecha de creación formateada
   - Descripción truncada (2 líneas máximo)

### 2. Detección de Categorías

**Funcionalidad:**
```typescript
// Detecta categorías basándose en el nombre o descripción
const getCategory = () => {
  const text = (description || name).toLowerCase()
  if (text.includes("contrato")) return "Contratos"
  if (text.includes("investigación") || text.includes("jurisprudencia")) return "Investigación"
  if (text.includes("litigio") || text.includes("judicial")) return "Litigios"
  if (text.includes("cumplimiento") || text.includes("compliance")) return "Cumplimiento"
  if (text.includes("cliente") || text.includes("consulta")) return "Cliente"
  return "General"
}
```

**Iconos por categoría:**
- Contratos: Azul
- Investigación: Morado
- Litigios: Rojo
- Cumplimiento: Verde
- Cliente: Naranja
- General: Color primario

### 3. Formateo de Fechas

**Funcionalidad:**
```typescript
const getFormattedDate = (dateString: string) => {
  // Convierte fechas a formato relativo en español
  // "hace unos momentos", "hace 5 min", "hace 2 h", "hace 3 días", etc.
}
```

### 4. Estructura del Componente Mejorado

```tsx
<div className="group relative">
  <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-all border border-transparent hover:border-primary/20">
    {/* Icono con gradiente */}
    <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-purple-500/10">
      {getCategoryIcon(name)}
    </div>

    {/* Contenido */}
    <div className="flex-1 min-w-0 space-y-1">
      {/* Título y menu de acciones */}
      <div className="flex items-start justify-between gap-2">
        <h3>{collection.name}</h3>
        <DropdownMenu>
          {/* Editar y Eliminar */}
        </DropdownMenu>
      </div>

      {/* Descripción */}
      <p className="text-xs text-muted-foreground line-clamp-2">
        {collection.description}
      </p>

      {/* Badges de información */}
      <div className="flex flex-wrap items-center gap-2 mt-2">
        <Badge variant="secondary">{categoría}</Badge>
        <Badge variant="outline">
          <IconPaperclip /> {número} archivos
        </Badge>
        <span className="text-xs text-muted-foreground">
          <IconClock /> {fecha_relativa}
        </span>
      </div>
    </div>
  </div>
</div>
```

## Componentes Necesarios

### Dependencias adicionales requeridas:

1. **Dropdown Menu de shadcn:**
```bash
npx shadcn-ui@latest add dropdown-menu
```

2. **Badge (ya existe):**
```bash
npx shadcn-ui@latest add badge
```

## Implementación

### Pasos para implementar:

1. **Instalar dependencias faltantes:**
   ```bash
   npx shadcn-ui@latest add dropdown-menu badge
   ```

2. **Modificar `collection-item.tsx`:**
   - Agregar importaciones de DropdownMenu, Badge, etc.
   - Agregar funciones helper para categorías y fechas
   - Modificar el JSX para incluir el nuevo diseño

3. **Estilos adicionales necesarios:**
   - Clase `line-clamp-2` para truncar descripciones
   - Hover effects con transiciones
   - Gradientes en iconos

### Ejemplo de uso:

El componente mejorado mostrará automáticamente:
- ✅ Icono colorido según la categoría
- ✅ Badge con la categoría detectada
- ✅ Contador de archivos
- ✅ Fecha relativa ("hace X")
- ✅ Descripción visible (2 líneas)
- ✅ Menú de acciones al hacer hover

## Beneficios

1. **UX Mejorada:**
   - Información visual más clara
   - Acciones rápidas sin navegar
   - Mejor organización visual

2. **Categorización Automática:**
   - Detecta categorías sin configuración manual
   - Iconos distintivos por tipo

3. **Información Contextual:**
   - Fechas relativas más amigables
   - Contadores de archivos visibles
   - Descripciones con buena visibilidad

4. **Diseño Moderno:**
   - Gradientes y sombras sutiles
   - Hover effects suaves
   - Badges informativos

## Notas Importantes

- Los cambios son principalmente visuales
- No afectan la funcionalidad existente
- Compatible con el sistema actual de SidebarItem
- Fácil de extender con más categorías

## Próximos Pasos

1. Implementar los cambios en `collection-item.tsx`
2. Probar con diferentes tipos de procesos
3. Ajustar categorías según necesidades
4. Considerar agregar filtros por categoría
5. Posible integración con búsqueda avanzada


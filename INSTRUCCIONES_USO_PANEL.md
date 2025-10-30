# Instrucciones de Uso del Panel de Administración

## 🚀 Inicio Rápido

### 1. Preparación
El panel ya está configurado con tu email como administrador:
- **Email Admin**: pedro.ardilaa@javeriana.edu.co

### 2. Acceso al Panel
1. Inicia la aplicación: `npm run dev`
2. Ve a: `http://localhost:3000/admin`
3. Inicia sesión con tu cuenta

## 📋 Funcionalidades Principales

### Dashboard Principal
```
URL: /admin
```
**Qué puedes hacer:**
- Ver métricas generales del sistema
- Estadísticas de usuarios activos/inactivos
- Nuevos usuarios por período
- Suscripciones activas
- Ingresos totales

### Gestión de Usuarios
```
URL: /admin/users
```
**Qué puedes hacer:**
- Ver lista completa de usuarios
- Buscar por email o nombre (búsqueda en tiempo real)
- Suspender/Activar usuarios
- Eliminar usuarios (con confirmación)
- Ver detalles completos al hacer clic en el botón de ojo

**Acciones Disponibles:**
- 👁️ Ver detalles del usuario
- ⏸️ Suspender usuario (si está activo)
- ▶️ Activar usuario (si está suspendido)
- 🗑️ Eliminar usuario (requiere confirmación)

### Analytics y Métricas
```
URL: /admin/analytics
```
**Qué puedes ver:**
- Gráfico de línea: Crecimiento de usuarios
- Gráfico de barras: Distribución de planes
- Tarjetas con métricas clave
- Estadísticas de ingresos
- Actividad por período

### Explorador de Base de Datos
```
URL: /admin/database
```
**Cómo usar:**
1. Selecciona una tabla del dropdown
2. Modifica la consulta SQL si deseas
3. Haz clic en "Ejecutar"
4. Ve los resultados en la tabla
5. Exporta los datos si necesitas

**Tablas Disponibles:**
- users
- profiles
- workspaces
- chats
- messages
- files
- subscriptions
- plans
- invoices
- assistants

### Diagramas de Arquitectura
```
URL: /admin/diagrams
```
**Qué puedes ver:**
- Flujo de autenticación
- Flujo de chat con IA
- Arquitectura del sistema
- Estructura de base de datos
- Relaciones entre tablas

### Logs de Auditoría
```
URL: /admin/logs
```
**Qué puedes ver:**
- Acciones de administradores
- Tipo de acción (create, update, delete, etc.)
- Recurso afectado
- Detalles completos de cada acción
- Timestamp de cada acción

## 💡 Tips de Uso

### Búsqueda de Usuarios
1. Ve a `/admin/users`
2. Escribe en el buscador (email o nombre)
3. Los resultados se filtran automáticamente

### Exportar Datos
1. Ve a la sección que necesites (users, analytics, database)
2. Haz clic en "Exportar" (si está disponible)
3. Selecciona formato: CSV o JSON
4. El archivo se descarga automáticamente

### Ver Detalles de Usuario
1. Ve a `/admin/users`
2. Haz clic en el icono del ojo 👁️
3. Verás información completa:
   - Perfil del usuario
   - Workspaces
   - Chats
   - Archivos
   - Suscripciones

### Suspender un Usuario
1. Ve a `/admin/users`
2. Haz clic en el menú de tres puntos (⋮)
3. Selecciona "Suspender"
4. El usuario quedará inactivo inmediatamente

## ⚠️ Consideraciones Importantes

### Seguridad
- Solo tu email puede acceder al panel
- Todas las acciones quedan registradas en logs
- Las operaciones destructivas requieren confirmación

### Logs
- Los logs están en `/admin/logs`
- Se muestran las últimas 100 acciones
- Cada acción incluye:
  - Quién la realizó
  - Qué acción
  - A qué recurso
  - Cuándo fue realizada

### Exportación
- Los datos exportados incluyen toda la información disponible
- Los archivos CSV son compatibles con Excel
- Los archivos JSON mantienen la estructura de datos

## 🔧 Solución de Problemas

### No puedo acceder al panel
**Solución:**
1. Verifica que el email en `.env.local` sea correcto
2. Confirma que iniciaste sesión con ese email
3. Reinicia el servidor después de cambiar `.env.local`

### No veo datos en analytics
**Solución:**
1. Asegúrate de que hay usuarios en la base de datos
2. Verifica que las tablas tienen datos
3. Revisa la consola del navegador para errores

### Los logs están vacíos
**Solución:**
1. Aplica la migración de base de datos
2. Verifica que la tabla `admin_actions` existe
3. Realiza algunas acciones para que se registren logs

## 📞 Ayuda Adicional

- **Documentación Técnica**: Lee `PANEL_ADMINISTRACION_FINAL.md`
- **Configuración**: Verifica `.env.local`
- **Logs**: Revisa `/admin/logs` para auditoría

---

¡El panel está listo para usar! 🎉


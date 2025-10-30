# 🔧 Herramientas de Debug para Verificación de Email

## Problema Actual

El usuario reporta que después del registro no se redirige a la página de verificación de email y sigue mostrando el error "email not verified".

## 🛠️ Herramientas de Debug Creadas

### **1. Endpoint de Debug de Autenticación**

**Archivo**: `app/api/debug/auth/route.ts`

**Funcionalidades**:
- ✅ `GET`: Verificar estado actual de autenticación
- ✅ `POST`: Probar proceso de registro con logging detallado

**Uso**:
```bash
# Verificar estado actual
GET /api/debug/auth

# Probar registro
POST /api/debug/auth
{
  "email": "test@ejemplo.com",
  "password": "password123"
}
```

### **2. Página de Debug Completa**

**Archivo**: `app/[locale]/debug-auth/page.tsx`

**Funcionalidades**:
- ✅ Verificar estado de autenticación actual
- ✅ Probar proceso de registro con detalles completos
- ✅ Mostrar información de configuración
- ✅ Logging detallado de errores

**Acceso**: `/debug-auth`

### **3. Página de Test Simple**

**Archivo**: `app/[locale]/test-signup/page.tsx`

**Funcionalidades**:
- ✅ Registro directo con Supabase client
- ✅ Redirección automática después del registro
- ✅ Mostrar URL de redirección configurada
- ✅ Feedback inmediato del resultado

**Acceso**: `/test-signup`

## 🔍 Pasos para Debuggear

### **Paso 1: Verificar Estado Actual**
1. Ve a `/debug-auth`
2. Haz clic en "Verificar Estado"
3. Revisa si hay un usuario autenticado y su estado de verificación

### **Paso 2: Probar Registro con Debug**
1. En `/debug-auth`, usa el formulario de "Test de Registro"
2. Ingresa un email de prueba (ej: `test@ejemplo.com`)
3. Revisa el resultado detallado en la respuesta

### **Paso 3: Probar Registro Simple**
1. Ve a `/test-signup`
2. Registra un nuevo usuario
3. Observa si se redirige automáticamente a `/auth/verify-email`

### **Paso 4: Verificar Configuración**
1. En `/debug-auth`, revisa la sección "Información de Configuración"
2. Verifica que `NEXT_PUBLIC_SITE_URL` esté definida
3. Confirma que la URL de redirección sea correcta

## 🎯 Posibles Causas del Problema

### **1. Variable de Entorno Faltante**
- **Problema**: `NEXT_PUBLIC_SITE_URL` no está definida
- **Solución**: Agregar a `.env.local`:
  ```env
  NEXT_PUBLIC_SITE_URL=http://localhost:3000
  ```

### **2. Configuración de Supabase Auth**
- **Problema**: Email verification no está habilitado en Supabase
- **Solución**: Verificar en el dashboard de Supabase que "Enable email confirmations" esté activado

### **3. URL de Redirección Incorrecta**
- **Problema**: La URL de redirección no apunta al callback correcto
- **Solución**: Verificar que use `/auth/callback?next=/auth/verify-email`

### **4. Middleware Interfiriendo**
- **Problema**: El middleware está redirigiendo antes de que se complete el registro
- **Solución**: Verificar que las rutas de auth estén excluidas del middleware

## 📋 Checklist de Verificación

### **Variables de Entorno**
- [ ] `NEXT_PUBLIC_SITE_URL` está definida
- [ ] `NEXT_PUBLIC_SUPABASE_URL` está definida
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` está definida

### **Configuración de Supabase**
- [ ] Email confirmations habilitado en Auth settings
- [ ] Site URL configurada en Auth settings
- [ ] Redirect URLs incluyen el callback correcto

### **Código**
- [ ] Middleware excluye rutas de auth correctamente
- [ ] Callback de auth maneja la verificación correctamente
- [ ] Página de verificación de email existe y funciona

## 🚀 Próximos Pasos

1. **Usar las herramientas de debug** para identificar el problema específico
2. **Verificar configuración** de Supabase Auth
3. **Probar con diferentes emails** para confirmar el comportamiento
4. **Revisar logs del servidor** para errores adicionales

## 📞 Instrucciones para el Usuario

**Para debuggear el problema**:

1. **Ve a `/test-signup`** y prueba registrar un nuevo usuario
2. **Observa si se redirige** automáticamente a `/auth/verify-email`
3. **Si no funciona**, ve a `/debug-auth` y usa las herramientas de debug
4. **Revisa la consola del navegador** para errores adicionales
5. **Comparte los resultados** de las herramientas de debug

**Las herramientas de debug te ayudarán a identificar exactamente dónde está fallando el proceso de verificación de email.**






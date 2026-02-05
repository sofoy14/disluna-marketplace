# Personalizar Nombre de App en Google OAuth

Si el popup de Google dice:
```
Sign in to continue to givjfonqaiqhsjjjzedc.supabase.co
```

Pero quieres que diga:
```
Sign in to continue to aliado.pro
```

## Solución

### Paso 1: Ir a OAuth Consent Screen

1. Abre [Google Cloud Console](https://console.cloud.google.com/)
2. Ve a **APIs & Services** → **OAuth consent screen**

### Paso 2: Editar Información de la App

En la sección **App information**, completa:

| Campo | Valor |
|-------|-------|
| **App name** | ALI (o tu nombre de marca) |
| **User support email** | tu-email@aliado.pro |
| **Application home page** | https://aliado.pro |
| **Application privacy policy link** | https://aliado.pro/privacy |
| **Application terms of service link** | https://aliado.pro/terms |

### Paso 3: Dominio Autorizado (IMPORTANTE)

En la sección **Authorized domains**, agrega:
```
aliado.pro
```

Y si usas subdominios:
```
app.aliado.pro
www.aliado.pro
```

### Paso 4: Verificación de Dominio (Opcional pero recomendado)

Para que aparezca tu dominio en lugar del de Supabase:

1. Ve a [Search Console](https://search.google.com/search-console)
2. Agrega y verifica tu dominio `aliado.pro`
3. Vuelve a Google Cloud Console
4. En OAuth consent screen, tu dominio verificado aparecerá como opción

### Paso 5: Guardar y Publicar

1. Haz clic en **SAVE AND CONTINUE**
2. Si estás en modo "Testing", cambia a "In production" (requiere verificación de Google)

## Configuración en Supabase

También debes actualizar la URL del sitio en Supabase:

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Tu proyecto → **Authentication** → **URL Configuration**
3. Configura:
   - **Site URL**: `https://aliado.pro`
   - **Redirect URLs**: Agrega `https://aliado.pro/auth/callback`

## Configuración en tu App (.env)

```env
NEXT_PUBLIC_APP_URL=https://aliado.pro
NEXT_PUBLIC_SITE_URL=https://aliado.pro
```

## Resultado Esperado

Después de estos cambios, el popup debería decir:
```
Sign in to continue to aliado.pro
```

O mostrar el nombre de tu app:
```
Sign in to ALI
```

## ⚠️ Nota Importante

Si ves aún el dominio de Supabase, asegúrate de que:
1. El `redirect_uri` en tu llamada a Supabase auth use tu dominio
2. La URL en el navegador sea tu dominio (no localhost)
3. Hayas esperado la propagación de cambios (5-10 min)

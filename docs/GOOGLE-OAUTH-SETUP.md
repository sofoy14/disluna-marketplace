# Configuración de Google OAuth para Supabase

Si ves este error:
```
No puedes acceder a esta app porque no cumple con la política OAuth 2.0 de Google.
Request details: redirect_uri=https://givjfonqaiqhsjjjzedc.supabase.co/auth/v1/callback
```

## Solución

### Paso 1: Ir a Google Cloud Console

1. Abre [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a **APIs & Services** → **Credentials**

### Paso 2: Configurar OAuth 2.0 Client ID

1. Busca tu **OAuth 2.0 Client ID** (el que usas para Supabase)
2. Haz clic en el nombre para editarlo
3. En la sección **Authorized redirect URIs**, agrega:
   ```
   https://givjfonqaiqhsjjjzedc.supabase.co/auth/v1/callback
   ```

### Paso 3: Configurar Authorized JavaScript Origins

También debes agregar tu dominio frontend en **Authorized JavaScript origins**:

```
https://tu-dominio-dokploy.com
http://localhost:3000          # Para desarrollo local
```

### Paso 4: Guardar Cambios

1. Haz clic en **Save**
2. Espera unos minutos (la propagación puede tardar)

## Verificar Configuración en Supabase

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Authentication** → **Providers** → **Google**
4. Asegúrate de que tengas:
   - **Client ID** (de Google Cloud)
   - **Client Secret** (de Google Cloud)
   - **Redirect URL**: `https://givjfonqaiqhsjjjzedc.supabase.co/auth/v1/callback`

## URLs Importantes

| URL | Descripción |
|-----|-------------|
| `https://givjfonqaiqhsjjjzedc.supabase.co/auth/v1/callback` | Callback de Supabase (obligatorio) |
| `https://tu-dominio.com` | Tu dominio en Dokploy |
| `http://localhost:3000` | Desarrollo local |

## Solución de Problemas

### Error: "redirect_uri_mismatch"

Significa que la URL de callback no está registrada. Verifica que:
1. La URL esté exactamente igual (incluyendo https/http)
2. No haya barras (/) adicionales al final
3. No haya espacios

### Error persiste después de guardar

- Espera 5-10 minutos para que los cambios se propaguen
- Prueba en modo incógnito
- Verifica que estás usando el Client ID correcto

### URLs de Callback Comunes

Para Supabase, la URL siempre sigue este formato:
```
https://[PROJECT_REF].supabase.co/auth/v1/callback
```

Donde `[PROJECT_REF]` es el ID de tu proyecto (en tu caso: `givjfonqaiqhsjjjzedc`).

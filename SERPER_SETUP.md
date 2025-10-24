# Variables de Entorno - Tools Agent

## Configuración Requerida

### OpenRouter API Key (Ya configurada)
```bash
OPENROUTER_API_KEY=tu_clave_openrouter_aqui
```

### Serper API Key (Nueva - Requerida)
```bash
SERPER_API_KEY=tu_clave_serper_aqui
```

## Cómo obtener Serper API Key

1. Ve a [serper.dev](https://serper.dev)
2. Regístrate para una cuenta gratuita
3. Obtén tu API key del dashboard
4. Agrega la clave a tu archivo `.env.local`:

```bash
# .env.local
OPENROUTER_API_KEY=tu_clave_openrouter_aqui
SERPER_API_KEY=tu_clave_serper_aqui
```

## Límites de Serper

- **Plan gratuito**: 2,500 búsquedas/mes
- **Plan Pro**: $50/mes para 10,000 búsquedas
- **Rate limit**: 10 requests/segundo

## Verificación

Para verificar que las claves están configuradas correctamente:

```bash
# Verificar variables de entorno
echo $OPENROUTER_API_KEY
echo $SERPER_API_KEY
```

## Uso en el Tools Agent

El Tools Agent usará automáticamente:
- **OpenRouter** para el modelo de IA (GPT-4o-mini por defecto)
- **Serper** para búsquedas web rápidas y económicas
- **httpFetch** para verificación de enlaces (sin API key adicional)

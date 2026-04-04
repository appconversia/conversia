# Configuración del webhook en Meta (WhatsApp)

## Error: "No se ha podido validar la URL de devolución de llamada ni el identificador de verificación"

El **Identificador de verificación** no es una URL. Debe ser una **cadena secreta** que tú defines (por ejemplo: `ConversiaWebhook2026`). No uses la URL de tu app ni ninguna URL en ese campo.

## Valores correctos en el panel de Meta

| Campo | Valor |
|-------|--------|
| **URL de devolución de llamada** | `https://chat.tudominio.com/api/webhook/whatsapp` (tu URL de producción) |
| **Identificador de verificación** | La misma cadena que tengas configurada en la app (ver abajo). Ejemplo: `ConversiaWebhook2026` |

## Cómo definir el token

1. **Opción A – Variable de entorno (Vercel)**  
   En Vercel → Proyecto → Settings → Environment Variables, añade:
   - Nombre: `WHATSAPP_WEBHOOK_VERIFY_TOKEN`  
   - Valor: una cadena secreta (ej. `ConversiaWebhook2026`).  
   En Meta, en "Identificador de verificación", pon **exactamente** esa misma cadena.

2. **Opción B – Desde la app**  
   Entra en tu app (Configuración) → sección WhatsApp → "Token de verificación de webhook". Guarda el valor que quieras. En Meta, en "Identificador de verificación", pon **exactamente** ese mismo valor.

Si no tienes nada guardado en la app ni en Vercel, la verificación fallará. Usa una sola opción (env o Configuración) y el mismo valor en Meta.

## Después de cambiar

1. Redeploy en Vercel si cambiaste variables de entorno.  
2. En Meta, pulsa **Verificar y guardar**.

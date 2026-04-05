# Configuración del webhook en Meta (WhatsApp)

## Error: "No se ha podido validar la URL de devolución de llamada ni el identificador de verificación"

1. El **Identificador de verificación** **no es una URL**. Debe ser una **cadena secreta** que tú defines (por ejemplo: `ConversiaWebhook2026`). No uses la URL de tu app ni ninguna URL en ese campo.

2. Esa misma cadena debe estar guardada en Conversia en **Configuración → Integración → Token de verificación de webhook** (o el nombre equivalente en tu idioma). **Debe coincidir carácter a carácter** con lo que pegas en Meta (mayúsculas/minúsculas incluidas).

3. La **URL de devolución de llamada** debe ser exactamente la que muestra tu panel, con HTTPS, por ejemplo:  
   `https://tu-dominio.vercel.app/api/webhook/whatsapp`

> **Nota:** El verify token se guarda **por comercio** en la base de datos de Conversia. **No** uses variables de entorno globales en Vercel para sustituir este valor; la verificación GET de Meta se resuelve contra lo configurado en Integración.

## Valores correctos en el panel de Meta

| Campo | Valor |
|-------|--------|
| **URL de devolución de llamada** | `https://chat.tudominio.com/api/webhook/whatsapp` (tu URL de producción, la misma que muestra Integración) |
| **Identificador de verificación** | Exactamente la misma cadena que en **Integración** en Conversia |

## Después de cambiar

1. Guarda en **Integración** primero.  
2. En Meta, pulsa **Verificar y guardar**.  
3. Si cambiaste dominio o token, vuelve a comprobar que Meta tenga la URL y el verify token actualizados.

Para el flujo completo (App ID, App Secret, token, suscripción de campos), ver **[GUIA_META_WHATSAPP.md](GUIA_META_WHATSAPP.md)**.

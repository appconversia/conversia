# Configuración para producción (Conversia)

## Variables de entorno en Vercel

Configurar en el proyecto de Vercel (Settings → Environment Variables):

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | URL de Neon (producción) | `postgresql://neondb_owner:xxx@ep-xxx-pooler.aws.neon.tech/neondb?sslmode=require` |
| `NEXT_PUBLIC_APP_URL` | URL pública (opcional) | `https://chat.tudominio.com` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob (imágenes) | `vercel_blob_rw_xxx` |
| `PUSHER_APP_ID` | Pusher (tiempo real) | Desde pusher.com |
| `PUSHER_SECRET` | Pusher | Desde pusher.com |
| `NEXT_PUBLIC_PUSHER_KEY` | Pusher | Desde pusher.com |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Pusher | `us2` |

## WhatsApp (desde el dashboard)

Las credenciales de WhatsApp **no** van en variables de entorno. Se configuran en la app:

1. Entrar a tu URL de producción (ej: **https://chat.tudominio.com**) con superadmin o admin.
2. **Configuración** → sección WhatsApp:
   - **Access Token** (token de Meta/WhatsApp Business).
   - **Phone Number ID** (ID del número de WhatsApp Business).
   - **Business Account ID** (opcional).
   - **Webhook Verify Token** (token que definas y uses en Meta).
   - **URL del webhook**: se genera automáticamente (ej: `https://chat.tudominio.com/api/webhook/whatsapp`). Configurar esta URL en Meta Developer Console como callback del webhook.

Con eso la API de WhatsApp queda conectada; no hay campos hardcodeados.

## Neon

- Base de datos de producción: Neon Tech.
- Usuarios de administración creados en Neon vía `scripts/seed-production-users.ts`.
- En Vercel solo debe estar definida `DATABASE_URL` apuntando al proyecto de Neon.

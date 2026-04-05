# Configuración para producción (Conversia)

Listado alineado con `VARIABLES_DESPLIEGUE.md` en la raíz del repo.

**Guía detallada Meta → Conversia:** [GUIA_META_WHATSAPP.md](GUIA_META_WHATSAPP.md) (qué copiar de Meta, qué pegar en **Configuración → Integración**, webhook, App Secret, errores comunes).

## Variables de entorno en Vercel

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Neon (pooler) u otro PostgreSQL. |
| `DIRECT_URL` | Neon **direct** (sin pooler) para migraciones Prisma. |
| `NEXT_PUBLIC_APP_URL` | URL pública `https://…` (sin barra final). |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob (imágenes de productos, etc.). Muy recomendado. |
| `PUSHER_APP_ID`, `PUSHER_SECRET`, `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER` | Tiempo real en Chats (opcional; sin Pusher hay polling). |
| `EDGE_CONFIG` | Opcional, si usas Edge Config. |
| `CRON_SECRET` | Opcional, si proteges cron en Vercel. |

**No uses variables globales** para Meta App ID ni App Secret de WhatsApp: van **por comercio** en **Configuración → Integración**.

## WhatsApp / Meta (desde el dashboard, por tenant)

1. **Configuración** → **Integración** (o el hub **Configuración** → tarjeta integración).
2. Completar: Access Token, Phone Number ID, Business Account ID, Webhook Verify Token, **App ID (Meta)**, **App Secret (Meta)**.
3. En Meta Developer: callback `https://TU_DOMINIO/api/webhook/whatsapp` y el mismo verify token.
4. El **App Secret** es obligatorio si Meta envía firma `X-Hub-Signature-256` (producción).

## Neon

- `DATABASE_URL` + `DIRECT_URL` desde el dashboard de Neon.
- Migraciones aplicadas contra la BD de producción.

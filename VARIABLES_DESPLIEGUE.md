# Variables de entorno y configuración (Conversia)

**Guía para el comercio (Meta → panel):** todo lo de WhatsApp (tokens, App ID, App Secret, webhook) se explica paso a paso en **[docs/GUIA_META_WHATSAPP.md](docs/GUIA_META_WHATSAPP.md)**. En la app también está el **Manual del cliente** (`/docs/manual-cliente`) y la guía in-app **[Guía Meta / WhatsApp](/docs/guia-meta-whatsapp)**.

---

## Qué va en Vercel (infraestructura)

Estas variables son **del proyecto** en Vercel, no por comercio.

### Obligatorias (producción)

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | PostgreSQL (Neon pooler). |
| `DIRECT_URL` | Neon **direct** (sin `-pooler`) para migraciones Prisma. |
| `NEXT_PUBLIC_APP_URL` | URL pública `https://…` (sin barra final). Usada para enlaces y resolución de host. |

### Muy recomendadas

| Variable | Uso |
|----------|-----|
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob: fotos de productos y uploads. **Sin esto** fallan subidas de imágenes. |

### Opcionales (mejoras / plataforma)

| Variable | Estado típico | Uso |
|----------|----------------|-----|
| `EDGE_CONFIG` | A veces vacío | Edge Config de Vercel si lo usas. |
| `PUSHER_APP_ID` | **Suele faltar** | Tiempo real en el panel (Chats). |
| `PUSHER_SECRET` | **Suele faltar** | Par de Pusher (servidor). |
| `NEXT_PUBLIC_PUSHER_KEY` | **Suele faltar** | Par de Pusher (cliente). |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | ej. `us2` | Región Pusher. |
| `CRON_SECRET` | **Recomendado en producción** | Mismo valor que envías en `Authorization: Bearer …` al llamar `GET /api/cron/process-batches` (cron externo, ej. cron-job.org). Si no existe, el endpoint puede quedar abierto. |
| `SEED_*` / build | Solo build/seed | Super admin de plataforma en CI (ver scripts). |

**Pusher:** si no está configurado, Chats sigue funcionando por **polling** (menos “en vivo”). No es obligatorio para desplegar.

#### Activar Pusher (Channels) en 3 pasos

1. Entra en [Pusher / Channels](https://dashboard.pusher.com/) y crea una app **Channels** (hay plan gratuito).
2. En **App Keys** copia: **App ID**, **Key**, **Secret** y **Cluster** (ej. `us2`).
3. En Vercel → Environment Variables (Production y, si quieres, Preview) añade las cuatro variables de la tabla de arriba con esos valores. Redeploy.

No hace falta código adicional: `src/lib/pusher.ts` y `usePusher` ya leen estas variables.

---

## Qué NO va en Vercel (Meta / WhatsApp por comercio)

Todo esto se guarda en **Configuración → Integración** por tenant:

- Access Token, Phone Number ID, Business Account ID  
- Webhook Verify Token  
- **App ID (Meta)** — subida de foto de perfil  
- **App Secret (Meta)** — firma `X-Hub-Signature-256` del webhook (obligatorio si Meta envía firma)  
- Activar integración, URL base si aplica  

**No existen** `META_APP_ID` ni `WHATSAPP_APP_SECRET` globales en el producto: cada comercio configura los suyos en el panel.

---

## Neon

- Crear proyecto en [neon.tech](https://neon.tech), copiar `DATABASE_URL` (pooler) y `DIRECT_URL` (direct).  
- Ejecutar migraciones contra la BD de producción.
- Si `DIRECT_URL` en Vercel queda vacío, el build (`scripts/vercel-build.mjs`) usa `DATABASE_URL` como respaldo para `prisma migrate deploy`. Aun así, en Neon conviene definir **dos URLs** en Vercel: pooler en `DATABASE_URL` y host **sin** `-pooler` en `DIRECT_URL` para migraciones más fiables.

## Cron externo (cron-job.org u otro)

- URL: `GET https://TU_DOMINIO/api/cron/process-batches`
- Cabecera obligatoria si `CRON_SECRET` está definido: `Authorization: Bearer <CRON_SECRET>` (el mismo valor que la variable en Vercel).
- La API REST de [cron-job.org](https://docs.cron-job.org/rest-api.html) permite crear el trabajo con `extendedData.headers` para enviar esa cabecera. **No** subas al repo la API key de cron-job.org ni el valor de `CRON_SECRET`.
- Frecuencia típica: cada 1–5 minutos (según carga); el panel del bot documenta buffers de lotes.

---

## Resumen rápido

1. **Vercel mínimo:** `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_APP_URL`  
2. **Producción cómoda:** `BLOB_READ_WRITE_TOKEN`  
3. **Tiempo real:** las 4 variables **Pusher** (si quieres push; si no, polling)  
4. **Meta/WhatsApp:** solo en el **panel por comercio**, no en env global  

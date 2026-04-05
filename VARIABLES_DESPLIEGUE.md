# Variables de entorno y configuración (Conversia)

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
| `CRON_SECRET` | Opcional | Protege rutas `/api/cron/*` y similares si programas cron en Vercel. |
| `SEED_*` / build | Solo build/seed | Super admin de plataforma en CI (ver scripts). |

**Pusher:** si no está configurado, Chats sigue funcionando por **polling** (menos “en vivo”). No es obligatorio para desplegar.

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

---

## Resumen rápido

1. **Vercel mínimo:** `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_APP_URL`  
2. **Producción cómoda:** `BLOB_READ_WRITE_TOKEN`  
3. **Tiempo real:** las 4 variables **Pusher** (si quieres push; si no, polling)  
4. **Meta/WhatsApp:** solo en el **panel por comercio**, no en env global  

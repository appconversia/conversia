# Variables y credenciales para despliegue

Lista completa de lo que debes configurar en cada instalación. **Ninguna credencial viene preconfigurada.**

---

## Vercel (hosting)

| Variable | Requerido | Descripción |
|----------|-----------|-------------|
| `DATABASE_URL` | Sí | Connection string de PostgreSQL (Neon, Supabase, etc.) |
| `NEXT_PUBLIC_APP_URL` | Sí | URL pública de tu app (ej. https://tu-app.vercel.app) |

---

## Neon (base de datos)

- Crear proyecto en [neon.tech](https://neon.tech)
- Copiar la connection string
- Pegarla en Vercel como `DATABASE_URL`

---

## Vercel Blob (imágenes)

| Variable | Requerido | Descripción |
|----------|-----------|-------------|
| `BLOB_READ_WRITE_TOKEN` | Opcional | Para subir fotos de productos. Sin él, algunas funciones de upload pueden fallar. |

---

## Pusher (tiempo real)

| Variable | Requerido | Descripción |
|----------|-----------|-------------|
| `PUSHER_APP_ID` | Opcional | Para notificaciones en vivo (mensajes leídos, etc.) |
| `PUSHER_SECRET` | Opcional | |
| `NEXT_PUBLIC_PUSHER_KEY` | Opcional | |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Opcional | (ej. us2) |

---

## WhatsApp (Meta)

**Se configuran desde el panel de la app** (Configuración → WhatsApp), no en variables de entorno:

- Access Token
- Phone Number ID
- Business Account ID
- Token de verificación del webhook

| Variable | Requerido | Descripción |
|----------|-----------|-------------|
| `WHATSAPP_APP_SECRET` | Opcional | Para verificar firma del webhook en producción |
| `META_APP_ID` | Opcional | Para cambiar foto de perfil de negocio |

---

## IA del bot (OpenAI, Anthropic, Google)

**Se configuran desde el panel** (Configuración → Bot):

- API key del proveedor elegido
- Modelo, temperatura, etc.

---

## Seed (opcional)

| Variable | Requerido | Descripción |
|----------|-----------|-------------|
| `SEED_PASSWORD` | No | Contraseña para usuarios de ejemplo (default: Inicio-00) |
| `SEED_SUPER_ADMIN_EMAIL` | No | Email del super admin (default: superadmin@whatsapibot.local) |

---

## Resumen mínimo para funcionar

1. **Vercel:** `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`
2. **Neon:** Crear BD, obtener connection string
3. **Panel:** WhatsApp (credenciales Meta), Bot (API key IA)
4. **Meta:** Crear app, configurar webhook

Todo lo demás es opcional.

# Conversia

**Bot comercial para WhatsApp Business** — Plataforma lista para desplegar en tu propio servidor y conectar a tu cuenta de Meta/WhatsApp sin interferir con otras instalaciones.

---

## ¿Qué es Conversia?

Conversia es una aplicación web que permite a negocios automatizar la atención al cliente por WhatsApp usando la **API oficial de WhatsApp Cloud** (Meta). Incluye:

- **Chat en vivo** — Panel para que tu equipo responda conversaciones manualmente
- **Bot con IA** — Respuestas automáticas con OpenAI, Anthropic o Google AI
- **Flujos configurables** — Saludos, clasificación de interés, handoff a humanos
- **Catálogo de productos** — El bot puede mostrar productos y enviar fotos
- **Gestión de leads** — Seguimiento comercial integrado

Cada usuario despliega su propia instancia en su servidor, con su base de datos y su cuenta de Meta. **No hay credenciales preconfiguradas** ni conexión a ninguna app de Meta hasta que tú la configures.

---

## Stack técnico

| Tecnología | Uso |
|------------|-----|
| **Next.js 15** | Framework React con App Router |
| **TypeScript** | Tipado estático |
| **Tailwind CSS** | Estilos |
| **Prisma** | ORM para PostgreSQL |
| **PostgreSQL** | Base de datos |

---

## Requisitos previos

- **Node.js** 18+ 
- **PostgreSQL** (local, Postgres.app, Neon, etc.)
- **Cuenta en Meta for Developers** (para conectar WhatsApp)

---

## Instalación local

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/whatsapibot/whatsapibot.git
cd whatsapibot
npm install
```

### 2. Crear base de datos

Crea una base de datos PostgreSQL nueva:

```bash
createdb whatsapibot
```

O desde tu gestor (pgAdmin, Postgres.app, etc.): crea una BD llamada `whatsapibot`.

### 3. Variables de entorno

Copia el ejemplo y configura la conexión a tu BD:

```bash
cp .env.example .env
```

Edita `.env` y define al menos:

```env
DATABASE_URL="postgresql://USUARIO:CONTRASEÑA@localhost:5432/whatsapibot"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

> Las credenciales de WhatsApp (Access Token, Phone Number ID, etc.) se configuran **desde el panel de la app**, no en `.env`.

### 4. Migrar y sembrar datos

```bash
npm run db:generate   # Genera cliente Prisma
npm run db:push       # Aplica el schema a la BD
npm run db:seed       # Crea usuarios, flujos y productos de ejemplo
```

### 5. Ejecutar

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

**Usuarios de ejemplo** (contraseña por defecto: `Inicio-00`):

| Rol | Email |
|-----|-------|
| Super Admin | superadmin@whatsapibot.local |
| Admin | admin@whatsapibot.local |
| Colaborador | ventas@whatsapibot.local |

---

## Conectar a WhatsApp (Meta)

### 1. Crear app en Meta

1. Entra en [Meta for Developers](https://developers.facebook.com/)
2. Crea una app → tipo **Empresa**
3. Añade el producto **WhatsApp**
4. Obtén: **Access Token**, **Phone Number ID**, **Business Account ID**

### 2. Configurar el webhook

En tu app de Meta → WhatsApp → Configuración → Webhook:

| Campo | Valor |
|-------|-------|
| **URL de devolución de llamada** | `https://tu-dominio.com/api/webhook/whatsapp` |
| **Identificador de verificación** | Una cadena secreta que definas (ej. `MiTokenSecreto123`) |

> El identificador **no** es una URL. Es un texto secreto que debe coincidir con lo que configures en Conversia. Ver [docs/WEBHOOK_META_CONFIG.md](docs/WEBHOOK_META_CONFIG.md).

### 3. Configurar en Conversia

En la app → **Configuración** → sección WhatsApp:

- Access Token
- Phone Number ID  
- Business Account ID
- Token de verificación del webhook (el mismo que pusiste en Meta)
- Activar WhatsApp

---

## Despliegue en producción

### Vercel (recomendado)

```bash
npx vercel
```

Configura en Vercel:

- `DATABASE_URL` — URL de tu PostgreSQL (Neon, Supabase, etc.)
- `NEXT_PUBLIC_APP_URL` — URL pública de tu app (ej. `https://chat.tudominio.com`)

Opcionales: Pusher (tiempo real), Vercel Blob (imágenes), `WHATSAPP_APP_SECRET` (verificación de firma del webhook).

### Otros proveedores

La app es estándar Next.js. Puedes desplegarla en Railway, Render, Fly.io, VPS, etc. Asegúrate de:

1. Tener PostgreSQL accesible
2. Definir `DATABASE_URL` y `NEXT_PUBLIC_APP_URL`
3. Ejecutar `npm run db:push` y `npm run db:seed` en el primer despliegue

---

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo (puerto 3000) |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción |
| `npm run db:studio` | Prisma Studio (explorar BD) |
| `npm run db:migrate` | Crear migración |
| `npm run lint` | Linter |

---

## Estructura del proyecto

```
src/
├── app/                    # Rutas Next.js (App Router)
│   ├── (auth)/             # Login
│   ├── (dashboard)/        # Panel principal
│   └── api/                # API routes (webhook, auth, etc.)
├── components/             # Componentes React
├── lib/                    # Lógica: bot, config, DB, etc.
└── ...
prisma/
├── schema.prisma           # Modelo de datos
└── seed.ts                 # Datos iniciales
```

---

## Seguridad y aislamiento

- **Sin credenciales preconfiguradas** — Cada instalación parte de cero
- **Despliegue independiente** — Tu servidor, tu BD, tu cuenta de Meta
- **Sin cruce entre usuarios** — Cada instancia es totalmente aislada

---

## Licencia

Privado / Ver términos del repositorio.

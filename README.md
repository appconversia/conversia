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
git clone https://github.com/appconversia/conversia.git
cd conversia
npm install
```

### 2. Crear base de datos

Crea una base de datos PostgreSQL nueva:

```bash
createdb conversia
```

O desde tu gestor (pgAdmin, Postgres.app, etc.): crea una BD llamada `conversia`.

### 3. Variables de entorno

Copia el ejemplo y configura la conexión a tu BD:

```bash
cp .env.example .env
```

Edita `.env` y define al menos:

```env
DATABASE_URL="postgresql://USUARIO:CONTRASEÑA@localhost:5432/conversia"
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
| Super Admin | superadmin@conversia.local |
| Admin | admin@conversia.local |
| Colaborador | ventas@conversia.local |

---

## Conectar a WhatsApp (Meta)

Toda la credencial de Meta/WhatsApp va **por comercio** en el panel (**Configuración → Integración**), no en `.env`. La guía completa (mapa campo a campo, orden de pasos, App ID, App Secret y webhook) está en **[docs/GUIA_META_WHATSAPP.md](docs/GUIA_META_WHATSAPP.md)**.

### 1. Crear app en Meta

1. Entra en [Meta for Developers](https://developers.facebook.com/)
2. Crea una app → tipo **Empresa**
3. Añade el producto **WhatsApp**
4. En **Configuración → Básico** anota **App ID** y **App Secret**
5. En **WhatsApp → API Setup** (o equivalente) obtén **Access Token**, **Phone Number ID** y **WhatsApp Business Account ID**

### 2. Configurar el webhook

En tu app de Meta → **WhatsApp** → **Configuración** → **Webhook**:

| Campo | Valor |
|-------|-------|
| **URL de devolución de llamada** | `https://tu-dominio.com/api/webhook/whatsapp` (la misma URL que muestra Integración en Conversia) |
| **Identificador de verificación** | Una cadena secreta que **tú** inventas; la misma en Meta y en el panel |

> El identificador **no** es una URL. Errores típicos: [docs/WEBHOOK_META_CONFIG.md](docs/WEBHOOK_META_CONFIG.md).

### 3. Configurar en Conversia

En la app → **Configuración** → **Integración**:

- Access Token, Phone Number ID, Business Account ID  
- Webhook Verify Token (idéntico al de Meta)  
- **App ID (Meta)** y **App Secret (Meta)** (misma app que el token; el secreto valida la firma del webhook en producción)  
- Activa la integración y **Guarda**

Opcional en la misma pantalla: **Suscribir webhook** y **Verificar conexión Meta** si algo no llega.

---

## Despliegue en producción

### Vercel (recomendado)

```bash
npx vercel
```

Configura en Vercel:

- `DATABASE_URL` — URL de tu PostgreSQL (Neon, Supabase, etc.)
- `NEXT_PUBLIC_APP_URL` — URL pública de tu app (ej. `https://chat.tudominio.com`)

Opcionales: Pusher (tiempo real en Chats), Vercel Blob (imágenes). Meta/WhatsApp (tokens, App ID, App Secret) se configuran **por comercio** en el panel, no en env.

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

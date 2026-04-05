# Guía completa: Meta for Developers → Conversia (Integración)

Esta guía explica **qué hace el comercio en Meta** y **qué pega en el panel de Conversia** (`Configuración` → `Integración`). No hay credenciales globales de WhatsApp en Vercel: **cada comercio** guarda las suyas.

---

## 1. Qué va en Vercel y qué va en el panel

| Dónde | Qué es |
|-------|--------|
| **Vercel (proyecto)** | Infraestructura: base de datos (`DATABASE_URL`, `DIRECT_URL`), URL pública (`NEXT_PUBLIC_APP_URL`), Blob, Pusher opcional, etc. Ver `VARIABLES_DESPLIEGUE.md`. |
| **Conversia → Integración** | Todo lo relacionado con **tu app de Meta** y **WhatsApp Cloud API**: tokens, IDs, webhook, App ID, App Secret. |

---

## 2. Prerrequisitos

1. **URL HTTPS** de tu app en producción (ej. `https://tu-app.vercel.app`). Sin HTTPS, Meta no suele aceptar el webhook.
2. Cuenta en [Meta for Developers](https://developers.facebook.com/).
3. Una **app** de tipo **Empresa** con el producto **WhatsApp** añadido.
4. Un **número** de WhatsApp Business API (de prueba o producción) vinculado a esa app.

---

## 3. Mapa campo a campo: Meta → Conversia

| Campo en Conversia (Integración) | Dónde obtenerlo en Meta | Notas |
|--------------------------------|-------------------------|--------|
| **Access Token** | WhatsApp → *API Setup* / *Getting started* (token temporal) o usuario del sistema / token permanente | Debe tener permisos de WhatsApp. El token temporal caduca (~24 h); en producción usa un token de larga duración. |
| **Phone Number ID** | WhatsApp → *API Setup* o *Números de teléfono* → ID del número | Numérico largo; identifica el número conectado a la API. |
| **WhatsApp Business Account ID** | WhatsApp → configuración de la cuenta / encabezado de la sección WhatsApp | A veces etiquetado como *WABA ID*. |
| **Webhook Verify Token** | Lo **defines tú** (no lo “da” Meta) | Misma cadena exacta en Meta (campo *Verify token*) y en Conversia. Ej.: `MiTokenSecreto2026`. |
| **App ID (Meta)** | App → *Configuración* → *Básico* → *Identificador de la aplicación* | Numérico. Necesario para ciertas operaciones (p. ej. subir foto de perfil del negocio desde el panel). |
| **App Secret (Meta)** | App → *Configuración* → *Básico* → *Clave secreta* (Secreto de la app) | **Obligatorio** si Meta envía el webhook con cabecera `X-Hub-Signature-256` (entornos reales). Debe ser el secreto de **la misma app** cuyo token usas. |
| **URL del webhook** | La genera Conversia | Formato: `https://TU-DOMINIO-PUBLICO/api/webhook/whatsapp`. Debes pegarla en Meta como *Callback URL*. |
| **Activar integración WhatsApp** | — | Interruptor en el panel; sin activar, la integración no se usa como esperas en flujos que dependan de ello. |

La pantalla de Integración también muestra la **URL de webhook** para copiarla en Meta.

---

## 4. Pasos en Meta (resumen)

### 4.1 Crear la app y añadir WhatsApp

1. [developers.facebook.com](https://developers.facebook.com/) → **Mis apps** → **Crear app** → tipo **Empresa**.
2. En el panel de la app → **Añadir producto** → **WhatsApp** → **Configurar**.

### 4.2 App ID y App Secret

1. En el menú de la app: **Configuración** → **Básico**.
2. Copia **Identificador de la aplicación** → es el **App ID** en Conversia.
3. Copia **Clave secreta** (puede pedirte la contraseña de Facebook) → es el **App Secret** en Conversia. Trátalo como contraseña.

### 4.3 Token, Phone Number ID y Business Account ID

1. En el menú lateral: **WhatsApp** → **API Setup** (o *Getting started*).
2. Copia el **Temporary access token** o configura un token permanente (usuario del sistema con permisos WhatsApp), según tu proceso.
3. En la misma zona o en **Números de teléfono**, copia **Phone number ID**.
4. Copia el **WhatsApp Business Account ID** (WABA) que muestre el panel.

### 4.4 Configurar el webhook en Meta

1. **WhatsApp** → **Configuración** (a veces *Configuration*) → sección **Webhook**.
2. **URL de devolución de llamada (Callback URL)**: `https://TU-DOMINIO/api/webhook/whatsapp` (sustituye `TU-DOMINIO` por tu URL pública, **sin** barra al final en el dominio habitual de la app).
3. **Verify token**: la **misma** cadena que guardarás en Conversia como **Webhook Verify Token** (un texto que tú inventas; **no** es una URL).

Pulsa **Verificar y guardar**. Si falla, revisa [docs/WEBHOOK_META_CONFIG.md](WEBHOOK_META_CONFIG.md) (token idéntico, URL accesible, HTTPS).

### 4.5 Suscribir el webhook a los campos

En la configuración del webhook de WhatsApp, suscríbete al menos a **messages** (y los demás que use tu flujo). En el panel de Conversia, el botón **Suscribir webhook** ayuda a alinear la suscripción con nuestro backend.

---

## 5. Pasos en Conversia (Integración)

1. Entra al panel → **Configuración** → **Integración** (no solo “WhatsApp” suelto; la sección unificada de integración).
2. **URL base / URL pública** (si tu instalación lo muestra): debe coincidir con el dominio que usaste en Meta para el webhook (`https://…`).
3. Rellena **Access Token**, **Phone Number ID**, **Business Account ID**, **Webhook Verify Token**, **App ID (Meta)** y **App Secret (Meta)** con los valores anteriores.
4. **Guarda** los cambios.
5. Copia la **URL de webhook** que muestra la pantalla y comprueba que en Meta está **exactamente** esa URL en Callback URL.
6. Activa **Activar integración WhatsApp** y vuelve a **Guardar** si hace falta.
7. Usa **Suscribir webhook** y **Verificar conexión Meta** (o el diagnóstico que ofrezca tu versión) si los mensajes no llegan.

---

## 6. Por qué el App Secret es importante

Meta puede enviar cada notificación del webhook firmada con **HMAC-SHA256** en la cabecera `X-Hub-Signature-256`. El servidor de Conversia valida esa firma con el **App Secret** que guardaste para ese comercio. Si el secreto falta o no coincide con la app de Meta, las peticiones pueden rechazarse (**401**). El **Verify Token** solo sirve para el **primer** handshake GET de Meta; la firma protege los POST en producción.

---

## 7. Políticas y revisión de la app

Para pasar de modo desarrollo a producción, Meta exige URLs de **privacidad**, **términos** y **eliminación de datos** en la configuración de la app. La pantalla de Integración incluye referencias a las rutas de tu sitio (`/privacidad`, `/eliminacion-datos`, etc.) para rellenar en **Configuración de la aplicación** → **Información básica**.

---

## 8. Documentos relacionados

- [WEBHOOK_META_CONFIG.md](WEBHOOK_META_CONFIG.md) — Errores típicos al verificar el webhook.
- [VARIABLES_DESPLIEGUE.md](../VARIABLES_DESPLIEGUE.md) — Variables de Vercel (sin Meta por comercio).
- [META_WHATSAPP_POLICY_COMPLIANCE.md](META_WHATSAPP_POLICY_COMPLIANCE.md) — Cumplimiento de políticas.

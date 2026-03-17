# Auditoría y Diagnóstico - YJ Barriles

**Fecha:** Febrero 2026

## 1. Cambios realizados

### ✅ WhatsApp API – Políticas y riesgos
- **Solo recepción:** Solo se reciben conversaciones; no se inician desde la app (alineado con políticas de Meta).
- **Webhook:** Eliminados `console.log` en producción para evitar fugas de datos.
- **getWhatsAppCredentials:** No se usa para enviar mensajes; la app no envía mensajes iniciados por negocio.
- **24h rule:** No aplica porque no hay envío de mensajes iniciados por negocio.

### ✅ Inicio de conversaciones restringido
- **API:** `POST /api/conversations` solo permite `admin` y `super_admin` (403 para `colaborador`).
- **UI:** El botón "Nueva conversación" (+) solo se muestra a admin y super_admin.

### ✅ Eliminación de hardcode
- **auth.ts:** El rol se lee del campo `User.role` en BD; no hay override por email.
- **auth-utils.ts:** Eliminado `SUPER_ADMIN_EMAIL`; funciones basadas solo en rol.
- **Usuarios protegidos:** `AppConfig.system_protected_user_id` define qué usuario no se puede editar/eliminar.
- **Seed:** Crea el super admin y asigna su ID en `system_protected_user_id`; email configurable vía `SEED_SUPER_ADMIN_EMAIL`.

### ✅ Configuración desde BD
- **AppConfig:** Configuración en BD (`whatsapp_*`, `bot_*`, `system_protected_user_id`).
- **Config.ts:** Solo usa fallbacks cuando la BD devuelve null (p. ej. `systemPrompt`, `temperature`).

## 2. Pruebas ejecutadas

| Tipo          | Archivo                         | Estado   |
|---------------|----------------------------------|----------|
| Unitarias     | `auth-utils.test.ts`            | 6 tests ✓ |
| Unitarias     | `config-keys.test.ts`           | 2 tests ✓ |

**Ejecutar:** `npm run test`

## 3. Diagnóstico de funcionalidad

| Componente                         | Estado | Notas                                                                 |
|------------------------------------|--------|-----------------------------------------------------------------------|
| **Auth / Session**                 | ✅     | Sesión desde BD; rol desde `User.role`.                              |
| **Inicio de conversaciones**       | ✅     | Solo admin/super_admin en API y UI.                                  |
| **Listado conversaciones**         | ✅     | GET desde BD; conteos de no leídos vía consulta.                     |
| **Marcar como leído**             | ✅     | Actualiza `lastReadAt` en BD.                                        |
| **Envío de mensajes (interno)**   | ✅     | Solo si el usuario tiene la conversación asignada.                    |
| **Usuarios – CRUD**                | ✅     | Protección por ID vía `system_protected_user_id`.                     |
| **Bot flows**                      | ✅     | Solo admin; configuración desde BD.                                  |
| **Configuración (super_admin)**    | ✅     | WhatsApp y bot desde `AppConfig`.                                    |
| **Dashboard stats**                | ✅     | Todo consultado en BD en tiempo real.                                |
| **Webhook WhatsApp**               | ⚠️     | Recibe eventos; aún no crea conversaciones/mensajes (TODO).           |
| **Pusher (tiempo real)**           | ⚠️     | Requiere `PUSHER_*` configurados.                                   |

## 4. Requisitos para producción

1. **Base de datos:** PostgreSQL configurado; ejecutar `npx prisma db push` y `npx prisma db seed`.
2. **Variables de entorno:** `DATABASE_URL`, `PUSHER_*` (opcional).
3. **Usuario protegido:** El seed debe ejecutarse para rellenar `system_protected_user_id`.

## 5. Resumen

- Cumplimiento con políticas WhatsApp: adecuado (solo recepción).
- Inicio de conversaciones: restringido a admin/super_admin.
- Sin hardcode: roles, configuración y usuario protegido desde BD.
- Pruebas: 8 tests unitarios pasando.
- Pendiente: implementar la creación de conversaciones/mensajes en el webhook de WhatsApp.

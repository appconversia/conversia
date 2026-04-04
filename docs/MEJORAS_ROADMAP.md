# Roadmap de mejoras - Conversia

## ✅ Implementado

- Admins ven todas las conversaciones; colaboradores solo las suyas
- Switch "Tomar/Liberar" conversación
- Solo quien tiene asignada puede escribir
- Admin puede **asignar a colaborador** desde dropdown
- Polling cada 2s para actualización "casi en tiempo real"
- Seed con conversaciones de ejemplo reales en DB

---

## 1. Tiempo real

| Opción | Esfuerzo | Descripción |
|--------|----------|-------------|
| **Server-Sent Events (SSE)** | Medio | Un endpoint que mantiene conexión abierta y envía eventos al crear/actualizar mensajes o asignaciones |
| **WebSockets** | Alto | Socket.io o similar: push bidireccional, ideal para chat. Requiere servidor persistente |
| **Polling optimizado** | Bajo | Ya tenemos 2s. Añadir `Last-Modified` / `If-None-Match` para no reenviar si no hay cambios |

---

## 2. Experiencia de usuario

- **Notificaciones de escritura**: "Usuario está escribiendo..."
- **Estado de lectura**: Marcar mensajes como leídos
- **Indicador "en línea"**: Quién está conectado
- **Búsqueda en conversaciones**: Filtrar por nombre o contenido
- **Archivos adjuntos**: Drag & drop más visible
- **Respuestas/citas**: Responder a un mensaje concreto

---

## 3. Escalabilidad

- **Paginación de mensajes**: Cargar por bloques al hacer scroll hacia arriba
- **Límite de participantes**: Hoy 1:1; en futuro grupos
- **Caché/Redis**: Para sesiones y estado de conexión si hay muchos usuarios

---

## 4. Integración y negocio

- **WhatsApp Business API**: Recibir/responder conversaciones desde WhatsApp
- **Webhooks**: Notificar a sistemas externos al crear/cerrar conversación
- **Historial/export**: Exportar conversaciones a PDF o CSV
- **Métricas**: Tiempo de primera respuesta, conversaciones por usuario, etc.

---

## 5. Seguridad y calidad

- **Rate limiting**: Evitar spam en creación de mensajes
- **Validación de archivos**: Tipo, tamaño, virus
- **Auditoría**: Log de quién asignó/liberó conversaciones
- **Tests E2E**: Playwright para flujos principales

---

## Próximos pasos sugeridos (prioridad)

1. **Tiempo real (SSE)** – Mejorar sensación de chat en vivo sin cambiar mucha arquitectura
2. **Estado de lectura** – Mejora clara de UX
3. **"Usuario está escribiendo"** – Muy útil para conversación fluida

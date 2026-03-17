# Cumplimiento políticas Meta / WhatsApp Business API

Este documento verifica que YJ Barriles Chat cumple con las políticas de Meta para WhatsApp Business Platform (feb 2026).

## Políticas aplicables

- [WhatsApp Business Messaging Policy](https://business.whatsapp.com/policy)
- [WhatsApp Business Platform - Policy Enforcement](https://developers.facebook.com/docs/whatsapp/overview/policy-enforcement/)

## Checklist de cumplimiento

### ✅ Autenticidad y transparencia
- [x] Perfil de negocio con información de contacto (email)
- [x] Sin suplantación de identidad
- [x] Solo usuarios que optan explícitamente (registro/login interno)

### ✅ Estándares técnicos
- [x] Seguir documentación oficial de producto
- [x] Información de negocio precisa
- [x] Cumplir leyes de comunicaciones aplicables

### ✅ Tipos de mensaje permitidos (WhatsApp Cloud API)
- [x] Texto
- [x] Imagen (jpeg, png, max 5MB)
- [x] Video (mp4, 3gp, max 16MB)
- [x] Audio (aac, amr, mp3, m4a, ogg, webm — max 16MB)
- [x] Documento (pdf, doc, docx, xls, xlsx, ppt, pptx, txt, max 100MB)
- [x] Sticker (webp, max 500KB animado / 100KB estático)
- [x] Notas de voz (webm/ogg vía MediaRecorder)

### ✅ Actividades prohibidas (evitar)
- [x] Sin venta de alcohol (B2B barriles - consultar uso comercial)
- [x] Sin contenido adulto
- [x] Sin venta de animales
- [x] Sin servicios de citas
- [x] Sin contenido digital no autorizado

### Uso interno y WhatsApp Cloud API
Este chat admite comunicación interna y, con WhatsApp Cloud API, atención a clientes externos. Para integración con WhatsApp Cloud API se cumple:
- Opt-in explícito del usuario (inicio de conversación por WhatsApp)
- Política de privacidad, términos y eliminación de datos publicados y enlazados en la app
- Plantillas aprobadas para mensajes iniciados por el negocio (cuando aplique)

### Enlaces para envío a aprobación (Meta App Review)
Lista completa de enlaces oficiales y URLs de esta aplicación: [WHATSAPP_APPROVAL_LINKS.md](./WHATSAPP_APPROVAL_LINKS.md).

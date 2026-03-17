# Análisis de conversaciones para plantillas de reactivación WhatsApp

**Fecha:** 10 de marzo de 2026  
**Conversaciones analizadas:** 550  
**Objetivo:** Definir plantillas para reactivar conversaciones y dar seguimiento (ventana 24h cerrada).

---

## 1. Resumen de patrones encontrados

| Métrica | Valor |
|---------|-------|
| **Total analizadas** | 550 |
| **Último mensaje del contacto** | 18 |
| **Último mensaje del bot** (esperando respuesta) | 532 |
| **Con interés comercial** (precio, producto, compra) | 204 |
| **Dijeron "te escribo" / "te aviso"** | 1 |
| **Inactivas 24h+** | 30 |
| **Inactivas 3d+** | 0 |
| **Inactivas 7d+** | 0 |

### Por etapa del proceso de venta

| Etapa | Cantidad | Descripción |
|-------|-----------|-------------|
| **producto** | 168 | Preguntaron por productos, precios, tamaños, barriles |
| **otro** | 273 | Varios: "Quiero más información", consultas genéricas |
| **saludo** | 71 | Solo saludaron o "¿Puedes darme más información?" |
| **cierre** | 33 | Preguntaron por envío, pago, compra |
| **despedida** | 4 | Se despidieron |
| **te_escribo** | 1 | Dijeron que escribirían después |

### Patrones más frecuentes en mensajes del contacto

- **"Quiero más información"** – Muy recurrente (botón de anuncio/ads)
- **"¿Puedes darme más información sobre esto?"** – Entrada desde anuncios
- **"Hola"** + consulta – Saludo inicial
- **Preguntas de producto** – "Barriles de cuántas libras", "precios", "el de 25 LB", "barril mini"
- **Preguntas de envío** – "¿Cuánto cuesta el envío a...?"
- **"Voy a mirarlos y te aviso"** – Interés sin cierre inmediato

---

## 2. Plantillas recomendadas (10 plantillas con botón y contexto)

Todas incluyen **Footer** (contexto de marca) y **Botón de respuesta rápida** para facilitar que el cliente responda y reactive la conversación.

| # | Nombre | Categoría | Uso principal | Variables |
|---|--------|-----------|---------------|-----------|
| 1 | `reactivacion_general` | UTILITY | Cualquier conversación fría | {{1}} |
| 2 | `seguimiento_producto` | UTILITY | Interés en productos | {{1}}, {{2}} |
| 3 | `recordatorio_info` | UTILITY | Pidieron info y no respondieron | {{1}} |
| 4 | `seguimiento_compra` | UTILITY | Preguntaron por envío/compra | {{1}} |
| 5 | `oferta_consulta` | MARKETING | Lead frío o saludo sin respuesta | {{1}} |
| 6 | `seguimiento_general` | UTILITY | Seguimiento a compra, proceso o ayuda | {{1}} |
| 7 | `recordatorio_catalogo` | UTILITY | Pidieron catálogo y no respondieron | {{1}} |
| 8 | `recordatorio_te_aviso` | UTILITY | Dijeron "te aviso" y no volvieron | {{1}} |
| 9 | `asesoria_disponible` | UTILITY | Asesor disponible para ayudar | {{1}} |
| 10 | `continuar_ayuda` | UTILITY | Continuar ayudando en general | {{1}} |

---

## 3. Textos completos (Body + Footer + Botón)

**Botón sugerido para todas:** Respuesta rápida → **"Sí, me interesa"** (el cliente toca y envía ese mensaje, reactivando la ventana 24h).

**Footer sugerido para todas:** `YJ Barriles - Barriles con el corazón`

---

### Plantilla 1: `reactivacion_general` (UTILITY)
**Uso:** Cualquier conversación que quedó sin respuesta.

**Body:**
```
Hola {{1}}, en YJ Barriles seguimos con los barriles con el corazón. ¿En qué te podemos ayudar hoy? Responde este mensaje y te atendemos.
```

**Footer:** YJ Barriles - Barriles con el corazón  
**Botón:** Respuesta rápida → "Sí, me interesa"

---

### Plantilla 2: `seguimiento_producto` (UTILITY)
**Uso:** Mostraron interés en productos, precios o catálogo.

**Body:**
```
Hola {{1}}, ¿cómo vas con lo del {{2}}? Si tienes dudas o quieres más información, aquí estamos. Responde y te ayudamos.
```

**Variables:** {{1}} = nombre, {{2}} = "barril" / "catálogo" / "productos" / "precios"  
**Footer:** YJ Barriles - Barriles con el corazón  
**Botón:** Respuesta rápida → "Sí, me interesa"

---

### Plantilla 3: `recordatorio_info` (UTILITY)
**Uso:** Pidieron "más información" o "catálogo" y no respondieron.

**Body:**
```
Hola {{1}}, te esperábamos. Si aún te interesa información de nuestros barriles y accesorios, cuéntanos y te ayudamos. Responde para continuar.
```

**Footer:** YJ Barriles - Barriles con el corazón  
**Botón:** Respuesta rápida → "Sí, me interesa"

---

### Plantilla 4: `seguimiento_compra` (UTILITY)
**Uso:** Preguntaron por envío, pago o compra y no cerraron.

**Body:**
```
Hola {{1}}, vimos que preguntaste por compra o envío. Un asesor puede ayudarte con los detalles. Responde este mensaje y te contactamos.
```

**Footer:** YJ Barriles - Barriles con el corazón  
**Botón:** Respuesta rápida → "Sí, me interesa"

---

### Plantilla 5: `oferta_consulta` (MARKETING)
**Uso:** Lead que solo saludó o mostró interés inicial.

**Body:**
```
Hola {{1}}, en YJ Barriles tenemos barriles y accesorios para parrilla. ¿Quieres que te enviemos catálogo y precios? Responde y te lo enviamos.
```

**Footer:** YJ Barriles - Barriles con el corazón  
**Botón:** Respuesta rápida → "Sí, me interesa"

---

### Plantilla 6: `seguimiento_general` (UTILITY)
**Uso:** Seguimiento a compra, proceso o para continuar ayudando. Muy versátil.

**Body:**
```
Hola {{1}}, te contacto para darle seguimiento a tu compra, a tu proceso o para continuar ayudándote. ¿En qué te podemos apoyar? Responde y te atendemos.
```

**Footer:** YJ Barriles - Barriles con el corazón  
**Botón:** Respuesta rápida → "Sí, me interesa"

---

### Plantilla 7: `recordatorio_catalogo` (UTILITY)
**Uso:** Pidieron catálogo, fotos o precios y no respondieron.

**Body:**
```
Hola {{1}}, te esperábamos por el catálogo. Si aún quieres ver nuestros barriles y accesorios, responde este mensaje y te enviamos la información.
```

**Footer:** YJ Barriles - Barriles con el corazón  
**Botón:** Respuesta rápida → "Sí, me interesa"

---

### Plantilla 8: `recordatorio_te_aviso` (UTILITY)
**Uso:** Dijeron "te aviso", "te escribo" o "voy a mirar" y no volvieron.

**Body:**
```
Hola {{1}}, ¿cómo vas con la decisión? Si ya revisaste y tienes dudas o quieres hacer el pedido, aquí estamos. Responde y te ayudamos.
```

**Footer:** YJ Barriles - Barriles con el corazón  
**Botón:** Respuesta rápida → "Sí, me interesa"

---

### Plantilla 9: `asesoria_disponible` (UTILITY)
**Uso:** Asesor disponible para resolver dudas o cerrar venta.

**Body:**
```
Hola {{1}}, tenemos un asesor disponible para ayudarte con precios, envíos o cualquier duda. Responde este mensaje y te atendemos de inmediato.
```

**Footer:** YJ Barriles - Barriles con el corazón  
**Botón:** Respuesta rápida → "Sí, me interesa"

---

### Plantilla 10: `continuar_ayuda` (UTILITY)
**Uso:** Continuar ayudando en general. Opción genérica de cierre.

**Body:**
```
Hola {{1}}, queremos continuar ayudándote. Si tienes alguna duda sobre barriles, accesorios, envíos o pedidos, responde y te atendemos.
```

**Footer:** YJ Barriles - Barriles con el corazón  
**Botón:** Respuesta rápida → "Sí, me interesa"

---

## 4. Instrucciones para crear plantillas en Meta Developer

### Paso 1: Acceso
1. Entra a [Meta Business Suite](https://business.facebook.com)
2. Ve a **Configuración** → **Cuentas** → **Cuentas de WhatsApp**
3. Selecciona tu número de WhatsApp Business
4. En el menú lateral: **Plantillas de mensajes** (Message Templates)

### Paso 2: Crear plantilla
1. Clic en **Crear plantilla**
2. **Nombre:** usa snake_case (ej: `reactivacion_general`) – sin espacios ni caracteres especiales
3. **Categoría:**
   - **UTILITY** – para reactivación y seguimiento (recomendado para la mayoría)
   - **MARKETING** – para ofertas y promociones
4. **Idioma:** Español (es) o es_CO

### Paso 3: Componentes
- **Header** (opcional): texto o imagen de marca
- **Body** (obligatorio): texto con variables `{{1}}`, `{{2}}`, etc.
- **Footer** (recomendado): "YJ Barriles - Barriles con el corazón" – da contexto de marca
- **Botón Respuesta rápida** (recomendado): tipo "Quick Reply" con texto "Sí, me interesa" – cuando el cliente toca, envía ese mensaje y reactiva la ventana 24h

### Paso 4: Botón de respuesta rápida
- En Meta, al crear la plantilla, añade un **botón** → tipo **Respuesta rápida** (Quick Reply)
- Texto del botón: **"Sí, me interesa"** (máx. 25 caracteres)
- Cuando el cliente toca el botón, WhatsApp envía ese texto como mensaje → se reactiva la ventana 24h automáticamente

### Paso 5: Variables
- Cada `{{1}}`, `{{2}}` se reemplaza al enviar
- En la app: `bodyParams: ["Juan", "barril"]` para {{1}}=Juan, {{2}}=barril
- Si la plantilla no tiene variables, `bodyParams: []`

### Paso 6: Envío de ejemplo
- Meta puede pedir un ejemplo para aprobar
- Usa datos ficticios: "Cliente", "producto", etc.

### Paso 7: Aprobación
- Meta revisa en 24–48 h
- Si rechazan, revisa las [políticas de plantillas](https://developers.facebook.com/docs/whatsapp/message-templates/guidelines)

---

## 5. Uso desde la app YJ Barriles

Cuando la ventana de 24h está cerrada:
1. Se muestra el selector de plantillas aprobadas
2. Eliges la plantilla
3. Si tiene variables, aparecen campos para rellenar
4. Clic en "Enviar plantilla"

El endpoint `POST /api/conversations/[id]/send-template` envía con:
- `templateName`: nombre exacto (ej. `reactivacion_general`)
- `languageCode`: `es` o `es_CO`
- `bodyParams`: array de strings para {{1}}, {{2}}, etc.

---

## 6. Prioridad recomendada

Para empezar, crea en este orden:
1. **reactivacion_general** – cubre la mayoría de casos
2. **seguimiento_general** – muy versátil (compra, proceso, ayuda)
3. **recordatorio_info** – útil por el volumen de "Quiero más información"
4. **seguimiento_producto** – para quienes preguntaron por productos
5. **seguimiento_compra** – para quienes preguntaron por envío/compra
6. **recordatorio_catalogo** – pidieron catálogo y no respondieron
7. **recordatorio_te_aviso** – dijeron "te aviso" y no volvieron
8. **asesoria_disponible** – asesor disponible
9. **continuar_ayuda** – opción genérica
10. **oferta_consulta** – para leads fríos (MARKETING)

---

## 7. ⭐ 5 PLANTILLAS GARANTIZADAS (sin reclasificación a Marketing)

Estas 5 plantillas están diseñadas para **cumplir estrictamente** las reglas de Utilidad de Meta y evitar el pop-up de reclasificación a Marketing.

### Reglas aplicadas
- **Variable {{1}}** = vincula el mensaje a una solicitud/consulta concreta (obligatorio para Utilidad)
- **Botón funcional** = "Continuar" o "Responder" (no "Sí, me interesa")
- **Footer neutro** = solo "YJ Barriles" (sin tagline promocional)
- **Body factual** = tono de actualización de estado, sin persuasión
- **Sin CTAs promocionales** = no "¿Quieres que te enviemos?", "catálogo", "precios", etc.

### Valor para {{1}}
Al enviar, pasa un identificador de la solicitud/consulta: número de conversación, ID corto, o el literal "Solicitud". Ejemplo: `bodyParams: ["001"]` o `bodyParams: ["Solicitud"]`.

---

### Plantilla 1: `solicitud_pendiente`
**Body:**
```
Tu solicitud {{1}} está pendiente.
```
**Footer:** YJ Barriles  
**Botón:** Respuesta rápida → **Continuar**

---

### Plantilla 2: `consulta_espera`
**Body:**
```
Tu consulta {{1}} está en espera.
```
**Footer:** YJ Barriles  
**Botón:** Respuesta rápida → **Continuar**

---

### Plantilla 3: `proceso_actualizacion`
**Body:**
```
Actualización: tu proceso {{1}} está pendiente.
```
**Footer:** YJ Barriles  
**Botón:** Respuesta rápida → **Responder**

---

### Plantilla 4: `asistencia_disponible`
**Body:**
```
Tu solicitud {{1}} tiene asistencia disponible.
```
**Footer:** YJ Barriles  
**Botón:** Respuesta rápida → **Continuar**

---

### Plantilla 5: `estado_solicitud`
**Body:**
```
Estado de tu solicitud {{1}}: pendiente de respuesta.
```
**Footer:** YJ Barriles  
**Botón:** Respuesta rápida → **Responder**

---

### Cómo crearlas en Meta
1. **Categoría:** UTILITY
2. **Idioma:** es o es_CO
3. **Variable {{1}}:** usar siempre (ID, "Solicitud", "Consulta", etc.)
4. **Footer:** exactamente "YJ Barriles"
5. **Botón:** Quick Reply con "Continuar" o "Responder"

### Envío desde la app
```json
{
  "templateName": "solicitud_pendiente",
  "languageCode": "es",
  "bodyParams": ["001"]
}
```

---

## 8. Muestras de conversaciones analizadas

| Teléfono | Etapa | Último mensaje contacto | Días inactivo |
|----------|-------|-------------------------|---------------|
| 573219020138 | otro | ¡Hola! Quiero más información | 0 |
| 573006788878 | saludo | Buenas tardees | 0 |
| 573015476476 | producto | Barriles de cuantas libras y que precios manejan | 0 |
| 573118776934 | producto | voy a mirarlos y te aviso | 0 |
| 573219754628 | cierre | Ok, Q cuesta el envío a San Gil Santander | 0 |
| 573234771816 | producto | Un barril mini como para un apartamento | 0 |
| 573154140267 | producto | El de 25 LB? | 0 |

*(30 muestras en total en el análisis)*

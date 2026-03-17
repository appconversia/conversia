# Análisis: Por qué el bot no envía fotos en algunas conversaciones con Pixel Hub

## Resumen ejecutivo

En conversaciones recientes con **Pixel Hub**, el bot **promete** enviar fotos ("Te enviaré las fotos del [producto]") pero en **7 de 7** casos recientes de ese tipo **no envía ninguna imagen**. Otras conversaciones (ej. gorras, carbón) sí reciben fotos/videos correctamente.

---

## Evidencia en producción

### Casos donde prometió fotos pero NO envió media

| Fecha/hora       | Usuario dijo            | Bot respondió                                  | ¿Media enviada? |
|------------------|-------------------------|------------------------------------------------|-----------------|
| 2026-02-27 00:56 | "Quiero video y fotos de las gorras" | "Te envío la imagen y video de Gorras..." | ✅ Sí (excepción) |
| 2026-02-27 01:39 | "Hola quiero información del carbón"  | "Te enviaré los detalles del Carbón..."    | ✅ Sí           |
| 2026-02-27 01:40 | **"Tienes fotos?"** (tras ver Delantal) | "Te enviaré las fotos del *Delantal de Cuero - Color Negro*" | ❌ No |
| 2026-02-25 02:56 | "El aventurero"         | "Te enviaré las fotos del EL AVENTURERO..." | ❌ No (solo texto ficha) |
| 2026-02-25 02:58 | "No me llegó la foto"   | "Te enviaré las fotos del EL AVENTURERO..." | ❌ No |
| 2026-02-25 04:09 | "Mándame fotos del barril grande promo" | "Te enviaré las fotos del Barril Grande..." | ❌ No |
| 2026-02-25 04:29 | "Si" (confirmación)     | "Aquí tienes las fotos del Barril Grande..." | ❌ No (solo ficha texto) |
| 2026-02-25 04:30 | "M y las fotos las fotos" | "Te enviaré las fotos del Barril Grande..." | ❌ No |
| 2026-02-25 04:45 | "El primero"            | "Te enviaré las fotos del Barril Grande..." | ❌ No |
| 2026-02-25 04:45 | "Qué pasó con las fotos?" | "Te enviaré las fotos..." | ❌ No |
| 2026-02-25 04:46 | "Mándeme todas fotos"   | "Te enviaré las fotos de todos..." | ❌ No |
| 2026-02-25 12:30 | "El tierno"           | "Te enviaré las fotos del EL TIERNO..." | ❌ No |

### Caso que SÍ funcionó (2026-02-25 02:46)

Cuando Pixel Hub dijo **"Quiero barriles"**, el bot envió **9 imágenes con media** (todos los barriles). Ese flujo fue correcto.

---

## Causas identificadas

### 1. **"Tienes fotos?" no dispara el envío de imágenes**

El mensaje **"Tienes fotos?"** no hace match con las condiciones que activan el envío:

- **pideVideoOImagen** exige frases como: `fotos de`, `fotos del`, `envíame foto`, `quiero video de`, etc.
- **CLIENTE_PIDE_FOTOS** exige que el mensaje empiece con: `fotos`, `dale`, `sí`, `envía`, `muéstrame`, etc.

**"Tienes fotos?"** no cumple ninguna de las dos, porque:
- no contiene `fotos de/del`,
- empieza con `tienes`, no con `fotos`, `sí`, `dale`, etc.

Resultado: el flujo no detecta que el usuario pide fotos, aunque el bot responda prometiendo envío.

---

### 2. **Respuestas genéricas vs. petición específica**

Cuando el usuario pide algo ambiguo como:
- "El aventurero"
- "Mándame fotos del barril grande promo"
- "El primero"

El sistema puede:
- resolver correctamente el producto,
- pero **no** encender `sendImages` porque no se detecta que pide explícitamente fotos o videos.

Además, algunas respuestas usan **SEND_FULL_DESCRIPTION** (ficha de texto) en lugar de imágenes, y en ese camino **no se envían fotos** por diseño.

---

### 3. **Productos inexistentes en tabla Product**

En el catálogo actual hay:
- `Delantal de Cuero - Color Café`
- `Delantal de Cuero - Color Negro`
- `Delantal de Cuero` (tabla `Product`)

La tabla `Product` solo tiene **"Delantal de Cuero"**. Las variantes por color fueron añadidas manualmente al catálogo y no están en la BD. Eso puede provocar inconsistencias entre resolución de producto y envío de media.

---

### 4. **Dependencia total de la respuesta de la IA**

Cuando el usuario dice algo que no matchea las condiciones explícitas (por ejemplo "Tienes fotos?"), el envío depende de:
1. Que la IA incluya una **promesa de envío** (ej. "te enviaré…", "te envío…"),
2. Que en esa misma respuesta se mencione el **nombre del producto**,
3. Que el nombre coincida con algún producto del catálogo.

Si la IA no incluye el producto o lo menciona de forma ambigua, no se extrae `productFilter` y **sendImages queda en false**.

---

### 5. **Posibles fallos silenciosos al enviar**

Si `sendProductImages` se llama pero falla el envío vía API de WhatsApp, el bot registra el error en logs, pero el usuario sigue viendo solo la promesa de envío. Sin revisar logs no se puede saber si algún caso es de fallo de API.

---

## ¿Pasa en otros contactos?

Sí. El mismo patrón puede repetirse con cualquier contacto que:
- diga "Tienes fotos?", "¿Me mandas las fotos?", "Y las fotos?", etc., sin usar frases tipo `fotos de X` o `envíame foto`,
- dé respuestas cortas como "Sí", "Dale" después de que el bot ofrezca fotos,
- pida un producto por nombre o posición sin una frase explícita de fotos/videos.

En esos casos, la lógica actual puede no encender `sendImages` aunque el bot prometa envío.

---

## Resumen de causas

| Causa | Descripción | Afecta a |
|-------|-------------|----------|
| Regex de petición de fotos | "Tienes fotos?" no matchea `pideVideoOImagen` ni `CLIENTE_PIDE_FOTOS` | Pixel Hub y cualquier contacto |
| Dependencia de la IA | Sin match de regex, todo depende de que la IA mencione producto en la promesa | Todos |
| SEND_FULL_DESCRIPTION | Ruta de ficha de texto sin imágenes por diseño | Todos |
| Productos solo en catálogo | Delantal Café/Negro no existen en `Product`, solo en catálogo | Casos de Delantal |

---

## Recomendaciones técnicas (para implementar después)

1. Añadir patrones que detecten peticiones de fotos como:
   - `tienes fotos`, `tiene fotos`, `tienen fotos`,
   - `y las fotos`, `las fotos`, `me mandas fotos`, `quiero las fotos`.
2. Ajustar `CLIENTE_PIDE_FOTOS` para que también matchee respuestas cortas de confirmación tras una promesa de fotos del bot.
3. Sincronizar catálogo con `Product` o mapear variantes (Café/Negro) al producto real antes de envío.

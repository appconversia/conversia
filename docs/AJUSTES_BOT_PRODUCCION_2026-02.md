# Ajustes Bot Producción — Feb 2026

## Resumen ejecutivo

Cambios aplicados para mejorar coherencia, matcheo de productos (MLP/M.L.P.) e intro antes de media.

---

## 1. Análisis: "más detalles" / "qué incluye" después de video/imagen

**Sí se cumple.** Existen dos rutas que cubren este caso:

### Ruta A: product-detail-question-brain (preguntas puntuales)
- **Detecta:** "qué incluye", "qué trae", "accesorios", "dimensiones", "características", "precio", etc.
- **Se ejecuta:** Antes de `processSalesFlow` en main-brain.
- **Contexto:** Usa `lastProductSentForBot` (el último producto enviado en video/imagen) para resolver a qué producto se refiere el usuario.
- **Resultado:** Consulta BD con datos reales, IA redacta respuesta, se envía solo texto (sin media).

### Ruta B: sales-flow SEND_FULL_DESCRIPTION
- **Detecta:** "más detalles", "descripción completa", "qué incluye", "info completa", "ficha completa", etc.
- **Cuando:** Si el usuario pide la ficha completa de un producto.
- **Resultado:** `buildFullProductDescription` genera la descripción extendida, se envía como texto, `sendImages = false`.

**Flujo típico:**
1. Usuario recibe video + imagen + descripción + CTA del Barril X.
2. Usuario escribe: "qué incluye?" o "más detalles".
3. Si "qué incluye" → product-detail-question usa `lastProductSent` = Barril X, consulta BD, responde.
4. Si "más detalles" o "descripción completa" → sales-flow emite SEND_FULL_DESCRIPTION, se envía ficha completa.

---

## 2. Ajustes implementados

### 2.1 Normalización MLP / M.L.P. (y similares)
- **Archivos:** `sales-flow-brain.ts`, `product-selection-brain.ts`, `product-detail-question-brain.ts`
- **Función:** `normalizeForMatch(s)` — quita puntos y guiones bajos para que "mlp" matchee "m.l.p."
- **Efecto:** "Quiero el MLP", "el mlp" ahora reconocen "El Barril M.L.P. 70 Libras Premium".
- **Usado en:** `findSingleProductMatch`, `matchByCatalogName`, `findProductNamesByWords`.

### 2.2 Intro corto antes de video/imagen
- **Archivo:** `main-brain.ts`
- **Lógica:** Cuando `sendImages === true`, en vez de usar la respuesta completa de la IA se usa un intro corto:
  - 1 producto: `"Te enviaré los detalles del *[nombre]*, un momento por favor ✨"`
  - Varios: `"Te envío la información de los barriles que elegiste, un momento por favor ✨"`
  - Catálogo completo: `"Te envío la información del catálogo, un momento por favor ✨"`
- **Efecto:** Se elimina texto largo con ficha y preguntas de asesor antes del video; esas van en imagen (caption) y CTA.

### 2.3 Capa coherencia (previamente implementado)
- **Archivo:** `sales-flow-brain.ts`
- **Lógica:** La Capa coherencia solo fuerza handoff cuando `confirmacionCortaDetectada` (usuario dijo "sí", "dale", etc.).
- **Efecto:** Evita falsos handoffs cuando el cliente solo pide info y la respuesta incluye el CTA estándar "un asesor te atiende".

---

## 3. Orden final del flujo cuando el usuario elige producto(s)

```
1. Intro corto (texto): "Te enviaré los detalles del *Barril X*, un momento por favor ✨"
2. Video del producto
3. Imagen con descripción (caption)
4. CTA: "¿Te interesa? Si tienes dudas, un asesor te atiende 📦"
```

Si después el usuario pregunta "qué incluye" o "más detalles", se aplica el flujo de product-detail o SEND_FULL_DESCRIPTION descrito arriba.

---

## 4. Resumen de archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/lib/bot/sub-brains/sales-flow-brain.ts` | `normalizeForMatch`, uso en `findSingleProductMatch` y `matchByCatalogName` |
| `src/lib/bot/sub-brains/product-selection-brain.ts` | `normalizeForMatch`, uso en `findProductNamesByWords` |
| `src/lib/bot/sub-brains/product-detail-question-brain.ts` | `normalizeForMatch`, uso en `findSingleProductMatch` |
| `src/lib/bot/main-brain.ts` | Intro corto cuando `sendImages === true` |
| `src/lib/__tests__/product-selection-brain.test.ts` | Test MLP/M.L.P. y catálogo ampliado |

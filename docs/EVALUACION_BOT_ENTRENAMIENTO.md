# Evaluación del Bot YJ Barriles — Entrenamiento y Coherencia

**Fecha:** Febrero 2026 (actualizado)  
**Modo:** Solo lectura (sin modificaciones al código)  
**Objetivo:** Calificar el bot, sus prompts y lógica híbrida de 0 a 100%, y proponer mejoras.

---

## 1. Calificación global

### Resumen ejecutivo

| Dimensión | Puntuación | Observaciones |
|-----------|------------|---------------|
| **Prompts y entrenamiento (IA)** | 78/100 | Buen prompt, FUERA_DE_ALCANCE añadido. Falta few-shot y regionalismos. |
| **Lógica híbrida (regex + fallbacks)** | 85/100 | normalizeForMatch, scopeGuardTriggered, coherencia promesa fotos, checkCtaResponseCoherence. |
| **Arquitectura (cerebritos)** | 80/100 | Bien separado. Clasificador CTA mejora handoff. |
| **Coherencia conversacional** | 75/100 | Coherencia promesa fotos (Fotos tras info) y clasificador CTA por IA. |
| **Robustez ante fallos** | 74/100 | scope_guard para NO_ENTIENDO y FUERA_DE_ALCANCE. Sin retry explícito. |
| **Testing** | 78/100 | 50+ tests (sales-flow, product-detail, product-selection, escenarios). |

### **Calificación global: 78/100**

---

## 2. Desglose por componente

### 2.1 Default System Prompt (`default-system-prompt.ts`)

**Fortalezas:**
- Instrucciones claras sobre tags (PRODUCT_INTEREST, HANDOFF_REQUIRED, etc.)
- **FUERA_DE_ALCANCE** añadido para mensajes fuera de tema (comida, política, etc.)
- Reglas de formato WhatsApp explícitas (*negrita*, sin **)
- "Opciones primero": no enviar fotos si piden genéricamente
- Mapeo de ordinales y referencias bien documentado
- Regla NO_ENTIENDO para mensajes incoherentes
- Coherencia handoff: no prometer asesor sin HANDOFF_REQUIRED

**Debilidades:**
- No hay ejemplos few-shot de respuestas correctas
- Posible confusión con productos de nombre muy similar
- No se menciona explícitamente el idioma colombiano/regionalismos
- Falta guía para mensajes multimodales (imagen + texto del usuario)

### 2.2 CatalogContext (inyectado en sales-flow-brain)

**Fortalezas:**
- Lista de productos numerada para "el primero", "el segundo"
- Instrucciones obligatorias para PRODUCT_INTEREST
- Casos especiales: "todos", "video del X", SEND_FULL_DESCRIPTION
- Prohibición de "cannot send" / "no puedo enviar"

**Debilidades:**
- El contexto puede ser largo si hay muchos productos; riesgo de truncar
- No hay priorización de productos populares o destacados

### 2.3 Lógica híbrida de resolución

| Función | Cobertura | Ejemplo que cubre | Gap potencial |
|---------|-----------|-------------------|---------------|
| `findSingleProductMatch` | ✅ Buena | "video del barril brochetero" | Deduplicación corregida. Nombres muy largos o con caracteres especiales. |
| `resolveByNameReference` | ✅ Buena | "imagen del X" cuando nombre está en texto | Productos con nombres que son substrings de otros. |
| `resolvePositionalReference` | ✅ Muy buena | "el tercero", "numero 5", "el último" | Solo hasta ordinal 20; "el 21" sí funciona por NUMERO_GEN_RE. |
| `resolveSizeReference` | ✅ Buena | "del mediano", "vídeos del grande" | Solo un tamaño si hay varios productos con "mediano". |
| `resolveMultiplePositions` | ✅ Buena | "el 1, 3 y 5" | Duplicados ("el 1 y el 1") se deduplican. |
| Referencia último enviado | ✅ Buena | "el que me enviaste" | Requiere lastProductSent actualizado. |
| Handoff híbrido Capa A/B | ✅ Muy buena | "si" + CTA asesor → handoff | **checkCtaResponseCoherence**: IA clasifica si respuesta encaja con CTA; mejora confirmaciones naturales. |
| Scope guard (NO_ENTIENDO / FUERA_DE_ALCANCE) | ✅ Nueva | Mensajes incoherentes o fuera de tema | main-brain envía mensaje límite + lista inductiva. |
| Coherencia promesa fotos | ✅ Nueva | Usuario dice "Fotos" tras info de producto | Fallback extrae producto del historial y envía media. |
| normalizeForMatch | ✅ Nueva | "el mlp" matchea "El Barril M.L.P." | Mejora matcheo con abreviaturas y puntos. |

### 2.4 Product-detail-question-brain

**Regex PRODUCT_DETAIL_QUESTION:** accesorios, qué trae, dimensiones, precio, stock, garantía, etc.

**Fortalezas:**
- Detecta bien preguntas puntuales
- Consulta BD real
- IA redacta con datos concretos

**Debilidades:**
- Solo 9 ordinales (hasta "noveno"); sales-flow tiene 20
- Si no resuelve producto, devuelve handled: false; puede perderse contexto

### 2.5 Product-selection-brain

**Patrón PIDE_ALGUNOS:** "el 2, 5 y 7", "aventurero y tierno"

**Fortalezas:**
- Extrae números y ordinales
- Combina por posición y por nombre
- Requiere mínimo 2 productos (no pisa sales-flow para 1)

**Debilidades:**
- Regex puede no capturar "el primero y el quinto" en algunas formulaciones
- No maneja "el 1 al 5" (rango)

### 2.6 Training de productos (sync-bot)

**Fortalezas:**
- Datos reales de BD (precio, stock, características)
- Sincronización con catálogo visual

**Debilidades:**
- Solo texto; no hay embedding ni búsqueda semántica para productos
- Si productos cambian mucho, el training puede quedar desactualizado hasta próxima sync

---

## 3. Matriz de pruebas — Comportamiento esperado por tipo de petición

| # | Tipo de petición | Ejemplo de mensaje | Cerebro que responde | Resultado esperado | Riesgo |
|---|------------------|--------------------|----------------------|--------------------|--------|
| 1 | Saludo inicial | "hola", "buenos días" | Flow / sales-flow | Saludo variado con YJ Barriles | Bajo |
| 2 | Pedir opciones (genérico) | "quiero ver barriles", "qué tienen?" | sales-flow | Lista en texto, NO envía fotos | Bajo |
| 3 | Producto por nombre | "el aventurero", "barril brochetero" | sales-flow | PRODUCT_INTEREST + envío media | Bajo |
| 4 | Video de producto | "me puedes enviar video del barril brochetero?" | sales-flow | productFilter + video | Bajo (corregido) |
| 5 | Imagen de producto | "envíame la imagen del tierno" | sales-flow | productFilter + imagen | Bajo |
| 6 | Solo video | "solo el video del aventurero" | sales-flow | mediaPreference: video_only | Bajo |
| 7 | Solo imagen | "solo la foto del mediano" | sales-flow | mediaPreference: image_only | Bajo |
| 8 | Por posición única | "el tercero", "numero 5", "el último" | sales-flow | resolvePositionalReference | Bajo |
| 9 | Varios por posición | "el 1, 3 y 5", "primero y quinto" | product-selection | productNames[] | Medio (regex) |
| 10 | Por tamaño | "del mediano", "vídeos del grande" | sales-flow | resolveSizeReference | Medio (ambigüedad) |
| 11 | Todos / catálogo completo | "todos los barriles", "envíame todo" | sales-flow | productFilter: null | Bajo |
| 12 | Referencia último enviado | "el que me enviaste", "ese mismo" | sales-flow | lastProductSent | Bajo si hay contexto |
| 13 | Más detalles / ficha | "más detalles del que mostraste" | sales-flow | sendFullDescription | Medio (resolver producto) |
| 14 | Pregunta puntual | "qué incluye el aventurero?", "precio del tierno" | product-detail-question | Respuesta BD + IA | Bajo |
| 15 | Handoff explícito | "quiero hablar con asesor", "cómo compro" | sales-flow | HANDOFF_REQUIRED | Bajo |
| 16 | Confirmación CTA | "si" tras CTA asesor | sales-flow | handoff Capa A/B | Bajo |
| 17 | Mensaje incoherente | "??", "asdfgh", solo emoji | sales-flow | NO_ENTIENDO | Bajo |
| 18 | Sin credenciales IA | (config vacía) | sales-flow | handoff directo | Bajo |
| 19 | Inglés | "send me the video of the aventurero" | sales-flow | pideVideoOImagen + resolución | Medio |
| 20 | Typo / variación | "barril brochetro", "aventuroro" | sales-flow | IA o fallback | Medio-alto |
| 21 | Varios productos por nombre | "aventurero, tierno y brochetero" | product-selection | productNames[] | Medio |
| 22 | Rango no soportado | "del 1 al 5" | sales-flow / product-selection | Puede no matchear | Alto |
| 23 | Pregunta post-media | "cuánto cuesta ese?" (tras enviar foto) | product-detail | Necesita lastProductSent | Medio |
| 24 | Queja / reclamo | "demoran mucho", "no me han contestado" | sales-flow (sin asignar) | generateSinAsignarResponse | Bajo |
| 25 | Audio | [nota de voz] | Requiere transcripción previa | Depende de router | Alto si no transcribe |

---

## 4. Mejoras propuestas (sin implementar)

### 4.1 Mejoras al entrenamiento y prompts

| # | Mejora | Justificación |
|---|--------|---------------|
| 1 | **Añadir 3–5 ejemplos few-shot** al system prompt (conversaciones completas con tags correctos) | Las IAs siguen mejor patrones concretos que instrucciones abstractas. Reduce errores de omisión de PRODUCT_INTEREST. |
| 2 | **Incluir regionalismos colombianos** (ej. "parcero", "bacano", "¿qué más?", "deme") en el prompt | Mejora la naturalidad y reduce respuestas que suenan demasiado "neutras" o genéricas. |
| 3 | **Prompt explícito para mensajes multimodales**: "Si el cliente envía imagen + texto, prioriza el texto para intención" | Evita que la IA ignore el texto cuando hay imagen adjunta. |
| 4 | **Límite de caracteres del CatalogContext** con resumen si hay >15 productos | Evita truncado y desperdicio de tokens en modelos con límite de contexto. |
| 5 | **Sistema de prioridad de productos** (ej. destacar "más vendidos") en el contexto | Ayuda a la IA a recomendar cuando el usuario pide "el que recomienden" o similar. |

### 4.2 Mejoras a la lógica híbrida

| # | Mejora | Justificación |
|---|--------|---------------|
| 6 | **Expandir CONFIRMACION_CORTA** para incluir "si quiero", "si por favor", "dale" en frases un poco más largas | Evita perder handoffs cuando el usuario confirma de forma natural pero con más palabras. |
| 7 | **Soporte para rangos** ("del 1 al 5", "del primero al quinto") en resolveMultiplePositions | Caso frecuente en pedidos de catálogo. |
| 8 | **Fuzzy matching de nombres** (distancia Levenshtein o similar) para typos leves | Mejora robustez ante "brochetro", "aventuroro". |
| 9 | **Unificar ordinales** entre product-detail-question (9) y sales-flow (20) | Evita inconsistencias si el usuario dice "el décimo" en contexto de detalle. |
| 10 | **Resolver "el que recomendaste" / "el popular"** con producto destacado o primer producto | Cierra gaps cuando no hay lastProductSent pero el usuario hace referencia implícita. |

### 4.3 Mejoras de arquitectura

| # | Mejora | Justificación |
|---|--------|---------------|
| 11 | **Cerebrito media-request** dedicado (como en el plan) para peticiones explícitas de video/imagen | Separa responsabilidad; evita que sales-flow se sobrecargue con edge cases de media. |
| 12 | **Cache del catálogo** (TTL corto) para reducir lecturas a BD en alta concurrencia | Mejora latencia cuando hay muchos mensajes simultáneos. |
| 13 | **Retry con backoff** para callAI/callAIMultimodal | Evita fallos transitorios de API que hoy devuelven handled: false silenciosamente. |
| 14 | **Logging de decisiones** (por qué se eligió product-detail vs sales-flow) | Facilita debug y afinado de prioridades. |

### 4.4 Mejoras de testing

| # | Mejora | Justificación |
|---|--------|---------------|
| 15 | **Tests para product-detail-question-brain** con mocks de prisma y callAI | Garantiza que las preguntas puntuales se enrutan bien. |
| 16 | **Tests de regresión para regex** (pideTodos, pideVideoOImagen, etc.) con dataset de ~50 frases | Evita roturas al cambiar patrones. |
| 17 | **Tests E2E con Playwright o similar** (flujo completo: mensaje → respuesta sin WhatsApp real) | Valida integración sin depender de APIs externas en CI. |

### 4.5 Mejoras de coherencia

| # | Mejora | Justificación |
|---|--------|---------------|
| 18 | **Inyectar último mensaje del bot en el prompt** de forma más prominente cuando el usuario responde corto | Mejora resolución de "ese", "el que dijiste" cuando el historial es largo. |
| 19 | **CTA diferenciado** según horario (ya existe isWithinBusinessHours) pero asegurar que el CTA post-media lo use | Mensajes más precisos ("te atienden ahora" vs "cuando estén disponibles"). |
| 20 | **Detección de "quiero ese" / "me llevo ese"** como handoff incluso sin CTA previo | Cierre de venta espontáneo; no depender solo del flujo CTA → confirmación. |

---

## 5. Resumen de calificación final

| Categoría | Peso | Puntaje | Ponderado |
|-----------|------|---------|-----------|
| Prompts y entrenamiento | 25% | 78 | 19.50 |
| Lógica híbrida | 25% | 85 | 21.25 |
| Arquitectura | 20% | 80 | 16.00 |
| Coherencia | 15% | 75 | 11.25 |
| Robustez | 10% | 74 | 7.40 |
| Testing | 5% | 78 | 3.90 |

### **Calificación global ponderada: 79.3 ≈ 79/100**

---

## 6. Conclusión

El bot tiene una base sólida y ha mejorado con las últimas actualizaciones:
- **FUERA_DE_ALCANCE** y scope_guard para mensajes fuera de tema.
- **checkCtaResponseCoherence** para handoff más natural tras CTA.
- **Coherencia promesa fotos**: si el usuario pide "Fotos" tras recibir info, se envían correctamente.
- **normalizeForMatch** para abreviaturas (M.L.P., MLP).
- **50+ tests** cubriendo sales-flow, product-detail, product-selection y patrones.

**Principales oportunidades de mejora:**
1. Few-shot examples en el system prompt.
2. Soporte para rangos ("del 1 al 5").
3. Más tests E2E de flujo completo.
4. Regionalismos colombianos en el prompt.

Con las mejoras propuestas aplicadas de forma incremental, el bot podría alcanzar **88–92/100** en coherencia y robustez.

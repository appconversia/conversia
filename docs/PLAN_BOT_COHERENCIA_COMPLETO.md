# Plan completo: Bot YJ Barriles con coherencia total

**Versión:** 1.2  
**Fecha:** Febrero 2026

---

## Resumen ejecutivo

Este documento integra todas las mejoras necesarias para que el bot de WhatsApp de YJ Barriles atienda de forma coherente, recuerde todo el contexto, guíe al cierre (que lo cierra un humano) y maneje correctamente a personas que escriben varios mensajes seguidos. El bot debe ser **totalmente conversacional** y **usar IA para todas las respuestas**; no hay respuestas fijas más allá del saludo inicial.

---

## Índice

| # | Sección |
|---|---------|
| 1 | Arquitectura: Cerebro principal + cerebritos |
| 2 | Memoria tipo Redis (sin Redis) |
| 3 | Debouncing |
| 4 | Saludo humano |
| 5 | Análisis de intención y producto específico |
| 6 | Medición de interés y handoff (completa) |
| 7 | Coherencia y guía al cierre |
| 8 | Atención a múltiples contactos |
| 9 | Otras mejoras |
| 10 | Orden de implementación |
| 11 | Archivos a crear o modificar |
| 12 | Diagrama de flujo completo |
| 13 | Lo que falta en producción |
| 14 | Requisitos conversacionales (100% IA) |
| 15 | Robustez y tolerancia a fallos |
| 16 | Horario de atención (configurable) |
| 17 | Resumen final |

---

## 1. Arquitectura: Cerebro principal + cerebritos

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        CEREBRO PRINCIPAL (Orquestador)                           │
│  • Recibe mensaje(s) entrante(s) - puede ser batch por debouncing                 │
│  • Carga contexto COMPLETO desde PostgreSQL (memoria tipo Redis)                   │
│  • Decide: ¿Saludo? ¿Análisis? ¿Handoff?                                          │
│  • Enruta a cerebritos                                                             │
│  • Orquesta respuesta final y acciones                                            │
└────────────────────────────────────┬──────────────────────────────────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         ▼                           ▼                           ▼
┌─────────────────┐      ┌─────────────────────┐      ┌─────────────────┐
│ CEREBRITO       │      │ CEREBRITO            │      │ CEREBRITO       │
│ SALUDO          │      │ ANÁLISIS INTENCIÓN   │      │ INTERÉS         │
│                 │      │                      │      │                 │
│ • Humano        │      │ • ¿Qué pide?         │      │ • Alto/medio/   │
│ • Natural       │      │ • ¿Un barril o       │      │   bajo          │
│ • Primer msg    │      │   varios?            │      │ • Handoff si    │
│   o retorno 24h │      │ • ¿Fotos? ¿Precio?  │      │   sube          │
└────────┬────────┘      └──────────┬──────────┘      └────────┬────────┘
         │                           │                          │
         └───────────────────────────┼──────────────────────────┘
                                     ▼
                        ┌─────────────────────┐
                        │ CEREBRITO PRODUCTOS  │
                        │ • Recibe intención   │
                        │ • Filtra por producto│
                        │   específico o todos │
                        │ • Devuelve texto +   │
                        │   qué medios enviar  │
                        └─────────────────────┘
```

---

## 2. Memoria tipo Redis (sin Redis) — PostgreSQL como almacén único

### Concepto

En vez de Redis, usamos **PostgreSQL** como fuente de verdad del historial completo. La idea es:

- Leer **todos** los mensajes de la conversación (o hasta un límite alto, ej. 150).
- Guardar **siempre** el contenido interpretable (transcripciones, no placeholders).
- Para conversaciones muy largas, usar un **resumen** de contexto.

### Cambios necesarios

| Actual | Nuevo |
|--------|-------|
| `take: 10` mensajes | `take: 150` (o todos) con orden cronológico |
| Guardar `[audio]` en content | Guardar transcripción real en content |
| Guardar `[imagen]` en content | Guardar caption o descripción breve |
| Historial fragmentado | Historial completo y legible |

### Nuevo modelo: `ConversationContext` (opcional, para optimización)

```
model ConversationContext {
  id             String   @id @default(cuid())
  conversationId String   @unique
  summaryText    String?  @db.Text   // Resumen de msgs antiguos (IA)
  summaryUpToId  String?  // Último msg incluido en el resumen
  updatedAt      DateTime @updatedAt
}
```

Cuando la conversación supere ~50 mensajes, un job (o el mismo cerebro) puede generar un resumen de los primeros N mensajes y guardarlo. El contexto que se pasa a la IA sería: `[resumen] + [últimos 30 mensajes]`.

### Servicio de memoria (`src/lib/bot/conversation-memory.ts`)

```typescript
// Funciones principales:
getFullConversationContext(conversationId: string): Promise<AIMessage[]>
  // Devuelve TODOS los mensajes en formato { role, content } listo para la IA
  // Si hay summary, incluye summary primero + mensajes recientes

appendMessage(conversationId: string, role: 'user'|'assistant', content: string): Promise<void>
  // Guarda en Message (ya existe) - asegurar que content sea legible (transcripción, no [audio])
```

### Transcripción antes de guardar

En el router, **antes** de crear el `Message`:

1. Si el mensaje es audio → transcribir con Whisper.
2. Guardar en `content` la transcripción real: `"[Voz]: texto transcrito"`.
3. Así el historial tendrá siempre contenido útil.

---

## 3. Debouncing: esperar mensajes rápidos antes de responder

### Problema

Algunas personas escriben de a un mensaje: "hola" → "quiero" → "ver" → "barriles". Si respondemos a cada uno, el bot da respuestas fragmentadas y poco coherentes.

### Solución: procesamiento por lotes (batch)

**Flujo:**

1. **Webhook**: Solo guarda el mensaje en la BD. No procesa. Responde 200 OK.
2. **Cron job** (cada 10 segundos): Busca conversaciones con mensajes del contacto que:
   - Aún no tienen respuesta del bot después de ellos.
   - El último mensaje del contacto tiene al menos 6 segundos de antigüedad.
3. **Procesamiento**: Toma todos los mensajes pendientes, los concatena en uno solo y procesa una única vez.

### Implementación

**Webhook modificado:**

```typescript
// Antes: routeIncomingMessage(payload) → procesaba de inmediato
// Después: solo guardar mensaje, NO llamar a runMainBrain
await saveIncomingMessage(payload);  // Crea mensaje en BD
return NextResponse.json({ ok: true });
```

**Nuevo modelo para cola de procesamiento (opcional):**

```
model PendingBotProcessing {
  id             String   @id @default(cuid())
  conversationId String   @unique
  lastMessageAt  DateTime
  messageIds     String   @db.Text  // JSON array de IDs
  createdAt      DateTime @default(now())
}
```

O más simple: consultar en cada ejecución del cron:

```sql
-- Conversaciones donde el último mensaje es del contacto,
-- no hay respuesta del bot después, y el último msg tiene > 6 seg
```

**Excluir:** Conversaciones con `handoffRequestedAt IS NOT NULL` — el bot ya no debe responder; un agente está tomando control.

**API y Cron:**

- `POST /api/cron/process-pending-bot` (protegida con CRON_SECRET).
- Vercel Cron en `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/process-pending-bot",
      "schedule": "*/10 * * * * *"
    }
  ]
}
```

*Nota: Cron cada 10 segundos requiere plan Pro en Vercel. Alternativa: cron externo (cron-job.org) que llame cada 10–15 seg.*

### Parámetros configurables

- `BOT_DEBOUNCE_SECONDS`: 6 (esperar 6 segundos tras el último mensaje).
- Si solo hay 1 mensaje y ya pasaron 6 seg, se procesa igual.

---

## 4. Saludo humano y natural

### Cerebrito Saludo

- **Trigger**: Primer mensaje o retorno tras 24 horas sin escribir.
- **Salida**: Texto de bienvenida generado por IA (o fijo si prefieres consistencia).

**Opciones:**

- **A)** Saludo fijo del flujo (como hoy) pero mejor redactado.
- **B)** Saludo generado por IA con prompt corto: "Genera un saludo cálido y humano para YJ Barriles. 1–2 frases. Sin listas ni emojis excesivos."

El cerebrito no analiza ni vende; solo da la bienvenida.

### Casos de primer mensaje

| Tipo de primer mensaje | Comportamiento |
|------------------------|----------------|
| "hola", "buenos días", "info" | Saludo estándar |
| "?" o mensaje vacío | Saludo + "¿En qué te puedo ayudar?" |
| Imagen o sticker | Saludo + "Gracias por contactarnos. ¿En qué te ayudo?" |
| Nota de voz | Transcribir primero; si es saludo → saludo; si es pregunta concreta → ir a Análisis (no saludo fijo) |
| "quiero ver barriles" (directo) | Saludo breve + iniciar flujo de productos (opción: saludo + primera respuesta de productos en un solo turno) |

**Regla:** Si el primer mensaje ya contiene una pregunta de producto/precio/envío, se puede combinar saludo + primera respuesta útil en un solo mensaje (más conversacional que saludo solo + esperar otro mensaje).

---

## 5. Análisis de intención y producto específico

### Cerebrito Análisis

**Input:** Mensaje actual + historial completo.

**Output (estructurado):**

```typescript
type AnalysisResult = {
  intención: 'producto_específico' | 'opciones_productos' | 'catálogo_completo' | 'precio' | 'envío' | 'handoff' | 'general';
  productoRequerido?: string;   // "Barril Premium 57L" si el cliente pidió uno concreto
  pideFotos?: boolean;
  pidePrecio?: boolean;
  contextoProducto?: string;    // "el que mencionó antes", "el barril grande"
};
```

- **`opciones_productos`**: Cliente pide ver productos sin especificar cuál → listar opciones en texto, no enviar fotos.
- **`producto_específico`**: Cliente eligió uno (o lo deduce del historial) → enviar solo ese.
- **`catálogo_completo`**: Cliente pide explícitamente "todos", "todo el catálogo" → enviar todas las fotos.

**Prompt ejemplo:**

> Dado el historial, extrae: 1) ¿Pide un producto concreto (nombre) o solo ver qué hay (opciones) o ver todo el catálogo? 2) ¿Quiere fotos? 3) ¿Quiere precio? 4) ¿Quiere hablar con asesor? Responde en JSON. Si pide "barriles" o "productos" sin elegir uno, usa opciones_productos.

### Resolución de referencias (crítico para conversación natural)

El cliente puede decir "el tercero", "ese", "el que mostraste", "el grande", "el premium" sin repetir el nombre. El Cerebrito Análisis debe:

- Usar el historial para resolver a qué producto se refiere.
- Si el bot envió fotos 1, 2, 3 y el cliente dice "quiero el segundo" → mapear al producto correcto.
- Devolver siempre `productoRequerido` con el nombre real del catálogo (ej. "Barril Premium 57L").

Incluir en el prompt del Análisis:

> Si el cliente usa referencias ("ese", "el tercero", "el que dijiste"), determina el producto concreto del historial y del catálogo enviado. Responde siempre con el nombre exacto del producto en productoRequerido.

### Cerebrito Productos

**Input:** `AnalysisResult` + catálogo + training de productos.

**Lógica:**

| Intención | Acción |
|-----------|--------|
| `opciones_productos` | Generar lista de productos en texto; preguntar cuál interesa. `mediaToSend: []`. |
| `producto_específico` | Filtrar por `productoRequerido`; respuesta + fotos de ese solo. |
| `catálogo_completo` | Incluir todo; enviar todas las fotos. |
| Otros | Según contexto; por defecto no enviar fotos si no hay intención clara. |

**Envío de medios:**

- Antes: enviar todas las fotos del catálogo.
- Ahora: enviar solo las del producto que pidió (o todas si pidió explícitamente "ver todo").

### Flujo: opciones primero, luego producto específico (obligatorio)

Cuando el cliente pide ver productos **sin especificar cuál**, el bot NO debe enviar todas las fotos de golpe. Debe guiar la conversación así:

| Paso | Cliente dice | Bot responde |
|------|--------------|--------------|
| 1 | "quiero ver barriles", "info de productos", "qué tienen?" | Lista las opciones en texto: "Tenemos el Barril Premium 57L, el Clásico 45L y el Compacto 30L. ¿Cuál te interesa ver?" **No envía fotos aún.** |
| 2 | "el premium", "el primero", "el 57" | Envía **solo** fotos y descripción del Barril Premium 57L. |
| Alternativa | "todos", "envíame todo", "catálogo completo" | Envía fotos de todos los productos. |
| Alternativa | Ya vio opciones antes; dice "el que dijiste" | Usa historial para resolver → envía el correspondiente. |

**Reglas del prompt (Cerebrito Productos o sistema):**

1. **Primera mención genérica** → Respuesta en texto con lista de modelos y pregunta cuál interesa. `mediaToSend: []`.
2. **Producto específico o referencia resuelta** → Respuesta + fotos y descripción solo de ese producto. `mediaToSend: [ítems del producto]`.
3. **"Todos" o "catálogo completo"** → Respuesta + todas las fotos. `mediaToSend: [todos]`.
4. **Evitar saturación** → No enviar 10+ imágenes de una vez salvo que lo pidan explícitamente.

**Ejemplo coherente:**

```
Cliente: Quiero ver barriles
Bot: Tenemos el Barril Premium 57L (ideal para asados grandes), el Clásico 45L y el Compacto 30L. ¿Cuál te gustaría ver?

Cliente: el premium
Bot: [Envía solo fotos del Premium 57L] Te cuento: el Premium 57L tiene... ¿Te interesa o quieres ver otro?

Cliente: cuánto cuesta?
Bot: [Contexto: hablamos del Premium] El Barril Premium 57L está en $X. ¿Te gustaría que un asesor te ayude con la compra?
```

Esto se aplica en todas las conversaciones: primero opciones, luego detalle del elegido.

---

## 6. Medición de interés y handoff (completa para cualquier caso)

### Cerebrito Interés

**Input:** Mensaje actual + historial completo (obligatorio para evaluar bien).

**Output:**

```typescript
type InterestResult = {
  level: 'bajo' | 'medio' | 'alto';
  handoffRequired: boolean;
  leadNotes?: string;
  productInterest?: string;  // Para el lead
};
```

### Reglas base

| Nivel | Ejemplos |
|-------|----------|
| **Bajo** | "hola", "info", "?", preguntas vagas, "solo mirando" |
| **Medio** | "precio de X", "¿envían a...?", "¿tienen disponible?", preguntas concretas |
| **Alto** | "lo quiero", "quiero comprar", "hablar con asesor", "cómo pago", "me lo llevo" |

Cuando `level === 'alto'` o el cliente pide explícitamente asesor → `handoffRequired = true`.

### Casos especiales para cubrir absolutamente cualquier situación

| Caso | Comportamiento |
|------|----------------|
| **Interés implícito** | "ok, perfecto, entonces me confirmas?", "dale, ese" → interpretar como alto. La IA debe usar contexto, no solo palabras clave. |
| **Variantes de español** | "lo tomo", "me lo llevo", "dale", "sí, ese", "cuándo puedo pagar?", "a cómo?" → alto o medio según contexto. |
| **Interés que baja** | "ah no, muy caro", "no me convence", "lo dejo para después" → descalificar: no handoff aunque antes hubo interés. |
| **Objeción sin cierre** | "me interesa pero no sé si me alcanza" → medio-alto; handoff para que humano negocie. |
| **Interés histórico** | Si dijo "lo quiero" hace 5 mensajes y luego "y el envío?" → interés sigue alto. Usar historial completo. |
| **Varios productos** | "quiero el barril A y el B" → alto; capturar ambos en `leadNotes`. |
| **Ambiguo** | "dame más info" → depende del contexto: si antes preguntó por un producto = medio; si es primer mensaje = bajo. |
| **Opt-out explícito** | "no quiero", "déjame en paz", "stop", "no molestar" → no handoff; marcar como bajo y no insistir. |
| **Solo preguntas de envío** | "¿envían a Medellín?" sin haber mostrado producto → medio (curiosidad). |
| **Confirmación de cierre** | "entonces me lo apartas?", "cómo hago el pago?" → alto; handoff inmediato. |

### Requisitos del prompt del Cerebrito Interés

1. **Historial completo obligatorio** — Sin historial no se puede evaluar evolución ni descalificación.
2. **Nivel acumulativo** — El interés puede subir (bajo→medio→alto) pero también bajar; evaluar la trayectoria.
3. **Interpretación conversacional** — No depender solo de palabras clave; la IA debe inferir intención del tono y contexto.
4. **Salida estructurada** — JSON con `level`, `handoffRequired`, `leadNotes`, `productInterest` para evitar ambigüedades.
5. **Idioma flexible** — Typos ("kiero", "baril"), Spanglish, jerga local deben seguir siendo interpretables.

### ¿Es suficiente para cubrir cualquier caso de interés?

Sí, **si se cumplen**:

1. **Historial completo** — Sin esto, no se pueden evaluar interés acumulativo, descalificación ni referencias.
2. **Prompt explícito** — Incluir en el prompt del Cerebrito Interés todos los casos de la tabla anterior (implícito, variantes, descalificación, opt-out, etc.).
3. **Salida estructurada (JSON)** — Evitar ambigüedades en la interpretación de la respuesta.
4. **Integración con Análisis** — Si el Cerebrito Análisis detecta `intención: 'handoff'` (ej. "quiero hablar con asesor"), el handoff puede dispararse también desde ahí, sin depender solo del Interest brain.

Con esto se cubren los casos típicos, edge cases y situaciones ambiguas. Cualquier caso nuevo se incorpora añadiendo ejemplos al prompt.

### Handoff: quitar etiqueta bot y pasar a sin asignar

Comportamiento ya implementado en `executeHandoff`:

- `handoffRequestedAt = now`
- `assignedToId = null`

Con eso la conversación sale de la pestaña "Bot" y entra en "Sin asignar". No hace falta cambiar `channel`; el filtro por pestaña se basa en `handoffRequestedAt` y `assignedToId`.

---

## 7. Coherencia de mensajes y guía al cierre

### Objetivo

Cada mensaje del bot debe ser:

- Coherente con lo que se ha dicho.
- Intencionado: avanza la conversación hacia el cierre.
- Sin sustituir al humano en la venta.

### Ajustes al prompt del sistema

1. **Memoria:** "Usa SIEMPRE el historial completo. Nunca repitas preguntas ya respondidas."
2. **Producto concreto:** "Si el cliente preguntó por un barril concreto, responde SOLO sobre ese. No menciones otros."
3. **Guía al cierre:** "Ayuda al cliente a decidir: aclara dudas, ofrece envío, sugiere hablar con asesor cuando haya interés real."
4. **Límite del bot:** "No cierres ventas. Cuando detectes interés de compra, escala a un asesor con HANDOFF_REQUIRED."

### Temperatura

- Bajar de 0.7 a **0.4–0.5** para respuestas más consistentes y predecibles.

---

## 8. Atención a múltiples contactos

### Escalabilidad

El bot debe poder atender muchos contactos en paralelo:

- Cada conversación es independiente (por `conversationId`).
- El cron procesa varios lotes en una misma ejecución.
- PostgreSQL ya soporta concurrencia; no hay estado global en memoria.

### Rate limiting (opcional)

- Límite por número de teléfono: p. ej. max 1 proceso activo por conversación.
- Evitar procesar dos veces el mismo lote: marcar mensajes como "procesados" o usar `processedAt` en un modelo de cola.

---

## 9. Otras mejoras

### 9.1 Evitar duplicar el mensaje actual en el historial

Hoy se pasa el historial (que incluye el mensaje nuevo) más el `lastUserMessage` por separado. El mensaje queda duplicado.

**Solución:** Pasar solo el historial completo (incluyendo el mensaje nuevo) y no añadir `lastUserMessage` aparte. O pasar historial sin el último mensaje y agregar solo `lastUserMessage` como mensaje final.

### 9.2 Etiquetas separadas del texto

En lugar de pedir `INTEREST_LEVEL: alto` dentro de la respuesta visible, usar un esquema de salida estructurada:

- Llamada a la IA con instrucción de devolver JSON.
- Ejemplo: `{ "reply": "...", "interestLevel": "alto", "handoffRequired": true }`.

Eso evita filtrar etiquetas del texto y reduce errores.

### 9.3 Sincronización automática de productos

- Al crear o editar un producto → llamar a `syncProductsWithBot` automáticamente.
- Evita que el catálogo del bot quede desactualizado.

### 9.4 Resumen periódico de contexto

Para conversaciones largas:

- Cada N mensajes (ej. 50), generar un resumen con IA.
- Guardar en `ConversationContext.summaryText`.
- Pasar a la IA: resumen + últimos 30 mensajes.

### 9.5 Fallback cuando no hay catálogo

- Si no hay productos sincronizados y el cliente pide fotos/precios, respuesta tipo: "Un asesor te enviará la información en breve" + handoff.

### 9.6 No procesar conversaciones ya en handoff

Cuando una conversación tiene `handoffRequestedAt` y ya está asignada a un humano (o pendiente de asignar), el bot **no debe volver a responder**. Un agente está tomando control. El cron y el flujo de procesamiento deben excluir conversaciones donde `handoffRequestedAt IS NOT NULL`.

### 9.7 Producto no disponible

Si el cliente pide un producto que está `available: false` o ya no existe: no hacer handoff ciego. El bot debe decir "Ese modelo ya no está disponible, pero tenemos [alternativas X, Y]. ¿Te interesa alguno?" y ofrecer productos disponibles.

### 9.8 Nombre del contacto

Usar `contactName` (perfil de WhatsApp) cuando esté disponible: "Hola, [nombre]" en saludos y respuestas clave para sonar más personal.

### 9.9 Producto de interés en el Lead

Al registrar el lead en handoff, incluir `productInterest` con el producto concreto que el cliente vio (del Cerebrito Análisis). No solo `leadNotes` genéricas.

### 9.10 Fallback cuando el cron no corre

Si los mensajes llevan más de 60 segundos sin procesar (p. ej. cron caído), tener fallback: en el webhook, al guardar un mensaje, verificar si hay mensajes pendientes muy antiguos; si es así, encolar procesamiento inmediato o exponer endpoint manual `POST /api/bot/process-now` para forzar procesamiento.

### 9.11 Pausa entre envíos de fotos

Al enviar múltiples imágenes (varios productos o varias fotos de uno), añadir pausa de 500–800 ms entre cada envío para evitar throttling de WhatsApp.

### 9.12 Mensajes largos (split)

WhatsApp ~4096 caracteres. Si la IA devuelve más: dividir por párrafos o oraciones; enviar 2+ mensajes consecutivos. Mejor: instruir a la IA a ser concisa (objetivo < 500 caracteres por respuesta).

### 9.13 Confirmación opcional antes de handoff

Configurable: si `BOT_CONFIRM_HANDOFF=true`, antes de ejecutar handoff el bot pregunta "¿Te conecto con un asesor ahora?" y espera confirmación. Reduce falsos handoffs; añade un turno.

### 9.14 Idioma

Definir política: siempre español, o detectar idioma del cliente y responder en el mismo. Por defecto: español. Si detectamos inglés u otro, el prompt puede incluir "Responde en el mismo idioma que use el cliente."

### 9.15 Pruebas

- Simular mensajes WhatsApp vía API interna para probar flujos sin Meta.
- Casos: primer mensaje, opciones → producto, handoff, fuera de horario, producto no disponible, error IA.

### 9.16 Monitoreo

Métricas básicas: mensajes procesados/día, handoffs, errores de IA, tiempo de respuesta. Logs o dashboard simple para saber si el bot funciona bien.

---

## 10. Orden de implementación sugerido

| Fase | Descripción |
|------|-------------|
| 1 | Transcripción antes de guardar: audios se guardan con transcripción en `content` |
| 2 | Memoria completa: leer hasta 150 mensajes, sin duplicar el mensaje actual |
| 3 | Cerebrito Saludo (aislado) |
| 4 | Cerebrito Análisis (intención + producto) |
| 5 | Cerebrito Productos (filtro por producto específico) |
| 6 | Cerebrito Interés (nivel + handoff) |
| 7 | Refactor del Cerebro Principal como orquestador |
| 8 | Debouncing: webhook solo guarda, cron procesa en batch |
| 9 | Ajuste de prompts y temperatura |
| 10 | Sincronización automática de productos |
| 11 | Horario de atención: modelo, CRUD, UI, lógica en bot |
| 12 | (Opcional) Resumen de contexto para conversaciones largas |

---

## 11. Archivos a crear o modificar

### Nuevos

- `src/lib/bot/conversation-memory.ts` — Servicio de memoria (lectura completa, resumen)
- `src/lib/bot/sub-brains/greeting-brain.ts` — Cerebrito Saludo
- `src/lib/bot/sub-brains/analysis-brain.ts` — Cerebrito Análisis
- `src/lib/bot/sub-brains/products-brain.ts` — Cerebrito Productos (refactor de sales-flow)
- `src/lib/bot/sub-brains/interest-brain.ts` — Cerebrito Interés
- `src/app/api/cron/process-pending-bot/route.ts` — Cron para debouncing
- `vercel.json` — Configuración del cron (o uso de cron externo)

### Modificar

- `src/app/api/webhook/whatsapp/route.ts` — Solo guardar, no procesar
- `src/lib/bot/router.ts` — Dividir en: guardar mensaje vs procesar lote
- `src/lib/bot/main-brain.ts` — Orquestador que usa los cerebritos
- `src/lib/bot/sub-brains/sales-flow-brain.ts` — Integrar en/products-brain o reemplazar
- `prisma/schema.prisma` — `ConversationContext` si se usa resumen; `BusinessHours` o `BusinessHoursConfig` para horario
- `src/lib/bot/default-system-prompt.ts` — Instrucciones actualizadas
- `src/app/api/config/business-hours/route.ts` — CRUD horario de atención
- `src/lib/bot/business-hours.ts` — `isWithinBusinessHours()`, lectura de config
- Página/pestaña Configuración — Formulario horarios por día

---

## 12. Diagrama de flujo completo

```
[Mensaje llega por WhatsApp]
         │
         ▼
┌─────────────────────────────────────┐
│ Webhook: Guardar mensaje en BD       │
│ (transcribir audio antes de guardar) │
│ Retornar 200 OK                      │
└─────────────────────────────────────┘
         │
         │ (Cada 10 seg)
         ▼
┌─────────────────────────────────────┐
│ Cron: ¿Hay conversaciones con       │
│ mensajes pendientes (>6 seg)?       │
└─────────────────────────────────────┘
         │ Sí
         ▼
┌─────────────────────────────────────┐
│ Agrupar mensajes pendientes en uno  │
│ (concatenar textos)                 │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Cerebro Principal:                  │
│ 1. Cargar contexto COMPLETO (PG)   │
│ 2. ¿Primer msg o retorno 24h?       │
└─────────────────────────────────────┘
         │
    ┌────┴────┐
    │ Sí      │ No
    ▼         ▼
┌─────────┐  ┌─────────────────────────────┐
│ Saludo  │  │ Cerebrito Análisis           │
│ Brain   │  │ → intención, producto       │
└────┬────┘  └──────────────┬──────────────┘
     │                      │
     │                      ▼
     │             ┌─────────────────────────────┐
     │             │ Cerebrito Productos         │
     │             │ → texto + medios a enviar    │
     │             └──────────────┬──────────────┘
     │                      │
     │                      ▼
     │             ┌─────────────────────────────┐
     │             │ Cerebrito Interés           │
     │             │ → nivel, handoff sí/no      │
     │             └──────────────┬──────────────┘
     │                      │
     └──────────────────────┼─────────────────────┐
                            ▼                      │
                    ┌───────────────────────┐      │
                    │ Enviar respuesta      │      │
                    │ Enviar fotos/videos   │◀─────┘
                    │ (solo las relevantes) │
                    └───────────┬───────────┘
                                │
                    ┌───────────┴───────────┐
                    │ ¿Handoff?             │
                    └───────────┬───────────┘
                         Sí    │    No
                    ┌──────────┴──────────┐
                    ▼                     │
            ┌──────────────┐              │
            │ executeHandoff│             │
            │ → Sin asignar │              │
            └──────────────┘              │
                    │                     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Guardar en BD        │
                    │ Registrar lead si hay│
                    └──────────────────────┘
```

---

## 13. Lo que falta en producción (vs. este plan)

| Aspecto | Producción actual | Con este plan |
|---------|------------------|---------------|
| **Historial** | 10 mensajes; audios como `[audio]` | Hasta 150; transcripciones reales |
| **Interés** | Etiquetas en texto; evalúa solo mensaje actual | Cerebrito dedicado; historial completo; casos especiales |
| **Producto específico** | Envía todas las fotos siempre | Filtra por producto pedido |
| **Debouncing** | Procesa cada mensaje al instante | Espera 6 seg; agrupa mensajes rápidos |
| **Respuestas** | 1 llamada IA hace todo (respuesta + interés + imágenes) | Cerebritos separados; orquestador |
| **Fallback IA** | Error puede dejar sin respuesta | Fallback: "Un asesor te contactará" + handoff |
| **Temperatura** | 0.7 (más variación) | 0.4–0.5 (más estable) |
| **Referencias** | "el tercero", "ese", "el que dijiste" | Cerebrito Análisis resuelve con historial |
| **Límite WhatsApp** | No controlado | Respuestas concisas; split si > 4096 caracteres |
| **Opt-out** | No manejado | Detecta "no quiero", "déjame" → no insistir |
| **Doble procesamiento** | Posible si webhook lento | Marca mensajes procesados; cron evita duplicados |
| **Sincronización productos** | Manual (botón) | Automática al crear/editar |

---

## 14. Requisitos conversacionales (bot 100% IA)

El bot debe ser **completamente conversacional** y **consumir IA para dar respuestas**. Solo el saludo inicial puede ser fijo; el resto viene de la IA.

### Principios

| Principio | Descripción |
|-----------|-------------|
| **Nada de respuestas fijas** | Salvo el saludo de bienvenida, toda respuesta se genera con IA según contexto. |
| **Coherencia con historial** | La IA recibe todo el historial; no repite, no contradice, no pregunta lo ya respondido. |
| **Resolución de referencias** | "ese", "el tercero", "el grande", "el que mostraste" → la IA identifica el producto con historial. |
| **Tono natural** | Prompt obliga tono humano, cercano; evita listas largas y jerga corporativa. |
| **Idioma flexible** | Typos, Spanglish, jerga local; la IA debe interpretar sin pedir "reformulación". |
| **Multi-turno** | Conversaciones de muchas vueltas sin perder el hilo. |
| **Guía al cierre** | Cada respuesta debe mover hacia el cierre (aclarar dudas, ofrecer asesor) sin cerrar la venta. |
| **Opciones primero** | Cuando pidan productos sin especificar, listar opciones y preguntar cuál; solo luego enviar fotos del elegido. No saturar con todas las fotos de golpe. |

### Flujo de IA

```
Usuario escribe → Historial completo + mensaje actual → IA genera respuesta
                                                      → IA puede indicar: fotos a enviar, interés, handoff
```

Ninguna respuesta proviene de plantillas; todo pasa por el modelo configurado.

---

## 15. Robustez y tolerancia a fallos

| Situación | Comportamiento |
|-----------|----------------|
| **Timeout o error de IA** | Mensaje: "Disculpa, hubo un momento. Un asesor te contactará en breve." + handoff automático. |
| **Catálogo vacío y piden fotos** | "Un asesor te enviará el catálogo en breve." + handoff. |
| **Mensaje ininteligible** | IA intenta interpretar; si no puede: "¿En qué te puedo ayudar? ¿Productos, precios o envíos?" |
| **Mensaje fuera de tema** | "Eso no lo manejamos, pero con gusto te ayudo con barriles." Sin handoff a menos que haya interés en nuestros productos. |
| **Procesamiento duplicado** | Marcar mensajes con `processedAt` o `botRespondedAfterId`; cron ignora lotes ya procesados. |
| **Límite de caracteres WhatsApp** | Máx. ~4096 por mensaje. Instruir a la IA: respuestas concisas. Si excede, dividir en 2 mensajes. |
| **Reacciones (👍, ❤️)** | Si Meta las envía, tratar como señal de interés leve; no handoff salvo que haya más contexto. |
| **Imagen sin caption** | Añadir hint: "[Cliente envió imagen. Analízala si es relevante.]" para IA multimodal. |
| **Sin API key de IA** | Handoff inmediato: "Un asesor te atenderá pronto." |

---

## 16. Horario de atención (configurable)

### Comportamiento

El bot **siempre entrega toda la información** (productos, precios, fotos, descripciones) sin importar la hora. La diferencia está en el **handoff**:

| Situación | Comportamiento |
|-----------|----------------|
| **Dentro del horario** | Handoff normal: conversación pasa a Sin asignar; un agente puede atender de inmediato. |
| **Fuera del horario** | El bot responde con algo tipo: "Ya tienes toda la información que necesitas. Nuestros agentes te atenderán en cuanto estén disponibles." **No ejecuta handoff** (o lo ejecuta pero el mensaje de cierre es distinto). La conversación sigue en bot hasta que un agente la tome, pero el cliente sabe que será atendido cuando haya equipo. |

### Base de datos: CRUD de horario

**Modelo en Prisma:**

```prisma
model BusinessHours {
  id          String   @id @default(cuid())
  dayOfWeek   Int      // 0=domingo, 1=lunes, ..., 6=sábado
  startTime   String   // "09:00" (HH:mm)
  endTime     String   // "18:00" (HH:mm)
  isEnabled   Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([dayOfWeek])
  @@index([dayOfWeek])
}
```

O, si se prefiere un solo registro por franja (más simple):

```prisma
model BusinessHoursConfig {
  id          String   @id @default(cuid())
  timezone    String   @default("America/Bogota")  // zona horaria
  scheduleJson String  @db.Text  // JSON: [{ day: 0, start: "09:00", end: "18:00" }, ...]
  updatedAt   DateTime @updatedAt
}
```

**Alternativa con AppConfig (sin nuevo modelo):**

- `business_hours_timezone`: "America/Bogota"
- `business_hours_schedule`: JSON con array de `{ dayOfWeek, start, end }`

### API y UI

| Recurso | Descripción |
|---------|-------------|
| `GET /api/config/business-hours` | Obtiene horarios configurados |
| `PUT /api/config/business-hours` | Crea/actualiza horarios (solo super_admin) |
| Pestaña en Configuración | Formulario: por día (L-D), hora inicio, hora fin; checkbox habilitado |

### Lógica en el bot

1. Función `isWithinBusinessHours(timezone?: string): boolean` que lee la config y compara con la hora actual.
2. Antes de ejecutar handoff, el Cerebro Principal consulta `isWithinBusinessHours()`.
3. **Si está dentro del horario:** handoff normal + mensaje inductivo habitual.
4. **Si está fuera:** no ejecutar handoff (o ejecutarlo igual pero con mensaje distinto). El mensaje final indica: "Ya tienes toda la info. Nuestros agentes te atenderán cuando estén disponibles."

El handoff puede ejecutarse igual (conversación a Sin asignar) para que aparezca en la cola, pero el texto al cliente cambia para no crear falsa expectativa de atención inmediata.

---

## 17. Resumen final

| Mejora | Descripción |
|--------|-------------|
| **Memoria sin Redis** | PostgreSQL con historial completo (hasta 150 msgs), transcripciones guardadas |
| **Debouncing** | Webhook guarda; cron procesa cada 10 seg, agrupa mensajes rápidos |
| **Saludo humano** | Cerebrito dedicado para primer mensaje / retorno 24h |
| **Producto específico** | Análisis de intención → filtro por producto → enviar solo lo relevante |
| **Opciones primero** | Listar productos en texto; preguntar cuál interesa; luego enviar fotos solo del elegido |
| **Interés (cualquier caso)** | Cerebrito Interés con historial completo, casos especiales y descalificación |
| **Handoff** | Conversación pasa a Sin asignar; humano cierra venta |
| **Coherencia** | Prompt ajustado, temperatura 0.4–0.5, sin duplicar mensaje |
| **100% conversacional** | IA genera todas las respuestas; no hay plantillas después del saludo |
| **Robustez** | Fallback ante errores, límites de WhatsApp, mensajes ambiguos |
| **Arquitectura** | Cerebro principal + 4 cerebritos con tareas bien definidas |
| **Horario de atención** | Configurable; fuera de horario: "agentes te atenderán cuando estén disponibles" |
| **Conversaciones en handoff** | Bot no vuelve a responder; excluir del cron |
| **Producto no disponible** | Ofrecer alternativas, no handoff ciego |
| **Nombre del contacto** | Usar en saludos cuando esté disponible |
| **Lead con producto** | Incluir productInterest del análisis |
| **Fallback cron** | Procesar si mensajes > 60 seg pendientes |
| **Pausa entre fotos** | 500–800 ms para evitar throttling WhatsApp |
| **Pruebas y monitoreo** | Simular mensajes; métricas de proceso y handoffs |

---

*Documento de referencia para la implementación del bot YJ Barriles.*

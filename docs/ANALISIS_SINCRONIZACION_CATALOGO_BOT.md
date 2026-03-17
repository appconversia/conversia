# Análisis: Productos del chat vs catálogo real

## Contexto del problema

Los productos que el bot envía en el chat de WhatsApp **no corresponden** a los productos del catálogo real (tabla Product). Se ha usado "Sincronizar con bot" pero la desincronización persiste.

---

## Arquitectura actual

```
┌─────────────────────┐     "Sincronizar con bot"      ┌──────────────────────────┐
│  Tabla Product      │ ───────────────────────────►  │  AppConfig               │
│  (BD - fuente       │     syncProductsWithBot()     │  bot_product_catalog     │
│   de verdad)        │                               │  (imágenes que envía)    │
└─────────────────────┘                               └────────────┬─────────────┘
         ▲                                                         │
         │                                                         │
         │ POST/PATCH                                              │ getProductCatalog()
         │ (crear/editar)                                          │
         │                                                         ▼
┌─────────────────────┐     "Guardar catálogo"        ┌──────────────────────────┐
│  Configuración      │ ───────────────────────────►  │  sales-flow-brain.ts     │
│  Catálogo manual    │     saveProductCatalog()     │  sendProductImages()     │
└─────────────────────┘                               └──────────────────────────┘
```

---

## Causas identificadas

### 1. **Doble fuente de verdad (conflicto principal)**

| Origen | Dónde | Qué hace |
|--------|-------|----------|
| **Productos** | Dashboard → Productos → "Sincronizar con bot" | Sobrescribe `bot_product_catalog` con lo que hay en la tabla Product |
| **Configuración** | Dashboard → Configuración → "Catálogo de productos" → "Guardar catálogo" | Sobrescribe `bot_product_catalog` con lo que está en el formulario (editado manualmente) |

**Problema:** Si alguien editó el catálogo manualmente en Configuración, quedan productos que no existen en la tabla Product. O al revés: si sincronizas desde Productos, se pierden los cambios hechos en Configuración.

---

### 2. **Eliminación sin sincronizar**

En `src/app/api/products/[id]/route.ts`, el `DELETE` **no llama** a `syncProductsWithBot()`:

```typescript
// DELETE - NO hace sync
await prisma.product.delete({ where: { id } });
return NextResponse.json({ ok: true });
```

Un producto eliminado sigue apareciendo en el catálogo del bot hasta que alguien haga sync manual.

---

### 3. **Productos sin fotos ni videos quedan fuera del catálogo**

`syncProductsWithBot()` solo añade al catálogo items cuando el producto tiene `photos` o `videos`:

```typescript
// sync-bot.ts líneas 52-76
videos.forEach((url, i) => { catalogItems.push(...); });
photos.forEach((url, i) => { catalogItems.push(...); });
```

Si un producto tiene `available: true` pero 0 fotos y 0 videos, **no se añade nada** al catálogo visual. El bot no puede enviar imágenes de ese producto.

---

### 4. **Inconsistencia training vs catálogo**

| Concepto | Origen | Contenido |
|----------|--------|-----------|
| **bot_products_training** | `generateProductsTrainingText()` | **Todos** los productos (sin filtro `available`) |
| **bot_product_catalog** | `syncProductsWithBot()` | Solo productos `available: true` **con** fotos o videos |

La IA puede "conocer" y nombrar productos que no están en el catálogo visual (unavailable o sin media), generando confusión al intentar enviarlos.

---

### 5. **Sync silencioso al crear/actualizar**

POST y PATCH **sí** llaman a `syncProductsWithBot()`, pero con `.catch()` que solo hace `console.error`. Si falla (BD, timeout, etc.), el usuario no se entera:

```typescript
await syncProductsWithBot().catch((err) => console.error("syncProductsWithBot after create:", err));
```

---

## Soluciones propuestas

### Solución 1: Sincronizar al eliminar (crítico)

Añadir `syncProductsWithBot()` después de borrar un producto.

**Archivo:** `src/app/api/products/[id]/route.ts`  
**Cambio:** Llamar a `syncProductsWithBot()` en el handler `DELETE`.

---

### Solución 2: Catálogo único desde Product (recomendado)

Hacer que el catálogo del bot **siempre** derive de la tabla Product. Opciones:

**A) Eliminar la edición manual en Configuración**  
- Quitar la sección "Catálogo del bot" que permite añadir/editar items manualmente.  
- Dejar solo "Sincronizar con bot" en Productos como única vía de actualización.  

**B) Hacer Configuración de solo lectura**  
- Mostrar el catálogo actual pero sin permitir editar.  
- Botón "Sincronizar desde Productos" que redirige o llama a `/api/products/sync-bot`.

---

### Solución 3: Sincronización automática en cada cambio

Actualmente POST y PATCH ya sincronizan. Falta:

- Llamar a sync en DELETE (ver Solución 1).  
- Reintentar o notificar si sync falla (opcional: toast "Catálogo actualizado con errores").

---

### Solución 4: Advertencia en Configuración

Si se mantiene la edición manual:

- Añadir aviso: *"Al guardar aquí se sobrescribe el catálogo. Para usar los productos del inventario, usa 'Sincronizar con bot' en Productos."*  
- O deshabilitar "Guardar catálogo" cuando el catálogo provenga de sync (flag o timestamp).

---

### Solución 5: Alinear training con catálogo

Hacer que `generateProductsTrainingText()` use los mismos criterios que el catálogo:

- Solo productos `available: true`.  
- Considerar solo productos con fotos o videos (o marcarlos explícitamente como "sin imagen en catálogo").

---

## Resumen de cambios sugeridos

| Prioridad | Acción | Archivo(s) |
|-----------|--------|------------|
| Alta | Añadir sync en DELETE de productos | `src/app/api/products/[id]/route.ts` |
| Alta | Unificar fuente de verdad: eliminar o hacer read-only el catálogo manual en Configuración | `configuracion/page.tsx`, `api/bot/product-catalog/route.ts` |
| Media | Añadir advertencia o deshabilitar edición manual del catálogo | `configuracion/page.tsx` |
| Media | Alinear training con catálogo (solo available + con media) | `src/lib/products/sync-bot.ts` |
| Baja | Mejorar manejo de errores en sync (toast, reintentos) | `productos/page.tsx`, rutas API |

---

## Verificación rápida

Para comprobar el estado actual:

1. Consultar productos en BD (disponibles, con fotos/videos).  
2. Consultar `bot_product_catalog` en AppConfig.  
3. Comparar nombres y conteo.

Si difieren, aplicar las soluciones 1 y 2 primero.

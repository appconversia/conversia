# Diagnóstico: Por qué el bot envía productos que no coinciden con el catálogo

## Resumen ejecutivo

**Los datos en producción (Neon) están correctos.** El bot recibe el catálogo y el texto de entrenamiento actualizados. Las respuestas incorrectas (“Gorra YJ Barriles” $35,000, “solo tengo información del barril M.L.P.”) se deben a **errores del modelo de IA**, no a datos desactualizados en la base de datos.

---

## 1. Flujo de datos: qué usa el bot

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                   NEON (Producción)                      │
                    │  • Product (tabla productos)                            │
                    │  • AppConfig.bot_product_catalog (JSON catálogo visual)  │
                    │  • AppConfig.bot_products_training (texto entrenamiento) │
                    └──────────────────────┬──────────────────────────────────┘
                                           │
           ┌───────────────────────────────┼───────────────────────────────┐
           │                               │                               │
           ▼                               ▼                               ▼
┌──────────────────────┐    ┌──────────────────────────────┐    ┌────────────────────────────┐
│ getProductCatalog()  │    │ getProductsTrainingText()    │    │ prisma.product (directo)   │
│ → catalogContext     │    │ → trainingBlock               │    │ → product-detail-brain      │
│   (nombres 1-15)     │    │   (precios, descripciones)   │    │   buildFullProductDesc...  │
└──────────┬───────────┘    └──────────────┬──────────────┘    └────────────────────────────┘
           │                                │
           │                                │
           └────────────────┬───────────────┘
                            │
                            ▼
                ┌─────────────────────────────────────┐
                │  sales-flow-brain.ts                 │
                │  processSalesFlow()                   │
                │                                      │
                │  Prompt al modelo de IA:             │
                │  • systemPrompt (config)            │
                │  • catalogContext (nombres)         │
                │  • trainingBlock (datos completos)   │
                │  • historial de conversación         │
                └─────────────────────────────────────┘
```

---

## 2. Verificación en producción (Neon)

### 2.1 Datos en `bot_product_catalog` (catálogo visual)

```
1. Barril Grande Promo 45-55 LB
2. Barril Brochetero 15 LB
...
9. EL AVENTURERO Barril Mediano 30-35 LB
10. Delantal de Cuero
11. Gorras Marca Propia
12. Miel YJ La Cumbre - Grande
13. Miel YJ La Cumbre - Mediana
14. Gorras Yeison Jimenez
15. Poncho Yeison Jimenez
+ línea añadida: "10. Otros (gorras, ponchos, carbón, etc.)"
```

Los nombres y el orden son correctos y coinciden con la tabla `Product`.

### 2.2 Datos en `bot_products_training` (texto de entrenamiento)

Fragmento relevante para gorras:

```
### Gorras Marca Propia
- Categoría: otros
- Precio: $85,000
- Stock: 3000 unidades
...

### Gorras Yeison Jimenez
- Categoría: otros
- Precio: $150,000
- Stock: 3000 unidades
- Descripción: Gorra oficial de YJ Barriles con logo bordado...
```

No existe “Gorra YJ Barriles” ni el precio de $35,000 en ningún `AppConfig`.

### 2.3 Tabla `Product`

- **Gorras Yeison Jimenez:** $150,000
- **Gorras Marca Propia:** $85,000

No existe “Gorra YJ Barriles” en la base de datos.

---

## 3. Origen de los errores

### 3.1 “Gorra YJ Barriles” $35,000

| Fuente posible | Verificación |
|----------------|--------------|
| Tabla `Product` | No existe este producto |
| `bot_product_catalog` | No existe |
| `bot_products_training` | No existe |
| Código fuente | Solo en `seed.ts` (no usado en ejecución) |
| `AppConfig` (system prompt, etc.) | No contiene ni “Gorra YJ Barriles” ni 35,000 |

Conclusión: **no hay ninguna fuente de datos en producción que contenga “Gorra YJ Barriles” ni $35,000**. El modelo los está generando por sí mismo, no leyéndolos de tu base de datos.

### 3.2 “Solo tengo información sobre El Barril M.L.P.”

En el `trainingBlock` sí están todos los productos (Delantal, Gorras, Miel, Poncho, Carbón, etc.). El modelo recibe esa información pero, en esa respuesta, no la utilizó y se limitó a mencionar el barril M.L.P.

Conclusión: **el modelo no siguió bien el contexto**. No es un problema de datos desactualizados.

### 3.3 ¿De dónde puede sacar el modelo esos errores?

1. **Alucinación / condensación del nombre**  
   A partir de “Gorras Yeison Jimenez” y “YJ Barriles”, el modelo puede crear “Gorra YJ Barriles” como variación.

2. **Estimaciones de precio**  
   $35,000 puede ser una mezcla entre precios reales (ej. Miel $30,000, Miel Mediana $21,000) o una cifra inventada.

3. **Uso parcial del contexto**  
   El modelo a veces se “fija” en el último producto mencionado (M.L.P.) o en una parte del contexto e ignora el resto.

4. **Instrucciones ambiguas**  
   Aunque se diga “usa ÚNICAMENTE la información anterior”, el modelo no siempre lo cumple al 100%.

---

## 4. Resumen de causas

| Respuesta incorrecta              | Causa principal                          | Dato real en producción                |
|----------------------------------|-----------------------------------------|----------------------------------------|
| “Gorra YJ Barriles” $35,000     | Modelo inventa/condensa nombre y precio | Gorras Yeison Jimenez $150,000         |
| “Solo info del barril M.L.P.”   | Modelo ignora productos “otros”         | Delantal, Gorras, Miel, Poncho, Carbón |
| Nombre “Gorra YJ Barriles”      | Modelo no usa el nombre exacto del catálogo | Gorras Yeison Jimenez / Gorras Marca Propia |

---

## 5. Flujos que sí usan la BD directamente

Algunos flujos leen la base de datos directamente y no dependen del modelo para precios o nombres:

1. **product-detail-question-brain**  
   - `findProductByName()` → `prisma.product`  
   - Usa solo datos reales de la BD para preguntas puntuales (precio, accesorios, etc.).

2. **product-response-brain / buildFullProductDescription**  
   - `findProductByName()` → `prisma.product`  
   - Usa solo datos reales para descripciones completas.

3. **sendProductImages**  
   - Usa `getProductCatalog()` para decidir qué imágenes y videos enviar.  
   - Los URLs y nombres vienen del catálogo sincronizado desde `Product`.

Si el error aparece en la **conversación escrita** (no en las descripciones de imágenes ni en las respuestas puntuales de detalle), entonces proviene del `sales-flow-brain`, que depende totalmente de lo que genere el modelo a partir del contexto.

---

## 6. Recomendaciones técnicas

1. **Reforzar instrucciones en el prompt**  
   Añadir algo del estilo: “Usa SOLO los nombres exactos del catálogo. No inventes variaciones como ‘Gorra YJ Barriles’ si el nombre es ‘Gorras Yeison Jimenez’.”

2. **Validación post-respuesta**  
   Comparar nombres y precios mencionados en la respuesta con el catálogo/`Product` y corregir o filtrar los que no existan.

3. **Más contexto explícito para “otros”**  
   Incluir en el prompt una lista explícita de “otros productos”: Delantal, Gorras Yeison Jimenez, Gorras Marca Propia, Miel, Poncho, Carbón, etc.

4. **Bajar temperatura**  
   Reducir la temperatura del modelo para respuestas más pegadas al contexto.

---

## 7. Conclusión final

**Los datos erróneos no salen de tu base de datos ni del catálogo.**  
Provienen del comportamiento del modelo de IA dentro de `sales-flow-brain`. Los datos en producción están correctos; el ajuste debe hacerse en prompt, validaciones y, si procede, en parámetros del modelo.

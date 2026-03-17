import { describe, it, expect } from "vitest";
import { fixWhatsAppFormat } from "../bot/sub-brains/product-response-brain";

/**
 * Tests para fixWhatsAppFormat: sanitización de Markdown para WhatsApp.
 * Función pura, sin dependencias externas.
 */
describe("product-response-brain / fixWhatsAppFormat", () => {
  it("convierte **texto** a *texto* para compatibilidad WhatsApp", () => {
    expect(fixWhatsAppFormat("**Precio especial**")).toBe("*Precio especial*");
    expect(fixWhatsAppFormat("**Barril** de 45 libras")).toBe("*Barril* de 45 libras");
  });

  it("elimina encabezados Markdown (# ## ###)", () => {
    expect(fixWhatsAppFormat("# Título")).toBe("Título");
    expect(fixWhatsAppFormat("## Subtítulo")).toBe("Subtítulo");
    expect(fixWhatsAppFormat("### Sección")).toBe("Sección");
  });

  it("preserva asteriscos simples para negrita válida de WhatsApp", () => {
    expect(fixWhatsAppFormat("*Texto en negrita*")).toBe("*Texto en negrita*");
  });

  it("no altera emojis ni texto sin formato especial", () => {
    expect(fixWhatsAppFormat("Hola 📦 $50 ✨")).toBe("Hola 📦 $50 ✨");
  });

  it("recorta espacios al inicio y final", () => {
    expect(fixWhatsAppFormat("  texto  ")).toBe("texto");
  });
});

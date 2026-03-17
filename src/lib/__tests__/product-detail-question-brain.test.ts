/**
 * Tests para product-detail-question-brain.
 * Detecta preguntas puntuales (precio, accesorios, dimensiones, etc.) y responde con datos de BD.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { processProductDetailQuestion } from "../bot/sub-brains/product-detail-question-brain";

const FAKE_CATALOG = vi.hoisted(() => [
  { id: "p1-vid-0", name: "Barril Aventurero", url: "", description: "", order: 0, type: "video" as const },
  { id: "p1-img-0", name: "Barril Aventurero", url: "", description: "", order: 50, type: "image" as const },
]);

vi.mock("@/lib/bot/product-catalog", () => ({
  getProductCatalog: vi.fn().mockResolvedValue(FAKE_CATALOG),
}));

vi.mock("@/lib/config", () => ({
  getBotAICredentials: vi.fn().mockResolvedValue({
    provider: "openai",
    openaiKey: "sk-test",
    model: "gpt-4o-mini",
    temperature: 0.3,
    maxTokens: 512,
  }),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    product: {
      findFirst: vi.fn().mockResolvedValue({
        name: "Barril Aventurero",
        description: "Barril ideal para eventos",
        price: 450000,
        characteristics: JSON.stringify({ capacidad: "45L", material: "Acero" }),
        stock: 10,
      }),
    },
  },
}));

vi.mock("@/lib/ai", () => ({
  callAI: vi.fn().mockResolvedValue(
    "El Barril Aventurero incluye capacidad de 45L, material en acero. Precio: $450,000. Stock disponible."
  ),
}));

describe("product-detail-question-brain / processProductDetailQuestion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("no procesa mensajes que no son preguntas de detalle", async () => {
    const r = await processProductDetailQuestion("hola", undefined, undefined, undefined);
    expect(r.handled).toBe(false);
  });

  it("procesa pregunta de precio con lastProductSent", async () => {
    const r = await processProductDetailQuestion(
      "cuánto cuesta?",
      "Barril Aventurero",
      undefined,
      undefined
    );
    expect(r.handled).toBe(true);
    expect(r.reply).toBeDefined();
    expect(r.reply!.length).toBeGreaterThan(10);
  });

  it("procesa pregunta de accesorios con producto por posición (el tercero)", async () => {
    const { prisma } = await import("@/lib/db");
    (prisma.product.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      name: "Barril Aventurero",
      description: "Barril",
      price: 400000,
      characteristics: "{}",
      stock: 5,
    });
    const r = await processProductDetailQuestion(
      "qué accesorios trae el primero?",
      undefined,
      undefined,
      undefined
    );
    expect(r.handled).toBe(true);
  });

  it("no procesa si no puede resolver el producto", async () => {
    const r = await processProductDetailQuestion(
      "qué incluye?",
      undefined,
      undefined,
      undefined
    );
    expect(r.handled).toBe(false);
  });
});

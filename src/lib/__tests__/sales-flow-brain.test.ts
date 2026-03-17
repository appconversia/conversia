import { describe, it, expect, vi, beforeEach } from "vitest";
import { processSalesFlow } from "../bot/sub-brains/sales-flow-brain";

const FAKE_CATALOG = vi.hoisted(() => [
  { id: "p1-vid-0", name: "Barril Aventurero", url: "https://x.com/v1", description: "Aventurero", order: 0, type: "video" as const },
  { id: "p1-img-0", name: "Barril Aventurero", url: "https://x.com/i1", description: "Aventurero", order: 50, type: "image" as const },
  { id: "p2-vid-0", name: "Barril Brochetero", url: "https://x.com/v2", description: "Brochetero", order: 100, type: "video" as const },
  { id: "p2-img-0", name: "Barril Brochetero", url: "https://x.com/i2", description: "Brochetero", order: 150, type: "image" as const },
  { id: "p3-vid-0", name: "Barril Grande 45-55", url: "", description: "", order: 200, type: "video" as const },
  { id: "p3-img-0", name: "Barril Grande 45-55", url: "", description: "", order: 250, type: "image" as const },
]);

vi.mock("@/lib/bot/product-catalog", () => ({
  getProductCatalog: vi.fn().mockResolvedValue(FAKE_CATALOG),
}));

vi.mock("@/lib/config", () => ({
  getBotAICredentials: vi.fn().mockResolvedValue({
    provider: "openai",
    openaiKey: "sk-test",
    model: "gpt-4o-mini",
    temperature: 0.5,
    maxTokens: 1024,
  }),
}));

vi.mock("@/lib/products/sync-bot", () => ({
  getProductsTrainingText: vi.fn().mockResolvedValue("Precios y descripciones de productos..."),
}));

vi.mock("@/lib/bot/greeting-classifier", () => ({
  classifyIsGreeting: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/ai-multimodal", () => ({
  callAIMultimodal: vi.fn(),
}));

describe("sales-flow-brain / processSalesFlow", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { callAIMultimodal } = await import("@/lib/ai-multimodal");
    (callAIMultimodal as ReturnType<typeof vi.fn>).mockResolvedValue(
      "Claro, te envío la información del barril que pediste. ✨"
    );
  });

  it("cuando IA devuelve PRODUCT_INTEREST: Barril Brochetero, usa ese filtro", async () => {
    const { callAIMultimodal } = await import("@/lib/ai-multimodal");
    (callAIMultimodal as ReturnType<typeof vi.fn>).mockResolvedValue(
      "PRODUCT_INTEREST: Barril Brochetero\nTe envío el video e imagen del Barril Brochetero. ✨"
    );
    const r = await processSalesFlow(
      "+573001234567",
      "me puedes enviar un video del barril brochetero?",
      [],
      undefined,
      undefined,
      false
    );
    expect(r.sendImages).toBe(true);
    expect(r.productFilter).toBe("Barril Brochetero");
  });

  it("cuando IA devuelve PRODUCT_INTEREST: todos, productFilter es null (envía todos)", async () => {
    const { callAIMultimodal } = await import("@/lib/ai-multimodal");
    (callAIMultimodal as ReturnType<typeof vi.fn>).mockResolvedValue(
      "PRODUCT_INTEREST: todos\nTe envío todo el catálogo. ✨"
    );
    const r = await processSalesFlow(
      "+573001234567",
      "quiero ver todos los barriles",
      [],
      undefined,
      undefined,
      false
    );
    expect(r.sendImages).toBe(true);
    expect(r.productFilter).toBeNull();
  });

  it("híbrido: IA no pone tag pero usuario pide video del barril brochetero → fallback por nombre", async () => {
    const { callAIMultimodal } = await import("@/lib/ai-multimodal");
    (callAIMultimodal as ReturnType<typeof vi.fn>).mockResolvedValue(
      "Claro, te envío el video del Barril Brochetero. Un momento."
    );
    const r = await processSalesFlow(
      "+573001234567",
      "me puedes enviar un video del barril brochetero?",
      [],
      undefined,
      undefined,
      false
    );
    expect(r.sendImages).toBe(true);
    expect(r.productFilter).toBe("Barril Brochetero");
  });

  it("handoff cuando usuario confirma con 'si' tras CTA de asesor", async () => {
    const { callAIMultimodal } = await import("@/lib/ai-multimodal");
    (callAIMultimodal as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce("SI") // clasificador coherencia CTA
      .mockResolvedValueOnce("¿Te interesa? Si tienes dudas o quieres ayuda, un asesor te atiende 📦");
    const r = await processSalesFlow(
      "+573001234567",
      "si",
      [
        { role: "user", content: "quiero el barril aventurero" },
        { role: "assistant", content: "Te envío el video. ¿Te interesa? Si tienes dudas, un asesor te atiende 📦" },
      ],
      undefined,
      undefined,
      false
    );
    expect(r.handoffRequired).toBe(true);
  });

  it("FUERA_DE_ALCANCE cuando IA detecta tema ajeno (pizza, política, etc.) → scope_guard", async () => {
    const { callAIMultimodal } = await import("@/lib/ai-multimodal");
    (callAIMultimodal as ReturnType<typeof vi.fn>).mockResolvedValue("FUERA_DE_ALCANCE");
    const r = await processSalesFlow(
      "+573001234567",
      "¿cuál es la mejor pizza de Bogotá?",
      [],
      undefined,
      undefined,
      false
    );
    expect(r.scopeGuardTriggered).toBe(true);
    expect(r.sendImages).toBe(false);
  });

  it("NO_ENTIENDO cuando IA devuelve tag → scope_guard (main-brain enviará mensaje límite + lista)", async () => {
    const { callAIMultimodal } = await import("@/lib/ai-multimodal");
    (callAIMultimodal as ReturnType<typeof vi.fn>).mockResolvedValue("NO_ENTIENDO");
    const r = await processSalesFlow(
      "+573001234567",
      "?? ???",
      [],
      undefined,
      undefined,
      false
    );
    expect(r.scopeGuardTriggered).toBe(true);
    expect(r.sendImages).toBe(false);
  });

  it("preferencia media: solo video cuando pide 'solo video del aventurero'", async () => {
    const { callAIMultimodal } = await import("@/lib/ai-multimodal");
    (callAIMultimodal as ReturnType<typeof vi.fn>).mockResolvedValue(
      "PRODUCT_INTEREST: Barril Aventurero\nTe envío solo el video. ✨"
    );
    const r = await processSalesFlow(
      "+573001234567",
      "solo el video del aventurero",
      [],
      undefined,
      undefined,
      false
    );
    expect(r.mediaPreference).toBe("video_only");
  });

  it("coherencia promesa fotos: bot prometió fotos + usuario dice 'Fotos' → envía fotos", async () => {
    const { callAIMultimodal } = await import("@/lib/ai-multimodal");
    (callAIMultimodal as ReturnType<typeof vi.fn>).mockResolvedValue(
      "Aquí tienes las fotos del *Barril Brochetero*. Un momento, por favor."
    );
    const r = await processSalesFlow(
      "+573001234567",
      "Fotos",
      [
        { role: "user", content: "Mándame la información de este barril" },
        { role: "assistant", content: "Claro, aquí tienes la información del *Barril Brochetero*:\n\n- Precio: $590,000" },
        { role: "user", content: "Fotos" },
        { role: "assistant", content: "Te enviaré las fotos del *Barril Brochetero*. Un momento, por favor." },
      ],
      undefined,
      undefined,
      false
    );
    expect(r.sendImages).toBe(true);
    expect(r.productFilter).toBe("Barril Brochetero");
  });

  it("sin credenciales IA → handoff directo", async () => {
    const { getBotAICredentials } = await import("@/lib/config");
    (getBotAICredentials as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const r = await processSalesFlow(
      "+573001234567",
      "hola",
      [],
      undefined,
      undefined,
      false
    );
    expect(r.handoffRequired).toBe(true);
    expect(r.reply).toContain("asesor");
    (getBotAICredentials as ReturnType<typeof vi.fn>).mockResolvedValue({
      provider: "openai",
      openaiKey: "sk-test",
      model: "gpt-4o-mini",
      temperature: 0.5,
      maxTokens: 1024,
    });
  });
});

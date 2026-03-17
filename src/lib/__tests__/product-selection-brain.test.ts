import { describe, it, expect, vi, beforeEach } from "vitest";
import { processProductSelection } from "../bot/sub-brains/product-selection-brain";

/** Catálogo fake: 6 productos (incluye M.L.P. para test normalización MLP/M.L.P.) */
const FAKE_CATALOG = vi.hoisted(() => [
  { id: "p1-vid-0", name: "Barril Aventurero", url: "", description: "", order: 0, type: "video" as const },
  { id: "p1-img-0", name: "Barril Aventurero", url: "", description: "", order: 50, type: "image" as const },
  { id: "p2-vid-0", name: "Barril Tierno", url: "", description: "", order: 100, type: "video" as const },
  { id: "p2-img-0", name: "Barril Tierno", url: "", description: "", order: 150, type: "image" as const },
  { id: "p3-vid-0", name: "Barril Grande 45-55", url: "", description: "", order: 200, type: "video" as const },
  { id: "p3-img-0", name: "Barril Grande 45-55", url: "", description: "", order: 250, type: "image" as const },
  { id: "p4-vid-0", name: "Barril Brochetero", url: "", description: "", order: 300, type: "video" as const },
  { id: "p4-img-0", name: "Barril Brochetero", url: "", description: "", order: 350, type: "image" as const },
  { id: "p5-vid-0", name: "Barril Mediano", url: "", description: "", order: 400, type: "video" as const },
  { id: "p5-img-0", name: "Barril Mediano", url: "", description: "", order: 450, type: "image" as const },
  { id: "p6-vid-0", name: "El Barril M.L.P. 70 Libras Premium", url: "", description: "", order: 500, type: "video" as const },
  { id: "p6-img-0", name: "El Barril M.L.P. 70 Libras Premium", url: "", description: "", order: 550, type: "image" as const },
]);

vi.mock("@/lib/bot/product-catalog", () => ({
  getProductCatalog: vi.fn().mockResolvedValue(FAKE_CATALOG),
}));

describe("product-selection-brain / processProductSelection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("no procesa cuando pide un solo producto (el 2)", async () => {
    const r = await processProductSelection("el 2");
    expect(r.handled).toBe(false);
  });

  it("procesa 'el 2, 5 y 7' y resuelve posiciones", async () => {
    const r = await processProductSelection("quiero el 2, 5 y 7");
    expect(r.handled).toBe(true);
    expect(r.productNames).toBeDefined();
    expect(r.productNames!.length).toBeGreaterThanOrEqual(2);
    // Con 5 productos, el 2 = Tierno, el 5 = Mediano, el 7 no existe → 2 productos
    expect(r.productNames).toContain("Barril Tierno");
    expect(r.productNames).toContain("Barril Mediano");
  });

  it("procesa 'el 1, 3 y 5' correctamente", async () => {
    const r = await processProductSelection("envíame el 1, 3 y 5");
    expect(r.handled).toBe(true);
    expect(r.productNames).toContain("Barril Aventurero");
    expect(r.productNames).toContain("Barril Grande 45-55");
    expect(r.productNames).toContain("Barril Mediano");
  });

  it("procesa por nombres: aventurero y tierno", async () => {
    const r = await processProductSelection("el aventurero y el tierno");
    expect(r.handled).toBe(true);
    expect(r.productNames).toContain("Barril Aventurero");
    expect(r.productNames).toContain("Barril Tierno");
  });

  it("no procesa mensajes cortos o vacíos", async () => {
    expect((await processProductSelection("")).handled).toBe(false);
    expect((await processProductSelection("hola")).handled).toBe(false);
  });

  it("no procesa cuando no matchea patrón PIDE_ALGUNOS", async () => {
    const r = await processProductSelection("quiero ver todos los barriles");
    expect(r.handled).toBe(false);
  });

  it("matchea MLP con M.L.P. por normalización (el mlp y el aventurero)", async () => {
    const r = await processProductSelection("quiero el mlp y el aventurero");
    expect(r.handled).toBe(true);
    expect(r.productNames).toContain("El Barril M.L.P. 70 Libras Premium");
    expect(r.productNames).toContain("Barril Aventurero");
  });
});

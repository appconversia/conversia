/**
 * Tests de escenarios: validan que las expresiones regex y patrones
 * del bot matchean correctamente las peticiones típicas de usuarios.
 * Solo valida la capa determinista (regex); no llama a IA ni BD.
 */
import { describe, it, expect, vi } from "vitest";
import { processProductSelection } from "../bot/sub-brains/product-selection-brain";
import { fixWhatsAppFormat } from "../bot/sub-brains/product-response-brain";

const FAKE_CATALOG = vi.hoisted(() => [
  { id: "p1-vid-0", name: "Barril Aventurero", url: "", description: "", order: 0, type: "video" as const },
  { id: "p1-img-0", name: "Barril Aventurero", url: "", description: "", order: 50, type: "image" as const },
  { id: "p2-vid-0", name: "Barril Tierno", url: "", description: "", order: 100, type: "video" as const },
  { id: "p2-img-0", name: "Barril Tierno", url: "", description: "", order: 150, type: "image" as const },
  { id: "p3-vid-0", name: "Barril Brochetero", url: "", description: "", order: 200, type: "video" as const },
  { id: "p3-img-0", name: "Barril Brochetero", url: "", description: "", order: 250, type: "image" as const },
  { id: "p4-vid-0", name: "Barril Grande 45-55", url: "", description: "", order: 300, type: "video" as const },
  { id: "p4-img-0", name: "Barril Grande 45-55", url: "", description: "", order: 350, type: "image" as const },
  { id: "p5-vid-0", name: "Barril Mediano", url: "", description: "", order: 400, type: "video" as const },
  { id: "p5-img-0", name: "Barril Mediano", url: "", description: "", order: 450, type: "image" as const },
]);

vi.mock("@/lib/bot/product-catalog", () => ({
  getProductCatalog: vi.fn().mockResolvedValue(FAKE_CATALOG),
}));

describe("Bot — Escenarios de peticiones (capa determinista)", () => {
  describe("fixWhatsAppFormat — Formato de mensajes", () => {
    const casos = [
      { input: "**Texto**", expected: "*Texto*" },
      { input: "## Título", expected: "Título" },
      { input: "*Correcto*", expected: "*Correcto*" },
    ];
    it.each(casos)("transforma correctamente: $input", ({ input, expected }) => {
      expect(fixWhatsAppFormat(input)).toBe(expected);
    });
  });

  describe("product-selection — Pide varios productos", () => {
    const pideVarios: Array<{ mensaje: string; esperaHandled: boolean }> = [
      { mensaje: "el 1, 3 y 5", esperaHandled: true },
      { mensaje: "quiero el aventurero y el brochetero", esperaHandled: true },
      { mensaje: "envíame el 2 y el 4", esperaHandled: true },
      { mensaje: "el primero y el tercero", esperaHandled: true },
      { mensaje: "solo el 2", esperaHandled: false },
      { mensaje: "quiero ver todos", esperaHandled: false },
      { mensaje: "hola", esperaHandled: false },
    ];

    it.each(pideVarios)("'$mensaje' → handled=$esperaHandled", async ({ mensaje, esperaHandled }) => {
      const r = await processProductSelection(mensaje);
      expect(r.handled).toBe(esperaHandled);
    });
  });

  describe("Patrones que debe cubrir sales-flow (documentación)", () => {
    // Estos regex existen en sales-flow-brain; aquí documentamos qué matchean.
    const pideTodos = /todos\s*(los\s+)?(productos?|items?|v[ií]deos?|fotos?|im[aá]genes?)|todo\s+(el\s+)?(cat[aá]logo|lo\s+que\s+tienen)|cat[aá]logo\s+completo|env[ií]ame\s+(todo|todos)|all\s+(the\s+)?(products?|items?|videos?)/i;
    const pideVideoOImagen = /\b(video[s]?\s+de|video[s]?\s+del|v[ií]deos?\s+de|me\s+puedes\s+enviar\s+(un\s+)?v[ií]deo[s]?|imagen(es)?\s+de|imagen(es)?\s+del|env[ií]ame\s+(la\s+)?imagen|foto[s]?\s+de|foto[s]?\s+del)\b/i;
    const referenciaUltimo = /\b(él?\s+que\s+me\s+enviaste|el\s+que\s+me\s+enviaste|el\s+que\s+mostraste|el\s+de\s+las\s+fotos|ese\s+mismo)\b/i;

    it("pideTodos matchea frases de catálogo completo", () => {
      expect(pideTodos.test("todos los productos")).toBe(true);
      expect(pideTodos.test("envíame todo")).toBe(true);
      expect(pideTodos.test("catálogo completo")).toBe(true);
      expect(pideTodos.test("all the products")).toBe(true);
      expect(pideTodos.test("quiero el aventurero")).toBe(false);
    });

    it("pideVideoOImagen matchea peticiones de media", () => {
      expect(pideVideoOImagen.test("video del barril brochetero")).toBe(true);
      expect(pideVideoOImagen.test("me puedes enviar un video")).toBe(true);
      expect(pideVideoOImagen.test("imagen del tierno")).toBe(true);
      expect(pideVideoOImagen.test("envíame la imagen")).toBe(true);
      expect(pideVideoOImagen.test("foto del grande")).toBe(true);
      expect(pideVideoOImagen.test("solo quiero info")).toBe(false);
    });

    it("referenciaUltimo matchea referencias al último enviado", () => {
      expect(referenciaUltimo.test("el que me enviaste")).toBe(true);
      expect(referenciaUltimo.test("el de las fotos")).toBe(true);
      expect(referenciaUltimo.test("ese mismo")).toBe(true);
      expect(referenciaUltimo.test("el aventurero")).toBe(false);
    });

    const pideDescripcion = /\b(m[aá]s\s+detalles|m[aá]s\s+informaci[oó]n|descripci[oó]n\s+completa|qu[eé]\s+incluye|caracter[ií]sticas|info\s+completa|ficha\s+completa)\b/i;
    const pideEspecifico = /el primero|el segundo|el tercero|el grande|el pequeño|numero\s*[1-9]|el [úu]ltimo|todos|todo el|catálogo completo/i;

    it("pideDescripcion matchea pedidos de ficha completa", () => {
      expect(pideDescripcion.test("más detalles del aventurero")).toBe(true);
      expect(pideDescripcion.test("qué incluye")).toBe(true);
      expect(pideDescripcion.test("descripción completa")).toBe(true);
      expect(pideDescripcion.test("solo el precio")).toBe(false);
    });

    it("pideEspecifico matchea referencias concretas a productos", () => {
      expect(pideEspecifico.test("el primero")).toBe(true);
      expect(pideEspecifico.test("el grande")).toBe(true);
      expect(pideEspecifico.test("numero 5")).toBe(true);
      expect(pideEspecifico.test("el último")).toBe(true);
      expect(pideEspecifico.test("hola")).toBe(false);
    });

    it("matriz de peticiones: catálogo vs video vs descripción", () => {
      const pT = /todos\s*(los\s+)?(productos?|items?)|env[ií]ame\s+(todo|todos)/i;
      const pV = /\b(video[s]?\s+(de|del)|imagen(es)?\s+(de|del)|foto[s]?\s+(de|del))\b/i;
      expect(pT.test("todos los productos")).toBe(true);
      expect(pT.test("envíame todo")).toBe(true);
      expect(pV.test("video del brochetero")).toBe(true);
      expect(pV.test("imagen del tierno")).toBe(true);
    });
  });
});

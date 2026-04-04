import { get } from "@vercel/edge-config";

/**
 * Lee un valor del Edge Config de Vercel (store conectado al proyecto, ej. dbconversia).
 * Requiere la variable de entorno EDGE_CONFIG en Vercel / .env.local.
 */
export async function getEdgeConfigValue<T = string>(key: string): Promise<T | undefined> {
  if (!process.env.EDGE_CONFIG) return undefined;
  try {
    const v = await get<T>(key);
    return v ?? undefined;
  } catch {
    return undefined;
  }
}

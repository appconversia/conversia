/**
 * Obtiene y descarga medios de WhatsApp Cloud API.
 * GET https://graph.facebook.com/v21.0/{media-id} → { url, mime_type }
 * Luego GET url con Authorization para descargar el archivo.
 */

const GRAPH_VERSION = "v21.0";

export type MediaResult = {
  base64: string;
  mimeType: string;
  filename?: string;
};

export async function getMediaUrl(mediaId: string, accessToken: string): Promise<{ url: string; mimeType?: string } | null> {
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${mediaId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { url?: string; mime_type?: string };
  return data.url
    ? { url: data.url, mimeType: data.mime_type }
    : null;
}

export async function downloadMediaAsBase64(
  url: string,
  accessToken: string,
  mimeType?: string
): Promise<MediaResult | null> {
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const detectedMime = res.headers.get("content-type")?.split(";")[0] || mimeType || "application/octet-stream";
    return { base64, mimeType: detectedMime };
  } catch {
    return null;
  }
}

/** Obtiene el medio por ID de WhatsApp y lo devuelve en base64 */
export async function fetchWhatsAppMedia(
  mediaId: string,
  accessToken: string
): Promise<MediaResult | null> {
  const meta = await getMediaUrl(mediaId, accessToken);
  if (!meta?.url) return null;
  return downloadMediaAsBase64(meta.url, accessToken, meta.mimeType);
}

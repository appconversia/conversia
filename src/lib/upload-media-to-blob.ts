import { put } from "@vercel/blob";

/**
 * Sube un buffer (ej. desde base64 de WhatsApp) a Vercel Blob.
 * Usado para persistir media recibida de clientes y mostrarla en el chat.
 */
export async function uploadBufferToBlob(
  buffer: Buffer,
  mimeType: string,
  prefix: string
): Promise<string> {
  const ext = mimeType.includes("image")
    ? (mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg")
    : mimeType.includes("video")
      ? "mp4"
      : mimeType.includes("audio")
        ? "ogg"
        : mimeType.includes("pdf")
          ? "pdf"
          : "bin";
  const filename = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;

  const blob = await put(filename, buffer, {
    access: "public",
    contentType: mimeType || "application/octet-stream",
  });
  return blob.url;
}

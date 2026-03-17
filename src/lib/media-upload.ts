/**
 * Límites y formatos para subida de productos.
 * Mensajes claros para el usuario.
 */
export const MEDIA_LIMITS = {
  image: {
    maxBytes: 5 * 1024 * 1024, // 5 MB
    maxMB: 5,
    formats: ["JPEG", "PNG", "WebP", "GIF", "HEIC", "HEIF"],
    accept: "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif",
  },
  video: {
    maxBytes: 16 * 1024 * 1024, // 16 MB (WhatsApp límite práctico)
    maxMB: 16,
    formats: ["MP4", "MOV", "WebM", "3GP", "M4V"],
    accept: "video/mp4,video/quicktime,video/webm,video/3gpp,video/x-m4v,.mp4,.mov,.webm,.3gp,.m4v",
  },
} as const;

const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|gif|heic|heif)$/i;
const IMAGE_MIMES = /^image\/(jpeg|png|webp|gif|heic|heif)/i;
const VIDEO_EXTENSIONS = /\.(mp4|mov|webm|3gp|m4v)$/i;
const VIDEO_MIMES = /^video\/(mp4|quicktime|webm|3gpp|x-m4v)/i;

export function isImageFile(file: { name: string; type: string }): boolean {
  return IMAGE_EXTENSIONS.test(file.name) || IMAGE_MIMES.test(file.type);
}

export function isVideoFile(file: { name: string; type: string }): boolean {
  return VIDEO_EXTENSIONS.test(file.name) || VIDEO_MIMES.test(file.type);
}

export function validateImageSize(bytes: number): { ok: boolean; error?: string } {
  if (bytes <= MEDIA_LIMITS.image.maxBytes) return { ok: true };
  return {
    ok: false,
    error: `La imagen es demasiado grande. Tamaño máximo permitido: ${MEDIA_LIMITS.image.maxMB} MB por archivo. Tu archivo supera ese límite.`,
  };
}

export function validateVideoSize(bytes: number): { ok: boolean; error?: string } {
  if (bytes <= MEDIA_LIMITS.video.maxBytes) return { ok: true };
  return {
    ok: false,
    error: `El video es demasiado grande. Tamaño máximo permitido: ${MEDIA_LIMITS.video.maxMB} MB por archivo. Tu archivo supera ese límite.`,
  };
}

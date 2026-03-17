import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { put } from "@vercel/blob";
import sharp from "sharp";
import {
  MEDIA_LIMITS,
  isImageFile,
  isVideoFile,
  validateImageSize,
  validateVideoSize,
} from "@/lib/media-upload";

const ADMIN_ROLES = ["admin", "super_admin"];

/** Formatos que sharp puede procesar directamente (compresión) */
const SHARP_SUPPORTED = /\.(jpe?g|png|webp|gif)$/i;

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!ADMIN_ROLES.includes(session.role)) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = (formData.get("type") as string) || "image";

    if (!file?.size) {
      return NextResponse.json({ error: "No se envió archivo" }, { status: 400 });
    }

    const fileName = file.name || "archivo";
    const fileSize = file.size;

    if (type === "image" || isImageFile({ name: fileName, type: file.type })) {
      const sizeCheck = validateImageSize(fileSize);
      if (!sizeCheck.ok) {
        return NextResponse.json({ error: sizeCheck.error }, { status: 413 });
      }
      return await handleImageUpload(file, fileName);
    }

    if (type === "video" || isVideoFile({ name: fileName, type: file.type })) {
      const sizeCheck = validateVideoSize(fileSize);
      if (!sizeCheck.ok) {
        return NextResponse.json({ error: sizeCheck.error }, { status: 413 });
      }
      return await handleVideoUpload(file, fileName);
    }

    return NextResponse.json(
      {
        error: `Formato no admitido. Imágenes: ${MEDIA_LIMITS.image.formats.join(", ")} (máx. ${MEDIA_LIMITS.image.maxMB} MB). Videos: ${MEDIA_LIMITS.video.formats.join(", ")} (máx. ${MEDIA_LIMITS.video.maxMB} MB).`,
      },
      { status: 400 }
    );
  } catch (err) {
    console.error("POST /api/products/upload error:", err);
    return NextResponse.json(
      { error: "Error al subir archivo. Intenta de nuevo." },
      { status: 500 }
    );
  }
}

async function handleImageUpload(file: File, fileName: string): Promise<NextResponse> {
  const buffer = Buffer.from(await file.arrayBuffer());
  let outputBuffer: Buffer;
  let ext = "jpg";
  let mime = "image/jpeg";

  if (SHARP_SUPPORTED.test(fileName)) {
    try {
      const image = sharp(buffer);
      const meta = await image.metadata();
      const width = meta.width ?? 1920;
      const height = meta.height ?? 1080;

      outputBuffer = await image
        .resize(width > 1920 || height > 1920 ? 1920 : undefined, undefined, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();

      ext = "jpg";
      mime = "image/jpeg";
    } catch {
      outputBuffer = buffer;
      const extMatch = fileName.match(/\.(\w+)$/i);
      ext = extMatch ? extMatch[1].toLowerCase() : "jpg";
      mime = file.type || "image/jpeg";
    }
  } else {
    outputBuffer = buffer;
    const extMatch = fileName.match(/\.(\w+)$/i);
    ext = extMatch ? extMatch[1].toLowerCase() : "jpg";
    mime = file.type || "image/jpeg";
  }

  const filename = `products/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
  const blob = await put(filename, outputBuffer, {
    access: "public",
    contentType: mime,
  });
  return NextResponse.json({ url: blob.url, filename: fileName, type: "image" });
}

async function handleVideoUpload(file: File, fileName: string): Promise<NextResponse> {
  const ext = fileName.split(".").pop()?.toLowerCase() || "mp4";
  const mime = file.type || "video/mp4";
  const filename = `products/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;

  const blob = await put(filename, file, {
    access: "public",
    contentType: mime,
  });
  return NextResponse.json({ url: blob.url, filename: fileName, type: "video" });
}

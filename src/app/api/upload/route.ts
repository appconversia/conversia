import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { put } from "@vercel/blob";
import sharp from "sharp";
import { convertToOgg } from "@/lib/convert-audio-to-ogg";
import { convertToMp4 } from "@/lib/convert-video-to-mp4";

/** Límites WhatsApp API: imagen 5MB, video 16MB, audio 16MB, documento 100MB, sticker 0.5MB */
const LIMITS = {
  image: 5 * 1024 * 1024,
  video: 16 * 1024 * 1024,
  audio: 16 * 1024 * 1024,
  document: 100 * 1024 * 1024,
  sticker: 512 * 1024, // 500KB animado
};

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = (formData.get("type") as string) || "image";

    if (!file || !file.size) {
      return NextResponse.json({ error: "No se envió archivo" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const safeName = `chat/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;

    if (type === "image" || type === "sticker") {
      const limit = type === "sticker" ? LIMITS.sticker : LIMITS.image;
      const buffer = Buffer.from(await file.arrayBuffer());
      const isWebp = file.type?.includes("webp") || file.name?.toLowerCase().endsWith(".webp");

      try {
        const image = sharp(buffer);
        const meta = await image.metadata();
        const w = meta.width ?? 1920;
        const h = meta.height ?? 1080;

        if (type === "sticker" && isWebp) {
          let output = await image.webp({ quality: 85 }).toBuffer();
          while (output.length > limit && output.length > 10000) {
            output = await sharp(output).webp({ quality: 70 }).toBuffer();
          }
          const blob = await put(safeName, output, {
            access: "public",
            contentType: "image/webp",
          });
          return NextResponse.json({ url: blob.url, filename: "" });
        }

        let output = await image
          .resize(w > 1920 || h > 1920 ? 1920 : undefined, undefined, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({ quality: 85, mozjpeg: true })
          .toBuffer();

        while (output.length > limit && output.length > 50000) {
          const q = Math.max(40, 85 - (output.length / limit) * 20);
          output = await sharp(output)
            .jpeg({ quality: Math.floor(q), mozjpeg: true })
            .toBuffer();
        }

        const blob = await put(safeName, output, {
          access: "public",
          contentType: "image/jpeg",
        });
        return NextResponse.json({ url: blob.url, filename: "" });
      } catch {
        const blob = await put(safeName, buffer, {
          access: "public",
          contentType: file.type || "image/jpeg",
        });
        return NextResponse.json({ url: blob.url, filename: "" });
      }
    }

    if (type === "video") {
      if (file.size > LIMITS.video) {
        return NextResponse.json(
          { error: `El video no debe superar ${LIMITS.video / 1024 / 1024}MB` },
          { status: 413 }
        );
      }
      const isWebm = file.type?.includes("webm") || file.name?.toLowerCase().endsWith(".webm");
      let buffer = Buffer.from(await file.arrayBuffer());
      let contentType = file.type || "video/mp4";
      let videoName = safeName;

      if (isWebm) {
        try {
          buffer = Buffer.from(await convertToMp4(buffer));
          contentType = "video/mp4";
          videoName = `chat/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.mp4`;
        } catch (err) {
          console.error("Error convirtiendo video webm a mp4:", err);
          return NextResponse.json({ error: "No se pudo procesar el video. WhatsApp requiere MP4." }, { status: 400 });
        }
      }

      const blob = await put(videoName, buffer, {
        access: "public",
        contentType,
      });
      return NextResponse.json({ url: blob.url, filename: "" });
    }

    if (type === "audio") {
      if (file.size > LIMITS.audio) {
        return NextResponse.json(
          { error: `El audio no debe superar ${LIMITS.audio / 1024 / 1024}MB` },
          { status: 413 }
        );
      }
      const isWebm = file.type?.includes("webm") || file.name?.toLowerCase().endsWith(".webm");
      const isOgg = file.type?.includes("ogg") || file.name?.toLowerCase().endsWith(".ogg");
      const isMp3 = file.type?.includes("mpeg") || file.name?.toLowerCase().endsWith(".mp3");

      let buffer = Buffer.from(await file.arrayBuffer());
      let contentType = file.type || "audio/ogg";
      let finalExt = ext;

      // WhatsApp API: OGG/Opus y MP3 soportados. WebM NO. Convertir webm a ogg.
      if (isWebm) {
        try {
          buffer = Buffer.from(await convertToOgg(buffer));
          contentType = "audio/ogg";
          finalExt = "ogg";
        } catch (err) {
          console.error("Error convirtiendo webm a ogg:", err);
          return NextResponse.json({ error: "No se pudo convertir el audio. Usa formato OGG o MP3." }, { status: 400 });
        }
      } else if (isMp3) {
        contentType = "audio/mpeg";
        finalExt = "mp3";
      } else if (isOgg) {
        contentType = "audio/ogg";
        finalExt = "ogg";
      } else {
        try {
          buffer = Buffer.from(await convertToOgg(buffer));
          contentType = "audio/ogg";
          finalExt = "ogg";
        } catch {
          return NextResponse.json({ error: "Formato de audio no soportado. Usa OGG, MP3 o graba con el micrófono." }, { status: 400 });
        }
      }

      const audioName = `chat/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${finalExt}`;
      const blob = await put(audioName, buffer, {
        access: "public",
        contentType,
      });
      return NextResponse.json({ url: blob.url, filename: "" });
    }

    if (type === "document") {
      if (file.size > LIMITS.document) {
        return NextResponse.json(
          { error: `El documento no debe superar ${LIMITS.document / 1024 / 1024}MB` },
          { status: 413 }
        );
      }
      const blob = await put(safeName, file, {
        access: "public",
        contentType: file.type || "application/octet-stream",
      });
      return NextResponse.json({ url: blob.url, filename: "" });
    }

    return NextResponse.json({ error: "Tipo de archivo no soportado" }, { status: 400 });
  } catch (e) {
    console.error("Upload error:", e);
    return NextResponse.json({ error: "Error al subir archivo" }, { status: 500 });
  }
}

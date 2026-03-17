import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

/** Límites exactos WhatsApp API: documento 100MB, imagen 5MB, video 16MB, audio 16MB, sticker 0.5MB */
const DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "application/octet-stream",
];
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/3gpp", "video/x-m4v"];
const AUDIO_TYPES = ["audio/mpeg", "audio/mp4", "audio/ogg", "audio/aac", "audio/webm", "audio/x-m4a", "audio/amr"];

const MAX_DOCUMENT = 100 * 1024 * 1024;
const MAX_IMAGE = 5 * 1024 * 1024;
const MAX_VIDEO = 16 * 1024 * 1024;
const MAX_AUDIO = 16 * 1024 * 1024;

/**
 * Client upload para chat: documento, video, audio, imagen (cuando > 4.5MB).
 * Evita el límite de 4.5MB de Vercel: el archivo va directo del navegador a Blob.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const ext = pathname.split(".").pop()?.toLowerCase() || "";
        const isVideo = /^(mp4|mov|webm|3gp|m4v)$/.test(ext);
        const isAudio = /^(mp3|m4a|ogg|aac|webm|amr)$/.test(ext);
        const isImage = /^(jpg|jpeg|png|webp)$/.test(ext);
        const isDoc = /^(pdf|doc|docx|xls|xlsx|ppt|pptx|txt)$/.test(ext);

        let allowedContentTypes: string[];
        let maximumSizeInBytes: number;

        if (isVideo) {
          allowedContentTypes = VIDEO_TYPES;
          maximumSizeInBytes = MAX_VIDEO;
        } else if (isAudio) {
          allowedContentTypes = AUDIO_TYPES;
          maximumSizeInBytes = MAX_AUDIO;
        } else if (isImage) {
          allowedContentTypes = IMAGE_TYPES;
          maximumSizeInBytes = MAX_IMAGE;
        } else if (isDoc) {
          allowedContentTypes = DOCUMENT_TYPES;
          maximumSizeInBytes = MAX_DOCUMENT;
        } else {
          allowedContentTypes = [...DOCUMENT_TYPES, ...IMAGE_TYPES, ...VIDEO_TYPES, ...AUDIO_TYPES];
          maximumSizeInBytes = MAX_DOCUMENT;
        }

        return {
          allowedContentTypes,
          maximumSizeInBytes,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: session.id }),
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("POST /api/chat/blob-upload error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}

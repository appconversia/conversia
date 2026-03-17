"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<void> | null = null;

async function loadFfmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadPromise) {
    await loadPromise;
    return ffmpegInstance!;
  }
  loadPromise = (async () => {
    const ffmpeg = new FFmpeg();
    const baseURL = typeof window !== "undefined" ? window.location.origin : "";
    const corePath = `${baseURL}/ffmpeg-core/ffmpeg-core.js`;
    const wasmPath = `${baseURL}/ffmpeg-core/ffmpeg-core.wasm`;
    await ffmpeg.load({
      coreURL: await toBlobURL(corePath, "text/javascript"),
      wasmURL: await toBlobURL(wasmPath, "application/wasm"),
    });
    ffmpegInstance = ffmpeg;
  })();
  await loadPromise;
  return ffmpegInstance!;
}

/** Convierte blob WebM a OGG en el navegador. Usar solo para audio webm. */
export async function convertWebmToOggInBrowser(webmBlob: Blob): Promise<Blob> {
  const ffmpeg = await loadFfmpeg();
  const inputData = new Uint8Array(await webmBlob.arrayBuffer());
  await ffmpeg.writeFile("input.webm", inputData);
  await ffmpeg.exec([
    "-i", "input.webm",
    "-vn",
    "-c:a", "libvorbis",
    "-q:a", "6",
    "output.ogg",
  ]);
  const data = await ffmpeg.readFile("output.ogg");
  await ffmpeg.deleteFile("input.webm");
  await ffmpeg.deleteFile("output.ogg");
  const raw = data instanceof Uint8Array ? data : new Uint8Array(data as unknown as ArrayBuffer);
  const copy = new Uint8Array(raw.length);
  copy.set(raw);
  return new Blob([copy], { type: "audio/ogg" });
}

/** Convierte blob WebM a MP4 en el navegador. Usar solo para webm. */
export async function convertWebmToMp4InBrowser(webmBlob: Blob): Promise<Blob> {
  const ffmpeg = await loadFfmpeg();
  const inputData = new Uint8Array(await webmBlob.arrayBuffer());
  await ffmpeg.writeFile("input.webm", inputData);
  await ffmpeg.exec([
    "-i", "input.webm",
    "-vf", "scale=640:-2",
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-crf", "28",
    "-c:a", "aac",
    "-b:a", "96k",
    "-movflags", "+faststart",
    "output.mp4",
  ]);
  const data = await ffmpeg.readFile("output.mp4");
  await ffmpeg.deleteFile("input.webm");
  await ffmpeg.deleteFile("output.mp4");
  const raw = data instanceof Uint8Array ? data : new Uint8Array(data as unknown as ArrayBuffer);
  const copy = new Uint8Array(raw.length);
  copy.set(raw);
  return new Blob([copy], { type: "video/mp4" });
}

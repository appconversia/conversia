import { spawn } from "child_process";
import ffmpegStatic from "ffmpeg-static";
import fs from "fs";
import path from "path";
import os from "os";

/** Convierte audio webm a OGG/Opus para WhatsApp API. Usa spawn para compatibilidad con Vercel. */
export async function convertToOgg(inputBuffer: Buffer): Promise<Buffer> {
  const ffmpegPath = ffmpegStatic as string | null;
  if (!ffmpegPath) {
    throw new Error("FFmpeg no disponible");
  }

  const tmpDir = os.tmpdir();
  const inputPath = path.join(tmpDir, `audio-in-${Date.now()}-${Math.random().toString(36).slice(2)}.webm`);
  const outputPath = path.join(tmpDir, `audio-out-${Date.now()}-${Math.random().toString(36).slice(2)}.ogg`);

  try {
    fs.writeFileSync(inputPath, inputBuffer);

    await new Promise<void>((resolve, reject) => {
      const proc = spawn(ffmpegPath, [
        "-y",
        "-i", inputPath,
        "-c:a", "libopus",
        "-b:a", "64k",
        outputPath,
      ], { stdio: ["ignore", "pipe", "pipe"] });

      let stderr = "";
      proc.stderr?.on("data", (d: Buffer) => { stderr += d.toString(); });
      proc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg exit ${code}: ${stderr.slice(-500)}`));
      });
      proc.on("error", reject);
    });

    return fs.readFileSync(outputPath);
  } finally {
    try { fs.unlinkSync(inputPath); } catch { /* ignore */ }
    try { fs.unlinkSync(outputPath); } catch { /* ignore */ }
  }
}

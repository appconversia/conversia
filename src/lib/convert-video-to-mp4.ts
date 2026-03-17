import { spawn } from "child_process";
import ffmpegStatic from "ffmpeg-static";
import fs from "fs";
import path from "path";
import os from "os";

/** Convierte video webm a MP4/H.264 para WhatsApp API. */
export async function convertToMp4(inputBuffer: Buffer): Promise<Buffer> {
  const ffmpegPath = ffmpegStatic as string | null;
  if (!ffmpegPath) {
    throw new Error("FFmpeg no disponible");
  }

  const tmpDir = os.tmpdir();
  const inputPath = path.join(tmpDir, `video-in-${Date.now()}-${Math.random().toString(36).slice(2)}.webm`);
  const outputPath = path.join(tmpDir, `video-out-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`);

  try {
    fs.writeFileSync(inputPath, inputBuffer);

    await new Promise<void>((resolve, reject) => {
      const proc = spawn(ffmpegPath, [
        "-y",
        "-i", inputPath,
        "-c:v", "libx264",
        "-c:a", "aac",
        "-movflags", "+faststart",
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

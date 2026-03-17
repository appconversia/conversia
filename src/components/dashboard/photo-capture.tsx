"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface PhotoCaptureProps {
  onSend: (blob: Blob) => void | Promise<void>;
  onCancel: () => void;
}

export function PhotoCapture({ onSend, onCancel }: PhotoCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startCamera = useCallback(async () => {
    try {
      // "user" = cámara frontal (funciona en desktop). "environment" = trasera (móvil).
      const constraints: MediaStreamConstraints = {
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };
      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = mediaStream;
      setStream(mediaStream);
    } catch (err) {
      console.error("Error al acceder a la cámara:", err);
      alert("No se puede acceder a la cámara. Verifica los permisos.");
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [startCamera]);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !stream || video.readyState !== 4) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
          stream.getTracks().forEach((t) => t.stop());
          setStream(null);
        }
      },
      "image/jpeg",
      0.85
    );
  }, [stream]);

  const sendPhoto = useCallback(async () => {
    if (!capturedBlob) return;
    await onSend(capturedBlob);
  }, [capturedBlob, onSend]);

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
      <div className="relative aspect-video max-w-[320px] overflow-hidden rounded-lg bg-black">
        {capturedBlob ? (
          <img
            src={URL.createObjectURL(capturedBlob)}
            alt="Foto capturada"
            className="h-full w-full object-contain"
          />
        ) : stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-white/60">
            <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 13v4a2 2 0 01-2 2H7a2 2 0 01-2-2v-4M14 9h4" />
            </svg>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="flex items-center justify-center gap-2">
        {capturedBlob ? (
          <>
            <button
              type="button"
              onClick={() => { setCapturedBlob(null); startCamera(); }}
              className="rounded-full p-2 text-[#667781] hover:bg-[#E9EDEF] hover:text-[#111B21]"
              aria-label="Tomar otra"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              type="button"
              onClick={sendPhoto}
              className="flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-white hover:bg-[#20bd5a]"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
              Enviar foto
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full p-2 text-[#667781] hover:bg-[#E9EDEF] hover:text-[#111B21]"
              aria-label="Cancelar"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {stream && (
              <button
                type="button"
                onClick={capturePhoto}
                className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-[#25D366] shadow-lg hover:bg-[#20bd5a]"
                aria-label="Tomar foto"
              >
                <span className="h-10 w-10 rounded-full bg-white" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

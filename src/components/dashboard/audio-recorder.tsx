"use client";

import { useState, useRef, useCallback } from "react";
import OpusMediaRecorder from "opus-media-recorder";

interface AudioRecorderProps {
  onSend: (blob: Blob) => void | Promise<void>;
  onCancel: () => void;
}

const workerOptions = typeof window !== "undefined" ? {
  encoderWorkerFactory: () => new Worker("/opus-media-recorder/encoderWorker.umd.js"),
  OggOpusEncoderWasmPath: "/opus-media-recorder/OggOpusEncoder.wasm",
  WebMOpusEncoderWasmPath: "/opus-media-recorder/WebMOpusEncoder.wasm",
} : undefined;

export function AudioRecorder({ onSend, onCancel }: AudioRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let recorder: MediaRecorder;
      if (workerOptions) {
        recorder = new OpusMediaRecorder(stream, { mimeType: "audio/ogg" }, workerOptions);
      } else {
        const mimeType = MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
          ? "audio/ogg;codecs=opus"
          : "audio/webm;codecs=opus";
        recorder = new MediaRecorder(stream, { mimeType });
      }
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        if (chunksRef.current.length > 0) {
          const mimeType = workerOptions ? "audio/ogg" : "audio/webm";
          const blob = new Blob(chunksRef.current, { type: mimeType });
          setRecordedBlob(blob);
        }
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start(100);
      setRecording(true);
      setRecordedBlob(null);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => Math.min(d + 1, 600));
      }, 1000);
    } catch (err) {
      console.error("Error al acceder al micrófono:", err);
      alert("No se puede acceder al micrófono. Verifica los permisos.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
  }, []);

  const sendRecording = useCallback(async () => {
    const blob = recordedBlob;
    if (!blob) return;
    await onSend(blob);
  }, [recordedBlob, onSend]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
      {recording ? (
        <>
          <button
            type="button"
            onClick={stopRecording}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
            aria-label="Detener grabación"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </button>
          <div className="flex-1 flex items-center gap-2">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-sm font-medium text-[#111B21]">{formatTime(duration)}</span>
          </div>
        </>
      ) : recordedBlob ? (
        <>
          <button
            type="button"
            onClick={() => {
              setRecordedBlob(null);
              setDuration(0);
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#667781] hover:bg-[#E9EDEF] hover:text-[#111B21]"
            aria-label="Descartar"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex-1 flex items-center gap-2">
            <span className="text-sm text-[#111B21]">Nota de voz {formatTime(duration)}</span>
          </div>
          <button
            type="button"
            onClick={sendRecording}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-conversia-primary text-white hover:bg-conversia-primary-hover"
            aria-label="Enviar"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#667781] hover:bg-[#E9EDEF] hover:text-[#111B21]"
            aria-label="Cancelar"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex-1 text-center">
            <button
              type="button"
              onClick={startRecording}
              className="flex items-center justify-center gap-2 rounded-full bg-conversia-primary px-6 py-2.5 text-white hover:bg-conversia-primary-hover"
            >
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
              </svg>
              <span className="font-medium">Grabar nota de voz</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

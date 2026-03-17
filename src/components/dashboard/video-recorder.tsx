"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";

function VideoPreview({ blob }: { blob: Blob }) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    <video
      key={url}
      src={url}
      controls
      playsInline
      preload="metadata"
      className="h-full w-full object-contain"
    />
  );
}

interface VideoRecorderProps {
  onSend: (blob: Blob) => void | Promise<void>;
  onCancel: () => void;
  sending?: boolean;
}

export function VideoRecorder({ onSend, onCancel, sending = false }: VideoRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (stream && recording && videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = stream;
      videoPreviewRef.current.muted = true;
    }
  }, [stream, recording]);

  const startRecording = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      setStream(mediaStream);

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm")
          ? "video/webm"
          : "video/mp4";

      const recorder = new MediaRecorder(mediaStream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          setRecordedBlob(blob);
        }
        mediaStream.getTracks().forEach((t) => t.stop());
        setStream(null);
      };

      recorder.start(100);
      setRecording(true);
      setRecordedBlob(null);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => Math.min(d + 1, 600));
      }, 1000);
    } catch (err) {
      console.error("Error al acceder a cámara/micrófono:", err);
      alert("No se puede acceder a la cámara o micrófono. Verifica los permisos.");
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
    if (!blob || sending) return;
    try {
      await onSend(blob);
    } catch (err) {
      console.error("Error en sendRecording:", err);
    }
  }, [recordedBlob, onSend, sending]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
      <div className="relative aspect-video max-w-[320px] overflow-hidden rounded-lg bg-black">
        {recording && (
          <video
            ref={videoPreviewRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
        )}
        {recordedBlob && (
          <VideoPreview blob={recordedBlob} />
        )}
        {!recording && !recordedBlob && (
          <div className="flex h-full items-center justify-center text-white/60">
            <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {recording && (
          <div className="absolute left-2 top-2 flex items-center gap-2 rounded bg-black/60 px-2 py-1 text-sm text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            {formatTime(duration)}
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-2">
        {recording ? (
          <button
            type="button"
            onClick={stopRecording}
            className="flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-white hover:bg-red-600"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
            Detener
          </button>
        ) : recordedBlob ? (
          <>
            <button
              type="button"
              onClick={() => { setRecordedBlob(null); setDuration(0); }}
              className="rounded-full p-2 text-[#667781] hover:bg-[#E9EDEF] hover:text-[#111B21]"
              aria-label="Descartar"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button
              type="button"
              onClick={sendRecording}
              disabled={sending}
              className="flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-white hover:bg-[#20bd5a] disabled:opacity-70 disabled:cursor-wait"
            >
              {sending ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Convirtiendo...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                  Enviar video
                </>
              )}
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
            <button
              type="button"
              onClick={startRecording}
              className="flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-white hover:bg-[#20bd5a]"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Grabar video
            </button>
          </>
        )}
      </div>
    </div>
  );
}

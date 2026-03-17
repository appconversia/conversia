"use client";

import { useState } from "react";

interface MediaViewerProps {
  type: "image" | "video" | "audio" | "document" | "sticker";
  url: string;
  filename?: string | null;
  isSent?: boolean;
}

function DownloadButton({ url, filename, label }: { url: string; filename?: string | null; label: string }) {
  return (
    <a
      href={url}
      download={filename || "archivo"}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-[#075E54] hover:bg-[#25D366]/20 transition"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      {label}
    </a>
  );
}

export function MediaViewer({ type, url, filename }: MediaViewerProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (type === "image" || type === "sticker") {
    return (
      <>
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="block rounded overflow-hidden mb-1 focus:outline-none focus:ring-2 focus:ring-[#25D366]"
        >
          <img
            src={url}
            alt={filename || (type === "sticker" ? "Sticker" : "Imagen")}
            className={`object-cover cursor-pointer hover:opacity-95 transition ${type === "sticker" ? "max-w-[120px] max-h-[120px]" : "max-w-[280px] max-h-[200px]"}`}
          />
        </button>
        <div className="flex items-center gap-2 mb-1">
          <DownloadButton url={url} filename={filename} label="Descargar" />
        </div>
        {lightboxOpen && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
            onClick={() => setLightboxOpen(false)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Escape" && setLightboxOpen(false)}
            aria-label="Cerrar visor"
          >
            <img
              src={url}
              alt={filename || "Ampliado"}
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <a
              href={url}
              download={filename || "archivo"}
              className="absolute top-4 right-14 rounded-full p-2 text-white hover:bg-white/20"
              aria-label="Descargar"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 rounded-full p-2 text-white hover:bg-white/20"
              aria-label="Cerrar"
            >
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </>
    );
  }

  if (type === "video") {
    return (
      <div className="rounded overflow-hidden mb-1 bg-black">
        <video
          src={url}
          controls
          playsInline
          className="max-w-[280px] max-h-[240px] w-full"
          preload="metadata"
        >
          Tu navegador no soporta video.
        </video>
        <div className="flex items-center gap-2 mt-1">
          <DownloadButton url={url} filename={filename} label="Descargar video" />
        </div>
      </div>
    );
  }

  if (type === "audio") {
    return (
      <div className="flex flex-col gap-1 mb-1">
        <div className="flex items-center gap-3 rounded-lg bg-[#25D366]/10 px-3 py-2 min-w-[200px]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
          <audio
            src={url}
            controls
            className="flex-1 h-10 max-w-full"
            preload="metadata"
          >
            Tu navegador no soporta audio.
          </audio>
        </div>
        <DownloadButton url={url} filename={filename} label="Descargar audio" />
      </div>
    );
  }

  if (type === "document") {
    const isPdf = (filename || url).toLowerCase().endsWith(".pdf");
    return (
      <div className="mb-1">
        {isPdf ? (
          <div className="rounded border border-gray-200 overflow-hidden bg-white">
            <iframe
              src={`${url}#toolbar=1`}
              title={filename || "PDF"}
              className="w-full h-[320px] max-w-[280px] border-0"
            />
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block py-2 text-center text-sm text-[#075E54] hover:underline"
            >
              Abrir PDF en nueva pestaña
            </a>
          </div>
        ) : (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#111B21] hover:bg-gray-50"
          >
            <span className="text-xl">📎</span>
            <span>{filename || "Descargar archivo"}</span>
          </a>
        )}
      </div>
    );
  }

  return null;
}

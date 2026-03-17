"use client";

/**
 * Adjuntos compatibles con WhatsApp Cloud API (feb 2026):
 * - Documento: pdf, doc, docx, xls, xlsx, ppt, pptx, txt (hasta 100MB)
 * - Imagen: jpeg, png (hasta 5MB)
 * - Video: mp4, 3gp (hasta 16MB)
 * - Audio: aac, amr, mp3, m4a, ogg (hasta 16MB)
 * - Sticker: webp (animado 500KB, estático 100KB)
 */
export type AttachmentType = "document" | "image" | "video" | "audio" | "sticker";

const OPTIONS: { type: AttachmentType; label: string; icon: string; accept: string; maxMB: number }[] = [
  { type: "document", label: "Documento", icon: "📄", accept: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt", maxMB: 100 },
  { type: "image", label: "Imagen", icon: "🖼️", accept: "image/jpeg,image/png,.jpg,.jpeg,.png", maxMB: 5 },
  { type: "video", label: "Video", icon: "🎬", accept: "video/mp4,video/3gpp,video/webm,.mp4,.3gp,.webm", maxMB: 16 },
  { type: "audio", label: "Audio (archivo)", icon: "🎵", accept: "audio/aac,audio/amr,audio/mpeg,audio/mp4,audio/ogg,audio/webm,.aac,.amr,.mp3,.m4a,.ogg,.webm", maxMB: 16 },
  { type: "sticker", label: "Sticker", icon: "🎭", accept: "image/webp,.webp", maxMB: 0.5 },
];

interface AttachmentsMenuProps {
  onSelect: (type: AttachmentType, file: File) => void;
  onRecordVoice?: () => void;
  onTakePhoto?: () => void;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLButtonElement | null>;
}

export function AttachmentsMenu({ onSelect, onRecordVoice, onTakePhoto, onClose }: AttachmentsMenuProps) {
  const handleFile = (type: AttachmentType, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const opt = OPTIONS.find((o) => o.type === type);
    if (opt && file.size > opt.maxMB * 1024 * 1024) {
      alert(`El archivo no debe superar ${opt.maxMB}MB`);
      return;
    }
    onSelect(type, file);
    onClose();
    e.target.value = "";
  };

  return (
    <div className="absolute bottom-full left-0 mb-2 w-64 rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
      <p className="mb-2 px-2 text-xs font-medium text-[#667781]">Adjuntar (WhatsApp API)</p>
      {onRecordVoice && (
        <button
          type="button"
          onClick={() => {
            onRecordVoice();
            onClose();
          }}
          className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[#F0F2F5] transition"
        >
          <span className="text-2xl">🎤</span>
          <div>
            <p className="text-sm font-medium text-[#111B21]">Nota de voz</p>
            <p className="text-xs text-[#667781]">Grabar y enviar audio</p>
          </div>
        </button>
      )}
      {onTakePhoto && (
        <button
          type="button"
          onClick={() => {
            onTakePhoto();
            onClose();
          }}
          className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[#F0F2F5] transition"
        >
          <span className="text-2xl">📷</span>
          <div>
            <p className="text-sm font-medium text-[#111B21]">Tomar foto</p>
            <p className="text-xs text-[#667781]">Capturar con cámara</p>
          </div>
        </button>
      )}
      <div className="space-y-0.5 mt-1">
        {OPTIONS.map((opt) => (
          <label
            key={opt.type}
            className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-[#F0F2F5] transition"
          >
            <input
              type="file"
              accept={opt.accept}
              className="hidden"
              onChange={(e) => handleFile(opt.type, e)}
            />
            <span className="text-2xl">{opt.icon}</span>
            <div>
              <p className="text-sm font-medium text-[#111B21]">{opt.label}</p>
              <p className="text-xs text-[#667781]">max {opt.maxMB}MB</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

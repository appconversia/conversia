"use client";

import { useEffect } from "react";

type ToastProps = {
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
  autoClose?: number;
};

export function Toast({ message, type, onClose, autoClose = 4000 }: ToastProps) {
  useEffect(() => {
    if (autoClose > 0) {
      const t = setTimeout(onClose, autoClose);
      return () => clearTimeout(t);
    }
  }, [autoClose, onClose]);

  const bg =
    type === "success"
      ? "bg-conversia-primary text-white"
      : type === "error"
        ? "bg-red-600 text-white"
        : "bg-conversia-dark text-white";

  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] rounded-lg px-4 py-3 shadow-lg ${bg} text-sm font-medium`}
    >
      {message}
      <button
        type="button"
        onClick={onClose}
        className="ml-3 inline-block opacity-80 hover:opacity-100"
        aria-label="Cerrar"
      >
        ×
      </button>
    </div>
  );
}

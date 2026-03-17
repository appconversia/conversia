"use client";

export function MobileSidebarOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
      aria-label="Cerrar menú"
    />
  );
}

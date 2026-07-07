"use client";

import { useEffect } from "react";

type Attachment = {
  id: string;
  publicUrl: string;
  contentType: string;
  caption?: string | null;
};

interface Props {
  isOpen: boolean;
  attachments: Attachment[];
  index: number;
  title?: string;
  tuning?: string;
  capo?: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function FullscreenMediaViewer({ isOpen, attachments, index, title, tuning, capo, onClose, onPrev, onNext }: Props) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose, onPrev, onNext]);

  if (!isOpen) return null;
  const attachment = attachments[index];
  if (!attachment) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white" style={{ touchAction: "none" }}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="space-y-0">
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-slate-300">{tuning || ""} {capo ? `· Capo ${capo}` : ""}</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onPrev} className="rounded-lg bg-white/10 px-3 py-2">◀</button>
          <button onClick={onNext} className="rounded-lg bg-white/10 px-3 py-2">▶</button>
          <button onClick={onClose} className="rounded-lg bg-white/10 px-3 py-2">Close</button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        {attachment.contentType.startsWith("image/") ? (
          // object-fit: contain behaviour
          <img src={attachment.publicUrl} alt={attachment.caption || title || "media"} className="max-h-[100vh] max-w-full object-contain" style={{ maxHeight: '100%' }} />
        ) : (
          <iframe src={attachment.publicUrl} className="w-full h-full" title={attachment.caption || "document"} />
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-3 text-sm text-slate-300">
        <div>{attachment.caption}</div>
        <div>{index + 1} / {attachments.length}</div>
      </div>
    </div>
  );
}

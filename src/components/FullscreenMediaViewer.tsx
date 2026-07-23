"use client";

import { useEffect } from "react";
import { Icons } from "./Icons";

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

const isImageAttachment = (attachment: Attachment) =>
  attachment.contentType?.startsWith("image/") || /\.(avif|gif|jpe?g|png|svg|webp)(?:[?#]|$)/i.test(attachment.publicUrl);

const isPdfAttachment = (attachment: Attachment) =>
  attachment.contentType?.toLowerCase() === "application/pdf" || /\.pdf(?:[?#]|$)/i.test(attachment.publicUrl);

const buildPdfViewerUrl = (url: string) => `${url}${url.includes("#") ? "&" : "#"}view=FitH`;

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
  const imageAttachment = isImageAttachment(attachment);
  const pdfAttachment = isPdfAttachment(attachment);

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
        {imageAttachment ? (
          // object-fit: contain behaviour
          <img src={attachment.publicUrl} alt={attachment.caption || title || "media"} className="max-h-[100vh] max-w-full object-contain" style={{ maxHeight: '100%' }} />
        ) : pdfAttachment ? (
          <div className="flex h-full w-full max-w-6xl flex-col gap-3 py-2">
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
              <span className="inline-flex items-center gap-2 font-medium">
                <Icons.Document className="h-4 w-4" />
                PDF preview
              </span>
              <a
                href={attachment.publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
              >
                Open in new tab
              </a>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl">
              <iframe
                src={buildPdfViewerUrl(attachment.publicUrl)}
                className="h-full w-full"
                title={attachment.caption || "PDF document"}
              />
            </div>
            <p className="text-center text-xs text-slate-400">
              Rendered natively so high-resolution PDF pages stay sharp.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-6 py-8 text-center">
            <Icons.Document className="h-10 w-10 text-slate-300" />
            <div>
              <div className="text-base font-semibold text-white">{attachment.caption || title || "Document"}</div>
              <div className="mt-1 text-sm text-slate-300">{attachment.contentType || "Document attachment"}</div>
            </div>
            <a
              href={attachment.publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Open document
            </a>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-3 text-sm text-slate-300">
        <div>{attachment.caption}</div>
        <div>{index + 1} / {attachments.length}</div>
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import { useEffect, useState, useRef, useMemo } from "react";
import { saveLocalNotes, getLocalNotes } from "@/lib/notes-store";
import { syncPendingNotes } from "@/lib/notes-sync";
import { useAuth } from "./AuthProvider";
import { useToast } from "./ToastContainer";

type PhotoNote = {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

const PHOTO_EXPORT_WIDTH = 1400;
const PHOTO_EXPORT_HEIGHT = 933;

export function PhotoAnnotationEditor({ onExport, persistId }: { onExport: (blob: Blob) => void; persistId?: string | null }) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const photoImageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{
    kind: "photo" | "note";
    id?: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string>("");
  const [photoNatural, setPhotoNatural] = useState({ width: 0, height: 0 });
  const [photoPos, setPhotoPos] = useState({ x: 24, y: 24 });
  const [photoScale, setPhotoScale] = useState(1);
  const [notes, setNotes] = useState<PhotoNote[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const { getAccessToken } = useAuth();
  const toast = useToast();
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const updateSize = () => {
      const el = stageRef.current;
      if (!el) return;
      setStageSize({ width: el.clientWidth, height: el.clientHeight });
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    if (!photoUrl) {
      photoImageRef.current = null;
      return;
    }

    const img = document.createElement("img") as HTMLImageElement;
    img.onload = () => {
      photoImageRef.current = img;
      setPhotoNatural({ width: img.naturalWidth, height: img.naturalHeight });
      setPhotoScale(1);
      setPhotoPos({ x: 24, y: 24 });
    };
    img.src = photoUrl;

    return () => {
      photoImageRef.current = null;
    };
  }, [photoUrl]);

  // Load persisted notes if provided
  useEffect(() => {
    if (!persistId) return;
    let mounted = true;
    (async () => {
      try {
        const rec = await getLocalNotes(persistId);
        if (!rec || !mounted) return;
        const data = JSON.parse(rec.notesJson);
        if (data.photoUrl) setPhotoUrl(data.photoUrl);
        if (data.photoName) setPhotoName(data.photoName);
        if (data.photoNatural) setPhotoNatural(data.photoNatural);
        if (data.photoPos) setPhotoPos(data.photoPos);
        if (data.photoScale) setPhotoScale(data.photoScale);
        if (Array.isArray(data.notes)) setNotes(data.notes);
      } catch (e) {
        console.debug("loadLocalNotes failed", e);
      }
    })();
    return () => { mounted = false; };
  }, [persistId]);

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  const photoBox = useMemo(() => {
    if (!photoUrl || !photoNatural.width || !photoNatural.height || !stageSize.width || !stageSize.height) {
      return null;
    }

    const fitWidth = Math.max(260, stageSize.width * 0.72);
    const scale = Math.min(1, fitWidth / photoNatural.width) * photoScale;
    const width = photoNatural.width * scale;
    const height = photoNatural.height * scale;

    return { x: photoPos.x, y: photoPos.y, width, height };
  }, [photoUrl, photoNatural, stageSize, photoScale, photoPos]);

  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

  const updatePhotoFromPointer = (clientX: number, clientY: number) => {
    const drag = dragRef.current;
    const stage = stageRef.current?.getBoundingClientRect();
    if (!drag || !stage || drag.kind !== "photo" || !photoBox) return;
    const nextX = clamp(clientX - stage.left - drag.offsetX, -photoBox.width * 0.45, stage.width - photoBox.width * 0.15);
    const nextY = clamp(clientY - stage.top - drag.offsetY, -photoBox.height * 0.45, stage.height - photoBox.height * 0.15);
    setPhotoPos({ x: nextX, y: nextY });
  };

  const updateNoteFromPointer = (clientX: number, clientY: number) => {
    const drag = dragRef.current;
    const stage = stageRef.current?.getBoundingClientRect();
    if (!drag || !stage || drag.kind !== "note" || !drag.id) return;
    const nextX = clientX - stage.left - drag.offsetX;
    const nextY = clientY - stage.top - drag.offsetY;
    setNotes((prev) => prev.map((note) => {
      if (note.id !== drag.id) return note;
      return {
        ...note,
        x: clamp(nextX, -40, stage.width - note.width + 40),
        y: clamp(nextY, -20, stage.height - note.height + 20),
      };
    }));
  };

  const handlePhotoFile = (file: File | null) => {
    if (!file) return;
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    const nextUrl = URL.createObjectURL(file);
    setPhotoUrl(nextUrl);
    setPhotoName(file.name);
    setNotes([]);
    setSelectedNoteId(null);
  };

  const addNote = () => {
    const stage = stageRef.current?.getBoundingClientRect();
    const width = 210;
    const height = 110;
    const x = stage ? Math.max(16, stage.width / 2 - width / 2) : 32;
    const y = stage ? Math.max(16, stage.height / 2 - height / 2) : 32;
    const id = crypto.randomUUID();
    setNotes((prev) => [...prev, { id, text: "Nieuwe notitie", x, y, width, height }]);
    setSelectedNoteId(id);
  };

  const clearAll = () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(null);
    setPhotoName("");
    setPhotoNatural({ width: 0, height: 0 });
    setPhotoPos({ x: 24, y: 24 });
    setPhotoScale(1);
    setNotes([]);
    setSelectedNoteId(null);
  };

  // Persist whenever notes or photo state changes
  useEffect(() => {
    if (!persistId) return;
    const payload = {
      photoUrl,
      photoName,
      photoNatural,
      photoPos,
      photoScale,
      notes,
    };
    try {
      saveLocalNotes(persistId, JSON.stringify(payload)).catch((e) => console.debug(e));
    } catch (e) {
      console.debug(e);
    }
  }, [persistId, photoUrl, photoName, photoNatural, photoPos, photoScale, notes]);

  // Auto sync when back online
  useEffect(() => {
    if (!persistId) return;
    const onOnline = async () => {
      setIsSyncing(true);
      try {
        const result = await syncPendingNotes(getAccessToken);
        if (result && result.synced) toast?.success?.(`${result.synced} notes synced`);
      } finally {
        setIsSyncing(false);
      }
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [persistId, getAccessToken, toast]);

  const exportAnnotatedPhoto = async () => {
    if (!photoImageRef.current || !photoBox) return;

    const stageRect = stageRef.current?.getBoundingClientRect();
    const scaleX = stageRect ? PHOTO_EXPORT_WIDTH / stageRect.width : 1;
    const scaleY = stageRect ? PHOTO_EXPORT_HEIGHT / stageRect.height : 1;
    const canvas = document.createElement("canvas");
    canvas.width = PHOTO_EXPORT_WIDTH;
    canvas.height = PHOTO_EXPORT_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      photoImageRef.current,
      photoBox.x * scaleX,
      photoBox.y * scaleY,
      photoBox.width * scaleX,
      photoBox.height * scaleY
    );

    const roundRect = (x: number, y: number, width: number, height: number, radius: number) => {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    };

    const wrapText = (text: string, maxWidth: number) => {
      const words = text.split(/\s+/).filter(Boolean);
      const lines: string[] = [];
      let current = "";
      for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (ctx.measureText(candidate).width <= maxWidth) {
          current = candidate;
        } else {
          if (current) lines.push(current);
          current = word;
        }
      }
      if (current) lines.push(current);
      return lines.length ? lines : [""];
    };

    for (const note of notes) {
      const x = note.x * scaleX;
      const y = note.y * scaleY;
      const width = note.width * scaleX;
      const height = note.height * scaleY;
      ctx.fillStyle = "rgba(255, 248, 196, 0.95)";
      ctx.strokeStyle = "rgba(161, 98, 7, 0.75)";
      ctx.lineWidth = 2;
      roundRect(x, y, width, height, 14);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#111827";
      ctx.font = `${Math.max(14, 16 * scaleY)}px ui-sans-serif, system-ui, sans-serif`;
      const lines = wrapText(note.text, width - 22);
      const lineHeight = Math.max(18, 22 * scaleY);
      lines.slice(0, 5).forEach((line, index) => {
        ctx.fillText(line, x + 12, y + 24 + index * lineHeight);
      });
    }

    canvas.toBlob((blob) => {
      if (blob) onExport(blob);
    }, "image/webp", 0.92);
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Foto annoteren</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Sleep, schaal en zet notities op de foto.</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2.25 15a4.5 4.5 0 0 0 4.5 4.5h10.5a4.5 4.5 0 0 0 4.5-4.5V9a4.5 4.5 0 0 0-4.5-4.5h-1.19a2.25 2.25 0 0 1-1.6-.66l-.84-.84A2.25 2.25 0 0 0 12 2.25H9.19a2.25 2.25 0 0 0-1.6.66l-.84.84a2.25 2.25 0 0 1-1.6.66H4.5A2.25 2.25 0 0 0 2.25 6.75V15Z" />
              <path d="M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z" />
            </svg>
            <span>Foto kiezen</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoFile(e.target.files?.[0] ?? null)} />
          </label>
          <button
            type="button"
            onClick={addNote}
            disabled={!photoUrl}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <svg className="mr-2 inline-block h-4 w-4 align-[-2px] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Notitie toevoegen
          </button>
          {persistId && (
            <button
              type="button"
              onClick={async () => {
                setIsSyncing(true);
                try {
                  const res = await syncPendingNotes(getAccessToken);
                  toast?.success?.(`${res.synced} notes synced`);
                } catch (e) {
                  toast?.error?.("Sync failed");
                } finally {
                  setIsSyncing(false);
                }
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {isSyncing ? "Syncing…" : "Sync"}
            </button>
          )}
          <button
            type="button"
            onClick={clearAll}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <svg className="mr-2 inline-block h-4 w-4 align-[-2px] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4.5 6h15M9 6V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V6m-7.5 0 .75 12A1.5 1.5 0 0 0 9.74 19.5h4.52a1.5 1.5 0 0 0 1.49-1.5L16.5 6M10 10.5v6M14 10.5v6" />
            </svg>
            Wissen
          </button>
        </div>
      </div>

      {photoUrl && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950/40">
          <div className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">{photoName}</div>
          <label className="flex min-w-[220px] items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            Vergroten/verkleinen
            <input
              type="range"
              min="0.35"
              max="2.2"
              step="0.01"
              value={photoScale}
              onChange={(e) => setPhotoScale(Number(e.target.value))}
              className="w-full"
            />
          </label>
        </div>
      )}

      <div
        ref={stageRef}
        className="relative aspect-[4/3] overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white shadow-inner touch-none dark:border-slate-700 dark:bg-slate-950"
      >
        {!photoUrl ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Kies een foto om hem te verplaatsen, te schalen en er notities bovenop te zetten.
          </div>
        ) : (
          <>
            {photoBox && (
              <div
                onPointerDown={(e) => {
                  e.preventDefault();
                  const stage = stageRef.current?.getBoundingClientRect();
                  if (!stage) return;
                  dragRef.current = {
                    kind: "photo",
                    offsetX: e.clientX - stage.left - photoPos.x,
                    offsetY: e.clientY - stage.top - photoPos.y,
                  };
                  (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (dragRef.current?.kind === "photo") updatePhotoFromPointer(e.clientX, e.clientY);
                }}
                onPointerUp={() => {
                  dragRef.current = null;
                }}
                onPointerCancel={() => {
                  dragRef.current = null;
                }}
                className="absolute cursor-move select-none"
                style={{ left: photoBox.x, top: photoBox.y, width: photoBox.width, height: photoBox.height }}
              >
                <Image src={photoUrl} width={600} height={400} alt="Annotated photo" className="h-full w-full rounded-lg object-contain shadow-lg" draggable={false} />
              </div>
            )}

            {notes.map((note) => (
              <div
                key={note.id}
                onPointerDown={(e) => {
                  setSelectedNoteId(note.id);
                  const stage = stageRef.current?.getBoundingClientRect();
                  if (!stage) return;
                  dragRef.current = {
                    kind: "note",
                    id: note.id,
                    offsetX: e.clientX - stage.left - note.x,
                    offsetY: e.clientY - stage.top - note.y,
                  };
                  (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (dragRef.current?.kind === "note" && dragRef.current.id === note.id) updateNoteFromPointer(e.clientX, e.clientY);
                }}
                onPointerUp={() => {
                  dragRef.current = null;
                }}
                onPointerCancel={() => {
                  dragRef.current = null;
                }}
                className={`absolute rounded-xl border shadow-lg ${selectedNoteId === note.id ? "border-brand-500 ring-2 ring-brand-400/30" : "border-amber-500/60"}`}
                style={{ left: note.x, top: note.y, width: note.width, height: note.height, background: "rgba(255,248,196,0.96)" }}
              >
                <div className="flex items-center justify-between rounded-t-xl bg-amber-200/90 px-3 py-1 text-[11px] font-semibold text-amber-900">
                  <span>Notitie</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setNotes((prev) => prev.filter((item) => item.id !== note.id));
                    }}
                    className="rounded px-1.5 py-0.5 hover:bg-amber-300/60"
                  >
                    ×
                  </button>
                </div>
                <textarea
                  value={note.text}
                  onChange={(e) => setNotes((prev) => prev.map((item) => (item.id === note.id ? { ...item, text: e.target.value } : item)))}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="h-[calc(100%-28px)] w-full resize-none bg-transparent px-3 py-2 text-sm text-slate-900 outline-none"
                />
              </div>
            ))}
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={exportAnnotatedPhoto}
          disabled={!photoUrl}
          className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg className="mr-2 inline-block h-4 w-4 align-[-2px] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 16.5V18a2.25 2.25 0 0 0 2.25 2.25h13.5A2.25 2.25 0 0 0 21 18v-1.5M12 3v12m0 0-3.75-3.75M12 15l3.75-3.75" />
          </svg>
          Export annotatie
        </button>
      </div>
    </div>
  );
}

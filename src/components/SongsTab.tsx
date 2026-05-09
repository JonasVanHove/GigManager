"use client";

import Image from "next/image";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabaseClient } from "@/lib/supabase-client";
import { useAuth } from "./AuthProvider";
import { useSettings } from "./SettingsProvider";
import { useToast } from "./ToastContainer";
import { PhotoAnnotationEditor } from "./PhotoAnnotationEditor";
import { Icons } from "./Icons";

type AttachmentMeta = {
  storagePath: string;
  publicUrl: string;
  contentType: string;
  caption?: string | null;
};

type PhotoNote = {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type SongAttachment = AttachmentMeta & {
  id: string;
  caption?: string | null;
};

type SongRecord = {
  id: string;
  title: string;
  notes: string | null;
  attachments?: SongAttachment[];
  tags?: Array<{ id: string; name: string }>;
  bands?: Array<{ id: string; name: string }>;
};

const PHOTO_EXPORT_WIDTH = 1400;
const PHOTO_EXPORT_HEIGHT = 933;

function CanvasEditor({ onExport }: { onExport: (blob: Blob) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const historyRef = useRef<string[]>([]);
  const drawing = useRef(false);
  const [stylusOnly, setStylusOnly] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = Math.min(window.innerWidth * 0.9, 1200);
    canvas.height = Math.min(window.innerHeight * 0.45, 900);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#111827";
    ctxRef.current = ctx;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Save initial state
    try {
      historyRef.current.push(canvas.toDataURL("image/webp", 0.9));
    } catch {
      // ignore
    }
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (stylusOnly && e.pointerType !== "pen") return;
    drawing.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctxRef.current?.beginPath();
    ctxRef.current?.moveTo(x, y);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    if (stylusOnly && e.pointerType !== "pen") return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctxRef.current?.lineTo(x, y);
    ctxRef.current?.stroke();
  };
  const handlePointerUp = () => {
    drawing.current = false;
    ctxRef.current?.closePath();
    // push snapshot to history for undo
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const url = canvas.toDataURL("image/webp", 0.9);
      historyRef.current.push(url);
      // limit history
      if (historyRef.current.length > 30) historyRef.current.shift();
    } catch {
      // ignore
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas || !ctxRef.current) return;
    ctxRef.current.clearRect(0, 0, canvas.width, canvas.height);
    ctxRef.current.fillStyle = "#ffffff";
    ctxRef.current.fillRect(0, 0, canvas.width, canvas.height);
    try {
      historyRef.current.push(canvas.toDataURL("image/webp", 0.9));
    } catch {}
  };

  const exportImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return new Promise<void>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) onExport(blob);
        resolve();
      }, "image/webp", 0.9);
    });
  };

  const undo = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    // pop current state
    if (historyRef.current.length <= 1) return;
    historyRef.current.pop();
    const prev = historyRef.current[historyRef.current.length - 1];
    const img = document.createElement("img") as HTMLImageElement;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = prev;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Tablet & Stylus Modus</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Negeer vingers & handpalm om nauwkeuriger te tekenen.</div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <div className="relative">
            <input type="checkbox" checked={stylusOnly} onChange={(e) => setStylusOnly(e.target.checked)} className="sr-only peer" />
            <div className="block h-6 w-10 min-w-10 rounded-full bg-slate-200 transition-colors peer-checked:bg-brand-500 dark:bg-slate-700"></div>
            <div className="dot absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-4"></div>
          </div>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Actief</span>
        </label>
      </div>

      <div className="border border-slate-200 shadow-sm rounded-lg overflow-hidden dark:border-slate-700">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`w-full ${!stylusOnly ? 'touch-none' : ''}`}
        />
      </div>
      <div className="flex gap-2 justify-between">
        <div className="flex gap-2">
          <button type="button" onClick={clear} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Wissen</button>
          <button type="button" onClick={undo} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Undo</button>
        </div>
        <button type="button" onClick={exportImage} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-700">Notitie Opslaan</button>
      </div>
    </div>
  );
}

export default function SongsTab() {
  const { session, getAccessToken } = useAuth();
  const { locale } = useSettings();
  const toast = useToast();

  const [songs, setSongs] = useState<SongRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [availableBands, setAvailableBands] = useState<Array<{id:string,name:string}>>([]);
  const [selectedBandIds, setSelectedBandIds] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [attachmentsMeta, setAttachmentsMeta] = useState<AttachmentMeta[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [deletingAttachmentIds, setDeletingAttachmentIds] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [activeSong, setActiveSong] = useState<SongRecord | null>(null);
  const [performanceNotesDraft, setPerformanceNotesDraft] = useState("");
  const [performanceBaseNotes, setPerformanceBaseNotes] = useState("");
  const [savingPerformanceNotes, setSavingPerformanceNotes] = useState(false);
  const [autoSavingPerformanceNotes, setAutoSavingPerformanceNotes] = useState(false);
  const [lastPerformanceSavedAt, setLastPerformanceSavedAt] = useState<Date | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDutch = locale.startsWith("nl");
  const hasPerformanceChanges = performanceNotesDraft !== performanceBaseNotes;
  const copy = {
    title: isDutch ? "Notities" : "Notes",
    newButton: showForm ? (isDutch ? "Sluiten" : "Close") : (isDutch ? "Nieuw" : "New"),
    create: isDutch ? "Nieuwe notitie" : "New note",
    edit: isDutch ? "Bewerken" : "Edit",
    performance: isDutch ? "Optreden" : "Performance",
    save: isDutch ? "Opslaan" : "Save",
    saveAndClose: isDutch ? "Opslaan en sluiten" : "Save and close",
    cancel: isDutch ? "Annuleren" : "Cancel",
    quickLabel: isDutch ? "Snelle notities" : "Quick notes",
    quickHelp: isDutch
      ? "Schrijf hier cues, setwissels of spontane aantekeningen."
      : "Capture cues, set changes, or quick ideas here.",
    openEditFromPerformance: isDutch ? "Volledige bewerking" : "Full edit",
    prompt: isDutch
      ? "Gebruik deze ruimte om snel aantekeningen te maken tijdens het optreden."
      : "Use this space to capture notes quickly during the show.",
    placeholder: isDutch
      ? "Schrijf hier snelle notities, cues of setwijzigingen..."
      : "Write quick notes, cues, or set changes here...",
    emptyState: isDutch ? "Nog geen notities" : "No notes yet",
    notesSaved: isDutch ? "Notitie opgeslagen" : "Note saved",
    notesSaveFailed: isDutch ? "Opslaan mislukt" : "Save failed",
    closeOverlay: isDutch ? "Sluiten" : "Close",
    saveNow: isDutch ? "Nu opslaan" : "Save now",
    autosaving: isDutch ? "Automatisch opslaan..." : "Autosaving...",
    unsavedChanges: isDutch ? "Niet-opgeslagen wijzigingen" : "Unsaved changes",
    savedAt: isDutch ? "Laatst opgeslagen" : "Last saved",
    quickActions: isDutch ? "Snelle cues" : "Quick cues",
    addTimestamp: isDutch ? "Tijdstempel" : "Timestamp",
    cueIntro: isDutch ? "Intro inzetten" : "Start intro",
    cueBridge: isDutch ? "Bridge" : "Bridge",
    cueBreak: isDutch ? "Break / stop" : "Break / stop",
    cueDynamics: isDutch ? "Dynamiek opbouwen" : "Build dynamics",
    cueTempo: isDutch ? "Tempo check" : "Tempo check",
    cueReminder: isDutch ? "Herinnering" : "Reminder",
  };

  const fetchSongs = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/songs", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to load songs");
      const data = await res.json();
      setSongs(data);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to fetch songs");
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, toast]);

  useEffect(() => {
    fetchSongs();
    // load bands for selection
    (async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch("/api/bands", { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const b = await res.json();
          setAvailableBands(b || []);
        }
      } catch (e) {
        // ignore
      }
    })();
  }, [fetchSongs, getAccessToken]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setSelectedFiles(files);
  };

  async function uploadFile(file: File) {
    // compress images if large by drawing to canvas
    let uploadFile = file;
    if (file.type.startsWith("image/") && file.size > 800 * 1024) {
      // compress
      const img = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      const maxW = 1600;
      const ratio = Math.min(1, maxW / img.width);
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/webp", 0.8));
      if (blob) uploadFile = new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" });
    }

    const fileExt = uploadFile.name.split(".").pop();
    const fileName = `${session?.user?.id}-${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabaseClient.storage.from("songs").upload(fileName, uploadFile, { upsert: true });
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabaseClient.storage.from("songs").getPublicUrl(fileName);
    return { storagePath: fileName, publicUrl, contentType: uploadFile.type } as AttachmentMeta;
  }

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setUploading(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("No session token");

      const uploaded: AttachmentMeta[] = [];
      for (const f of selectedFiles) {
        const meta = await uploadFile(f);
        uploaded.push(meta);
      }

      // attachmentsMeta may include drawings saved via CanvasEditor (client will push using onExport -> handleDrawingExport)
      const allAttachments = [...attachmentsMeta, ...uploaded];

      const bodyPayload: any = { title: title.trim(), notes: notes.trim() || null, attachments: allAttachments, tags, bandIds: selectedBandIds };

      let res;
      if (editingSongId) {
        res = await fetch(`/api/songs?id=${editingSongId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(bodyPayload),
        });
      } else {
        res = await fetch("/api/songs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(bodyPayload),
        });
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save song");
      }

      setTitle("");
      setNotes("");
      setTags([]);
      setSelectedBandIds([]);
      setSelectedFiles([]);
      setAttachmentsMeta([]);
      setEditingSongId(null);
      setShowForm(false);
      toast.success("Song saved");
      fetchSongs();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Save failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDrawingExport = async (blob: Blob) => {
    const file = new File([blob], `drawing-${Date.now()}.webp`, { type: blob.type });
    try {
      const meta = await uploadFile(file);
      setAttachmentsMeta((s) => [...s, meta]);
      toast.success("Drawing saved as attachment");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to upload drawing");
    }
  };

  const startEdit = (song: any) => {
    setEditingSongId(song.id);
    setTitle(song.title || "");
    setNotes(song.notes || "");
    setExistingAttachments((song.attachments || []).map((a: any) => ({ id: a.id, storagePath: a.storagePath || a.storage_path || a.storagePath, publicUrl: a.publicUrl || a.public_url || a.publicUrl, contentType: a.contentType || a.content_type || 'image', caption: a.caption || null })));
    setAttachmentsMeta([]);
    setSelectedFiles([]);
    setShowForm(true);
    setDeletingAttachmentIds(new Set());
    setTags((song.tags || []).map((t: any) => t.name));
    setSelectedBandIds((song.bands || []).map((b: any) => b.id));
  };

  const openPerformanceMode = (song: SongRecord) => {
    setActiveSong(song);
    const noteText = song.notes || "";
    setPerformanceNotesDraft(noteText);
    setPerformanceBaseNotes(noteText);
    setLastPerformanceSavedAt(null);
    setShowForm(false);
  };

  const closePerformanceMode = useCallback(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    setActiveSong(null);
    setPerformanceNotesDraft("");
    setPerformanceBaseNotes("");
    setLastPerformanceSavedAt(null);
    setAutoSavingPerformanceNotes(false);
    setSavingPerformanceNotes(false);
  }, []);

  const handleOpenEditMode = (song: SongRecord) => {
    closePerformanceMode();
    startEdit(song);
    setShowForm(true);
  };

  const resetSongFormState = () => {
    setShowForm(false);
    setTitle("");
    setNotes("");
    setTags([]);
    setTagInput("");
    setSelectedBandIds([]);
    setSelectedFiles([]);
    setAttachmentsMeta([]);
    setExistingAttachments([]);
    setEditingSongId(null);
    setDeletingAttachmentIds(new Set());
  };

  const handleToggleSongForm = () => {
    if (showForm) {
      resetSongFormState();
      return;
    }

    closePerformanceMode();
    setEditingSongId(null);
    setTitle("");
    setNotes("");
    setTags([]);
    setTagInput("");
    setSelectedBandIds([]);
    setSelectedFiles([]);
    setAttachmentsMeta([]);
    setExistingAttachments([]);
    setDeletingAttachmentIds(new Set());
    setShowForm(true);
  };

  const appendPerformanceSnippet = (snippet: string) => {
    const next = performanceNotesDraft.trimEnd();
    const prefix = next.length > 0 ? "\n" : "";
    setPerformanceNotesDraft(`${next}${prefix}${snippet}`);
  };

  const getPerformanceTimestamp = () => {
    return new Date().toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  const savePerformanceNotes = useCallback(async (options?: { closeAfterSave?: boolean; silent?: boolean; source?: "manual" | "autosave" }) => {
    if (!activeSong) return false;
    const closeAfterSave = options?.closeAfterSave ?? false;
    const silent = options?.silent ?? false;
    const source = options?.source ?? "manual";

    if (source === "manual") {
      setSavingPerformanceNotes(true);
    } else {
      setAutoSavingPerformanceNotes(true);
    }

    const songId = activeSong.id;
    const nextNotes = performanceNotesDraft.trim() || null;

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("No session token");

      const res = await fetch(`/api/songs?id=${songId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: nextNotes }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Failed to save notes");
      }

      setSongs((prev) =>
        prev.map((song) =>
          song.id === songId ? { ...song, notes: nextNotes } : song
        )
      );
      setActiveSong((prev) => (prev && prev.id === songId ? { ...prev, notes: nextNotes } : prev));
      setPerformanceBaseNotes(nextNotes || "");
      setLastPerformanceSavedAt(new Date());

      if (!silent) {
        toast.success(isDutch ? "Notitie opgeslagen" : "Note saved");
      }
      if (closeAfterSave) {
        closePerformanceMode();
      }
      return true;
    } catch (err: any) {
      console.error(err);
      if (!silent) {
        toast.error(err?.message || (isDutch ? "Opslaan mislukt" : "Save failed"));
      }
      return false;
    } finally {
      setSavingPerformanceNotes(false);
      setAutoSavingPerformanceNotes(false);
    }
  }, [activeSong, performanceNotesDraft, getAccessToken, toast, closePerformanceMode, isDutch]);

  const handleSavePerformanceNotes = async () => {
    await savePerformanceNotes({ closeAfterSave: true, source: "manual" });
  };

  useEffect(() => {
    if (!activeSong) return;
    if (!hasPerformanceChanges) return;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      savePerformanceNotes({ silent: true, source: "autosave" });
    }, 1800);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [activeSong, hasPerformanceChanges, performanceNotesDraft, savePerformanceNotes]);

  useEffect(() => {
    if (!activeSong) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (!savingPerformanceNotes && !autoSavingPerformanceNotes) {
          savePerformanceNotes({ source: "manual" });
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeSong, savingPerformanceNotes, autoSavingPerformanceNotes, savePerformanceNotes]);

  const toggleDeleteExistingAttachment = (id: string) => {
    setDeletingAttachmentIds((prev) => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id); else copy.add(id);
      return copy;
    });
  };

  const updateExistingAttachmentCaption = (id: string, caption: string) => {
    setExistingAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, caption } : a)));
  };

  const moveExistingAttachment = (index: number, dir: -1 | 1) => {
    setExistingAttachments((prev) => {
      const arr = [...prev];
      const to = index + dir;
      if (to < 0 || to >= arr.length) return prev;
      const tmp = arr[to];
      arr[to] = arr[index];
      arr[index] = tmp;
      return arr;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{copy.title}</h2>
        <div className="flex gap-2">
          <button onClick={handleToggleSongForm} className="rounded-lg bg-brand-600 text-white px-3 py-2">{copy.newButton}</button>
        </div>
      </div>

      {showForm && (
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">{copy.create}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{copy.prompt}</p>
            </div>
            <button type="button" onClick={resetSongFormState} className="rounded-lg border px-3 py-2 text-sm">{copy.cancel}</button>
          </div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={isDutch ? 'Titel' : 'Title'} className="w-full rounded-lg border px-3 py-2" />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={isDutch ? 'Notities' : 'Notes'} className="w-full rounded-lg border px-3 py-2 h-28" />

          <div className="space-y-2 rounded-lg border p-3">
            <label className="block text-sm font-medium">Tags</label>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const value = tagInput.trim();
                    if (value && !tags.includes(value)) {
                      setTags((prev) => [...prev, value]);
                    }
                    setTagInput('');
                  }
                }}
                placeholder="Add tag and press Enter"
                className="flex-1 rounded-lg border px-3 py-2"
              />
              <button
                type="button"
                onClick={() => {
                  const value = tagInput.trim();
                  if (value && !tags.includes(value)) setTags((prev) => [...prev, value]);
                  setTagInput('');
                }}
                className="rounded-lg border px-3 py-2"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setTags((prev) => prev.filter((item) => item !== tag))}
                  className="rounded-full bg-slate-100 px-3 py-1 text-sm dark:bg-slate-800"
                >
                  {tag} ×
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <label className="block text-sm font-medium">Bands</label>
            <div className="grid gap-2 sm:grid-cols-2">
              {availableBands.length === 0 ? (
                <div className="text-sm text-slate-500">No bands yet</div>
              ) : (
                availableBands.map((band) => (
                  <label key={band.id} className="flex items-center gap-2 rounded border px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedBandIds.includes(band.id)}
                      onChange={(e) => {
                        setSelectedBandIds((prev) =>
                          e.target.checked ? [...prev, band.id] : prev.filter((id) => id !== band.id)
                        );
                      }}
                    />
                    <span>{band.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <label className="rounded-lg border px-3 py-2 cursor-pointer">Attach Photo
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" multiple />
            </label>
            <div className="text-sm text-slate-500">{selectedFiles.length} files selected</div>
          </div>

          <div className="space-y-3">
            <PhotoAnnotationEditor onExport={handleDrawingExport} />
            <CanvasEditor onExport={handleDrawingExport} />
          </div>

              {/* Existing attachments (when editing) */}
              {existingAttachments.length > 0 && (
                <div className="space-y-2">
                  <div className="font-semibold">Existing attachments</div>
                  <div className="grid grid-cols-3 gap-2">
                    {existingAttachments.map((a, idx) => (
                      <div key={a.id} className={`rounded overflow-hidden border p-2 ${deletingAttachmentIds.has(a.id) ? 'opacity-50' : ''}`}>
                        <Image src={a.publicUrl} width={150} height={100} className="h-24 w-full object-cover rounded" alt="attachment" />
                        <div className="mt-2 flex gap-2 items-center">
                          <button onClick={() => moveExistingAttachment(idx, -1)} className="px-2 py-1 border rounded">◀</button>
                          <button onClick={() => moveExistingAttachment(idx, 1)} className="px-2 py-1 border rounded">▶</button>
                          <button onClick={() => toggleDeleteExistingAttachment(a.id)} className={`ml-auto px-2 py-1 rounded ${deletingAttachmentIds.has(a.id) ? 'bg-red-600 text-white' : 'border'}`}>{deletingAttachmentIds.has(a.id) ? 'Undo' : 'Delete'}</button>
                        </div>
                        <input value={a.caption || ''} onChange={(e) => updateExistingAttachmentCaption(a.id, e.target.value)} placeholder="Caption" className="mt-2 w-full rounded border px-2 py-1 text-sm" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New attachments preview (selected files and drawings) */}
              {(selectedFiles.length > 0 || attachmentsMeta.length > 0) && (
                <div className="space-y-2">
                  <div className="font-semibold">New attachments</div>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedFiles.map((f, i) => (
                      <div key={f.name + i} className="rounded overflow-hidden border p-2">
                        <div className="h-24 w-full bg-slate-100 flex items-center justify-center text-sm">{f.name}</div>
                        <div className="mt-2 text-xs text-slate-500">{Math.round(uploadProgress[`${session?.user?.id}-${Date.now()}-${i}`] || 0)}%</div>
                      </div>
                    ))}
                    {attachmentsMeta.map((a, i) => (
                      <div key={a.storagePath} className="rounded overflow-hidden border p-2">
                        <Image src={a.publicUrl} width={150} height={100} className="h-24 w-full object-cover rounded" alt="attachment" />
                        <input value={a.caption || ''} onChange={(e) => setAttachmentsMeta((prev) => prev.map((p, idx) => idx === i ? { ...p, caption: e.target.value } : p))} placeholder="Caption" className="mt-2 w-full rounded border px-2 py-1 text-sm" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={handleSave} disabled={uploading} className="rounded-lg bg-brand-600 text-white px-3 py-2">{copy.save}</button>
                <button onClick={resetSongFormState} className="rounded-lg border px-3 py-2">{copy.cancel}</button>
              </div>
            </div>
          )}

      <div className="space-y-3">
        {loading ? (
          <div className="text-sm text-slate-500">Loading...</div>
        ) : songs.length === 0 ? (
          <div className="text-sm text-slate-500">No songs yet</div>
        ) : (
          <div className="grid gap-3">
            {songs.map((s) => (
              <div key={s.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{s.title}</div>
                    {s.notes ? (
                      <div className="mt-1 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{s.notes}</div>
                    ) : (
                      <div className="mt-1 text-sm text-slate-400">{copy.emptyState}</div>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => openPerformanceMode(s)}
                      className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 transition hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-950/30 dark:text-brand-300 dark:hover:bg-brand-900/40"
                    >
                      {copy.performance}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditMode(s)}
                      className="rounded-lg border px-3 py-2 text-sm font-medium transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                    >
                      {copy.edit}
                    </button>
                  </div>
                </div>
                {s.attachments && s.attachments.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {s.attachments.map((a: any) => (
                      <Image key={a.id} src={a.publicUrl} width={150} height={100} className="h-24 w-full object-cover rounded" alt="attachment" />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {activeSong && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-700">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">
                  {copy.performance}
                </p>
                <h3 className="truncate text-xl font-semibold text-slate-900 dark:text-slate-100">{activeSong.title}</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.prompt}</p>
              </div>
              <button
                type="button"
                onClick={closePerformanceMode}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                title={copy.closeOverlay}
              >
                <Icons.Close className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{copy.quickLabel}</label>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => appendPerformanceSnippet(`[${getPerformanceTimestamp()}] `)}
                      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {copy.addTimestamp}
                    </button>
                    <button
                      type="button"
                      onClick={() => appendPerformanceSnippet(`[${getPerformanceTimestamp()}] ${copy.cueIntro}`)}
                      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {copy.cueIntro}
                    </button>
                    <button
                      type="button"
                      onClick={() => appendPerformanceSnippet(`[${getPerformanceTimestamp()}] ${copy.cueBridge}`)}
                      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {copy.cueBridge}
                    </button>
                    <button
                      type="button"
                      onClick={() => appendPerformanceSnippet(`[${getPerformanceTimestamp()}] ${copy.cueBreak}`)}
                      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {copy.cueBreak}
                    </button>
                    <button
                      type="button"
                      onClick={() => appendPerformanceSnippet(`[${getPerformanceTimestamp()}] ${copy.cueDynamics}`)}
                      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {copy.cueDynamics}
                    </button>
                    <button
                      type="button"
                      onClick={() => appendPerformanceSnippet(`[${getPerformanceTimestamp()}] ${copy.cueTempo}`)}
                      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {copy.cueTempo}
                    </button>
                    <button
                      type="button"
                      onClick={() => appendPerformanceSnippet(`[${getPerformanceTimestamp()}] ${copy.cueReminder}: `)}
                      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {copy.cueReminder}
                    </button>
                  </div>
                  <textarea
                    value={performanceNotesDraft}
                    onChange={(e) => setPerformanceNotesDraft(e.target.value)}
                    placeholder={copy.placeholder}
                    className="min-h-[320px] w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base leading-6 text-slate-900 shadow-inner outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-brand-400 dark:focus:bg-slate-900"
                  />
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span>{isDutch ? "Tip: Ctrl/Cmd+S om direct op te slaan" : "Tip: Ctrl/Cmd+S to save instantly"}</span>
                    <span>
                      {autoSavingPerformanceNotes
                        ? copy.autosaving
                        : hasPerformanceChanges
                        ? copy.unsavedChanges
                        : lastPerformanceSavedAt
                        ? `${copy.savedAt}: ${lastPerformanceSavedAt.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}`
                        : ""}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => savePerformanceNotes({ source: "manual" })}
                    disabled={savingPerformanceNotes || autoSavingPerformanceNotes || !hasPerformanceChanges}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {savingPerformanceNotes ? <Icons.Spinner className="h-4 w-4" /> : null}
                    {copy.saveNow}
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePerformanceNotes}
                    disabled={savingPerformanceNotes}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingPerformanceNotes ? <Icons.Spinner className="h-4 w-4" /> : null}
                    {copy.saveAndClose}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEditMode(activeSong)}
                    className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {copy.openEditFromPerformance}
                  </button>
                  <button
                    type="button"
                    onClick={closePerformanceMode}
                    className="rounded-xl border border-transparent px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {copy.cancel}
                  </button>
                </div>
              </div>

              <aside className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{copy.title}</div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{activeSong.notes ? copy.quickHelp : copy.emptyState}</div>
                </div>
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{copy.quickActions}</div>
                  <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <li>{isDutch ? "Gebruik tijdstempelknoppen voor een speelvolgorde met context." : "Use timestamp buttons for context-rich running notes."}</li>
                    <li>{isDutch ? "Kort noteren per overgang werkt beter dan lange paragrafen." : "Capture short notes per transition instead of long paragraphs."}</li>
                    <li>{isDutch ? "Sla tussendoor op of laat autosave het werk doen." : "Save in between or let autosave handle it."}</li>
                  </ul>
                </div>

                {activeSong.tags && activeSong.tags.length > 0 && (
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Tags</div>
                    <div className="flex flex-wrap gap-2">
                      {activeSong.tags.map((tag) => (
                        <span key={tag.id} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700">
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {activeSong.bands && activeSong.bands.length > 0 && (
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Bands</div>
                    <div className="flex flex-wrap gap-2">
                      {activeSong.bands.map((band) => (
                        <span key={band.id} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-200 dark:bg-brand-950/30 dark:text-brand-300 dark:ring-brand-800">
                          {band.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {activeSong.attachments && activeSong.attachments.length > 0 && (
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Attachments</div>
                    <div className="grid grid-cols-2 gap-2">
                      {activeSong.attachments.map((attachment) => (
                        <Image
                          key={attachment.id}
                          src={attachment.publicUrl}
                          width={240}
                          height={160}
                          className="h-28 w-full rounded-xl object-cover"
                          alt={attachment.caption || activeSong.title}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </aside>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

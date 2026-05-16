"use client";

import Image from "next/image";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
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
  isLocalFallback?: boolean;
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

type SongMeta = {
  bandProject: string;
  genre: string;
  keySignature: string;
  bpm: string;
  comments: string;
};

type ParsedSongNotes = {
  meta: SongMeta;
  body: string;
};

const SONG_META_START = "[[song-meta]]";
const SONG_META_END = "[[/song-meta]]";

const createDefaultSongMeta = (): SongMeta => ({
  bandProject: "",
  genre: "",
  keySignature: "",
  bpm: "",
  comments: "",
});

const parseSongNotes = (rawNotes: string | null | undefined): ParsedSongNotes => {
  const fallback = { meta: createDefaultSongMeta(), body: rawNotes || "" };
  if (!rawNotes) return fallback;

  const startIndex = rawNotes.indexOf(SONG_META_START);
  const endIndex = rawNotes.indexOf(SONG_META_END);
  if (startIndex !== 0 || endIndex < 0) return fallback;

  const metaJson = rawNotes.slice(SONG_META_START.length, endIndex).trim();
  const body = rawNotes.slice(endIndex + SONG_META_END.length).replace(/^\s+/, "");

  try {
    const parsed = JSON.parse(metaJson) as Partial<SongMeta>;
    return {
      meta: {
        bandProject: typeof parsed.bandProject === "string" ? parsed.bandProject : "",
        genre: typeof parsed.genre === "string" ? parsed.genre : "",
        keySignature: typeof parsed.keySignature === "string" ? parsed.keySignature : "",
        bpm: typeof parsed.bpm === "string" ? parsed.bpm : "",
        comments: typeof parsed.comments === "string" ? parsed.comments : "",
      },
      body,
    };
  } catch {
    return fallback;
  }
};

const serializeSongNotes = (meta: SongMeta, body: string) => {
  const payload = JSON.stringify(meta);
  const trimmedBody = body.trim();
  return `${SONG_META_START}\n${payload}\n${SONG_META_END}${trimmedBody ? `\n\n${trimmedBody}` : ""}`;
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Failed to read attachment locally"));
    };
    reader.onerror = () => reject(new Error("Failed to read attachment locally"));
    reader.readAsDataURL(file);
  });

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
      // WebP export can fail on some tablet browsers (notably older iPad/Safari builds).
      canvas.toBlob((blob) => {
        if (blob) {
          onExport(blob);
          resolve();
          return;
        }

        canvas.toBlob((fallbackBlob) => {
          if (fallbackBlob) onExport(fallbackBlob);
          resolve();
        }, "image/png");
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
          <button type="button" onClick={clear} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Wissen</button>
          <button type="button" onClick={undo} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Undo</button>
        </div>
        <button type="button" onClick={exportImage} className="rounded-lg bg-brand-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700">Notitie Opslaan</button>
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
  const [bandSuggestions, setBandSuggestions] = useState<string[]>([]);
  const [selectedBandName, setSelectedBandName] = useState("");
  const [addingBandToNote, setAddingBandToNote] = useState(false);
  const [selectedBandIds, setSelectedBandIds] = useState<string[]>([]);
  const [songMeta, setSongMeta] = useState<SongMeta>(createDefaultSongMeta());
  const [formSection, setFormSection] = useState<"details" | "notes" | "media" | "concert">("details");
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
  const [activeAttachmentIndex, setActiveAttachmentIndex] = useState(0);
  const [showPerformanceEditor, setShowPerformanceEditor] = useState(false);
  const [savingPerformanceNotes, setSavingPerformanceNotes] = useState(false);
  const [autoSavingPerformanceNotes, setAutoSavingPerformanceNotes] = useState(false);
  const [songSearch, setSongSearch] = useState("");
  const [bandFilterIds, setBandFilterIds] = useState<string[]>([]);
  const [showOnlyWithNotes, setShowOnlyWithNotes] = useState(false);
  const [lastPerformanceSavedAt, setLastPerformanceSavedAt] = useState<Date | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const performanceTouchStartRef = useRef<number | null>(null);
  const draftStorageKey = editingSongId ? `gigmanager:song-draft:${editingSongId}` : "gigmanager:song-draft:new";
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
    sheetViewer: isDutch ? "Partituurweergave" : "Sheet viewer",
    noSheetsYet: isDutch ? "Geen geuploade partituren voor dit nummer." : "No uploaded sheet files for this song.",
    openEditor: isDutch ? "Toon live notities" : "Show live notes",
    hideEditor: isDutch ? "Verberg live notities" : "Hide live notes",
    attachmentCounter: isDutch ? "Partituur" : "Sheet",
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
    searchPlaceholder: isDutch ? "Zoek in titel of notities..." : "Search title or notes...",
    filterByBand: isDutch ? "Filter op band" : "Filter by band",
    withNotesOnly: isDutch ? "Alleen met notities" : "Only with notes",
    clearFilters: isDutch ? "Filters wissen" : "Clear filters",
    resultsLabel: isDutch ? "resultaten" : "results",
    noBand: isDutch ? "Zonder band" : "No band",
    assignBands: isDutch ? "Koppel bands" : "Assign bands",
    clearBands: isDutch ? "Geen band" : "No band",
    selectedBandsCount: isDutch ? "geselecteerd" : "selected",
    chooseBand: isDutch ? "Kies bestaande band" : "Choose an existing band",
    addBand: isDutch ? "Band toevoegen" : "Add band",
    noBandsHint: isDutch ? "Nog geen bands beschikbaar" : "No bands available yet",
    detailsTab: isDutch ? "Details" : "Details",
    notesTab: isDutch ? "Notities" : "Notes",
    mediaTab: isDutch ? "Media" : "Media",
    concertTab: isDutch ? "Concert" : "Concert",
    saveDraftHint: isDutch ? "Opslag gebeurt automatisch als concept." : "Drafts are saved automatically.",
    restoreDraft: isDutch ? "Concept herstellen" : "Restore draft",
    bandProject: isDutch ? "Band / project" : "Band / project",
    genre: isDutch ? "Genre" : "Genre",
    keySignature: isDutch ? "Toonsoort" : "Key",
    bpm: isDutch ? "BPM" : "BPM",
    comments: isDutch ? "Opmerkingen" : "Comments",
  };

  const normalizeName = (name: string) => name.trim().toLowerCase();

  const mergeBandSuggestions = useCallback((names: string[]) => {
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const raw of names) {
      const clean = raw.trim();
      if (!clean) continue;
      const key = normalizeName(clean);
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(clean);
    }
    unique.sort((a, b) => a.localeCompare(b));
    return unique;
  }, []);

  const filterBandOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const band of availableBands) map.set(band.id, band.name);
    for (const song of songs) {
      for (const band of song.bands || []) {
        if (!map.has(band.id)) map.set(band.id, band.name);
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [availableBands, songs]);

  const filteredSongs = useMemo(() => {
    const q = songSearch.trim().toLowerCase();
    return songs.filter((song) => {
      const parsed = parseSongNotes(song.notes);
      if (showOnlyWithNotes && !parsed.body.trim()) return false;

      if (bandFilterIds.length > 0) {
        const songBandIds = new Set((song.bands || []).map((band) => band.id));
        const matchesBand = bandFilterIds.some((id) => songBandIds.has(id));
        if (!matchesBand) return false;
      }

      if (!q) return true;
      const inTitle = song.title.toLowerCase().includes(q);
      const inNotes = parsed.body.toLowerCase().includes(q);
      const inMeta = [parsed.meta.bandProject, parsed.meta.genre, parsed.meta.keySignature, parsed.meta.bpm, parsed.meta.comments]
        .join(" ")
        .toLowerCase()
        .includes(q);
      return inTitle || inNotes || inMeta;
    });
  }, [songs, songSearch, showOnlyWithNotes, bandFilterIds]);

  const hasActiveFilters = songSearch.trim().length > 0 || showOnlyWithNotes || bandFilterIds.length > 0;

  const toggleBandFilter = (bandId: string) => {
    setBandFilterIds((prev) => (prev.includes(bandId) ? prev.filter((id) => id !== bandId) : [...prev, bandId]));
  };

  const resetListFilters = () => {
    setSongSearch("");
    setBandFilterIds([]);
    setShowOnlyWithNotes(false);
  };

  const fetchSongs = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/songs", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to load songs");
      const data = await res.json();
      setSongs(data);
      // Debug: check if bands are present
      console.log("[SongsTab] Fetched songs:", data.length, "songs with bands sample:", data.slice(0, 2).map((s: any) => ({ id: s.id, title: s.title, bands: s.bands })));
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to fetch songs");
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, toast]);

  const fetchBandSources = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;

      const [bandsRes, gigsRes, membersRes] = await Promise.all([
        fetch("/api/bands", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/gigs", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/band-members", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const bands = bandsRes.ok ? await bandsRes.json() : [];
      const gigs = gigsRes.ok ? await gigsRes.json() : [];
      const members = membersRes.ok ? await membersRes.json() : [];

      const normalizedBands = Array.isArray(bands) ? bands : [];
      setAvailableBands(normalizedBands);

      const suggestionNames = [
        ...normalizedBands.map((band: { name: string }) => band.name),
        ...(Array.isArray(gigs) ? gigs.map((gig: { performers?: string }) => gig.performers || "") : []),
        ...(Array.isArray(members)
          ? members.flatMap((member: { bands?: string[] }) => member.bands || [])
          : []),
      ];
      setBandSuggestions(mergeBandSuggestions(suggestionNames));
    } catch {
      // ignore band source loading failures to keep notes form usable
    }
  }, [getAccessToken, mergeBandSuggestions]);

  useEffect(() => {
    if (!showForm) return;
    try {
      const raw = window.localStorage.getItem(draftStorageKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as {
        title?: string;
        notes?: string;
        meta?: SongMeta;
        tags?: string[];
        bandIds?: string[];
        section?: "details" | "notes" | "media" | "concert";
      };

      if (typeof draft.title === "string") setTitle(draft.title);
      if (typeof draft.notes === "string") setNotes(draft.notes);
      if (draft.meta) setSongMeta({ ...createDefaultSongMeta(), ...draft.meta });
      if (Array.isArray(draft.tags)) setTags(draft.tags.filter((tag) => typeof tag === "string"));
      if (Array.isArray(draft.bandIds)) setSelectedBandIds(draft.bandIds.filter((id) => typeof id === "string"));
      if (draft.section) setFormSection(draft.section);
    } catch {
      // ignore draft restore failures
    }
  }, [draftStorageKey, showForm]);

  useEffect(() => {
    if (!showForm) return;
    try {
      window.localStorage.setItem(
        draftStorageKey,
        JSON.stringify({
          title,
          notes,
          meta: songMeta,
          tags,
          bandIds: selectedBandIds,
          section: formSection,
        })
      );
    } catch {
      // ignore draft save failures
    }
  }, [draftStorageKey, showForm, title, notes, songMeta, tags, selectedBandIds, formSection]);

  const ensureBandExistsByName = useCallback(async (name: string) => {
    const clean = name.trim();
    if (!clean) return null;
    const key = normalizeName(clean);

    const existing = availableBands.find((band) => normalizeName(band.name) === key);
    if (existing) return existing;

    const token = await getAccessToken();
    if (!token) throw new Error("No session token");

    const res = await fetch("/api/bands", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: clean }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || "Failed to create band");
    }

    const created = await res.json();
    setAvailableBands((prev) => [...prev, created]);
    setBandSuggestions((prev) => mergeBandSuggestions([...prev, clean]));
    return created as { id: string; name: string };
  }, [availableBands, getAccessToken, mergeBandSuggestions]);

  const handleAddBandToNote = useCallback(async (bandName?: string) => {
    const targetName = (bandName ?? selectedBandName).trim();
    if (!targetName) return;
    try {
      setAddingBandToNote(true);
      const band = await ensureBandExistsByName(targetName);
      if (!band) return;
      setSelectedBandIds((prev) => (prev.includes(band.id) ? prev : [...prev, band.id]));
      setSelectedBandName("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to add band");
    } finally {
      setAddingBandToNote(false);
    }
  }, [ensureBandExistsByName, selectedBandName, toast]);

  useEffect(() => {
    fetchSongs();
    fetchBandSources();
  }, [fetchSongs, fetchBandSources]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setSelectedFiles(files);
  };

  async function uploadFile(file: File) {
    const {
      data: { session: activeSession },
    } = await supabaseClient.auth.getSession();

    if (!activeSession?.access_token) {
      const { data: refreshedData, error: refreshError } = await supabaseClient.auth.refreshSession();
      if (refreshError || !refreshedData.session?.access_token) {
        throw new Error("Session expired. Please sign in again before uploading drawings.");
      }
    }

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
    if (uploadError) {
      const message = uploadError.message || "Upload failed";
      if (message.toLowerCase().includes("bucket") || uploadError.statusCode === "404") {
        const localUrl = await readFileAsDataUrl(uploadFile);
        return {
          storagePath: `local:${crypto.randomUUID()}`,
          publicUrl: localUrl,
          contentType: uploadFile.type || "application/octet-stream",
          isLocalFallback: true,
        } as AttachmentMeta;
      }
      throw new Error(message);
    }

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
      let usedLocalFallback = false;
      for (const f of selectedFiles) {
        const meta = await uploadFile(f);
        if (meta.isLocalFallback) usedLocalFallback = true;
        uploaded.push(meta);
      }

      // attachmentsMeta may include drawings saved via CanvasEditor (client will push using onExport -> handleDrawingExport)
      const allAttachments = [...attachmentsMeta, ...uploaded];

      const composedNotes = serializeSongNotes(songMeta, notes);
      const bodyPayload: any = { title: title.trim(), notes: composedNotes, attachments: allAttachments, tags, bandIds: selectedBandIds };

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
      setSongMeta(createDefaultSongMeta());
      setTags([]);
      setSelectedBandIds([]);
      setSelectedFiles([]);
      setAttachmentsMeta([]);
      setEditingSongId(null);
      setShowForm(false);
      try {
        window.localStorage.removeItem(draftStorageKey);
      } catch {
        // ignore
      }
      toast.success("Song saved");
      if (usedLocalFallback) {
        toast.info(isDutch ? "Een of meer bijlagen zijn lokaal opgeslagen omdat de opslagbucket niet bereikbaar is." : "One or more attachments were stored locally because the storage bucket was unavailable.");
      }
      fetchSongs();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Save failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDrawingExport = async (blob: Blob) => {
    if (!blob || blob.size === 0) {
      toast.error(isDutch ? "Tekenen export mislukt op dit apparaat." : "Drawing export failed on this device.");
      return;
    }

    const inferredType = blob.type && blob.type.startsWith("image/") ? blob.type : "image/png";
    const ext = inferredType.includes("png") ? "png" : "webp";
    const file = new File([blob], `drawing-${Date.now()}.${ext}`, { type: inferredType });
    try {
      const meta = await uploadFile(file);
      setAttachmentsMeta((s) => [...s, meta]);
      toast[meta.isLocalFallback ? "info" : "success"](meta.isLocalFallback
        ? (isDutch ? "Tekening lokaal bewaard omdat opslagbucket niet bereikbaar is." : "Drawing stored locally because the storage bucket was unavailable.")
        : "Drawing saved as attachment");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to upload drawing");
    }
  };

  const startEdit = (song: any) => {
    const parsed = parseSongNotes(song.notes);
    setEditingSongId(song.id);
    setTitle(song.title || "");
    setNotes(parsed.body);
    setSongMeta(parsed.meta);
    setFormSection("details");
    setExistingAttachments((song.attachments || []).map((a: any) => ({ id: a.id, storagePath: a.storagePath || a.storage_path || a.storagePath, publicUrl: a.publicUrl || a.public_url || a.publicUrl, contentType: a.contentType || a.content_type || 'image', caption: a.caption || null })));
    setAttachmentsMeta([]);
    setSelectedFiles([]);
    setShowForm(true);
    setDeletingAttachmentIds(new Set());
    setTags((song.tags || []).map((t: any) => t.name));
    setSelectedBandIds((song.bands || []).map((b: any) => b.id));
  };

  const openPerformanceMode = (song: SongRecord) => {
    const parsed = parseSongNotes(song.notes);
    setActiveSong(song);
    const noteText = parsed.body;
    setSongMeta(parsed.meta);
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
    setSongMeta(createDefaultSongMeta());
    setTags([]);
    setTagInput("");
    setSelectedBandIds([]);
    setSelectedBandName("");
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
    setSongMeta(createDefaultSongMeta());
    setTags([]);
    setTagInput("");
    setSelectedBandIds([]);
    setSelectedBandName("");
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
    const nextNotes = performanceNotesDraft.trim() || "";
    const currentMeta = activeSong ? parseSongNotes(activeSong.notes).meta : createDefaultSongMeta();

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("No session token");

      const res = await fetch(`/api/songs?id=${songId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: serializeSongNotes(currentMeta, nextNotes) }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Failed to save notes");
      }

      setSongs((prev) =>
        prev.map((song) =>
          song.id === songId ? { ...song, notes: serializeSongNotes(currentMeta, nextNotes) } : song
        )
      );
      setActiveSong((prev) => (prev && prev.id === songId ? { ...prev, notes: serializeSongNotes(currentMeta, nextNotes) } : prev));
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

  const selectedBands = useMemo(() => {
    const map = new Map<string, string>();
    for (const band of availableBands) map.set(band.id, band.name);
    for (const song of songs) {
      for (const band of song.bands || []) {
        if (!map.has(band.id)) map.set(band.id, band.name);
      }
    }
    return selectedBandIds
      .map((id) => ({ id, name: map.get(id) || id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [availableBands, songs, selectedBandIds]);

  const activePerformanceIndex = useMemo(() => {
    if (!activeSong) return -1;
    return filteredSongs.findIndex((song) => song.id === activeSong.id);
  }, [activeSong, filteredSongs]);

  const performanceAttachments = useMemo(() => {
    if (!activeSong?.attachments || activeSong.attachments.length === 0) return [];
    return activeSong.attachments
      .map((attachment) => ({
        id: attachment.id,
        publicUrl: attachment.publicUrl,
        contentType: attachment.contentType || "",
        caption: attachment.caption || null,
      }))
      .filter((attachment) => Boolean(attachment.publicUrl));
  }, [activeSong]);

  const activePerformanceAttachment =
    performanceAttachments.length > 0
      ? performanceAttachments[Math.min(activeAttachmentIndex, performanceAttachments.length - 1)]
      : null;

  useEffect(() => {
    if (!activeSong) return;
    setActiveAttachmentIndex(0);
    setShowPerformanceEditor(false);
  }, [activeSong?.id]);

  const goToAdjacentPerformanceSong = (direction: -1 | 1) => {
    if (activePerformanceIndex < 0) return;
    const nextSong = filteredSongs[activePerformanceIndex + direction];
    if (nextSong) {
      openPerformanceMode(nextSong);
    }
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
        <div className="rounded-2xl border border-slate-200 bg-white/95 shadow-xl dark:border-slate-700 dark:bg-slate-900/95">
          <div className="max-h-[calc(100dvh-8rem)] overflow-y-auto p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{copy.create}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{copy.prompt}</p>
              </div>
              <button type="button" onClick={resetSongFormState} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">{copy.cancel}</button>
            </div>

            <div className="flex flex-wrap gap-2 rounded-2xl bg-slate-100 p-2 dark:bg-slate-800/70">
              {(["details", "notes", "media", "concert"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFormSection(key)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${formSection === key ? "bg-cyan-600 text-white shadow-sm" : "text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"}`}
                >
                  {key === "details" ? copy.detailsTab : key === "notes" ? copy.notesTab : key === "media" ? copy.mediaTab : copy.concertTab}
                </button>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
              <div className="space-y-4">
                {formSection === "details" && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-950/50">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{isDutch ? "Songtitel" : "Song title"}</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={isDutch ? "Titel" : "Title"} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base shadow-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{copy.bandProject}</label>
                      <input value={songMeta.bandProject} onChange={(e) => setSongMeta((prev) => ({ ...prev, bandProject: e.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" placeholder={copy.chooseBand} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{copy.genre}</label>
                      <input value={songMeta.genre} onChange={(e) => setSongMeta((prev) => ({ ...prev, genre: e.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" placeholder="Pop, jazz, rock..." />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{copy.keySignature}</label>
                      <input value={songMeta.keySignature} onChange={(e) => setSongMeta((prev) => ({ ...prev, keySignature: e.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" placeholder="C, Am..." />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{copy.bpm}</label>
                      <input value={songMeta.bpm} onChange={(e) => setSongMeta((prev) => ({ ...prev, bpm: e.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" placeholder="120" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{copy.comments}</label>
                    <textarea value={songMeta.comments} onChange={(e) => setSongMeta((prev) => ({ ...prev, comments: e.target.value }))} placeholder={isDutch ? "Context, intro cues, arrangement notes..." : "Context, intro cues, arrangement notes..."} className="h-20 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
                  </div>
                </div>
                )}

                {formSection === "notes" && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-950/50">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-sm font-medium text-slate-900 dark:text-slate-100">{copy.notesTab}</label>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{copy.saveDraftHint}</span>
                  </div>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={isDutch ? "Notities" : "Notes"} className="mt-2 min-h-[10rem] w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm shadow-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
                </div>
                )}

                {formSection === "notes" && (
                <details className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-950/50">
                  <summary className="cursor-pointer select-none text-sm font-medium text-slate-900 dark:text-slate-100">Tags</summary>
                  <div className="mt-3 space-y-2">
                    <div className="flex gap-2">
                      <input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const value = tagInput.trim();
                            if (value && !tags.includes(value)) setTags((prev) => [...prev, value]);
                            setTagInput("");
                          }
                        }}
                        placeholder="Add tag and press Enter"
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                      <button type="button" onClick={() => { const value = tagInput.trim(); if (value && !tags.includes(value)) setTags((prev) => [...prev, value]); setTagInput(""); }} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Add</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <button key={tag} type="button" onClick={() => setTags((prev) => prev.filter((item) => item !== tag))} className="rounded-full bg-slate-100 px-3 py-1 text-sm dark:bg-slate-800">{tag} ×</button>
                      ))}
                    </div>
                  </div>
                </details>
                )}

                {formSection === "notes" && (
                <details className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-950/50" open>
                  <summary className="cursor-pointer select-none text-sm font-medium">{copy.assignBands}</summary>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-slate-500 dark:text-slate-400">{selectedBandIds.length} {copy.selectedBandsCount}</div>
                      <button type="button" onClick={() => setSelectedBandIds([])} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">{copy.clearBands}</button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <input type="text" value={selectedBandName} onChange={(e) => setSelectedBandName(e.target.value)} placeholder={copy.chooseBand} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
                      <button type="button" onClick={() => handleAddBandToNote()} disabled={!selectedBandName.trim() || addingBandToNote} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium disabled:opacity-50 dark:border-slate-700 dark:text-slate-200">{addingBandToNote ? (isDutch ? "Toevoegen..." : "Adding...") : copy.addBand}</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {bandSuggestions.map((bandName) => {
                        const alreadySelected = selectedBands.some((band) => band.name === bandName);
                        return (
                          <button key={bandName} type="button" onClick={() => handleAddBandToNote(bandName)} disabled={alreadySelected || addingBandToNote} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${alreadySelected ? "cursor-default bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:ring-cyan-800/50" : "bg-slate-100 text-slate-700 hover:bg-cyan-50 hover:text-cyan-800 hover:ring-1 hover:ring-cyan-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-cyan-950/30 dark:hover:text-cyan-200"}`}>{bandName}</button>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedBands.map((band) => (
                        <button key={band.id} type="button" onClick={() => setSelectedBandIds((prev) => prev.filter((id) => id !== band.id))} className="rounded-full bg-slate-100 px-3 py-1 text-sm dark:bg-slate-800">{band.name} ×</button>
                      ))}
                    </div>
                  </div>
                </details>
                )}
              </div>

              <div className="space-y-4">
                {formSection === "media" && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-950/50">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                      <Icons.Document className="h-4 w-4" />
                      {isDutch ? "Afbeelding/PDF toevoegen" : "Add image/PDF"}
                      <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" multiple />
                    </label>
                    <div className="text-sm text-slate-500 dark:text-slate-400">{selectedFiles.length} files selected</div>
                  </div>
                  <div className="mt-3 text-xs text-slate-400 dark:text-slate-500">{isDutch ? "Gebruik media en tekening om aantekeningen snel vast te leggen." : "Use media and drawing to capture notes quickly."}</div>
                </div>
                )}

                {formSection === "media" && (
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-950/50">
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{copy.mediaTab}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{isDutch ? "Teken, markeer en annoteer direct op tablet." : "Draw, highlight, and annotate directly on tablet."}</div>
                  </div>
                  <PhotoAnnotationEditor onExport={handleDrawingExport} />
                  <CanvasEditor onExport={handleDrawingExport} />
                </div>
                )}

                {formSection === "concert" && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-950/50">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{copy.concertTab}</div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{isDutch ? "Na opslaan kun je meteen concertmodus openen voor snelle navigatie." : "After saving, open concert mode for quick navigation."}</p>
                </div>
                )}

                {formSection === "media" && existingAttachments.length > 0 && (
                  <details className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-950/50">
                    <summary className="cursor-pointer select-none font-semibold">Existing attachments</summary>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {existingAttachments.map((a, idx) => (
                        <div key={a.id} className={`rounded overflow-hidden border p-2 ${deletingAttachmentIds.has(a.id) ? "opacity-50" : ""}`}>
                          <Image src={a.publicUrl} width={150} height={100} className="h-24 w-full object-cover rounded" alt="attachment" />
                          <div className="mt-2 flex items-center gap-2">
                            <button onClick={() => moveExistingAttachment(idx, -1)} className="rounded border px-2 py-1">◀</button>
                            <button onClick={() => moveExistingAttachment(idx, 1)} className="rounded border px-2 py-1">▶</button>
                            <button onClick={() => toggleDeleteExistingAttachment(a.id)} className={`ml-auto rounded px-2 py-1 ${deletingAttachmentIds.has(a.id) ? "bg-red-600 text-white" : "border"}`}>{deletingAttachmentIds.has(a.id) ? "Undo" : "Delete"}</button>
                          </div>
                          <input value={a.caption || ""} onChange={(e) => updateExistingAttachmentCaption(a.id, e.target.value)} placeholder="Caption" className="mt-2 w-full rounded border px-2 py-1 text-sm" />
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {formSection === "media" && (selectedFiles.length > 0 || attachmentsMeta.length > 0) && (
                  <details className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-950/50" open>
                    <summary className="cursor-pointer select-none font-semibold">New attachments</summary>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {selectedFiles.map((f, i) => (
                        <div key={f.name + i} className="rounded overflow-hidden border p-2">
                          <div className="flex h-24 w-full items-center justify-center bg-slate-100 text-sm">{f.name}</div>
                          <div className="mt-2 text-xs text-slate-500">{Math.round(uploadProgress[`${session?.user?.id}-${Date.now()}-${i}`] || 0)}%</div>
                        </div>
                      ))}
                      {attachmentsMeta.map((a, i) => (
                        <div key={a.storagePath} className="rounded overflow-hidden border p-2">
                          <Image src={a.publicUrl} width={150} height={100} className="h-24 w-full object-cover rounded" alt="attachment" />
                          <input value={a.caption || ""} onChange={(e) => setAttachmentsMeta((prev) => prev.map((p, idx) => idx === i ? { ...p, caption: e.target.value } : p))} placeholder="Caption" className="mt-2 w-full rounded border px-2 py-1 text-sm" />
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-500 dark:text-slate-400">{isDutch ? "Snelle opslag: Ctrl/Cmd+S werkt ook in de notitie-editor." : "Quick save: Ctrl/Cmd+S also works in the note editor."}</div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button onClick={handleSave} disabled={uploading || !title.trim()} className="w-full sm:w-auto rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">{copy.save}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {/* Quick actions bar */}
        <div className="rounded-xl border border-cyan-200 bg-gradient-to-r from-cyan-50 to-blue-50 p-4 shadow-sm dark:border-cyan-800/50 dark:from-cyan-950/20 dark:to-blue-950/20">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{copy.title}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">{copy.create}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  resetSongFormState();
                  setShowForm(true);
                }}
                className="rounded-lg bg-cyan-600 text-white px-3 py-2.5 text-sm font-medium transition hover:bg-cyan-700 dark:bg-cyan-700 dark:hover:bg-cyan-800"
              >
                {isDutch ? "+ Nieuwe notitie" : "+ New note"}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="relative">
              <Icons.Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={songSearch}
                onChange={(e) => setSongSearch(e.target.value)}
                placeholder={copy.searchPlaceholder}
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={showOnlyWithNotes}
                onChange={(e) => setShowOnlyWithNotes(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              {copy.withNotesOnly}
            </label>
          </div>

          {filterBandOptions.length > 0 ? (
            <div className="mt-3 space-y-2">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{copy.filterByBand}</div>
              <div className="flex flex-wrap gap-2">
                {filterBandOptions.map((band) => {
                  const selected = bandFilterIds.includes(band.id);
                  return (
                    <button
                      key={band.id}
                      type="button"
                      onClick={() => toggleBandFilter(band.id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        selected
                          ? "bg-cyan-600 text-white ring-2 ring-cyan-300/50 dark:bg-cyan-700 dark:ring-cyan-600/50"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:ring-1 hover:ring-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:ring-slate-600"
                      }`}
                    >
                      {band.name || copy.noBand}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-3 text-xs text-slate-400 dark:text-slate-500">{isDutch ? "Geen bands beschikbaar om op te filteren" : "No bands available to filter"}</div>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>
              {filteredSongs.length} / {songs.length} {copy.resultsLabel}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetListFilters}
                className="rounded-md border border-slate-300 px-2 py-1 font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {copy.clearFilters}
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-slate-500">Loading...</div>
        ) : songs.length === 0 ? (
          <div className="text-sm text-slate-500">No songs yet</div>
        ) : filteredSongs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {isDutch ? "Geen notities gevonden met deze filters." : "No notes found for these filters."}
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredSongs.map((s) => {
              const parsed = parseSongNotes(s.notes);
              return (
              <div key={s.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="truncate font-semibold text-slate-900 dark:text-slate-100">{s.title}</div>
                      {parsed.meta.bandProject && (
                        <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[11px] font-semibold text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
                          {parsed.meta.bandProject}
                        </span>
                      )}
                    </div>
                    {s.bands && s.bands.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {s.bands.map((band) => (
                          <span key={band.id} className="inline-flex items-center gap-1 rounded-full bg-cyan-100/70 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-700 ring-1 ring-cyan-200/50 dark:bg-cyan-950/40 dark:text-cyan-300 dark:ring-cyan-800/50">
                            <span className="inline-block w-1.5 h-1.5 bg-cyan-400 rounded-full dark:bg-cyan-400"></span>
                            {band.name}
                          </span>
                        ))}
                      </div>
                    ) : parsed.meta.bandProject ? (
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{parsed.meta.bandProject}</div>
                    ) : (
                      <div className="mt-1 text-xs text-slate-400 dark:text-slate-500 italic">{isDutch ? "Geen band gekoppeld" : "No band assigned"}</div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {parsed.meta.genre && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{parsed.meta.genre}</span>
                      )}
                      {parsed.meta.keySignature && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{parsed.meta.keySignature}</span>
                      )}
                      {parsed.meta.bpm && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{parsed.meta.bpm} BPM</span>
                      )}
                    </div>
                    {parsed.body ? (
                      <div className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{parsed.body}</div>
                    ) : (
                      <div className="mt-1 text-sm text-slate-400">{copy.emptyState}</div>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => openPerformanceMode(s)}
                      className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5 text-sm font-medium text-brand-700 transition hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-950/30 dark:text-brand-300 dark:hover:bg-brand-900/40"
                    >
                      {copy.performance}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditMode(s)}
                      className="rounded-lg border px-3 py-2.5 text-sm font-medium transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
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
              );
            })}
          </div>
        )}
      </div>

      {activeSong && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/95 px-4 py-6 backdrop-blur-sm"
          onTouchStart={(event) => {
            performanceTouchStartRef.current = event.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            const startX = performanceTouchStartRef.current;
            const endX = event.changedTouches[0]?.clientX ?? null;
            if (startX === null || endX === null) return;
            const delta = endX - startX;
            if (Math.abs(delta) > 60) {
              goToAdjacentPerformanceSong(delta < 0 ? 1 : -1);
            }
            performanceTouchStartRef.current = null;
          }}
        >
          <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-700 bg-black text-white shadow-2xl ring-1 ring-white/10">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                  {copy.performance}
                </p>
                <h3 className="truncate text-xl font-semibold text-white sm:text-2xl">{activeSong.title}</h3>
                <p className="mt-1 text-sm text-slate-300">{isDutch ? "Alleen de essentiële notities voor live gebruik" : "Only the essential notes for live use"}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => goToAdjacentPerformanceSong(-1)}
                  disabled={activePerformanceIndex <= 0}
                  className="rounded-lg border border-white/15 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isDutch ? "Vorige" : "Prev"}
                </button>
                <button
                  type="button"
                  onClick={() => goToAdjacentPerformanceSong(1)}
                  disabled={activePerformanceIndex < 0 || activePerformanceIndex >= filteredSongs.length - 1}
                  className="rounded-lg border border-white/15 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isDutch ? "Volgende" : "Next"}
                </button>
                <button
                  type="button"
                  onClick={closePerformanceMode}
                  className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
                  title={copy.closeOverlay}
                >
                  <Icons.Close className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-4 px-4 py-5 sm:px-6">
              <section className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">{copy.sheetViewer}</p>
                  {performanceAttachments.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveAttachmentIndex((prev) => Math.max(0, prev - 1))}
                        disabled={activeAttachmentIndex <= 0}
                        className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {isDutch ? "Vorige partituur" : "Previous sheet"}
                      </button>
                      <span className="text-xs text-slate-300">
                        {copy.attachmentCounter} {activeAttachmentIndex + 1}/{performanceAttachments.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveAttachmentIndex((prev) => Math.min(performanceAttachments.length - 1, prev + 1))}
                        disabled={activeAttachmentIndex >= performanceAttachments.length - 1}
                        className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {isDutch ? "Volgende partituur" : "Next sheet"}
                      </button>
                    </div>
                  )}
                </div>

                {activePerformanceAttachment ? (
                  <div className="relative min-h-[68vh] overflow-hidden rounded-xl border border-white/10 bg-black">
                    {activePerformanceAttachment.contentType.includes("pdf") ? (
                      <iframe
                        src={`${activePerformanceAttachment.publicUrl}#view=FitH&toolbar=0&navpanes=0&scrollbar=1`}
                        className="h-[68vh] w-full"
                        title={activePerformanceAttachment.caption || activeSong.title}
                      />
                    ) : (
                      <Image
                        src={activePerformanceAttachment.publicUrl}
                        alt={activePerformanceAttachment.caption || activeSong.title}
                        fill
                        sizes="100vw"
                        className="object-contain"
                        priority
                      />
                    )}
                  </div>
                ) : (
                  <div className="min-h-[68vh] rounded-xl border border-dashed border-white/15 bg-black/60 px-6 py-10 text-center text-sm text-slate-300">
                    {copy.noSheetsYet}
                  </div>
                )}
              </section>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowPerformanceEditor((prev) => !prev)}
                  className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  {showPerformanceEditor ? copy.hideEditor : copy.openEditor}
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEditMode(activeSong)}
                  className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  {copy.openEditFromPerformance}
                </button>
                <button
                  type="button"
                  onClick={closePerformanceMode}
                  className="rounded-xl border border-transparent px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:text-white"
                >
                  {copy.cancel}
                </button>
              </div>

              {showPerformanceEditor && (
                <section className="space-y-4 rounded-2xl border border-white/10 bg-black/50 p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => appendPerformanceSnippet(`[${getPerformanceTimestamp()}] `)}
                      className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white transition hover:bg-white/10"
                    >
                      {copy.addTimestamp}
                    </button>
                    <button
                      type="button"
                      onClick={() => appendPerformanceSnippet(`[${getPerformanceTimestamp()}] ${copy.cueIntro}`)}
                      className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white transition hover:bg-white/10"
                    >
                      {copy.cueIntro}
                    </button>
                    <button
                      type="button"
                      onClick={() => appendPerformanceSnippet(`[${getPerformanceTimestamp()}] ${copy.cueBridge}`)}
                      className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white transition hover:bg-white/10"
                    >
                      {copy.cueBridge}
                    </button>
                    <button
                      type="button"
                      onClick={() => appendPerformanceSnippet(`[${getPerformanceTimestamp()}] ${copy.cueBreak}`)}
                      className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white transition hover:bg-white/10"
                    >
                      {copy.cueBreak}
                    </button>
                  </div>

                  <textarea
                    value={performanceNotesDraft}
                    onChange={(e) => setPerformanceNotesDraft(e.target.value)}
                    placeholder={copy.placeholder}
                    className="min-h-[220px] w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-base leading-7 text-white shadow-inner outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10"
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

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => savePerformanceNotes({ source: "manual" })}
                      disabled={savingPerformanceNotes || autoSavingPerformanceNotes || !hasPerformanceChanges}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingPerformanceNotes ? <Icons.Spinner className="h-4 w-4" /> : null}
                      {copy.saveNow}
                    </button>
                    <button
                      type="button"
                      onClick={handleSavePerformanceNotes}
                      disabled={savingPerformanceNotes}
                      className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-medium text-black transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingPerformanceNotes ? <Icons.Spinner className="h-4 w-4" /> : null}
                      {copy.saveAndClose}
                    </button>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

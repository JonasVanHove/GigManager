"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { useSettings } from "./SettingsProvider";
import { useToast } from "./ToastContainer";
import { createPrintDocument } from "@/lib/print-document";
import { supabaseClient } from "@/lib/supabase-client";

type SongRow = {
  id: string;
  title: string;
  notes: string | null;
  date: string;
  attachments?: Array<{ id: string; publicUrl: string; contentType?: string; caption?: string | null }>;
};

const isImageAttachment = (attachment: NonNullable<SongRow["attachments"]>[number]) =>
  attachment.contentType?.startsWith("image/") || /\.(avif|gif|jpe?g|png|webp)(?:[?#]|$)/i.test(attachment.publicUrl);

type SongMeta = {
  bandProject: string;
  genre: string;
  keySignature: string;
  bpm: string;
  comments: string;
};

type ApiSetlistItem = {
  id: string;
  order: number;
  type: string;
  title: string | null;
  notes: string | null;
  chords: string | null;
  tuning: string | null;
};

type SetlistMeta = {
  datum: string | null;
  locatie: string;
  notities: string;
  status: "concept" | "klaar" | "gearchiveerd";
  pauseOnTuningChange: boolean;
};

type DraftItem = {
  id: string;
  kind: "song" | "special";
  songId: string | null;
  label: string;
  artist: string;
  tuning: string;
  key: string;
  tempo: string;
  notitie: string;
  specialLabel: string;
  expanded: boolean;
};

type StoredSetlist = {
  id: string;
  userId: string;
  naam: string;
  datum: string | null;
  locatie: string | null;
  gigIds: string[];
  items: DraftItem[];
  notities: string;
  status: SetlistMeta["status"];
  pauseOnTuningChange: boolean;
  bandId?: string | null;
  band?: {
    id: string;
    name: string;
    color?: string | null;
    logoUrl?: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
};

type LinkedNote = {
  id: string;
  titel: string;
  inhoud: string;
  tags: string[];
};

type NotePayload = {
  titel?: unknown;
  inhoud?: unknown;
  tags?: unknown;
};

const SONG_META_START = "[[song-meta]]";
const SONG_META_END = "[[/song-meta]]";

const tuningGroups = ["Standard", "Capo I", "Capo II", "Capo III", "Capo IV", "Capo VI", "Downtuning", "Down Down", "Onbekend"];

const defaultSongMeta = (): SongMeta => ({ bandProject: "", genre: "", keySignature: "", bpm: "", comments: "" });

const parseSongNotes = (raw: string | null | undefined) => {
  const fallback = { meta: defaultSongMeta(), body: raw || "" };
  if (!raw || !raw.startsWith(SONG_META_START)) return fallback;

  const endIndex = raw.indexOf(SONG_META_END);
  if (endIndex < 0) return fallback;

  try {
    const metaJson = raw.slice(SONG_META_START.length, endIndex).trim();
    const body = raw.slice(endIndex + SONG_META_END.length).replace(/^\s+/, "");
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

const parseDateOnly = (value: string | null) => (value ? value.slice(0, 10) : "");

const defaultSetlistMeta = (): SetlistMeta => ({ datum: null, locatie: "", notities: "", status: "concept", pauseOnTuningChange: false });

const parseSetlistMeta = (description: string | null | undefined): SetlistMeta => {
  if (!description) return defaultSetlistMeta();
  try {
    const parsed = JSON.parse(description) as Partial<SetlistMeta> & { notes?: string; location?: string; date?: string };
    return {
      datum: typeof parsed.datum === "string" ? parsed.datum : typeof parsed.date === "string" ? parsed.date : null,
      locatie: typeof parsed.locatie === "string" ? parsed.locatie : typeof parsed.location === "string" ? parsed.location : "",
      notities: typeof parsed.notities === "string" ? parsed.notities : typeof parsed.notes === "string" ? parsed.notes : "",
      status: parsed.status === "klaar" || parsed.status === "gearchiveerd" || parsed.status === "concept" ? parsed.status : "concept",
      pauseOnTuningChange: Boolean(parsed.pauseOnTuningChange),
    };
  } catch {
    return { ...defaultSetlistMeta(), notities: description };
  }
};

const serializeSetlistMeta = (meta: SetlistMeta) =>
  JSON.stringify({
    datum: meta.datum,
    locatie: meta.locatie,
    notities: meta.notities,
    status: meta.status,
    pauseOnTuningChange: meta.pauseOnTuningChange,
  });

const songSortValue = (item: DraftItem) => Number(item.tempo || 0) || 0;

const tuningIndex = (value: string) => {
  const idx = tuningGroups.findIndex((group) => group.toLowerCase() === value.trim().toLowerCase());
  return idx < 0 ? tuningGroups.length - 1 : idx;
};

const tuningBadgeClass = (value: string) => {
  const key = value.trim().toLowerCase();
  if (key === "standard") return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30";
  if (key.startsWith("capo")) return "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30";
  if (key.includes("down")) return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30";
  return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
};

const createSongItem = (song: SongRow): DraftItem => {
  const parsed = parseSongNotes(song.notes);
  return {
    id: crypto.randomUUID(),
    kind: "song",
    songId: song.id,
    label: song.title,
    artist: parsed.meta.bandProject || parsed.meta.genre || "",
    tuning: parsed.meta.keySignature || "Onbekend",
    key: "",
    tempo: parsed.meta.bpm || "",
    notitie: "",
    specialLabel: "",
    expanded: false,
  };
};

const createSpecialItem = (label: string): DraftItem => ({
  id: crypto.randomUUID(),
  kind: "special",
  songId: null,
  label,
  artist: "",
  tuning: "",
  key: "",
  tempo: "",
  notitie: "",
  specialLabel: label,
  expanded: false,
});

const cloneItem = (item: DraftItem): DraftItem => ({ ...item });

const buildExportText = (setlist: StoredSetlist, songs: SongRow[]) => {
  const lines: string[] = [];
  lines.push(setlist.naam);
  if (setlist.datum) lines.push(`Datum: ${setlist.datum}`);
  if (setlist.locatie) lines.push(`Locatie: ${setlist.locatie}`);
  lines.push(`Status: ${setlist.status}`);
  lines.push("");

  setlist.items.forEach((item, index) => {
    if (item.kind === "special") {
      lines.push(`${index + 1}. ${item.specialLabel}`);
      return;
    }

    const song = songs.find((entry) => entry.id === item.songId);
    const title = song?.title || item.label;
    const meta = [item.artist, item.tuning, item.key, item.tempo ? `${item.tempo} bpm` : ""].filter(Boolean).join(" · ");
    lines.push(`${index + 1}. ${title}${meta ? ` — ${meta}` : ""}`);
    if (item.notitie.trim()) lines.push(`   ${item.notitie.trim()}`);
  });

  if (setlist.notities.trim()) {
    lines.push("");
    lines.push("Notities:");
    lines.push(setlist.notities.trim());
  }

  return lines.join("\n");
};

type GigOption = {
  id: string;
  eventName: string;
  date?: string | null;
};

const normalizeGigOptions = (payload: unknown): GigOption[] => {
  const rows = Array.isArray(payload)
    ? payload
    : (payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown[] }).data))
      ? (payload as { data: unknown[] }).data
      : [];

  return rows
    .filter((row): row is { id: string; eventName?: string; date?: string | null } => Boolean(row && typeof row === "object" && typeof (row as { id?: unknown }).id === "string"))
    .map((row) => ({
      id: row.id,
      eventName: typeof row.eventName === "string" && row.eventName.trim() ? row.eventName : "Untitled gig",
      date: typeof row.date === "string" ? row.date : null,
    }));
};

export default function SetlistsTab() {
  const { session, getAccessToken } = useAuth();
  const { locale, settings } = useSettings();
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [songs, setSongs] = useState<SongRow[]>([]);
  const [gigsList, setGigsList] = useState<GigOption[]>([]);
  const [bandsList, setBandsList] = useState<Array<{ id: string; name: string; logoUrl?: string; color?: string | null }>>([]);
  const [setlists, setSetlists] = useState<StoredSetlist[]>([]);
  const [notes, setNotes] = useState<LinkedNote[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<StoredSetlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingState, setSavingState] = useState<"saved" | "saving" | "dirty">("saved");
  const [statusFilter, setStatusFilter] = useState<"alle" | SetlistMeta["status"]>("alle");
  const [songSearch, setSongSearch] = useState("");
  const [attachmentFilter, setAttachmentFilter] = useState<"all" | "with" | "without">("all");
  const [showPerformanceMode, setShowPerformanceMode] = useState(false);
  const [showGeneralNotes, setShowGeneralNotes] = useState(true);
  const [showTuningPanel, setShowTuningPanel] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [error, setError] = useState("");
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [drawerSongId, setDrawerSongId] = useState<string | null>(null);
  const [itemAttachments, setItemAttachments] = useState<Map<string, Array<{ id: string; url: string; type: string; title?: string }>>>(new Map());
  const [uploadingAttachment, setUploadingAttachment] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftVersionRef = useRef(0);

  const isDutch = locale.startsWith("nl");

  const copy = useMemo(() => ({
    title: isDutch ? "Setlists" : "Setlists",
    newSetlist: isDutch ? "Nieuwe setlist" : "New setlist",
    searchSongs: isDutch ? "Zoek in repertoire" : "Search repertoire",
    save: isDutch ? "Opslaan" : "Save",
    saved: isDutch ? "Opgeslagen" : "Saved",
    saving: isDutch ? "Opslaan..." : "Saving...",
    performanceMode: isDutch ? "Uitvoermodus" : "Performance mode",
    backToEditor: isDutch ? "Terug naar editor" : "Back to editor",
    export: isDutch ? "Exporteer" : "Export",
    duplicate: isDutch ? "Dupliceer" : "Duplicate",
    autoGenerate: isDutch ? "Auto-genereer" : "Auto-generate",
    addSong: isDutch ? "Voeg toe" : "Add",
    pause: isDutch ? "⏸ PAUZE" : "⏸ PAUSE",
    bis: isDutch ? "🎸 BIS" : "🎸 ENCORE",
    customBlock: isDutch ? "＋ Aangepast blok" : "＋ Custom block",
    noSetlists: isDutch ? "Maak je eerste setlist aan" : "Create your first setlist",
    noSelection: isDutch ? "Selecteer een setlist of maak een nieuwe aan" : "Select a setlist or create a new one",
    name: isDutch ? "Naam" : "Name",
    location: isDutch ? "Locatie" : "Location",
    generalNotes: isDutch ? "Algemene setlist notities" : "General setlist notes",
    tuningPanel: isDutch ? "Tuning uitleg" : "Tuning explanation",
    linkedNotes: isDutch ? "Gekoppelde nota's" : "Linked notes",
    songPicker: isDutch ? "Repertoire" : "Repertoire",
    create: isDutch ? "Maken" : "Create",
    cancel: isDutch ? "Annuleren" : "Cancel",
    statusAll: isDutch ? "Alle" : "All",
  }), [isDutch]);

  const activeDraft = draft;
  const songOccurrences = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of activeDraft?.items || []) {
      if (item.kind === "song" && item.songId) counts.set(item.songId, (counts.get(item.songId) || 0) + 1);
    }
    return counts;
  }, [activeDraft?.items]);
  const selectedSetlist = useMemo(() => (selectedId ? setlists.find((setlist) => setlist.id === selectedId) || null : null), [selectedId, setlists]);
  const currentItems = useMemo(() => (draft?.items || selectedSetlist?.items || []).slice(), [draft?.items, selectedSetlist?.items]);
  const activeSongMap = useMemo(() => new Map(songs.map((song) => [song.id, song])), [songs]);
  const songNoteMap = useMemo(() => {
    const map = new Map<string, LinkedNote[]>();
    for (const note of notes) {
      const key = note.id;
      const list = map.get(key) || [];
      list.push(note);
      map.set(key, list);
    }
    return map;
  }, [notes]);

  const linkedNotesForSong = useCallback((songId: string) => {
    return notes.filter((note) => note.id === songId || note.titel.toLowerCase().includes(songId.toLowerCase()));
  }, [notes]);

  const filteredSetlists = useMemo(
    () => setlists.filter((setlist) => (statusFilter === "alle" ? true : setlist.status === statusFilter)),
    [setlists, statusFilter]
  );

  const statusLabels = useMemo(() => (({
    alle: isDutch ? "Alle" : "All",
    concept: isDutch ? "Concept" : "Draft",
    klaar: isDutch ? "Klaar" : "Ready",
    gearchiveerd: isDutch ? "Gearchiveerd" : "Archived",
  })), [isDutch]);

  const statusTooltips = useMemo(() => ({
    alle: isDutch ? "Toon alle setlists" : "Show all setlists",
    concept: isDutch ? "Toon concept setlists (nog in bewerking)" : "Show draft setlists (still in progress)",
    klaar: isDutch ? "Toon klaargemaakte setlists" : "Show ready setlists",
    gearchiveerd: isDutch ? "Toon gearchiveerde setlists" : "Show archived setlists",
  }), [isDutch]);

  const statusIcons = useMemo(() => ({
    alle: "◉",
    concept: "✎",
    klaar: "✓",
    gearchiveerd: "🗂",
  }), []);

  const songGroups = useMemo(() => {
    const query = songSearch.trim().toLowerCase();
    const songsByGroup = new Map<string, SongRow[]>();

    // Fuzzy search with match explanations
    const fuzzySearchSongs = (songs: SongRow[], query: string): { song: SongRow; matchReasons: string[] }[] => {
      if (!query.trim()) return songs.map(s => ({ song: s, matchReasons: [] }));
      
      const q = query.toLowerCase().trim();
      const results: { song: SongRow; score: number; matchReasons: string[] }[] = [];
      
      for (const song of songs) {
        const parsed = parseSongNotes(song.notes);
        let score = 0;
        const reasons: string[] = [];
        
        // Check title (exact match gets highest score)
        if (song.title.toLowerCase() === q) {
          score += 100;
          reasons.push(isDutch ? "Exacte titelmatch" : "Exact title match");
        } else if (song.title.toLowerCase().includes(q)) {
          score += 50;
          reasons.push(isDutch ? "Titel bevat zoekterm" : "Title contains search term");
        } else {
          // Fuzzy title match (allow 1-2 character differences)
          const titleLower = song.title.toLowerCase();
          let matches = 0;
          let qIndex = 0;
          for (const char of titleLower) {
            if (qIndex < q.length && char === q[qIndex]) {
              matches++;
              qIndex++;
            }
          }
          if (matches >= q.length * 0.7) {
            score += 25;
            reasons.push(isDutch ? "Gedeeltelijke titelmatch" : "Partial title match");
          }
        }
        
        // Check body content
        if (parsed.body.toLowerCase().includes(q)) {
          score += 30;
          reasons.push(isDutch ? "In songtekst" : "In lyrics");
        }
        
        // Check metadata fields
        if (parsed.meta.bandProject?.toLowerCase().includes(q)) {
          score += 20;
          reasons.push(isDutch ? "In band/project" : "In band/project");
        }
        if (parsed.meta.genre?.toLowerCase().includes(q)) {
          score += 15;
          reasons.push(isDutch ? "In genre" : "In genre");
        }
        if (parsed.meta.keySignature?.toLowerCase().includes(q)) {
          score += 15;
          reasons.push(isDutch ? "In toonsoort" : "In key signature");
        }
        if (parsed.meta.bpm?.toLowerCase().includes(q)) {
          score += 10;
          reasons.push(isDutch ? "In BPM" : "In BPM");
        }
        if (parsed.meta.comments?.toLowerCase().includes(q)) {
          score += 10;
          reasons.push(isDutch ? "In opmerkingen" : "In comments");
        }
        
        if (score > 0) {
          results.push({ song, score, matchReasons: reasons });
        }
      }
      
      // Sort by score descending and return songs with reasons
      return results.sort((a, b) => b.score - a.score).map(r => ({ song: r.song, matchReasons: r.matchReasons }));
    };

    const filteredSongs = query ? fuzzySearchSongs(songs, query) : songs.map(s => ({ song: s, matchReasons: [] }));

    for (const item of filteredSongs) {
      const song = 'song' in item ? item.song : item;
      const parsed = parseSongNotes(song.notes);
      const tuning = parsed.meta.keySignature || "Onbekend";
      const hasImages = Boolean(song.attachments?.some(isImageAttachment));
      if ((attachmentFilter === "with" && !hasImages) || (attachmentFilter === "without" && hasImages)) continue;
      const list = songsByGroup.get(tuning) || [];
      list.push(song);
      songsByGroup.set(tuning, list);
    }

    return Array.from(songsByGroup.entries())
      .map(([tuning, list]) => [tuning, list.slice().sort((a, b) => a.title.localeCompare(b.title))] as const)
      .sort((a, b) => tuningIndex(a[0]) - tuningIndex(b[0]));
  }, [attachmentFilter, songSearch, songs]);

  const repertoireImageStats = useMemo(() => {
    const withImages = songs.filter((song) => song.attachments?.some(isImageAttachment)).length;
    return { withImages, withoutImages: songs.length - withImages };
  }, [songs]);

  const exportText = useMemo(() => (draft ? buildExportText(draft, songs) : ""), [draft, songs]);

  const tuningExplanation = useMemo(() => {
    const lines: string[] = [];
    let previousTuning = "";
    let sawFirstSong = false;

    for (const item of currentItems) {
      if (item.kind === "special") {
        const label = item.specialLabel.toUpperCase();
        if (label.includes("PAUZE")) lines.push("Goed moment voor tuningwissel");
        else if (label.includes("BIS")) lines.push("BIS-nummer");
        continue;
      }

      if (!sawFirstSong) {
        lines.push("Opener");
        sawFirstSong = true;
      } else if ((item.tuning || "Onbekend") === previousTuning) {
        lines.push(`✓ ${item.tuning || "Onbekend"} — geen wissel`);
      } else {
        lines.push(`⚠ Tuningwissel: ${previousTuning || "Onbekend"} → ${item.tuning || "Onbekend"}`);
      }
      previousTuning = item.tuning || "Onbekend";
    }

    return lines;
  }, [currentItems]);

  const loadNotes = useCallback(async () => {
    if (!session?.user) return;
    const token = await getAccessToken();
    if (!token) return;

    const response = await fetch("/api/notes", { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return;
    const rows = (await response.json()) as Array<{ id: string; noteType?: string; photoName?: string | null; notes?: unknown; linkedBand?: string | null; createdAt: string; updatedAt: string }>;
    const textRows = rows.filter((row) => row.noteType === "text");
    setNotes(textRows.map((row) => {
      const raw = typeof row.notes === "string" ? safeJson<NotePayload>(row.notes, {}) : (row.notes as NotePayload | undefined) || {};
      return {
        id: row.id,
        titel: typeof raw.titel === "string" ? raw.titel : row.photoName || "",
        inhoud: typeof raw.inhoud === "string" ? raw.inhoud : "",
        tags: Array.isArray(raw.tags) ? raw.tags.filter((tag): tag is string => typeof tag === "string") : [],
      } satisfies LinkedNote;
    }));
  }, [getAccessToken, session?.user]);

  const loadData = useCallback(async () => {
    if (!session?.user) {
      setSongs([]);
      setSetlists([]);
      setNotes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = await getAccessToken();
      if (!token) return;

      const [songsResponse, setlistsResponse, bandsResponse] = await Promise.all([
        fetch("/api/songs", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/setlists", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/bands", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!songsResponse.ok) throw new Error(isDutch ? "Songs laden mislukt" : "Failed to load songs");
      if (!setlistsResponse.ok) throw new Error(isDutch ? "Setlists laden mislukt" : "Failed to load setlists");

      const songPayload = (await songsResponse.json()) as Array<{ id: string; title: string; notes?: string | null; date: string; attachments?: any[] }>;
      const setlistPayload = (await setlistsResponse.json()) as Array<{ id: string; title?: string; description?: string | null; items?: ApiSetlistItem[]; gigs?: Array<{ id: string; eventName?: string; date?: string | null }>; createdAt: string; updatedAt: string }>;
      const bandsPayload = (await bandsResponse.json()) as Array<{ id: string; name: string; logoUrl?: string; color?: string | null }>;
      
      setBandsList(bandsPayload || []);
      const songIdByTitle = new Map((Array.isArray(songPayload) ? songPayload : []).map((song) => [song.title.trim().toLocaleLowerCase(), song.id]));

      const currentUserId = session.user?.id;
      if (!currentUserId) throw new Error("Missing user id");

      const hydratedSetlists: StoredSetlist[] = Array.isArray(setlistPayload)
        ? setlistPayload.map((setlist) => {
            const meta = parseSetlistMeta(setlist.description);
            const items: DraftItem[] = Array.isArray(setlist.items)
              ? setlist.items.map((item) => ({
                  id: item.id,
                  kind: item.type === "song" ? "song" : "special",
                  // The API stores a setlist item's title, not a song foreign
                  // key. Restore the repertoire link so image badges, exports
                  // and duplicate counters remain available after a reload.
                  songId: item.type === "song" ? songIdByTitle.get((item.title || "").trim().toLocaleLowerCase()) || null : null,
                  label: item.title || "",
                  artist: "",
                  tuning: item.tuning || "Onbekend",
                  key: item.chords || "",
                  tempo: item.notes || "",
                  notitie: item.notes || "",
                  specialLabel: item.type === "note" ? item.title || "" : "",
                  expanded: false,
                }))
              : [];

            return {
              id: setlist.id,
              userId: currentUserId,
              naam: setlist.title || "Untitled setlist",
              datum: meta.datum,
              locatie: meta.locatie,
              gigIds: Array.isArray(setlist.gigs) ? setlist.gigs.map((gig) => gig.id) : [],
              items,
              notities: meta.notities,
              status: meta.status,
              pauseOnTuningChange: meta.pauseOnTuningChange,
              bandId: (setlist as any).bandId || null,
              band: (setlist as any).band || null,
              createdAt: setlist.createdAt,
              updatedAt: setlist.updatedAt,
            };
          })
        : [];

      setSongs(Array.isArray(songPayload) ? songPayload.map((song) => ({ id: song.id, title: song.title, notes: song.notes || null, date: song.date, attachments: song.attachments || [] })) : []);
      setSetlists(hydratedSetlists);

      if (!selectedId && hydratedSetlists[0]) {
        const first = hydratedSetlists[0];
        setSelectedId(first.id);
        setDraft(JSON.parse(JSON.stringify(first)) as StoredSetlist);
        setSavingState("saved");
      }

      // These datasets are secondary to opening the setlist editor. Loading
      // them in the background makes the initial editor render immediate.
      void loadNotes();
      void (async () => {
        try {
          const gigsRes = await fetch('/api/gigs', { headers: { Authorization: `Bearer ${token}` } });
          if (gigsRes.ok) {
            const gigsJson = await gigsRes.json();
            setGigsList(normalizeGigOptions(gigsJson));
          }
        } catch {
          // A gig assignment can be retried later; it must not delay setlists.
        }
      })();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, isDutch, loadNotes, session?.user, selectedId, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle URL parameter to open specific setlist from gig card
  useEffect(() => {
    const setlistIdFromUrl = searchParams.get('setlist');
    if (setlistIdFromUrl && setlists.length > 0) {
      const targetSetlist = setlists.find(s => s.id === setlistIdFromUrl);
      if (targetSetlist && selectedId !== setlistIdFromUrl) {
        setSelectedId(setlistIdFromUrl);
        setDraft(JSON.parse(JSON.stringify(targetSetlist)) as StoredSetlist);
        setSavingState("saved");
        // Clean up URL parameter
        router.replace('/?tab=setlists', { scroll: false });
      }
    }
  }, [searchParams, setlists, selectedId, router]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const updateDraft = useCallback((patch: Partial<StoredSetlist>) => {
    draftVersionRef.current += 1;
    setDraft((current) => {
      if (!current) return current;
      return { ...current, ...patch, updatedAt: new Date().toISOString() };
    });
    setSavingState("dirty");
  }, []);

  const updateDraftItems = useCallback((update: (items: DraftItem[]) => DraftItem[]) => {
    draftVersionRef.current += 1;
    setDraft((current) => current ? {
      ...current,
      items: update(current.items),
      updatedAt: new Date().toISOString(),
    } : current);
    setSavingState("dirty");
  }, []);

  const selectSetlist = useCallback((setlist: StoredSetlist) => {
    draftVersionRef.current += 1;
    setSelectedId(setlist.id);
    setDraft(JSON.parse(JSON.stringify(setlist)));
    setSavingState("saved");
    setShowPerformanceMode(false);
    setActiveItemId(null);
    // Auto-collapse sidebar on mobile when setlist is selected
    setSidebarCollapsed(true);
  }, []);

  const saveDraft = useCallback(async (nextDraft: StoredSetlist, version: number) => {
    if (!session?.user) return;
    setSavingState("saving");
    const token = await getAccessToken();
    if (!token) return;

    const payload = {
      title: nextDraft.naam.trim() || (isDutch ? "Nieuwe setlist" : "New setlist"),
      description: serializeSetlistMeta({
        datum: nextDraft.datum,
        locatie: nextDraft.locatie || "",
        notities: nextDraft.notities,
        status: nextDraft.status,
        pauseOnTuningChange: nextDraft.pauseOnTuningChange,
      }),
      items: nextDraft.items.map((item, index) => ({
        type: item.kind === "song" ? "song" : "note",
        title: item.kind === "song" ? item.label : item.specialLabel,
        notes: item.kind === "song" ? item.notitie || null : item.notitie || null,
        chords: item.kind === "song" ? item.key || null : null,
        tuning: item.kind === "song" ? item.tuning || null : null,
        order: index + 1,
      })),
      gigIds: nextDraft.gigIds,
      bandId: nextDraft.bandId || null,
    };

    const response = await fetch(`/api/setlists/${nextDraft.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(isDutch ? "Opslaan mislukt" : "Save failed");
    }

    const refreshed = (await response.json()) as { id: string; title?: string; description?: string | null; gigs?: Array<{ id: string }>; createdAt: string; updatedAt: string; bandId?: string | null; band?: any };
    const meta = parseSetlistMeta(refreshed.description);
    const saved: StoredSetlist = {
      id: refreshed.id,
      userId: nextDraft.userId,
      naam: refreshed.title || nextDraft.naam,
      datum: meta.datum,
      locatie: meta.locatie,
      gigIds: Array.isArray(refreshed.gigs) ? refreshed.gigs.map((gig) => gig.id) : nextDraft.gigIds,
      items: nextDraft.items.map(cloneItem),
      notities: meta.notities,
      status: meta.status,
      pauseOnTuningChange: meta.pauseOnTuningChange,
      bandId: refreshed.bandId || nextDraft.bandId || null,
      band: refreshed.band || nextDraft.band || null,
      createdAt: refreshed.createdAt,
      updatedAt: refreshed.updatedAt,
    };

    // Never replace the live editor with an older network response. This was
    // the cause of quick additions/reorders appearing to undo themselves.
    if (draftVersionRef.current === version) {
      setSetlists((prev) => [saved, ...prev.filter((item) => item.id !== saved.id)]);
      setSelectedId(saved.id);
      setSavingState("saved");
    }
  }, [getAccessToken, isDutch, session?.user]);

  useEffect(() => {
    if (!draft || savingState !== "dirty") return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const version = draftVersionRef.current;
    saveTimerRef.current = setTimeout(() => {
      saveDraft(draft, version).catch((err) => toast.error(err instanceof Error ? err.message : String(err)));
    }, 800);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [draft, saveDraft, savingState, toast]);

  const createSetlist = useCallback(async () => {
    if (!newName.trim() || !session?.user) return;
    try {
      const token = await getAccessToken();
      if (!token) return;
      const response = await fetch("/api/setlists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newName.trim(),
          description: serializeSetlistMeta({
            datum: newDate || null,
            locatie: newLocation.trim(),
            notities: "",
            status: "concept",
            pauseOnTuningChange: false,
          }),
          items: [],
        }),
      });

      if (!response.ok) throw new Error(isDutch ? "Setlist aanmaken mislukt" : "Failed to create setlist");

      const created = (await response.json()) as { id: string; title?: string; description?: string | null; createdAt: string; updatedAt: string };
      const meta = parseSetlistMeta(created.description);
      const next: StoredSetlist = {
        id: created.id,
        userId: session.user.id,
        naam: created.title || newName.trim(),
        datum: meta.datum,
        locatie: meta.locatie,
        gigIds: [],
        items: [],
        notities: meta.notities,
        status: meta.status,
        pauseOnTuningChange: meta.pauseOnTuningChange,
        bandId: null,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      };

      setSetlists((prev) => [next, ...prev]);
      selectSetlist(next);
      setShowCreateModal(false);
      setNewName("");
      setNewDate("");
      setNewLocation("");
      toast.success(isDutch ? "Setlist aangemaakt" : "Setlist created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }, [getAccessToken, isDutch, newDate, newLocation, newName, selectSetlist, session?.user, toast]);

  const duplicateSetlist = useCallback(async () => {
    if (!draft || !session?.user) return;
    try {
      const token = await getAccessToken();
      if (!token) return;
      const response = await fetch("/api/setlists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: `${draft.naam} (kopie)`,
          description: serializeSetlistMeta({
            datum: draft.datum,
            locatie: draft.locatie || "",
            notities: draft.notities,
            status: "concept",
            pauseOnTuningChange: draft.pauseOnTuningChange,
          }),
          items: draft.items.map((item, index) => ({
            type: item.kind === "song" ? "song" : "note",
            title: item.kind === "song" ? item.label : item.specialLabel,
            notes: item.notitie || null,
            chords: item.key || null,
            tuning: item.tuning || null,
            order: index + 1,
          })),
        }),
      });

      if (!response.ok) throw new Error(isDutch ? "Kopiëren mislukt" : "Duplicate failed");

      const created = (await response.json()) as { id: string; title?: string; description?: string | null; createdAt: string; updatedAt: string };
      const meta = parseSetlistMeta(created.description);
      const next: StoredSetlist = {
        id: created.id,
        userId: draft.userId,
        naam: created.title || `${draft.naam} (kopie)`,
        datum: meta.datum,
        locatie: meta.locatie,
        gigIds: [],
        items: draft.items.map(cloneItem),
        notities: meta.notities,
        status: meta.status,
        pauseOnTuningChange: meta.pauseOnTuningChange,
        bandId: draft.bandId || null,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      };

      setSetlists((prev) => [next, ...prev]);
      toast.success(isDutch ? "Setlist gedupliceerd" : "Setlist duplicated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }, [draft, getAccessToken, isDutch, session?.user, toast]);

  const assignSetlistToGig = useCallback(async (gigId: string | null) => {
    if (!draft) return;
    try {
      const token = await getAccessToken();
      if (!token) return;

      const nextGigIds = gigId ? [gigId] : [];
      
      // Get gig info to sync bandId, band info, date, and location
      let bandId = draft.bandId || null;
      let bandInfo = draft.band || null;
      let gigDatum = draft.datum || null;
      let gigLocatie = draft.locatie || null;
      
      if (gigId) {
        const gigRes = await fetch(`/api/gigs/${gigId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (gigRes.ok) {
          const gigData = await gigRes.json();
          bandId = gigData.bandId || null;
          gigDatum = gigData.date ? gigData.date.split('T')[0] : null;
          gigLocatie = gigData.eventName || null;
          
          // Fetch band info if bandId is present
          if (bandId) {
            const bandRes = await fetch(`/api/bands`, { headers: { Authorization: `Bearer ${token}` } });
            if (bandRes.ok) {
              const bands = await bandRes.json();
              const band = bands.find((b: any) => b.id === bandId);
              if (band) {
                bandInfo = { id: band.id, name: band.name, color: band.color, logoUrl: band.logoUrl };
              }
            }
          }
        }
      }

      const res = await fetch(`/api/setlists/${draft.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ gigIds: nextGigIds, datum: gigDatum, locatie: gigLocatie, bandId }),
      });

      if (!res.ok) throw new Error(gigId ? (isDutch ? 'Toewijzen mislukt' : 'Assign failed') : (isDutch ? 'Ontkoppelen mislukt' : 'Unassign failed'));

      const refreshed = (await res.json()) as { gigs?: Array<{ id: string }>; bandId?: string | null; band?: any; datum?: string | null; locatie?: string | null };
      const resolvedGigIds = Array.isArray(refreshed.gigs) ? refreshed.gigs.map((gig) => gig.id) : nextGigIds;

      setDraft((current) => current ? { 
        ...current, 
        gigIds: resolvedGigIds, 
        bandId: refreshed.bandId || null, 
        band: refreshed.band || bandInfo,
        datum: refreshed.datum || gigDatum || null,
        locatie: refreshed.locatie || gigLocatie || null
      } : current);
      setSetlists((prev) =>
        prev.map((setlist) => {
          if (setlist.id === draft.id) {
            return { 
              ...setlist, 
              gigIds: resolvedGigIds, 
              bandId: refreshed.bandId || null, 
              band: refreshed.band || bandInfo,
              datum: refreshed.datum || gigDatum || null,
              locatie: refreshed.locatie || gigLocatie || null
            };
          }
          return gigId && setlist.gigIds.includes(gigId)
            ? { ...setlist, gigIds: setlist.gigIds.filter((id) => id !== gigId) }
            : setlist;
        })
      );

      toast.success(gigId ? (isDutch ? 'Setlist toegewezen' : 'Setlist assigned') : (isDutch ? 'Setlist ontkoppeld' : 'Setlist unassigned'));

      const gigsRes = await fetch('/api/gigs', { headers: { Authorization: `Bearer ${await getAccessToken()}` } });
      if (gigsRes.ok) {
        const gigsJson = await gigsRes.json();
        setGigsList(normalizeGigOptions(gigsJson));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }, [draft, getAccessToken, isDutch, toast]);

  const deleteSetlist = useCallback(async (setlistId: string) => {
    if (!window.confirm(isDutch ? "Deze setlist verwijderen?" : "Delete this setlist?")) return;
    const token = await getAccessToken();
    if (!token) return;
    const response = await fetch(`/api/setlists/${setlistId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      toast.error(isDutch ? "Verwijderen mislukt" : "Delete failed");
      return;
    }
    setSetlists((prev) => prev.filter((item) => item.id !== setlistId));
    if (selectedId === setlistId) {
      setSelectedId(null);
      setDraft(null);
    }
  }, [getAccessToken, isDutch, selectedId, toast]);

  const addSong = useCallback((song: SongRow) => {
    updateDraftItems((items) => [...items, createSongItem(song)]);
  }, [updateDraftItems]);

  const addSpecial = useCallback((label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    updateDraftItems((items) => [...items, createSpecialItem(trimmed)]);
  }, [updateDraftItems]);

  const updateItem = useCallback((itemId: string, patch: Partial<DraftItem>) => {
    updateDraftItems((items) => items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)));
  }, [updateDraftItems]);

  const removeItem = useCallback((itemId: string) => {
    updateDraftItems((items) => items.filter((item) => item.id !== itemId));
  }, [updateDraftItems]);

  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    updateDraftItems((items) => {
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) return items;
      const copy = items.slice();
      const [item] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, item);
      return copy;
    });
  }, [updateDraftItems]);

  const moveItemById = useCallback((itemId: string, direction: -1 | 1) => {
    updateDraftItems((items) => {
      const index = items.findIndex((item) => item.id === itemId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= items.length) return items;
      const copy = items.slice();
      const [item] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, item);
      return copy;
    });
  }, [updateDraftItems]);

  const autoGenerate = useCallback(() => {
    if (!draft) return;
    const songsOnly = draft.items.filter((item) => item.kind === "song");
    const specials = draft.items.filter((item) => item.kind === "special");
    const orderedSongs = tuningGroups.flatMap((group) =>
      songsOnly
        .filter((item) => (item.tuning || "Onbekend").toLowerCase() === group.toLowerCase())
        .sort((a, b) => songSortValue(b) - songSortValue(a))
    );

    const rebuilt: DraftItem[] = [];
    orderedSongs.forEach((item, index) => {
      rebuilt.push({ ...cloneItem(item), id: crypto.randomUUID(), expanded: false });
      const next = orderedSongs[index + 1];
      if (draft.pauseOnTuningChange && next && (item.tuning || "Onbekend") !== (next.tuning || "Onbekend")) {
        rebuilt.push(createSpecialItem("PAUZE"));
      }
    });

    const preservedSpecials = specials.filter((item) => !["PAUZE", "BIS"].includes(item.specialLabel.toUpperCase()));
    updateDraft({ items: [...rebuilt, ...preservedSpecials] });
  }, [draft, updateDraft]);

  const openNoteTab = useCallback((noteId: string) => {
    router.push(`?tab=notes&noteId=${noteId}`, { scroll: false } as any);
  }, [router]);

  const toggleDrawerSong = (songId: string) => {
    setDrawerSongId((current) => (current === songId ? null : songId));
  };

  const loadItemAttachments = useCallback(async (itemId: string) => {
    if (!session?.user) return;
    try {
      const token = await getAccessToken();
      if (!token) return;
      
      const response = await fetch(`/api/setlist-items/${itemId}/attachments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const attachments = await response.json();
        setItemAttachments(prev => new Map(prev).set(itemId, attachments));
      }
    } catch (error) {
      console.error('Failed to load attachments:', error);
    }
  }, [session, getAccessToken]);

  const handleAttachmentUpload = async (itemId: string, file: File) => {
    if (!session?.user) return;
    setUploadingAttachment(itemId);
    
    try {
      const token = await getAccessToken();
      if (!token) return;
      
      // Upload to Supabase
      const ext = file.name.split('.').pop() || 'png';
      const fileName = `setlist-item-${itemId}-${Date.now()}.${ext}`;
      
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('songs')
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabaseClient.storage
        .from('songs')
        .getPublicUrl(fileName);
      
      // Create attachment record
      const response = await fetch(`/api/setlist-items/${itemId}/attachments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          url: publicUrl,
          type: file.type.startsWith('image/') ? 'image' : 'file',
          title: file.name,
          mimeType: file.type,
          fileSize: file.size,
        }),
      });
      
      if (response.ok) {
        await loadItemAttachments(itemId);
        toast.success(isDutch ? 'Bijlage toegevoegd' : 'Attachment added');
      }
    } catch (error) {
      console.error('Failed to upload attachment:', error);
      toast.error(isDutch ? 'Upload mislukt' : 'Upload failed');
    } finally {
      setUploadingAttachment(null);
    }
  };

  const handleDeleteAttachment = async (itemId: string, attachmentId: string) => {
    if (!session?.user) return;
    
    try {
      const token = await getAccessToken();
      if (!token) return;
      
      const response = await fetch(`/api/setlist-items/${itemId}/attachments/${attachmentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        await loadItemAttachments(itemId);
        toast.success(isDutch ? 'Bijlage verwijderd' : 'Attachment deleted');
      }
    } catch (error) {
      console.error('Failed to delete attachment:', error);
      toast.error(isDutch ? 'Verwijderen mislukt' : 'Delete failed');
    }
  };

  const renderItem = (item: DraftItem, index: number, performance = false) => {
    if (item.kind === "special") {
      if (performance) {
        return (
          <div key={item.id} className="rounded-3xl border border-dashed border-slate-300 bg-slate-100/80 px-4 py-5 text-center text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200">
            {item.specialLabel}
            {item.specialLabel.toUpperCase().includes("PAUZE") && <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">15 min</div>}
          </div>
        );
      }
      return (
        <div
          key={item.id}
          draggable
          onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const from = Number(event.dataTransfer.getData("text/plain"));
            if (!Number.isNaN(from)) moveItem(from, index);
          }}
          className="rounded-3xl border border-dashed border-slate-300 bg-slate-100/80 px-4 py-3 text-center text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200"
        >
          <div className="flex items-center justify-between gap-2">
            <span>{item.specialLabel}</span>
            <div className="flex gap-1">
              <button type="button" onClick={() => moveItemById(item.id, -1)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" title={isDutch ? "Omhoog" : "Move up"}>↑</button>
              <button type="button" onClick={() => moveItemById(item.id, 1)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" title={isDutch ? "Omlaag" : "Move down"}>↓</button>
              <button type="button" onClick={() => removeItem(item.id)} className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10">×</button>
            </div>
          </div>
        </div>
      );
    }

    const song = item.songId ? activeSongMap.get(item.songId) : null;
    const songNotes = item.songId ? linkedNotesForSong(item.songId) : [];
    const hasImages = Boolean(song?.attachments?.some(isImageAttachment));
    const tuningChanged = index > 0 ? (currentItems[index - 1]?.kind === "song" ? (currentItems[index - 1].tuning || "Onbekend") !== (item.tuning || "Onbekend") : false) : false;

    if (performance) {
      return (
        <section key={item.id} className={`rounded-3xl border px-5 py-5 ${activeItemId === item.id ? "border-brand-400 bg-brand-500/10" : "border-white/10 bg-white/5"}`}>
          <button type="button" onClick={() => setActiveItemId(item.id)} className="flex w-full items-start justify-between gap-4 text-left">
            <div className="min-w-0">
              <div className="text-4xl font-black text-white/90">{index + 1}</div>
              <div className="mt-2 text-2xl font-semibold">{song?.title || item.label}</div>
              {hasImages && <div className="mt-2 text-sm font-medium text-cyan-200">🖼️ {isDutch ? "Notitie-afbeelding beschikbaar" : "Image note available"}</div>}
              {item.artist && <div className="text-sm text-slate-300">{item.artist}</div>}
            </div>
            <div className="flex flex-col items-end gap-2 text-right">
              <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${tuningBadgeClass(item.tuning || "Onbekend")}`}>{item.tuning || "Onbekend"}</span>
              <div className="text-sm text-slate-300">{item.key || ""} {item.tempo ? `· ${item.tempo}` : ""}</div>
            </div>
          </button>
          {item.notitie && <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-base text-slate-100">{item.notitie}</div>}
          {songNotes.length > 0 && (
            <div className="mt-4 space-y-3">
              {songNotes.map((note) => (
                <details key={note.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-100">{note.titel}</summary>
                  <div className="mt-3 whitespace-pre-wrap text-sm text-slate-300">{note.inhoud}</div>
                  <div className="mt-3 flex justify-end">
                    <button type="button" onClick={() => openNoteTab(note.id)} className="text-sm font-semibold text-brand-300 hover:underline">
                      {isDutch ? "Bewerk nota" : "Edit note"}
                    </button>
                  </div>
                </details>
              ))}
            </div>
          )}
        </section>
      );
    }

    return (
      <div
        key={item.id}
        draggable
        onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const from = Number(event.dataTransfer.getData("text/plain"));
          if (!Number.isNaN(from)) moveItem(from, index);
        }}
        className={`rounded-3xl border p-4 transition ${activeItemId === item.id ? "border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-500/10" : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"}`}
      >
        <div className="flex items-start gap-2 sm:gap-4 min-w-0 max-w-full">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xs sm:text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {index + 1}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
              <div className="truncate text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">{song?.title || item.label}</div>
              {item.artist && <span className="text-xs text-slate-500 dark:text-slate-400">{item.artist}</span>}
              <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${tuningBadgeClass(item.tuning || "Onbekend")}`}>{item.tuning || "Onbekend"}</span>
              {item.key && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{item.key}</span>}
              {item.tempo && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{item.tempo}</span>}
              {hasImages && <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-xs font-semibold text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300" title={isDutch ? "Afbeelding wordt meegenomen in de PDF" : "Image is included in the PDF"}>🖼️ {isDutch ? "Afbeelding" : "Image"}</span>}
              {tuningChanged && <span className="text-sm text-amber-600">⚠</span>}
            </div>
            {item.notitie && <div className="mt-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-2.5 sm:p-3 text-xs sm:text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">{item.notitie}</div>}
            {item.songId && songNoteMap.get(item.songId)?.length ? (
              <div className="mt-2 sm:mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={(event) => { event.stopPropagation(); toggleDrawerSong(item.songId || ""); }} className="rounded-full border border-slate-200 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" title={isDutch ? "Gekoppelde notities" : "Linked notes"} aria-label={isDutch ? "Gekoppelde notities" : "Linked notes"}>
                  📝 {songNoteMap.get(item.songId)?.length}
                </button>
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col gap-1.5 sm:gap-2">
            <button type="button" onClick={() => moveItemById(item.id, -1)} className="rounded-xl border border-slate-200 px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" title={isDutch ? "Omhoog" : "Move up"} aria-label={isDutch ? "Omhoog" : "Move up"}>
              ↑
            </button>
            <button type="button" onClick={() => moveItemById(item.id, 1)} className="rounded-xl border border-slate-200 px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" title={isDutch ? "Omlaag" : "Move down"} aria-label={isDutch ? "Omlaag" : "Move down"}>
              ↓
            </button>
            <button type="button" onClick={() => {
              updateItem(item.id, { expanded: !item.expanded });
              if (!item.expanded) {
                loadItemAttachments(item.id);
              }
            }} className="rounded-xl border border-slate-200 px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" title={isDutch ? "Details uitklappen" : "Expand details"} aria-label={isDutch ? "Details uitklappen" : "Expand details"}>
              📝
            </button>
            <button type="button" onClick={() => removeItem(item.id)} className="rounded-xl border border-rose-200 px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10" title={isDutch ? "Verwijderen" : "Delete"} aria-label={isDutch ? "Verwijderen" : "Delete"}>
              ×
            </button>
          </div>
        </div>

        {item.expanded && (
          <div className="mt-4 grid gap-3 grid-cols-1 sm:grid-cols-2">
            <input value={item.notitie} onChange={(e) => updateItem(item.id, { notitie: e.target.value })} placeholder={isDutch ? "Inline notitie" : "Inline note"} className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <input value={item.tuning} onChange={(e) => updateItem(item.id, { tuning: e.target.value })} placeholder="Tuning" className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
              <input value={item.key} onChange={(e) => updateItem(item.id, { key: e.target.value })} placeholder={isDutch ? "Toonsoort" : "Key"} className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
            </div>
            
            {/* Attachments Section */}
            <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isDutch ? "Bijlagen" : "Attachments"}
                </span>
                <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                  {uploadingAttachment === item.id ? (
                    <span className="flex items-center gap-1">
                      <span className="h-3 w-3 animate-spin rounded-full border border-slate-400 border-t-transparent" />
                      {isDutch ? "Uploaden..." : "Uploading..."}
                    </span>
                  ) : (
                    <span>+ {isDutch ? "Toevoegen" : "Add"}</span>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleAttachmentUpload(item.id, file);
                    }}
                    disabled={uploadingAttachment === item.id}
                  />
                </label>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {itemAttachments.get(item.id)?.map((att) => (
                  <div key={att.id} className="relative group">
                    {att.type === 'image' ? (
                      <img src={att.url} alt={att.title || ''} className="h-16 w-16 rounded-lg object-cover border border-slate-200 dark:border-slate-700" />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        📄
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteAttachment(item.id, att.id)}
                      className="absolute -right-1 -top-1 hidden rounded-full bg-rose-500 p-1 text-white shadow-sm group-hover:block hover:bg-rose-600"
                      title={isDutch ? "Verwijderen" : "Delete"}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {itemAttachments.get(item.id)?.length === 0 && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {isDutch ? "Geen bijlagen" : "No attachments"}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const activeNotes = drawerSongId ? songNoteMap.get(drawerSongId) || [] : [];

  if (showPerformanceMode && activeDraft) {
    const songsOnly = currentItems.filter((item) => item.kind === "song");
    const position = songsOnly.length > 0 ? `${Math.max(0, songsOnly.findIndex((item) => item.id === activeItemId)) + 1} / ${songsOnly.length}` : "0 / 0";

    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-slate-950 text-white">
        <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-slate-950/95 px-4 py-3 backdrop-blur">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{copy.performanceMode}</div>
            <div className="truncate text-2xl font-semibold">{activeDraft.naam}</div>
            <div className="text-sm text-slate-300">{[activeDraft.datum, activeDraft.locatie].filter(Boolean).join(" · ")}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-full border border-white/10 px-3 py-2 text-sm">{position}</div>
            <button type="button" onClick={() => setShowPerformanceMode(false)} className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">{copy.backToEditor}</button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-5">
          <div className="mx-auto max-w-5xl space-y-4">
            {currentItems.map((item, index) => renderItem(item, index, true))}
          </div>
        </main>

        <footer className="sticky bottom-0 border-t border-white/10 bg-slate-950/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <button type="button" onClick={() => {
              const idx = songsOnly.findIndex((item) => item.id === activeItemId);
              const next = songsOnly[Math.max(0, idx - 1)];
              setActiveItemId(next?.id || null);
            }} className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">
              ← {isDutch ? "Vorig" : "Prev"}
            </button>
            <div className="text-sm text-slate-300">{position}</div>
            <button type="button" onClick={() => {
              const idx = songsOnly.findIndex((item) => item.id === activeItemId);
              const next = songsOnly[Math.min(songsOnly.length - 1, idx + 1)];
              setActiveItemId(next?.id || null);
            }} className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">
              {isDutch ? "Volgend" : "Next"} →
            </button>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-black text-slate-100 p-3 sm:p-6 rounded-3xl border border-neutral-800/80 shadow-2xl min-h-[calc(100vh-8rem)] min-w-0 max-w-full">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-800/80 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-brand-500 animate-pulse" />
            {copy.title}
          </h2>
          {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowCreateModal(true)} className="rounded-xl bg-gradient-to-r from-brand-600 via-indigo-600 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-cyan-500/20 transition hover:scale-[1.02] active:scale-[0.98]">{copy.newSetlist}</button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[320px_minmax(0,1fr)] min-w-0 max-w-full">
        <aside className={`space-y-4 rounded-3xl border border-slate-200/80 bg-white/90 p-3 sm:p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 transition-all duration-300 ${sidebarCollapsed ? 'hidden md:block' : 'block'}`}>
          <div className="flex items-center justify-between">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 flex-1">
              {["alle", "concept", "klaar", "gearchiveerd"].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value as typeof statusFilter)}
                  title={statusTooltips[value as keyof typeof statusTooltips]}
                  aria-label={statusLabels[value as keyof typeof statusLabels]}
                  className={`min-w-0 rounded-2xl px-2.5 py-2 text-base font-semibold sm:px-3 ${statusFilter === value ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}
                >
                  <span aria-hidden className="block text-center leading-none">{statusIcons[value as keyof typeof statusIcons]}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="md:hidden ml-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label={sidebarCollapsed ? "Show setlists" : "Hide setlists"}
            >
              {sidebarCollapsed ? "☰" : "✕"}
            </button>
          </div>

          <div className="space-y-2">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40 animate-pulse">
                    <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700 mb-2"></div>
                    <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-700 mb-2"></div>
                    <div className="h-3 w-1/4 rounded bg-slate-200 dark:bg-slate-700"></div>
                  </div>
                ))}
              </div>
            ) : filteredSetlists.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">{copy.noSetlists}</div>
            ) : filteredSetlists.map((setlist) => (
              <div key={setlist.id} className={`rounded-3xl border p-3 transition ${selectedId === setlist.id ? "border-brand-500 bg-brand-50 dark:border-brand-500/50 dark:bg-brand-500/10" : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"}`}>
                <button type="button" onClick={() => selectSetlist(setlist)} className="w-full text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="break-words text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">{setlist.naam}</div>
                      <div className="mt-1 line-clamp-2 text-xs leading-snug text-slate-500 dark:text-slate-400">{[setlist.datum, setlist.locatie].filter(Boolean).join(" · ")}</div>
                      <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">{setlist.items.filter((item) => item.kind === "song").length} {isDutch ? "nummers" : "songs"}</div>
                    </div>
                    <span className="max-w-[100px] rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase leading-none text-slate-600 dark:border-slate-700 dark:text-slate-300">
                      <span className="block truncate">{statusLabels[setlist.status]}</span>
                    </span>
                  </div>
                </button>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={duplicateSetlist} className="min-w-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" title={copy.duplicate} aria-label={copy.duplicate}>
                    {copy.duplicate}
                  </button>
                  <button type="button" onClick={() => deleteSetlist(setlist.id)} className="min-w-0 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10" title={isDutch ? "Verwijderen" : "Delete"} aria-label={isDutch ? "Verwijderen" : "Delete"}>
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="min-h-[760px] min-w-0 max-w-full rounded-3xl border border-slate-200/80 bg-white/95 p-3.5 sm:p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
          {!activeDraft ? (
            <div className="flex min-h-[680px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center dark:border-slate-700 dark:bg-slate-900/40">
              <div className="text-5xl">🎼</div>
              <div className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">{setlists.length === 0 ? copy.noSetlists : copy.noSelection}</div>
              <button type="button" onClick={() => setShowCreateModal(true)} className="mt-6 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                {copy.newSetlist}
              </button>
              {/* Mobile toggle button when no setlist selected */}
              {sidebarCollapsed && (
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed(false)}
                  className="mt-4 lg:hidden rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {isDutch ? "Toon setlists" : "Show setlists"}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6 min-w-0 max-w-full">
              <div className="flex flex-wrap items-start justify-between gap-3 min-w-0 max-w-full">
                <div className="min-w-0 flex-1 w-full sm:w-auto">
                  <div className="flex flex-wrap items-center gap-2 mb-2 min-w-0">
                    <select 
                      value={activeDraft.id} 
                      onChange={(e) => {
                        const selected = setlists.find(s => s.id === e.target.value);
                        if (selected) selectSetlist(selected);
                      }}
                      className="max-w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 truncate dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                    >
                      {filteredSetlists.map((setlist) => (
                        <option key={setlist.id} value={setlist.id}>{setlist.naam}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0 w-full">
                    <input value={activeDraft.naam} onChange={(e) => updateDraft({ naam: e.target.value })} className="flex-1 min-w-0 w-full sm:w-auto border-0 bg-transparent p-0 text-xl font-semibold tracking-tight text-slate-900 outline-none sm:text-3xl dark:text-slate-100" />
                    {activeDraft.bandId && (() => {
                      const band = bandsList.find(b => b.id === activeDraft.bandId);
                      return band ? (
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full border shrink-0 max-w-full" style={{ borderColor: band.color || '#e2e8f0', backgroundColor: band.color ? `${band.color}20` : undefined }}>
                          {band.logoUrl && <img src={band.logoUrl} alt={band.name} className="h-5 w-5 rounded-full object-cover shrink-0" />}
                          <span className="text-sm font-medium truncate" style={{ color: band.color || '#6366f1' }}>{band.name}</span>
                        </div>
                      ) : null;
                    })()}
                  </div>
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{savingState === "saving" ? copy.saving : copy.saved}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full w-full sm:w-auto">
                  <div className="flex min-w-0 flex-wrap items-center gap-2 w-full sm:w-auto">
                    <select value={activeDraft.gigIds[0] || ""} onChange={(e) => assignSetlistToGig(e.target.value || null)} className="w-full sm:w-auto max-w-full rounded-lg border border-slate-200 px-3 py-2 text-xs sm:text-sm truncate dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                      <option value="">{isDutch ? "Toewijzen aan performance..." : "Assign to performance..."}</option>
                      {gigsList.map((g) => (
                        <option key={g.id} value={g.id}>{g.date ? `${g.eventName} · ${new Date(g.date).toLocaleDateString(locale)}` : g.eventName}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => assignSetlistToGig(null)} className="rounded-lg border border-slate-200 px-2.5 sm:px-3 py-2 text-xs sm:text-sm text-rose-600 shrink-0">{isDutch ? "Ontkoppelen" : "Unassign"}</button>
                  </div>
                  <button type="button" onClick={() => setShowPerformanceMode((current) => !current)} className="rounded-xl border border-slate-200 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 shrink-0 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
                    {copy.performanceMode}
                  </button>
                  <button type="button" onClick={() => setShowExport(true)} className="rounded-xl border border-slate-200 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 shrink-0 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
                    {copy.export}
                  </button>
                  <button type="button" onClick={duplicateSetlist} className="rounded-xl border border-slate-200 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 shrink-0 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
                    {copy.duplicate}
                  </button>
                </div>
              </div>

              <div className="grid gap-2 sm:gap-3 grid-cols-2 md:grid-cols-4 min-w-0 max-w-full">
                <input type="date" value={parseDateOnly(activeDraft.datum)} onChange={(e) => updateDraft({ datum: e.target.value || null })} className="min-w-0 max-w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
                <input value={activeDraft.locatie || ""} onChange={(e) => updateDraft({ locatie: e.target.value })} placeholder={copy.location} className="min-w-0 max-w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
                <select value={activeDraft.status} onChange={(e) => updateDraft({ status: e.target.value as SetlistMeta["status"] })} className="min-w-0 max-w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                  <option value="concept">{isDutch ? "concept" : "Draft"}</option>
                  <option value="klaar">{isDutch ? "klaar" : "Ready"}</option>
                  <option value="gearchiveerd">{isDutch ? "gearchiveerd" : "Archived"}</option>
                </select>
                <select value={activeDraft.bandId || ""} onChange={(e) => updateDraft({ bandId: e.target.value || null })} className="min-w-0 max-w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                  <option value="">{isDutch ? "Selecteer band..." : "Select band..."}</option>
                  {bandsList.map((band) => (
                    <option key={band.id} value={band.id}>{band.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:gap-6 md:grid-cols-[1fr_320px] min-w-0 max-w-full">
                <section className="space-y-4 min-w-0 max-w-full">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3 sm:p-4 dark:border-slate-800 dark:bg-slate-900/60 min-w-0 max-w-full">
                    <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
                      <button type="button" onClick={() => addSpecial("PAUZE")} className="min-w-0 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-white dark:text-slate-900">{copy.pause}</button>
                      <button type="button" onClick={() => addSpecial("BIS")} className="min-w-0 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-white dark:text-slate-900">{copy.bis}</button>
                      <button type="button" onClick={() => addSpecial(window.prompt(isDutch ? "Custom blok label" : "Custom block label") || "")} className="min-w-0 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">{copy.customBlock}</button>
                      <button type="button" onClick={autoGenerate} className="min-w-0 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">{copy.autoGenerate}</button>
                      <label className="ml-auto flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                        <input type="checkbox" checked={activeDraft.pauseOnTuningChange} onChange={(e) => updateDraft({ pauseOnTuningChange: e.target.checked })} />
                        {isDutch ? "Voeg pauze in bij tuningwissel" : "Insert pause on tuning change"}
                      </label>
                    </div>
                  </div>

                  <div className="space-y-3 min-w-0 max-w-full">
                    {currentItems.map((item, index) => renderItem(item, index, false))}
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3 sm:p-4 dark:border-slate-800 dark:bg-slate-900/60">
                    <button type="button" onClick={() => setShowGeneralNotes((current) => !current)} className="mb-3 text-left text-sm font-semibold text-slate-800 dark:text-slate-100">{copy.generalNotes}</button>
                    {showGeneralNotes && <textarea value={activeDraft.notities} onChange={(e) => updateDraft({ notities: e.target.value })} className="min-h-32 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" placeholder={copy.generalNotes} />}
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3 sm:p-4 dark:border-slate-800 dark:bg-slate-900/60">
                    <button type="button" onClick={() => setShowTuningPanel((current) => !current)} className="mb-3 text-left text-sm font-semibold text-slate-800 dark:text-slate-100">{copy.tuningPanel}</button>
                    {showTuningPanel && (
                      <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                        {tuningExplanation.map((line, index) => (
                          <div key={`${line}-${index}`} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">{line}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>

                <aside className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-3 sm:p-4 dark:border-slate-800 dark:bg-slate-900/60 min-w-0 max-w-full">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{copy.songPicker}</div>
                    <span className="rounded-full bg-cyan-50 px-2 py-1 text-[11px] font-semibold text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">🖼️ {repertoireImageStats.withImages}/{songs.length} PDF</span>
                  </div>
                  <p className="mb-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{isDutch ? "Afbeeldingen zijn de tablatuur/notities die in de setlist-PDF worden opgenomen." : "Images are the tabs/notes included in the setlist PDF."}</p>
                  <input value={songSearch} onChange={(e) => setSongSearch(e.target.value)} placeholder={copy.searchSongs} className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
                  <div className="mt-2 flex flex-wrap gap-1.5 min-w-0 max-w-full" aria-label={isDutch ? "Filter op afbeeldingsbijlage" : "Filter by image attachment"}>
                    {([
                      ["all", isDutch ? `Alle (${songs.length})` : `All (${songs.length})`],
                      ["with", isDutch ? `Met PDF-afbeelding (${repertoireImageStats.withImages})` : `With PDF image (${repertoireImageStats.withImages})`],
                      ["without", isDutch ? `Zonder PDF-afbeelding (${repertoireImageStats.withoutImages})` : `Without PDF image (${repertoireImageStats.withoutImages})`],
                    ] as const).map(([value, label]) => (
                      <button key={value} type="button" onClick={() => setAttachmentFilter(value)} className={`rounded-xl border px-2 py-1.5 text-[11px] font-semibold leading-tight transition shrink-0 ${attachmentFilter === value ? "border-cyan-500 bg-cyan-500 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"}`}>{label}</button>
                    ))}
                  </div>

                  <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                    {songGroups.map(([tuning, group]) => (
                      <div key={tuning}>
                        <div className={`mb-2 inline-flex max-w-full rounded-full border px-2 py-0.5 text-xs font-semibold ${tuningBadgeClass(tuning)}`}><span className="block truncate">{tuning}</span></div>
                        <div className="space-y-2">
                          {group.map((item) => {
                            const song = (item as any).song || item as SongRow;
                            const matchReasons = (item as any).matchReasons || [] as string[];
                            const occurrenceCount = songOccurrences.get(song.id) || 0;
                            const meta = parseSongNotes(song.notes).meta;
                            const imageCount = song.attachments?.filter(isImageAttachment).length || 0;
                            const documentCount = (song.attachments?.length || 0) - imageCount;
                            return (
                              <button key={song.id} type="button" onClick={() => addSong(song)} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left text-sm transition hover:border-brand-300 hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-brand-500/50 dark:hover:bg-brand-500/10">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="break-words font-semibold leading-snug">{song.title}</div>
                                    <div className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{meta.bandProject || meta.genre || ""}</div>
                                    {matchReasons.length > 0 && (
                                      <div className="mt-1 flex flex-wrap gap-1">
                                        {matchReasons.map((reason: string, idx: number) => (
                                          <span key={idx} className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                                            {reason}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-col items-end gap-1 shrink-0">
                                    <div className="flex items-center gap-1">
                                      {imageCount
                                        ? `🖼️ ${imageCount} ${isDutch ? (imageCount === 1 ? "afbeelding voor PDF" : "afbeeldingen voor PDF") : (imageCount === 1 ? "image for PDF" : "images for PDF")}`
                                        : documentCount
                                          ? `📎 ${documentCount} ${isDutch ? (documentCount === 1 ? "bijlage — niet in PDF" : "bijlagen — niet in PDF") : (documentCount === 1 ? "attachment — not in PDF" : "attachments — not in PDF")}`
                                          : (isDutch ? "Geen afbeelding voor PDF" : "No image for PDF")}
                                    </div>
                                    {occurrenceCount > 0 && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-100">{occurrenceCount}× {isDutch ? "in setlist" : "in setlist"}</span>}
                                    <span className="rounded-full bg-brand-600 px-2 py-1 text-xs font-semibold text-white">{copy.addSong}</span>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                    {isDutch ? "Songs worden gegroepeerd op tuning en gesorteerd op tempo binnen de groep." : "Songs are grouped by tuning and sorted by tempo within each group."}
                  </div>
                </aside>
              </div>
            </div>
          )}
        </main>
      </div>

      {drawerSongId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl dark:bg-slate-950">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{copy.linkedNotes}</div>
                <div className="text-xl font-semibold text-slate-900 dark:text-slate-100">{activeSongMap.get(drawerSongId)?.title || ""}</div>
              </div>
              <button type="button" onClick={() => setDrawerSongId(null)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700">×</button>
            </div>

            <div className="mt-4 space-y-3">
              {activeNotes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  {isDutch ? "Geen gekoppelde nota's" : "No linked notes"}
                </div>
              ) : activeNotes.map((note) => (
                <div key={note.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{note.titel}</div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {note.tags.map((tag) => <span key={tag} className="rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-medium text-white">{tag}</span>)}
                      </div>
                    </div>
                    <button type="button" onClick={() => openNoteTab(note.id)} className="text-sm font-semibold text-brand-600 hover:underline">
                      {isDutch ? "Bewerk nota" : "Edit note"}
                    </button>
                  </div>
                  <div className="mt-3 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">{note.inhoud}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showExport && draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-950">
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{copy.export}</div>
              <button type="button" onClick={() => setShowExport(false)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700">×</button>
            </div>
            <textarea readOnly value={exportText} className="mt-4 min-h-80 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 font-mono text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => navigator.clipboard.writeText(exportText)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold">Copy</button>
              <button type="button" onClick={() => {
                // Open printable view for PDF export
                const win = window.open('', '_blank', 'toolbar=0,location=0,menubar=0');
                if (!win) return;
                
                // Generate pastel colors for unique tunings
                const tuningColors = new Map<string, string>();
                const pastelColors = [
                  '#e3f2fd', // pastel blue
                  '#e8f5e9', // pastel green
                  '#fff3e0', // pastel orange
                  '#f3e5f5', // pastel purple
                  '#fce4ec', // pastel pink
                  '#e0f7fa', // pastel cyan
                  '#fff9c4', // pastel yellow
                  '#efebe9', // pastel brown
                ];
                let colorIndex = 0;
                
                const getTuningColor = (tuning: string) => {
                  if (!tuningColors.has(tuning)) {
                    tuningColors.set(tuning, pastelColors[colorIndex % pastelColors.length]);
                    colorIndex++;
                  }
                  return tuningColors.get(tuning);
                };
                
                const htmlParts: string[] = [];
                
                // Get band logo if band is selected
                const selectedBand = draft.bandId ? bandsList.find(b => b.id === draft.bandId) : null;
                const bandLogo = selectedBand?.logoUrl;
                
                // Metadata badges (without title - handled by createPrintDocument)
                const metaBadges: string[] = [];
                if (selectedBand) metaBadges.push(`<span class="metadata-item">Band: ${escapeHtml(selectedBand.name)}</span>`);
                if (draft.status) metaBadges.push(`<span class="metadata-item">Status: ${escapeHtml(draft.status)}</span>`);
                if (draft.datum) metaBadges.push(`<span class="metadata-item">Date: ${escapeHtml(draft.datum)}</span>`);
                if (draft.locatie) metaBadges.push(`<span class="metadata-item">Location: ${escapeHtml(draft.locatie)}</span>`);
                if (metaBadges.length > 0) htmlParts.push(`<div class="metadata">${metaBadges.join('')}</div>`);
                htmlParts.push('<section class="section">');
                
                // Track song numbers separately (only for actual songs)
                let songNumber = 0;
                
                draft.items.forEach((item) => {
                  if (item.kind === 'special') {
                    // Render as divider without number
                    htmlParts.push(`<div class="setlist-item" style="text-align:center;color:#64748b;font-size:11pt;font-weight:600;letter-spacing:0.1em;padding:4mm 0;border-top:1px dashed #e2e8f0;border-bottom:1px dashed #e2e8f0;text-transform:uppercase;">--- ${escapeHtml(item.specialLabel)} ---</div>`);
                    return;
                  }
                  
                  songNumber++;
                  const song = songs.find(s => s.id === item.songId || (s.title && s.title.toLowerCase() === item.label.toLowerCase()));
                  const title = song ? song.title : item.label;
                  
                  // Build metadata badges with pastel colors
                  const badges: string[] = [];
                  if (item.tuning) {
                    const color = getTuningColor(item.tuning);
                    badges.push(`<span class="metadata-item" style="background:${color};color:#1a1a2e;">${escapeHtml(item.tuning)}</span>`);
                  }
                  if (item.key) {
                    const color = getTuningColor(item.key);
                    badges.push(`<span class="metadata-item" style="background:${color};color:#1a1a2e;">Key: ${escapeHtml(item.key)}</span>`);
                  }
                  if (item.tempo) {
                    const color = getTuningColor(item.tempo + ' bpm');
                    badges.push(`<span class="metadata-item" style="background:${color};color:#1a1a2e;">${escapeHtml(item.tempo)} BPM</span>`);
                  }
                  
                  const metaStr = badges.length > 0 ? `<div class="metadata" style="justify-content:flex-start;margin-top:2mm;">${badges.join('')}</div>` : '';
                  
                  htmlParts.push(`<article class="setlist-item">`);
                  htmlParts.push(`<h3 class="setlist-item-title"><span class="setlist-item-number">${songNumber}.</span>${escapeHtml(title)}</h3>`);
                  if (metaStr) htmlParts.push(metaStr);
                  
                  // Include image attachments without captions
                  if (song?.attachments && song.attachments.length > 0) {
                    const imageAttachments = song.attachments.filter(isImageAttachment);
                    if (imageAttachments.length > 0) {
                      imageAttachments.forEach((att) => {
                        htmlParts.push(`<figure class="attachment"><img src="${escapeHtml(att.publicUrl)}" alt="" loading="eager" /></figure>`);
                      });
                    }
                  }
                  
                  if (item.notitie) htmlParts.push(`<div class="note-content" style="margin-top:3mm;">${escapeHtml(item.notitie)}</div>`);
                  htmlParts.push('</article>');
                });
                
                htmlParts.push('</section>');
                if (draft.notities.trim()) htmlParts.push(`<section class="section"><h2 class="section-heading">General Notes</h2><div class="note-content">${escapeHtml(draft.notities)}</div></section>`);
                htmlParts.push('<footer class="document-footer">GigsManager <span aria-hidden="true">·</span> Page <span class="page-number"></span></footer>');
                
                // Get band logo if setlist is linked to a band
                const band = draft.bandId ? bandsList.find(b => b.id === draft.bandId) : null;
                const logoUrl = band?.logoUrl || undefined;
                
                win.document.open();
                win.document.write(createPrintDocument(escapeHtml(draft.naam), htmlParts.join('\n'), {
                  includeLogo: settings.pdfIncludeLogo ?? true,
                  logoUrl: logoUrl,
                  font: settings.pdfFont ?? "inter",
                  pageSize: settings.pdfPageSize ?? "a4",
                  pageBreakMode: settings.pdfPageBreakMode ?? "auto",
                  darkMode: settings.pdfDarkMode ?? false,
                  showHeaders: settings.pdfShowHeaders ?? true,
                  showMetadata: settings.pdfShowMetadata ?? true,
                  imagesOnly: settings.pdfImagesOnly ?? false,
                  showPageNumbers: settings.pdfShowPageNumbers ?? true,
                  marginSize: settings.pdfMarginSize ?? "medium",
                }));
                win.document.close();
                // Printing is handled by the small script that waits for images to load
              }} className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition shadow-md">
                <span>📄</span>
                <span>{isDutch ? "Exporteer als PDF" : "Export as PDF"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-950">
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{copy.newSetlist}</div>
            <div className="mt-4 grid gap-3">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={copy.name} className="rounded-2xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              <input value={newDate} onChange={(e) => setNewDate(e.target.value)} type="date" className="rounded-2xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              <input value={newLocation} onChange={(e) => setNewLocation(e.target.value)} placeholder={copy.location} className="rounded-2xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreateModal(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">{copy.cancel}</button>
              <button type="button" onClick={createSetlist} disabled={!newName.trim()} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{copy.create}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function safeJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

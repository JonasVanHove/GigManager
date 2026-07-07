"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { useSettings } from "./SettingsProvider";
import { useToast } from "./ToastContainer";

type SongRow = {
  id: string;
  title: string;
  notes: string | null;
  date: string;
  attachments?: Array<{ id: string; publicUrl: string; contentType?: string; caption?: string | null }>;
};

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
  locatie: string;
  items: DraftItem[];
  notities: string;
  status: SetlistMeta["status"];
  pauseOnTuningChange: boolean;
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
    key: parsed.meta.keySignature || "",
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

export default function SetlistsTab() {
  const { session, getAccessToken } = useAuth();
  const { locale } = useSettings();
  const toast = useToast();
  const router = useRouter();

  const [songs, setSongs] = useState<SongRow[]>([]);
  const [gigsList, setGigsList] = useState<Array<{ id: string; eventName: string }>>([]);
  const [setlists, setSetlists] = useState<StoredSetlist[]>([]);
  const [notes, setNotes] = useState<LinkedNote[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<StoredSetlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingState, setSavingState] = useState<"saved" | "saving" | "dirty">("saved");
  const [statusFilter, setStatusFilter] = useState<"alle" | SetlistMeta["status"]>("alle");
  const [songSearch, setSongSearch] = useState("");
  const [showPerformanceMode, setShowPerformanceMode] = useState(false);
  const [showGeneralNotes, setShowGeneralNotes] = useState(true);
  const [showTuningPanel, setShowTuningPanel] = useState(true);
  const [showExport, setShowExport] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [error, setError] = useState("");
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [drawerSongId, setDrawerSongId] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const statusLabels = useMemo(() => ({
    alle: isDutch ? "Alle" : "All",
    concept: isDutch ? "Concept" : "Draft",
    klaar: isDutch ? "Klaar" : "Ready",
    gearchiveerd: isDutch ? "Gearchiveerd" : "Archived",
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

    for (const song of songs) {
      const parsed = parseSongNotes(song.notes);
      const tuning = parsed.meta.keySignature || "Onbekend";
      if (query && !`${song.title} ${parsed.body} ${parsed.meta.bandProject} ${parsed.meta.genre} ${parsed.meta.keySignature} ${parsed.meta.bpm} ${parsed.meta.comments}`.toLowerCase().includes(query)) {
        continue;
      }
      const list = songsByGroup.get(tuning) || [];
      list.push(song);
      songsByGroup.set(tuning, list);
    }

    return Array.from(songsByGroup.entries())
      .map(([tuning, list]) => [tuning, list.slice().sort((a, b) => a.title.localeCompare(b.title))] as const)
      .sort((a, b) => tuningIndex(a[0]) - tuningIndex(b[0]));
  }, [songSearch, songs]);

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

    const details = await Promise.all(
      textRows.map(async (row) => {
        const detailResponse = await fetch(`/api/notes/${row.id}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!detailResponse.ok) return null;
        const detail = (await detailResponse.json()) as { id: string; notes?: unknown; photoName?: string | null };
        const raw = typeof detail.notes === "string" ? safeJson<NotePayload>(detail.notes, {}) : (detail.notes as NotePayload | undefined) || {};
        return {
          id: row.id,
          titel: typeof raw.titel === "string" ? raw.titel : row.photoName || "",
          inhoud: typeof raw.inhoud === "string" ? raw.inhoud : "",
          tags: Array.isArray(raw.tags) ? raw.tags.filter((tag): tag is string => typeof tag === "string") : [],
        } satisfies LinkedNote;
      })
    );

    setNotes(details.filter((note): note is LinkedNote => Boolean(note)));
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

      const [songsResponse, setlistsResponse] = await Promise.all([
        fetch("/api/songs", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/setlists", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!songsResponse.ok) throw new Error(isDutch ? "Songs laden mislukt" : "Failed to load songs");
      if (!setlistsResponse.ok) throw new Error(isDutch ? "Setlists laden mislukt" : "Failed to load setlists");

      const songPayload = (await songsResponse.json()) as Array<{ id: string; title: string; notes?: string | null; date: string; attachments?: any[] }>;
      const setlistPayload = (await setlistsResponse.json()) as Array<{ id: string; title?: string; description?: string | null; items?: ApiSetlistItem[]; createdAt: string; updatedAt: string }>;

      const currentUserId = session.user?.id;
      if (!currentUserId) throw new Error("Missing user id");

      const hydratedSetlists: StoredSetlist[] = Array.isArray(setlistPayload)
        ? setlistPayload.map((setlist) => {
            const meta = parseSetlistMeta(setlist.description);
            const items: DraftItem[] = Array.isArray(setlist.items)
              ? setlist.items.map((item) => ({
                  id: item.id,
                  kind: item.type === "song" ? "song" : "special",
                  songId: item.type === "song" ? item.id : null,
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
              items,
              notities: meta.notities,
              status: meta.status,
              pauseOnTuningChange: meta.pauseOnTuningChange,
              createdAt: setlist.createdAt,
              updatedAt: setlist.updatedAt,
            };
          })
        : [];

      setSongs(Array.isArray(songPayload) ? songPayload.map((song) => ({ id: song.id, title: song.title, notes: song.notes || null, date: song.date, attachments: song.attachments || [] })) : []);
      // load gigs for possible assignment
      try {
        const token = await getAccessToken();
        if (token) {
          const gigsRes = await fetch('/api/gigs', { headers: { Authorization: `Bearer ${token}` } });
          if (gigsRes.ok) {
            const gigsJson = await gigsRes.json();
            setGigsList(Array.isArray(gigsJson) ? gigsJson.map((g: any) => ({ id: g.id, eventName: g.eventName })) : []);
          }
        }
      } catch (e) {
        // noop
      }
      setSetlists(hydratedSetlists);
      await loadNotes();

      if (!selectedId && hydratedSetlists[0]) {
        const first = hydratedSetlists[0];
        setSelectedId(first.id);
        setDraft(JSON.parse(JSON.stringify(first)) as StoredSetlist);
        setSavingState("saved");
      }
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

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const updateDraft = useCallback((patch: Partial<StoredSetlist>) => {
    setDraft((current) => {
      if (!current) return current;
      return { ...current, ...patch, updatedAt: new Date().toISOString() };
    });
    setSavingState("dirty");
  }, []);

  const selectSetlist = useCallback((setlist: StoredSetlist) => {
    setSelectedId(setlist.id);
    setDraft(JSON.parse(JSON.stringify(setlist)));
    setSavingState("saved");
    setShowPerformanceMode(false);
    setActiveItemId(null);
  }, []);

  const saveDraft = useCallback(async (nextDraft: StoredSetlist) => {
    if (!session?.user) return;
    setSavingState("saving");
    const token = await getAccessToken();
    if (!token) return;

    const payload = {
      title: nextDraft.naam.trim() || (isDutch ? "Nieuwe setlist" : "New setlist"),
      description: serializeSetlistMeta({
        datum: nextDraft.datum,
        locatie: nextDraft.locatie,
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

    const refreshed = (await response.json()) as { id: string; title?: string; description?: string | null; createdAt: string; updatedAt: string };
    const meta = parseSetlistMeta(refreshed.description);
    const saved: StoredSetlist = {
      id: refreshed.id,
      userId: nextDraft.userId,
      naam: refreshed.title || nextDraft.naam,
      datum: meta.datum,
      locatie: meta.locatie,
      items: nextDraft.items.map(cloneItem),
      notities: meta.notities,
      status: meta.status,
      pauseOnTuningChange: meta.pauseOnTuningChange,
      createdAt: refreshed.createdAt,
      updatedAt: refreshed.updatedAt,
    };

    setSetlists((prev) => [saved, ...prev.filter((item) => item.id !== saved.id)]);
    setDraft(JSON.parse(JSON.stringify(saved)));
    setSelectedId(saved.id);
    setSavingState("saved");
  }, [getAccessToken, isDutch, session?.user]);

  useEffect(() => {
    if (!draft || saveStateIsStable(savingState)) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveDraft(draft).catch((err) => toast.error(err instanceof Error ? err.message : String(err)));
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
        items: [],
        notities: meta.notities,
        status: meta.status,
        pauseOnTuningChange: meta.pauseOnTuningChange,
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
            locatie: draft.locatie,
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
        items: draft.items.map(cloneItem),
        notities: meta.notities,
        status: meta.status,
        pauseOnTuningChange: meta.pauseOnTuningChange,
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

      if (!gigId) {
          // Unassign: find any gigs currently assigned to this setlist and clear them
          try {
            const allGigsRes = await fetch('/api/gigs', { headers: { Authorization: `Bearer ${token}` } });
            if (!allGigsRes.ok) return;
            const allGigs = await allGigsRes.json();
            const assigned = (allGigs || []).find((g: any) => g.setlistId === draft.id);
            if (!assigned) return;
            const unassignRes = await fetch(`/api/gigs/${assigned.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ setlistId: null }),
            });
            if (!unassignRes.ok) throw new Error(isDutch ? 'Ontkoppelen mislukt' : 'Unassign failed');
            toast.success(isDutch ? 'Setlist ontkoppeld' : 'Setlist unassigned');
            // refresh gigs list
            const gigsRes2 = await fetch('/api/gigs', { headers: { Authorization: `Bearer ${await getAccessToken()}` } });
            if (gigsRes2.ok) {
              const gigsJson2 = await gigsRes2.json();
              setGigsList(Array.isArray(gigsJson2) ? gigsJson2.map((g: any) => ({ id: g.id, eventName: g.eventName })) : []);
            }
          } catch (e) {
            toast.error(e instanceof Error ? e.message : String(e));
          }
          return;
        }

        const res = await fetch(`/api/gigs/${gigId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ setlistId: draft.id, eventName: undefined }),
      });

      if (!res.ok) throw new Error(isDutch ? 'Toewijzen mislukt' : 'Assign failed');
      toast.success(isDutch ? 'Setlist toegewezen' : 'Setlist assigned');
      // refresh gigs list
      const gigsRes = await fetch('/api/gigs', { headers: { Authorization: `Bearer ${await getAccessToken()}` } });
      if (gigsRes.ok) {
        const gigsJson = await gigsRes.json();
        setGigsList(Array.isArray(gigsJson) ? gigsJson.map((g: any) => ({ id: g.id, eventName: g.eventName })) : []);
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
    if (!draft) return;
    if (draft.items.some((item) => item.songId === song.id)) return;
    updateDraft({ items: [...draft.items, createSongItem(song)] });
  }, [draft, updateDraft]);

  const addSpecial = useCallback((label: string) => {
    if (!draft) return;
    const trimmed = label.trim();
    if (!trimmed) return;
    updateDraft({ items: [...draft.items, createSpecialItem(trimmed)] });
  }, [draft, updateDraft]);

  const updateItem = useCallback((itemId: string, patch: Partial<DraftItem>) => {
    if (!draft) return;
    updateDraft({ items: draft.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)) });
  }, [draft, updateDraft]);

  const removeItem = useCallback((itemId: string) => {
    if (!draft) return;
    updateDraft({ items: draft.items.filter((item) => item.id !== itemId) });
  }, [draft, updateDraft]);

  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    if (!draft) return;
    if (toIndex < 0 || toIndex >= draft.items.length) return;
    const copy = draft.items.slice();
    const [item] = copy.splice(fromIndex, 1);
    copy.splice(toIndex, 0, item);
    updateDraft({ items: copy });
  }, [draft, updateDraft]);

  const moveItemById = useCallback((itemId: string, direction: -1 | 1) => {
    if (!draft) return;
    const index = draft.items.findIndex((item) => item.id === itemId);
    if (index < 0) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= draft.items.length) return;
    moveItem(index, nextIndex);
  }, [draft, moveItem]);

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

  const saveStateIsStable = (state: typeof savingState) => state === "saved";

  useEffect(() => {
    if (!draft || saveStateIsStable(savingState)) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveDraft(draft).catch((err) => toast.error(err instanceof Error ? err.message : String(err)));
    }, 800);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [draft, saveDraft, savingState, toast]);

  const renderItem = (item: DraftItem, index: number, performance = false) => {
    if (item.kind === "special") {
      return (
        <div key={item.id} className="rounded-3xl border border-dashed border-slate-300 bg-slate-100/80 px-4 py-5 text-center text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200">
          {item.specialLabel}
          {item.specialLabel.toUpperCase().includes("PAUZE") && performance && <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">15 min</div>}
        </div>
      );
    }

    const song = item.songId ? activeSongMap.get(item.songId) : null;
    const songNotes = item.songId ? linkedNotesForSong(item.songId) : [];
    const tuningChanged = index > 0 ? (currentItems[index - 1]?.kind === "song" ? (currentItems[index - 1].tuning || "Onbekend") !== (item.tuning || "Onbekend") : false) : false;

    if (performance) {
      return (
        <section key={item.id} className={`rounded-3xl border px-5 py-5 ${activeItemId === item.id ? "border-brand-400 bg-brand-500/10" : "border-white/10 bg-white/5"}`}>
          <button type="button" onClick={() => setActiveItemId(item.id)} className="flex w-full items-start justify-between gap-4 text-left">
            <div className="min-w-0">
              <div className="text-4xl font-black text-white/90">{index + 1}</div>
              <div className="mt-2 text-2xl font-semibold">{song?.title || item.label}</div>
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
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {index + 1}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">{song?.title || item.label}</div>
              {item.artist && <span className="text-xs text-slate-500 dark:text-slate-400">{item.artist}</span>}
              <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${tuningBadgeClass(item.tuning || "Onbekend")}`}>{item.tuning || "Onbekend"}</span>
              {item.key && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{item.key}</span>}
              {item.tempo && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{item.tempo}</span>}
              {tuningChanged && <span className="text-sm text-amber-600">⚠</span>}
            </div>
            {item.notitie && <div className="mt-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">{item.notitie}</div>}
            {item.songId && songNoteMap.get(item.songId)?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={(event) => { event.stopPropagation(); toggleDrawerSong(item.songId || ""); }} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                  📝 {songNoteMap.get(item.songId)?.length}
                </button>
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <button type="button" onClick={() => moveItemById(item.id, -1)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" title={isDutch ? "Omhoog" : "Move up"} aria-label={isDutch ? "Omhoog" : "Move up"}>
              ↑
            </button>
            <button type="button" onClick={() => moveItemById(item.id, 1)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" title={isDutch ? "Omlaag" : "Move down"} aria-label={isDutch ? "Omlaag" : "Move down"}>
              ↓
            </button>
            <button type="button" onClick={() => updateItem(item.id, { expanded: !item.expanded })} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              📝
            </button>
            <button type="button" onClick={() => removeItem(item.id)} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10">
              ×
            </button>
          </div>
        </div>

        {item.expanded && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input value={item.notitie} onChange={(e) => updateItem(item.id, { notitie: e.target.value })} placeholder={isDutch ? "Inline notitie" : "Inline note"} className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={item.tuning} onChange={(e) => updateItem(item.id, { tuning: e.target.value })} placeholder="Tuning" className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
              <input value={item.key} onChange={(e) => updateItem(item.id, { key: e.target.value })} placeholder={isDutch ? "Toonsoort" : "Key"} className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{copy.title}</h2>
          {error && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowCreateModal(true)} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">{copy.newSetlist}</button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {["alle", "concept", "klaar", "gearchiveerd"].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value as typeof statusFilter)}
                title={statusLabels[value as keyof typeof statusLabels]}
                aria-label={statusLabels[value as keyof typeof statusLabels]}
                className={`min-w-0 rounded-2xl px-2.5 py-2 text-base font-semibold sm:px-3 ${statusFilter === value ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}
              >
                <span aria-hidden className="block text-center leading-none">{statusIcons[value as keyof typeof statusIcons]}</span>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {loading ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">Loading…</div>
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
                  <button type="button" onClick={duplicateSetlist} className="min-w-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                    {copy.duplicate}
                  </button>
                  <button type="button" onClick={() => deleteSetlist(setlist.id)} className="min-w-0 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10">
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="min-h-[760px] rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
          {!activeDraft ? (
            <div className="flex min-h-[680px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center dark:border-slate-700 dark:bg-slate-900/40">
              <div className="text-5xl">🎼</div>
              <div className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">{setlists.length === 0 ? copy.noSetlists : copy.noSelection}</div>
              <button type="button" onClick={() => setShowCreateModal(true)} className="mt-6 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                {copy.newSetlist}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <input value={activeDraft.naam} onChange={(e) => updateDraft({ naam: e.target.value })} className="w-full border-0 bg-transparent p-0 text-2xl font-semibold tracking-tight text-slate-900 outline-none sm:text-3xl dark:text-slate-100" />
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{savingState === "saving" ? copy.saving : copy.saved}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <select value={""} onChange={(e) => assignSetlistToGig(e.target.value)} className="max-w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                      <option value="">{isDutch ? "Toewijzen aan performance..." : "Assign to performance..."}</option>
                      {gigsList.map((g) => (
                        <option key={g.id} value={g.id}>{g.eventName}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => assignSetlistToGig(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-rose-600">{isDutch ? "Ontkoppelen" : "Unassign"}</button>
                  </div>
                  <button type="button" onClick={() => setShowPerformanceMode((current) => !current)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
                    {copy.performanceMode}
                  </button>
                  <button type="button" onClick={() => setShowExport(true)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
                    {copy.export}
                  </button>
                  <button type="button" onClick={duplicateSetlist} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">
                    {copy.duplicate}
                  </button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <input type="date" value={parseDateOnly(activeDraft.datum)} onChange={(e) => updateDraft({ datum: e.target.value || null })} className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
                <input value={activeDraft.locatie} onChange={(e) => updateDraft({ locatie: e.target.value })} placeholder={copy.location} className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
                <select value={activeDraft.status} onChange={(e) => updateDraft({ status: e.target.value as SetlistMeta["status"] })} className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                  <option value="concept">{isDutch ? "concept" : "Draft"}</option>
                  <option value="klaar">{isDutch ? "klaar" : "Ready"}</option>
                  <option value="gearchiveerd">{isDutch ? "gearchiveerd" : "Archived"}</option>
                </select>
              </div>

              <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
                <section className="space-y-4">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                    <div className="flex flex-wrap items-center gap-2">
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

                  <div className="space-y-3">
                    {currentItems.map((item, index) => renderItem(item, index, false))}
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                    <button type="button" onClick={() => setShowGeneralNotes((current) => !current)} className="mb-3 text-left text-sm font-semibold text-slate-800 dark:text-slate-100">{copy.generalNotes}</button>
                    {showGeneralNotes && <textarea value={activeDraft.notities} onChange={(e) => updateDraft({ notities: e.target.value })} className="min-h-32 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" placeholder={copy.generalNotes} />}
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
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

                <aside className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                  <div>
                    <div className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">{copy.songPicker}</div>
                    <input value={songSearch} onChange={(e) => setSongSearch(e.target.value)} placeholder={copy.searchSongs} className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
                  </div>

                  <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                    {songGroups.map(([tuning, group]) => (
                      <div key={tuning}>
                        <div className={`mb-2 inline-flex max-w-full rounded-full border px-2 py-0.5 text-xs font-semibold ${tuningBadgeClass(tuning)}`}><span className="block truncate">{tuning}</span></div>
                        <div className="space-y-2">
                          {group.map((song) => {
                            const alreadyAdded = activeDraft.items.some((item) => item.songId === song.id && item.kind === "song");
                            const meta = parseSongNotes(song.notes).meta;
                            return (
                              <button key={song.id} type="button" disabled={alreadyAdded} onClick={() => addSong(song)} className={`w-full rounded-2xl border px-3 py-2 text-left text-sm transition ${alreadyAdded ? "border-dashed border-slate-300 bg-slate-100 text-slate-400 opacity-60 dark:border-slate-700 dark:bg-slate-900" : "border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-900"}`}>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="break-words font-semibold leading-snug">{song.title}</div>
                                    <div className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{meta.bandProject || meta.genre || ""}</div>
                                  </div>
                                  <span className="shrink-0 rounded-full bg-brand-600 px-2 py-1 text-xs font-semibold text-white">{alreadyAdded ? (isDutch ? "Toegevoegd" : "Added") : copy.addSong}</span>
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
                const htmlParts: string[] = [];
                htmlParts.push('<!doctype html><html><head><meta charset="utf-8"><title>Setlist</title>');
                htmlParts.push('<meta name="viewport" content="width=device-width,initial-scale=1" />');
                htmlParts.push('<style>');
                htmlParts.push('@page { size: A4; margin: 20mm; }');
                htmlParts.push('html,body{height:100%;margin:0;padding:0;font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;}');
                htmlParts.push('.container{max-width:800px;margin:0 auto;padding:0 8mm;}');
                htmlParts.push('.title{font-size:20px;font-weight:700;margin-bottom:6px;}');
                htmlParts.push('.meta{color:#444;margin-bottom:12px;}');
                htmlParts.push('.song{margin-bottom:12px;page-break-inside:avoid;break-inside:avoid-column;padding-bottom:6px;border-bottom:1px solid #eee;}');
                htmlParts.push('.song-title{font-weight:700;font-size:16px;margin:0 0 6px 0;}');
                htmlParts.push('.song-meta{color:#666;font-size:13px;margin-top:6px;}');
                htmlParts.push('img{max-width:100%;height:auto;display:block;margin-top:8px;border:0;padding:0;}');
                htmlParts.push('@media print{body{margin:0} .container{padding:0} .song{page-break-inside:avoid;}}');
                htmlParts.push('</style>');
                // Small script to wait for images to load before printing
                htmlParts.push('<script>function waitForImagesAndPrint(timeoutMs=3000){const imgs = Array.from(document.images); if(imgs.length===0){window.focus();window.print();return;} let loaded=0; const done=()=>{loaded++; if(loaded===imgs.length){window.focus();window.print();}}; imgs.forEach(img=>{ if(img.complete){loaded++; } else { img.addEventListener("load", done); img.addEventListener("error", done); }}); setTimeout(()=>{window.focus();window.print();}, timeoutMs);} window.addEventListener("load",()=>setTimeout(()=>waitForImagesAndPrint(3000),250));</script>');
                htmlParts.push('</head><body>');
                htmlParts.push(`<h1>${escapeHtml(draft.naam)}</h1>`);
                if (draft.datum || draft.locatie) htmlParts.push(`<div style="margin-bottom:12px;color:#444">${escapeHtml([draft.datum, draft.locatie].filter(Boolean).join(' · '))}</div>`);
                htmlParts.push('<div class="container">');
                draft.items.forEach((item, idx) => {
                  if (item.kind === 'special') {
                    htmlParts.push(`<div class="song"><div class="song-title">${idx+1}. ${escapeHtml(item.specialLabel)}</div></div>`);
                    return;
                  }
                  const song = songs.find(s => s.id === item.songId);
                  const title = song ? song.title : item.label;
                  htmlParts.push(`<div class="song"><div class="song-title">${idx+1}. ${escapeHtml(title)}</div>`);
                  if (song && song.attachments && song.attachments.length > 0) {
                    const att = song.attachments[0];
                    htmlParts.push(`<div><img src="${escapeHtml(att.publicUrl)}" alt="${escapeHtml(title)}" /></div>`);
                  }
                  if (item.notitie) htmlParts.push(`<div class="song-meta">${escapeHtml(item.notitie)}</div>`);
                  htmlParts.push('</div>');
                });
                htmlParts.push('</div>');
                htmlParts.push('</body></html>');
                win.document.open();
                win.document.write(htmlParts.join('\n'));
                win.document.close();
                // Printing is handled by the small script that waits for images to load
              }} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Print as PDF</button>
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

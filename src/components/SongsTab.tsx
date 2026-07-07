"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthProvider";
import { useSettings } from "./SettingsProvider";
import { useToast } from "./ToastContainer";
import { SongMediaManager } from "./SongMediaManager";
import FullscreenMediaViewer from "./FullscreenMediaViewer";

type SongAttachment = {
  id: string;
  storagePath: string;
  publicUrl: string;
  contentType: string;
  caption?: string | null;
  order: number;
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

const META_START = "[[song-meta]]";
const META_END = "[[/song-meta]]";

const defaultMeta = (): SongMeta => ({ bandProject: "", genre: "", keySignature: "", bpm: "", comments: "" });

const parseSongNotes = (raw: string | null | undefined) => {
  const fallback = { meta: defaultMeta(), body: raw || "" };
  if (!raw || !raw.startsWith(META_START)) return fallback;

  const endIndex = raw.indexOf(META_END);
  if (endIndex < 0) return fallback;

  try {
    const metaJson = raw.slice(META_START.length, endIndex).trim();
    const body = raw.slice(endIndex + META_END.length).replace(/^\s+/, "");
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
  const cleanedBody = body.trim();
  return `${META_START}\n${JSON.stringify(meta)}\n${META_END}${cleanedBody ? `\n\n${cleanedBody}` : ""}`;
};

export default function SongsTab() {
  const { getAccessToken } = useAuth();
  const { locale } = useSettings();
  const toast = useToast();

  const isDutch = locale.startsWith("nl");

  const [songs, setSongs] = useState<SongRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [songSearch, setSongSearch] = useState("");
  const [showOnlyWithNotes, setShowOnlyWithNotes] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<SongRecord | null>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [songMeta, setSongMeta] = useState<SongMeta>(defaultMeta());
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [attachments, setAttachments] = useState<SongAttachment[]>([]);
  const [saving, setSaving] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerAttachments, setViewerAttachments] = useState<SongAttachment[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerTitle, setViewerTitle] = useState<string | undefined>(undefined);
  const [viewerTuning, setViewerTuning] = useState<string | undefined>(undefined);

  const copy = useMemo(
    () => ({
      title: isDutch ? "Notities" : "Notes",
      newButton: isDutch ? "Nieuw" : "New",
      save: isDutch ? "Opslaan" : "Save",
      cancel: isDutch ? "Annuleren" : "Cancel",
      create: isDutch ? "Nieuwe notitie" : "New note",
      placeholder: isDutch ? "Schrijf hier notities..." : "Write notes here...",
      emptyState: isDutch ? "Nog geen notities" : "No notes yet",
      searchPlaceholder: isDutch ? "Zoek in titel of notities..." : "Search title or notes...",
      withNotesOnly: isDutch ? "Alleen met notities" : "Only with notes",
      noBand: isDutch ? "Zonder band" : "No band",
      tags: isDutch ? "Tags" : "Tags",
      attachments: isDutch ? "bijlagen" : "attachments",
      bandProject: isDutch ? "Band / project" : "Band / project",
      genre: isDutch ? "Genre" : "Genre",
      keySignature: isDutch ? "Toonsoort" : "Key",
      bpm: "BPM",
      comments: isDutch ? "Opmerkingen" : "Comments",
      addTag: isDutch ? "Tag toevoegen" : "Add tag",
      attachmentHint: isDutch ? "Screenshots, partituren, chord sheets of lyrics" : "Screenshots, score sheets, chord sheets or lyrics",
    }),
    [isDutch]
  );

  const fetchSongs = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/songs", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to load songs");
      const data = (await res.json()) as SongRecord[];
      setSongs(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast.error(error?.message || "Failed to fetch songs");
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, toast]);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  const filteredSongs = useMemo(() => {
    const query = songSearch.trim().toLowerCase();
    return songs.filter((song) => {
      const parsed = parseSongNotes(song.notes);
      if (showOnlyWithNotes && !parsed.body.trim()) return false;
      if (!query) return true;
      return (
        song.title.toLowerCase().includes(query) ||
        parsed.body.toLowerCase().includes(query) ||
        [parsed.meta.bandProject, parsed.meta.genre, parsed.meta.keySignature, parsed.meta.bpm, parsed.meta.comments]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [songs, songSearch, showOnlyWithNotes]);

  const openEditor = (song?: SongRecord) => {
    if (!song) {
      setEditingSong(null);
      setTitle("");
      setNotes("");
      setSongMeta(defaultMeta());
      setTags([]);
      setTagInput("");
      setAttachments([]);
      setEditorOpen(true);
      return;
    }

    const parsed = parseSongNotes(song.notes);
    setEditingSong(song);
    setTitle(song.title);
    setNotes(parsed.body);
    setSongMeta(parsed.meta);
    setTags((song.tags || []).map((tag) => tag.name));
    setTagInput("");
    setAttachments((song.attachments || []).slice().sort((a, b) => a.order - b.order));
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingSong(null);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error(isDutch ? "Titel is verplicht" : "Title is required");
      return;
    }

    setSaving(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("No session token");

      // Ensure the artist / bandProject is represented as a tag so songs can be filtered by artist
      const normalizedTags = tags.slice();
      const artist = (songMeta.bandProject || "").trim();
      if (artist && !normalizedTags.includes(artist)) normalizedTags.unshift(artist);

      const payload = {
        title: title.trim(),
        notes: serializeSongNotes(songMeta, notes),
        tags: normalizedTags,
        attachments: attachments.map((attachment, index) => ({
          storagePath: attachment.storagePath,
          publicUrl: attachment.publicUrl,
          contentType: attachment.contentType,
          caption: attachment.caption || null,
          order: index + 1,
        })),
      };

      const res = await fetch(editingSong ? `/api/songs?id=${editingSong.id}` : "/api/songs", {
        method: editingSong ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to save song");
      }

      toast.success(isDutch ? "Opgeslagen" : "Saved");
      closeEditor();
      fetchSongs();
    } catch (error: any) {
      toast.error(error?.message || (isDutch ? "Opslaan mislukt" : "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{copy.title}</h2>
        <button type="button" onClick={() => openEditor()} className="rounded-lg bg-brand-600 px-3 py-2 text-white">
          {copy.newButton}
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <input
            type="text"
            value={songSearch}
            onChange={(e) => setSongSearch(e.target.value)}
            placeholder={copy.searchPlaceholder}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
          <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={showOnlyWithNotes}
              onChange={(e) => setShowOnlyWithNotes(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            {copy.withNotesOnly}
          </label>
        </div>

        <div className="mt-4 grid gap-3">
          {loading ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">Loading…</div>
          ) : filteredSongs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              {copy.emptyState}
            </div>
          ) : (
            filteredSongs.map((song) => {
              const parsed = parseSongNotes(song.notes);
              const attachmentCount = song.attachments?.length || 0;
              return (
                <div key={song.id} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{song.title}</div>
                      <div className="truncate text-xs text-slate-500 dark:text-slate-400">{(song.bands || []).map((b) => b.name).join(", ") || copy.noBand}</div>
                      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        {attachmentCount} {copy.attachments}
                      </div>
                    </div>
                    <button type="button" onClick={() => openEditor(song)} className="rounded bg-brand-600 px-2 py-1 text-sm text-white">
                      {isDutch ? "Bewerken" : "Edit"}
                    </button>
                  </div>
                  {parsed.body.trim() && <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{parsed.body}</p>}
                  {(song.attachments || []).length > 0 && (
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                          {song.attachments!.slice(0, 4).map((attachment, aIdx) => (
                            <button key={attachment.id} type="button" onClick={() => {
                              setViewerAttachments(song.attachments || []);
                              setViewerIndex(aIdx);
                              setViewerTitle(song.title);
                              const parsedMeta = parseSongNotes(song.notes).meta;
                              setViewerTuning(parsedMeta.keySignature || undefined);
                              setViewerOpen(true);
                            }} className="rounded overflow-hidden">
                              <img src={attachment.publicUrl} alt={attachment.caption || song.title} className="h-20 w-20 rounded object-cover" />
                            </button>
                          ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {editorOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4 sm:p-6">
          <div className="mx-auto w-full max-w-4xl rounded-2xl bg-white p-4 shadow-2xl dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{editingSong ? editingSong.title : copy.create}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{copy.attachmentHint}</p>
              </div>
              <button type="button" onClick={closeEditor} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700">
                {copy.cancel}
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={isDutch ? "Titel" : "Title"}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={songMeta.bandProject}
                  onChange={(e) => setSongMeta((prev) => ({ ...prev, bandProject: e.target.value }))}
                  placeholder={copy.bandProject}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
                <input
                  value={songMeta.genre}
                  onChange={(e) => setSongMeta((prev) => ({ ...prev, genre: e.target.value }))}
                  placeholder={copy.genre}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
                <input
                  value={songMeta.keySignature}
                  onChange={(e) => setSongMeta((prev) => ({ ...prev, keySignature: e.target.value }))}
                  placeholder={copy.keySignature}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
                <input
                  value={songMeta.bpm}
                  onChange={(e) => setSongMeta((prev) => ({ ...prev, bpm: e.target.value }))}
                  placeholder={copy.bpm}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={copy.placeholder}
                className="min-h-32 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />

              <div className="flex flex-wrap gap-2">
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
                  placeholder={copy.addTag}
                  className="min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => {
                    const value = tagInput.trim();
                    if (value && !tags.includes(value)) setTags((prev) => [...prev, value]);
                    setTagInput("");
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700"
                >
                  {copy.addTag}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button key={tag} type="button" onClick={() => setTags((prev) => prev.filter((entry) => entry !== tag))} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium dark:bg-slate-800">
                    {tag} ×
                  </button>
                ))}
              </div>

              <SongMediaManager attachments={attachments} onChange={setAttachments} />

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
                <button type="button" onClick={closeEditor} className="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-700">
                  {copy.cancel}
                </button>
                <button type="button" onClick={handleSave} disabled={saving || !title.trim()} className="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white disabled:opacity-50">
                  {saving ? `${copy.save}...` : copy.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <FullscreenMediaViewer
        isOpen={viewerOpen}
        attachments={viewerAttachments}
        index={viewerIndex}
        title={viewerTitle}
        tuning={viewerTuning}
        onClose={() => setViewerOpen(false)}
        onPrev={() => setViewerIndex((i) => Math.max(0, i - 1))}
        onNext={() => setViewerIndex((i) => Math.min((viewerAttachments?.length || 1) - 1, i + 1))}
      />
    </div>
  );
}
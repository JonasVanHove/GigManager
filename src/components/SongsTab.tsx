"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthProvider";
import { useSettings } from "./SettingsProvider";
import { useToast } from "./ToastContainer";
import { SongMediaManager } from "./SongMediaManager";
import FullscreenMediaViewer from "./FullscreenMediaViewer";
import { Icons } from "./Icons";
import { createPrintDocument } from "@/lib/print-document";

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

const isImageAttachment = (attachment: SongAttachment) =>
  attachment.contentType?.startsWith("image/") || /\.(avif|gif|jpe?g|png|webp)(?:[?#]|$)/i.test(attachment.publicUrl);

const isPdfAttachment = (attachment: SongAttachment) =>
  attachment.contentType?.toLowerCase() === "application/pdf" || /\.pdf(?:[?#]|$)/i.test(attachment.publicUrl);

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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default function SongsTab() {
  const { getAccessToken } = useAuth();
  const { locale } = useSettings();
  const toast = useToast();

  const isDutch = locale.startsWith("nl");

  const [songs, setSongs] = useState<SongRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [songSearch, setSongSearch] = useState("");
  const [showOnlyWithNotes, setShowOnlyWithNotes] = useState(false);
  const [attachmentFilter, setAttachmentFilter] = useState<"all" | "with" | "without">("all");
  const [tuningFilter, setTuningFilter] = useState<string>("");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [keyFilter, setKeyFilter] = useState<string>("");
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
      title: isDutch ? "Repertoire & Songs" : "Repertoire & Songs",
      newButton: isDutch ? "+ Nieuw nummer" : "+ New Song",
      save: isDutch ? "Opslaan" : "Save",
      cancel: isDutch ? "Annuleren" : "Cancel",
      create: isDutch ? "Nieuw nummer toevoegen" : "Add new song",
      placeholder: isDutch ? "Schrijf hier notities, akkoorden of tekst..." : "Write notes, chords or lyrics here...",
      emptyState: isDutch ? "Nog geen nummers in repertoire" : "No songs in repertoire yet",
      searchPlaceholder: isDutch ? "Zoek op titel, band, toonsoort of notities..." : "Search title, band, key or notes...",
      withNotesOnly: isDutch ? "Alleen met notities" : "Only with notes",
      noBand: isDutch ? "Geen band toegewezen" : "No band assigned",
      tags: isDutch ? "Tags" : "Tags",
      attachments: isDutch ? "bijlagen/afbeeldingen" : "attachments/images",
      bandProject: isDutch ? "Band / Project" : "Band / Project",
      genre: isDutch ? "Genre" : "Genre",
      keySignature: isDutch ? "Toonsoort / Tuning" : "Key / Tuning",
      bpm: "BPM",
      comments: isDutch ? "Opmerkingen" : "Comments",
      addTag: isDutch ? "Tag toevoegen" : "Add tag",
      attachmentHint: isDutch ? "Partituren, chord sheets, tabs of screenshots van nummers" : "Score sheets, chord sheets, tabs or screenshots of songs",
      exportSong: isDutch ? "Exporteer PDF / Print" : "Export PDF / Print",
      filterAttachments: isDutch ? "Bijlagen" : "Attachments",
      filterAttachmentsAll: isDutch ? "Alle" : "All",
      filterAttachmentsWith: isDutch ? "Met bijlagen" : "With attachments",
      filterAttachmentsWithout: isDutch ? "Zonder bijlagen" : "Without attachments",
      filterTuning: isDutch ? "Tuning" : "Tuning",
      filterTag: isDutch ? "Tag" : "Tag",
      filterKey: isDutch ? "Toonsoort" : "Key",
      resetFilters: isDutch ? "Filters wissen" : "Reset filters",
      deleteSong: isDutch ? "Verwijderen" : "Delete",
      deleteConfirm: isDutch ? "Weet je zeker dat je dit nummer wilt verwijderen?" : "Are you sure you want to delete this song?",
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

  const deleteSong = useCallback(async (songId: string) => {
    if (!confirm(copy.deleteConfirm)) return;
    
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/songs/${songId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Failed to delete song");
      toast.success(isDutch ? "Nummer verwijderd" : "Song deleted");
      fetchSongs();
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete song");
    }
  }, [getAccessToken, toast, copy.deleteConfirm, isDutch, fetchSongs]);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  const filteredSongs = useMemo(() => {
    const query = songSearch.trim().toLowerCase();
    return songs.filter((song) => {
      const parsed = parseSongNotes(song.notes);
      if (showOnlyWithNotes && !parsed.body.trim()) return false;
      
      // Attachment filter
      if (attachmentFilter === "with" && (!song.attachments || song.attachments.length === 0)) return false;
      if (attachmentFilter === "without" && song.attachments && song.attachments.length > 0) return false;
      
      // Tuning filter
      if (tuningFilter && parsed.meta.keySignature.toLowerCase() !== tuningFilter.toLowerCase()) return false;
      
      // Tag filter
      if (tagFilter && (!song.tags || !song.tags.some(t => t.name.toLowerCase() === tagFilter.toLowerCase()))) return false;
      
      // Key signature filter
      if (keyFilter && parsed.meta.keySignature.toLowerCase() !== keyFilter.toLowerCase()) return false;
      
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
  }, [songs, songSearch, showOnlyWithNotes, attachmentFilter, tuningFilter, tagFilter, keyFilter]);

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

  const handleExportSong = (song: SongRecord) => {
    const parsed = parseSongNotes(song.notes);
    const win = window.open('', '_blank', 'toolbar=0,location=0,menubar=0');
    if (!win) return;
    const body: string[] = [];
    body.push('<header class="document-header"><div class="document-eyebrow">GigManager · nummerfiche</div>');
    body.push(`<h1 class="document-title">${escapeHtml(song.title)}</h1>`);

    const metaBadges: string[] = [];
    if (parsed.meta.bandProject) metaBadges.push(`<span class="meta-item">Band: ${escapeHtml(parsed.meta.bandProject)}</span>`);
    if (parsed.meta.genre) metaBadges.push(`<span class="meta-item">Genre: ${escapeHtml(parsed.meta.genre)}</span>`);
    if (parsed.meta.keySignature) metaBadges.push(`<span class="meta-item">Toonsoort: ${escapeHtml(parsed.meta.keySignature)}</span>`);
    if (parsed.meta.bpm) metaBadges.push(`<span class="meta-item">BPM: ${escapeHtml(parsed.meta.bpm)}</span>`);
    if (metaBadges.length > 0) body.push(`<div class="metadata">${metaBadges.join('')}</div>`);
    body.push('</header>');

    if (parsed.body.trim()) body.push(`<section class="section"><h2 class="section-heading">Notities</h2><div class="note-content">${escapeHtml(parsed.body)}</div></section>`);
    if (parsed.meta.comments.trim()) body.push(`<section class="section"><h2 class="section-heading">Opmerkingen</h2><div class="note-content">${escapeHtml(parsed.meta.comments)}</div></section>`);

    // Include ALL image attachments in export (webp, jpeg, png, etc.)
    if (song.attachments && song.attachments.length > 0) {
      const imageAttachments = song.attachments.filter(isImageAttachment);
      if (imageAttachments.length > 0) {
        body.push('<section class="section"><h2 class="section-heading">Bijlagen</h2>');
        imageAttachments.forEach((att, attIdx) => {
          const caption = att.caption ? escapeHtml(att.caption) : (imageAttachments.length > 1 ? `${escapeHtml(song.title)} (${attIdx + 1})` : escapeHtml(song.title));
          body.push(`<figure class="attachment"><img src="${escapeHtml(att.publicUrl)}" alt="${caption}" loading="eager" style="max-width:100%;height:auto;display:block;margin:0 auto;" /><figcaption class="attachment-caption">${caption}</figcaption></figure>`);
        });
        body.push('</section>');
      }
    }
    body.push('<footer class="document-footer">GigManager <span aria-hidden="true">·</span> pagina <span class="page-number"></span></footer>');
    win.document.open();
    win.document.write(createPrintDocument(escapeHtml(song.title), body.join('\n')));
    win.document.close();
  };

  return (
    <div className="space-y-6 bg-black text-slate-100 p-4 sm:p-6 rounded-3xl border border-neutral-800/80 shadow-2xl min-h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-neutral-800/80 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-cyan-500 animate-pulse" />
            {copy.title}
          </h2>
          <p className="text-xs text-neutral-400 mt-1">Beheer nummers, akkorden, notities en bladmuziek afbeeldingen</p>
        </div>
        <button
          type="button"
          onClick={() => openEditor()}
          className="rounded-xl bg-gradient-to-r from-brand-600 via-indigo-600 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-cyan-500/20 transition hover:scale-[1.02] active:scale-[0.98]"
        >
          {copy.newButton}
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950/90 p-4 shadow-xl backdrop-blur">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <input
            type="text"
            value={songSearch}
            onChange={(e) => setSongSearch(e.target.value)}
            placeholder={copy.searchPlaceholder}
            className="w-full rounded-xl border border-neutral-800 bg-black px-4 py-2.5 text-sm text-slate-100 placeholder-neutral-500 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
          />
          <label className="inline-flex items-center gap-2 text-sm text-neutral-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyWithNotes}
              onChange={(e) => setShowOnlyWithNotes(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-cyan-500 focus:ring-cyan-500"
            />
            {copy.withNotesOnly}
          </label>
        </div>
        
        {/* Additional Filters */}
        <div className="mt-3 flex flex-wrap gap-2">
          {/* Attachment Filter */}
          <select
            value={attachmentFilter}
            onChange={(e) => setAttachmentFilter(e.target.value as "all" | "with" | "without")}
            className="rounded-lg border border-neutral-800 bg-black px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
          >
            <option value="all">{copy.filterAttachmentsAll}</option>
            <option value="with">{copy.filterAttachmentsWith}</option>
            <option value="without">{copy.filterAttachmentsWithout}</option>
          </select>
          
          {/* Tuning Filter */}
          <select
            value={tuningFilter}
            onChange={(e) => setTuningFilter(e.target.value)}
            className="rounded-lg border border-neutral-800 bg-black px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
          >
            <option value="">{copy.filterTuning}</option>
            {Array.from(new Set(songs.map(s => parseSongNotes(s.notes).meta.keySignature).filter(Boolean))).sort().map(tuning => (
              <option key={tuning} value={tuning}>{tuning}</option>
            ))}
          </select>
          
          {/* Tag Filter */}
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="rounded-lg border border-neutral-800 bg-black px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
          >
            <option value="">{copy.filterTag}</option>
            {Array.from(new Set(songs.flatMap(s => s.tags?.map(t => t.name) || []))).sort().map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
          
          {/* Key Filter */}
          <select
            value={keyFilter}
            onChange={(e) => setKeyFilter(e.target.value)}
            className="rounded-lg border border-neutral-800 bg-black px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
          >
            <option value="">{copy.filterKey}</option>
            {Array.from(new Set(songs.map(s => parseSongNotes(s.notes).meta.keySignature).filter(Boolean))).sort().map(key => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
          
          {/* Reset Filters Button */}
          {(attachmentFilter !== "all" || tuningFilter || tagFilter || keyFilter) && (
            <button
              onClick={() => {
                setAttachmentFilter("all");
                setTuningFilter("");
                setTagFilter("");
                setKeyFilter("");
              }}
              className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-slate-300 hover:bg-neutral-800 transition"
            >
              {copy.resetFilters}
            </button>
          )}
        </div>

        {/* Songs List */}
        <div className="mt-5 grid gap-3">
          {loading ? (
            <div className="py-12 text-center text-sm text-neutral-400">Repertoire laden...</div>
          ) : filteredSongs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-800 p-8 text-center text-sm text-neutral-400">
              {copy.emptyState}
            </div>
          ) : (
            filteredSongs.map((song) => {
              const parsed = parseSongNotes(song.notes);
              const attachmentCount = song.attachments?.length || 0;
              return (
                <div
                  key={song.id}
                  className="rounded-2xl border border-neutral-800/90 bg-black p-4 transition duration-200 hover:border-neutral-700 hover:shadow-lg hover:shadow-cyan-950/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-base font-bold text-white">{song.title}</div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="truncate text-xs font-medium text-neutral-400">
                          {(song.bands || []).map((b) => b.name).join(", ") || copy.noBand}
                        </span>
                        {parsed.meta.keySignature && (
                          <span className="rounded-full bg-cyan-950/60 border border-cyan-800/50 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-300">
                            {parsed.meta.keySignature}
                          </span>
                        )}
                        {parsed.meta.bpm && (
                          <span className="rounded-full bg-neutral-900 border border-neutral-800 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-300">
                            {parsed.meta.bpm} BPM
                          </span>
                        )}
                        <span className="text-[11px] text-neutral-400">
                          {attachmentCount} {copy.attachments}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleExportSong(song)}
                        className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-800 transition"
                        title="Export song details and images to PDF/Print"
                      >
                        {copy.exportSong}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditor(song)}
                        className="rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-500 transition"
                      >
                        {isDutch ? "Bewerken" : "Edit"}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSong(song.id)}
                        className="rounded-xl border border-rose-900/50 bg-rose-950/30 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-950/50 transition"
                        title={copy.deleteSong}
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {parsed.body.trim() && (
                    <p className="mt-3 text-xs text-neutral-300 line-clamp-3 bg-neutral-950 p-2.5 rounded-xl border border-neutral-900">
                      {parsed.body}
                    </p>
                  )}

                  {song.attachments && song.attachments.length > 0 && (
                    <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1">
                      {song.attachments.map((attachment, aIdx) => (
                        <button
                          key={attachment.id}
                          type="button"
                          onClick={() => {
                            setViewerAttachments(song.attachments || []);
                            setViewerIndex(aIdx);
                            setViewerTitle(song.title);
                            const parsedMeta = parseSongNotes(song.notes).meta;
                            setViewerTuning(parsedMeta.keySignature || undefined);
                            setViewerOpen(true);
                          }}
                          className="group relative rounded-xl overflow-hidden border border-neutral-800 hover:border-cyan-500 transition shrink-0"
                        >
                          {isImageAttachment(attachment) ? (
                            <img
                              src={attachment.publicUrl}
                              alt={attachment.caption || song.title}
                              className="h-20 w-20 object-cover group-hover:scale-105 transition"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement?.classList.add('bg-neutral-900');
                              }}
                            />
                          ) : isPdfAttachment(attachment) ? (
                            <div className="flex h-20 w-20 flex-col items-center justify-center gap-1 bg-gradient-to-br from-rose-950/70 to-neutral-950 px-2 text-white">
                              <Icons.Document className="h-6 w-6" />
                              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-200">PDF</span>
                            </div>
                          ) : (
                            <div className="flex h-20 w-20 flex-col items-center justify-center gap-1 bg-neutral-900 px-2 text-white">
                              <Icons.Document className="h-6 w-6" />
                              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-300">Doc</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-[10px] text-white font-medium">
                            Bekijk
                          </div>
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

      {/* Editor Modal */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm p-4 sm:p-6 flex items-center justify-center">
          <div className="w-full max-w-4xl rounded-3xl bg-neutral-950 border border-neutral-800 p-6 shadow-2xl text-slate-100 my-auto">
            <div className="flex items-start justify-between gap-3 border-b border-neutral-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white">
                  {editingSong ? editingSong.title : copy.create}
                </h3>
                <p className="text-xs text-neutral-400 mt-1">{copy.attachmentHint}</p>
              </div>
              <div className="flex items-center gap-2">
                {editingSong && (
                  <button
                    type="button"
                    onClick={() => handleExportSong(editingSong)}
                    className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-800 transition"
                  >
                    {copy.exportSong}
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeEditor}
                  className="rounded-xl border border-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-400 hover:bg-neutral-900 hover:text-white transition"
                >
                  {copy.cancel}
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={isDutch ? "Titel van nummer" : "Song title"}
                className="w-full rounded-xl border border-neutral-800 bg-black px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={songMeta.bandProject}
                  onChange={(e) => setSongMeta((prev) => ({ ...prev, bandProject: e.target.value }))}
                  placeholder={copy.bandProject}
                  className="rounded-xl border border-neutral-800 bg-black px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:border-cyan-500 outline-none"
                />
                <input
                  value={songMeta.genre}
                  onChange={(e) => setSongMeta((prev) => ({ ...prev, genre: e.target.value }))}
                  placeholder={copy.genre}
                  className="rounded-xl border border-neutral-800 bg-black px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:border-cyan-500 outline-none"
                />
                <input
                  value={songMeta.keySignature}
                  onChange={(e) => setSongMeta((prev) => ({ ...prev, keySignature: e.target.value }))}
                  placeholder={copy.keySignature}
                  className="rounded-xl border border-neutral-800 bg-black px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:border-cyan-500 outline-none"
                />
                <input
                  value={songMeta.bpm}
                  onChange={(e) => setSongMeta((prev) => ({ ...prev, bpm: e.target.value }))}
                  placeholder={copy.bpm}
                  className="rounded-xl border border-neutral-800 bg-black px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:border-cyan-500 outline-none"
                />
              </div>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={copy.placeholder}
                className="min-h-36 w-full rounded-xl border border-neutral-800 bg-black px-4 py-3 text-sm text-white placeholder-neutral-500 focus:border-cyan-500 outline-none"
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
                  className="min-w-[220px] flex-1 rounded-xl border border-neutral-800 bg-black px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:border-cyan-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const value = tagInput.trim();
                    if (value && !tags.includes(value)) setTags((prev) => [...prev, value]);
                    setTagInput("");
                  }}
                  className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-200 hover:bg-neutral-800"
                >
                  {copy.addTag}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setTags((prev) => prev.filter((entry) => entry !== tag))}
                    className="rounded-full bg-neutral-900 border border-neutral-800 px-3 py-1 text-xs font-semibold text-neutral-300 hover:border-rose-800 hover:text-rose-400"
                  >
                    {tag} ×
                  </button>
                ))}
              </div>

              <SongMediaManager attachments={attachments} onChange={setAttachments} />

              <div className="flex justify-end gap-3 border-t border-neutral-800 pt-4">
                <button
                  type="button"
                  onClick={closeEditor}
                  className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-300 hover:bg-neutral-800"
                >
                  {copy.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !title.trim()}
                  className="rounded-xl bg-gradient-to-r from-brand-600 to-cyan-600 px-5 py-2 text-sm font-semibold text-white shadow-md disabled:opacity-50"
                >
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

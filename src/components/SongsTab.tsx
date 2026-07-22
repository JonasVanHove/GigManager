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
    const htmlParts: string[] = [];
    htmlParts.push('<!doctype html><html><head><meta charset="utf-8"><title>' + escapeHtml(song.title) + '</title>');
    htmlParts.push('<meta name="viewport" content="width=device-width,initial-scale=1" />');
    htmlParts.push('<style>');
    htmlParts.push('@page { size: A4; margin: 20mm; }');
    htmlParts.push('html,body{height:100%;margin:0;padding:0;font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background:#fff; color:#0f172a;}');
    htmlParts.push('.container{max-width:800px;margin:0 auto;padding:24px;}');
    htmlParts.push('.title{font-size:26px;font-weight:800;margin-bottom:6px;color:#020617;}');
    htmlParts.push('.meta-bar{display:flex;flex-wrap:wrap;gap:12px;color:#475569;font-size:13px;font-weight:600;margin-bottom:18px;padding-bottom:12px;border-bottom:2px solid #e2e8f0;}');
    htmlParts.push('.meta-item{background:#f1f5f9;padding:4px 10px;border-radius:6px;}');
    htmlParts.push('.notes-box{white-space:pre-wrap;background:#f8fafc;padding:16px;border-radius:10px;border:1px solid #cbd5e1;margin-bottom:24px;font-size:14px;line-height:1.6;}');
    htmlParts.push('.image-box{margin-top:20px;page-break-inside:avoid;break-inside:avoid-column;text-align:center;}');
    htmlParts.push('.image-box img{max-width:100%;height:auto;border-radius:8px;border:1px solid #cbd5e1;box-shadow:0 4px 12px rgba(0,0,0,0.08);}');
    htmlParts.push('.caption{font-size:12px;color:#64748b;margin-top:6px;font-style:italic;}');
    htmlParts.push('@media print{body{margin:0} .container{padding:0} .image-box{page-break-inside:avoid;}}');
    htmlParts.push('</style>');
    htmlParts.push('<script>function printWhenLoaded(){const imgs = Array.from(document.images); if(imgs.length===0){window.focus();window.print();return;} let loaded=0; const done=()=>{loaded++; if(loaded===imgs.length){window.focus();window.print();}}; imgs.forEach(img=>{ if(img.complete){loaded++; } else { img.addEventListener("load", done); img.addEventListener("error", done); }}); setTimeout(()=>{window.focus();window.print();}, 3000);} window.addEventListener("load",()=>setTimeout(printWhenLoaded, 250));</script>');
    htmlParts.push('</head><body><div class="container">');
    htmlParts.push(`<div class="title">${escapeHtml(song.title)}</div>`);

    const metaBadges: string[] = [];
    if (parsed.meta.bandProject) metaBadges.push(`<span class="meta-item">Band: ${escapeHtml(parsed.meta.bandProject)}</span>`);
    if (parsed.meta.genre) metaBadges.push(`<span class="meta-item">Genre: ${escapeHtml(parsed.meta.genre)}</span>`);
    if (parsed.meta.keySignature) metaBadges.push(`<span class="meta-item">Toonsoort: ${escapeHtml(parsed.meta.keySignature)}</span>`);
    if (parsed.meta.bpm) metaBadges.push(`<span class="meta-item">BPM: ${escapeHtml(parsed.meta.bpm)}</span>`);
    if (metaBadges.length > 0) htmlParts.push(`<div class="meta-bar">${metaBadges.join('')}</div>`);

    if (parsed.body.trim()) htmlParts.push(`<div class="notes-box">${escapeHtml(parsed.body)}</div>`);

    if (song.attachments && song.attachments.length > 0) {
      htmlParts.push('<div style="margin-top:24px;">');
      htmlParts.push('<h3 style="font-size:16px;font-weight:700;margin-bottom:12px;">Bijlagen & Afbeeldingen</h3>');
      song.attachments.forEach((att) => {
        htmlParts.push(`<div class="image-box"><img src="${escapeHtml(att.publicUrl)}" alt="${escapeHtml(att.caption || song.title)}" />${att.caption ? `<div class="caption">${escapeHtml(att.caption)}</div>` : ''}</div>`);
      });
      htmlParts.push('</div>');
    }
    htmlParts.push('</div></body></html>');
    win.document.open();
    win.document.write(htmlParts.join('\n'));
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
                          <img
                            src={attachment.publicUrl}
                            alt={attachment.caption || song.title}
                            className="h-20 w-20 object-cover group-hover:scale-105 transition"
                          />
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
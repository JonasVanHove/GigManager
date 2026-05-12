"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Icons } from "./Icons";
import { supabaseClient } from "@/lib/supabase-client";
import { useAuth } from "./AuthProvider";
import { useSettings } from "./SettingsProvider";
import { useImmersiveMode } from "@/lib/use-immersive-mode";
import type { AppLanguage } from "@/types";

const CURRENCIES = [
  { code: "EUR", label: "Euro (€)", symbol: "€" },
  { code: "USD", label: "US Dollar ($)", symbol: "$" },
  { code: "GBP", label: "British Pound (£)", symbol: "£" },
  { code: "CHF", label: "Swiss Franc (CHF)", symbol: "CHF" },
  { code: "SEK", label: "Swedish Krona (kr)", symbol: "kr" },
  { code: "NOK", label: "Norwegian Krone (kr)", symbol: "kr" },
  { code: "DKK", label: "Danish Krone (kr)", symbol: "kr" },
  { code: "PLN", label: "Polish Złoty (zł)", symbol: "zł" },
  { code: "CZK", label: "Czech Koruna (Kč)", symbol: "Kč" },
  { code: "HUF", label: "Hungarian Forint (Ft)", symbol: "Ft" },
  { code: "CAD", label: "Canadian Dollar (CA$)", symbol: "CA$" },
  { code: "AUD", label: "Australian Dollar (A$)", symbol: "A$" },
  { code: "JPY", label: "Japanese Yen (¥)", symbol: "¥" },
];

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { session } = useAuth();
  const { settings, updateSettings, language, setLanguage } = useSettings();
  const { isFullscreen, canRequestFullscreen, toggleFullscreen } = useImmersiveMode();
  const [currency, setCurrency] = useState(settings.currency);
  const [claimPerf, setClaimPerf] = useState(settings.claimPerformanceFee);
  const [claimTech, setClaimTech] = useState(settings.claimTechnicalFee);
  const [theme, setTheme] = useState(settings.theme);
  const [appLanguage, setAppLanguage] = useState<AppLanguage>(language);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const githubRepoUrl = "https://github.com/JonasVanHove/GigManager";

  const hasSettingsChanges =
    currency !== settings.currency ||
    claimPerf !== settings.claimPerformanceFee ||
    claimTech !== settings.claimTechnicalFee ||
    theme !== settings.theme ||
    appLanguage !== language;

  const hasProfileChanges =
    displayName !== (session?.user?.user_metadata?.name || "") ||
    avatarUrl !== (session?.user?.user_metadata?.avatar_url || "");

  useEffect(() => {
    setDisplayName(session?.user?.user_metadata?.name || "");
    setAvatarUrl(session?.user?.user_metadata?.avatar_url || "");
    setAvatarFile(null);
  }, [session?.user]);

  useEffect(() => {
    setAppLanguage(language);
  }, [language]);

  useEffect(() => {
    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousDocumentOverflow = documentElement.style.overflow;

    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousDocumentOverflow;
    };
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be smaller than 2MB");
      return;
    }

    setAvatarFile(file);
    setError("");

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${session?.user?.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabaseClient.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        console.error("Avatar upload error:", uploadError);
        throw new Error(
          uploadError.message.includes("not found") || uploadError.statusCode === "404"
            ? "Storage bucket 'avatars' not found. Please create it in Supabase (see AVATAR_SETUP.md)"
            : uploadError.message
        );
      }

      const { data: { publicUrl } } = supabaseClient.storage
        .from("avatars")
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrl);
    } catch (err: any) {
      console.error("Avatar upload failed:", err);
      setError(err.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!hasSettingsChanges && !hasProfileChanges) {
      onClose();
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (hasSettingsChanges) {
        await updateSettings({
          currency,
          claimPerformanceFee: claimPerf,
          claimTechnicalFee: claimTech,
          theme,
        });
        setLanguage(appLanguage);
      }

      if (hasProfileChanges) {
        const { error: profileError } = await supabaseClient.auth.updateUser({
          data: {
            name: displayName.trim(),
            avatar_url: avatarUrl.trim() || null,
          },
        });

        if (profileError) {
          throw profileError;
        }
      }
      onClose();
    } catch {
      setError("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 py-4 backdrop-blur-md sm:items-center modal-backdrop-enter">
      <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200/50 bg-white/95 shadow-2xl backdrop-blur dark:border-slate-700/50 dark:bg-slate-900/95 modal-content-enter">
        <div className="flex items-center justify-between border-b border-slate-100/50 px-6 py-5 dark:border-slate-700/50">
          <h2 className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-lg font-semibold text-transparent dark:from-white dark:to-slate-200">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-all duration-200 hover:bg-slate-100/60 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800/60 dark:hover:text-slate-300"
          >
            <Icons.Close className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Profile
            </label>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 overflow-hidden rounded-full bg-slate-200 text-slate-600 shadow-sm dark:bg-slate-700 dark:text-slate-100">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="Profile avatar"
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-semibold">
                    {(displayName || session?.user?.email || "?").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Display name"
                  className="w-full rounded-lg border border-slate-300/60 bg-white/80 px-3 py-2 text-sm text-slate-900 shadow-sm backdrop-blur transition-all duration-200 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600/60 dark:bg-slate-800/70 dark:text-slate-100 dark:focus:border-brand-400 dark:focus:ring-brand-400/20"
                />
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="Avatar image URL"
                    className="flex-1 rounded-lg border border-slate-300/60 bg-white/80 px-3 py-2 text-sm text-slate-900 shadow-sm backdrop-blur transition-all duration-200 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600/60 dark:bg-slate-800/70 dark:text-slate-100 dark:focus:border-brand-400 dark:focus:ring-brand-400/20"
                  />
                  <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300/60 bg-white/80 px-3 py-2 text-sm text-slate-600 shadow-sm backdrop-blur transition-all duration-200 hover:bg-slate-50/90 hover:shadow-md dark:border-slate-600/60 dark:bg-slate-800/70 dark:text-slate-400 dark:hover:bg-slate-700/70">
                    {uploading ? <Icons.Spinner className="h-4 w-4" /> : <Icons.Download className="h-4 w-4" />}
                    <span className="hidden sm:inline">Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Upload an image or paste a URL. Max 2MB.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Project
            </label>
            <a
              href={githubRepoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300/60 bg-white/80 px-3 py-2 text-sm font-medium text-slate-800 shadow-sm backdrop-blur transition-all duration-200 hover:bg-slate-50/90 hover:shadow-md dark:border-slate-600/60 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-700/70"
              title="Open GitHub repository"
            >
              <Icons.GitHub className="h-4 w-4" />
              GitHub repository
            </a>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Opens the repository you can use for version bumps, tags, and releases.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-lg border border-slate-300/60 bg-white/80 px-3 py-2 text-sm text-slate-900 shadow-sm backdrop-blur transition-all duration-200 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600/60 dark:bg-slate-800/70 dark:text-slate-100 dark:focus:border-brand-400 dark:focus:ring-brand-400/20"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              All amounts will be displayed in this currency.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Language
            </label>
            <select
              value={appLanguage}
              onChange={(e) => setAppLanguage(e.target.value as AppLanguage)}
              className="w-full rounded-lg border border-slate-300/60 bg-white/80 px-3 py-2 text-sm text-slate-900 shadow-sm backdrop-blur transition-all duration-200 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600/60 dark:bg-slate-800/70 dark:text-slate-100 dark:focus:border-brand-400 dark:focus:ring-brand-400/20"
            >
              <option value="system">System language</option>
              <option value="en">English</option>
              <option value="nl">Nederlands</option>
            </select>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {appLanguage === "system"
                ? "Matches your device language and date/time format."
                : appLanguage === "nl"
                ? "Dutch interface with Dutch date/time formatting."
                : "English interface with English date/time formatting."}
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Appearance
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["light", "dark", "system"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    theme === t
                      ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-950/30 dark:text-brand-300"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-600"
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {theme === "system"
                ? "Matches your device settings"
                : theme === "dark"
                ? "Always dark mode"
                : "Always light mode"}
            </p>
          </div>

          {canRequestFullscreen && (
            <div>
              <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Display
              </label>
              <button
                onClick={toggleFullscreen}
                className={`flex w-full items-center justify-between rounded-lg border-2 px-4 py-3 transition-all duration-200 ${
                  isFullscreen
                    ? "border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-950/30"
                    : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
                }`}
              >
                <span className={`text-sm font-medium ${isFullscreen ? "text-brand-700 dark:text-brand-300" : "text-slate-700 dark:text-slate-300"}`}>
                  Fullscreen Mode
                </span>
                <div className={`h-5 w-9 rounded-full transition ${isFullscreen ? "bg-brand-500 dark:bg-brand-600" : "bg-slate-300 dark:bg-slate-600"}`}>
                  <div className={`h-4 w-4 rounded-full bg-white transition-transform ${isFullscreen ? "translate-x-4" : "translate-x-0.5"}`} />
                </div>
              </button>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {isFullscreen ? "Fullscreen mode is active. Tap/click to exit." : "Toggle fullscreen to maximize your display space."}
              </p>
            </div>
          )}

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              Fee components you claim
            </legend>
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              Toggle which fee components count towards your personal earnings.
            </p>

            <div className="space-y-3">
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-800/70">
                <input
                  type="checkbox"
                  checked={claimPerf}
                  onChange={(e) => setClaimPerf(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600 dark:text-brand-400 dark:focus:ring-brand-400"
                />
                <div>
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Performance fee</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Your share of the performance fee split among all musicians
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-800/70">
                <input
                  type="checkbox"
                  checked={claimTech}
                  onChange={(e) => setClaimTech(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600 dark:text-brand-400 dark:focus:ring-brand-400"
                />
                <div>
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Technical fee</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    The full technical fee (not split, goes to the manager)
                  </p>
                </div>
              </label>
            </div>
          </fieldset>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100/50 px-6 py-4 dark:border-slate-700/50">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-600 to-brand-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:from-brand-700 hover:to-brand-800 disabled:opacity-50"
          >
            {saving && (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

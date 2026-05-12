"use client";

import { useState } from "react";
import type { Gig } from "@/types";
import { useAuth } from "./AuthProvider";

interface BulkEditorProps {
  gigs: Gig[];
  selectedIds: Set<string>;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkEditor({
  gigs,
  selectedIds,
  onClose,
  onSuccess,
}: BulkEditorProps) {
  const { getAccessToken } = useAuth();
  const [action, setAction] = useState<"payment" | "band" | "none">("none");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedGigs = gigs.filter((g) => selectedIds.has(g.id));

  const handleBatchMarkPaid = async () => {
    if (selectedGigs.length === 0) return;

    setLoading(true);
    setError("");

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("No auth token");

      const updates = selectedGigs.map((gig) => ({
        id: gig.id,
        updates: {
          paymentReceived: true,
          paymentReceivedDate: new Date().toISOString(),
        },
      }));

      const response = await fetch("/api/gigs/bulk-update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update gigs");
      }

      onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchMarkBandPaid = async () => {
    if (selectedGigs.length === 0) return;

    setLoading(true);
    setError("");

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("No auth token");

      const updates = selectedGigs.map((gig) => ({
        id: gig.id,
        updates: {
          bandPaid: true,
          bandPaidDate: new Date().toISOString(),
        },
      }));

      const response = await fetch("/api/gigs/bulk-update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update gigs");
      }

      onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md modal-backdrop-enter">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/50 bg-white/95 dark:border-slate-700/50 dark:bg-slate-800/95 backdrop-blur shadow-2xl modal-content-enter">
        <div className="border-b border-slate-200/50 dark:border-slate-700/50 px-6 py-5 bg-gradient-to-r from-slate-50/70 to-slate-100/40 dark:from-slate-800/40 dark:to-slate-800/10">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Bulk Actions
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Applying to {selectedGigs.length} gig{selectedGigs.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="px-6 py-5">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200/50 bg-red-50/70 backdrop-blur px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleBatchMarkPaid}
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 px-4 py-3 text-sm font-medium text-white shadow-md transition-all duration-200"
            >
              {loading ? "Updating..." : "✓ Mark as Payment Received"}
            </button>

            <button
              onClick={handleBatchMarkBandPaid}
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 px-4 py-3 text-sm font-medium text-white shadow-md transition-all duration-200"
            >
              {loading ? "Updating..." : "✓ Mark Band as Paid"}
            </button>

            <button
              onClick={onClose}
              disabled={loading}
              className="w-full rounded-lg border border-slate-300/50 dark:border-slate-600/50 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-700/40 backdrop-blur hover:bg-slate-50/80 dark:hover:bg-slate-700/60 transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import LoadingSpinner from "./LoadingSpinner";

interface SuperAdminUserRow {
  id: string;
  supabaseId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  superAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  counts: {
    bandMembers: number;
    gigs: number;
    investments: number;
    notes: number;
    setlists: number;
    songs: number;
  };
}

export default function SuperAdminTab() {
  const { getAccessToken } = useAuth();
  const [users, setUsers] = useState<SuperAdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadUsers = async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          throw new Error("Missing access token");
        }

        const response = await fetch("/api/superadmin/users", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const payload = (await response.json()) as { users?: SuperAdminUserRow[] };
        if (mounted) {
          setUsers(payload.users || []);
          setError("");
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load users");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadUsers();

    return () => {
      mounted = false;
    };
  }, [getAccessToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" message="Loading superadmin data..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
        Failed to load superadmin overview: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200/60 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">Superadmin</p>
        <h2 className="mt-2 text-2xl font-bold">User overview</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          All registered users with their profile image, account data, and usage counts.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Users", value: users.length },
          { label: "Superadmins", value: users.filter((user) => user.superAdmin).length },
          { label: "Gigs", value: users.reduce((total, user) => total + user.counts.gigs, 0) },
          { label: "Notes", value: users.reduce((total, user) => total + user.counts.notes, 0) },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{item.label}</div>
            <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-950/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Data</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Counts</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Dates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {users.map((user) => (
                <tr key={user.id} className="align-top hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                        {user.avatarUrl ? (
                          <Image src={user.avatarUrl} alt={user.name || user.email} width={44} height={44} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-sm font-semibold">{(user.name || user.email || "?").charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-slate-900 dark:text-slate-50">{user.name || "Unnamed user"}</div>
                          {user.superAdmin && (
                            <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[11px] font-semibold text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300">superadmin</span>
                          )}
                        </div>
                        <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                    <div>Supabase ID: {user.supabaseId}</div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 xl:grid-cols-3">
                      <span>Gigs: {user.counts.gigs}</span>
                      <span>Band members: {user.counts.bandMembers}</span>
                      <span>Setlists: {user.counts.setlists}</span>
                      <span>Investments: {user.counts.investments}</span>
                      <span>Notes: {user.counts.notes}</span>
                      <span>Songs: {user.counts.songs}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">
                    <div>Created {new Date(user.createdAt).toLocaleString()}</div>
                    <div className="mt-1">Updated {new Date(user.updatedAt).toLocaleString()}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
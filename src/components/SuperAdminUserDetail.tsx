"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import LoadingSpinner from "./LoadingSpinner";

interface UserDetailProps {
  userId: string;
  userName: string | null;
  userEmail: string;
  userAvatar: string | null;
  token: string;
  onClose: () => void;
}

interface DetailData {
  user: {
    id: string;
    supabaseId: string;
    email: string;
    name: string | null;
    superAdmin: boolean;
    createdAt: string;
    updatedAt: string;
  };
  stats: {
    gigsThisMonth: number;
    totalEarnings: number;
    myEarnings: number; // now represents received amount
    totalEarningsReceived?: number;
    totalEarningsPending?: number;
    paidMyEarnings: number;
    pendingMyEarnings: number;
    averageMyEarningsPerGig: number;
    totalGigs: number;
    totalBandMembers: number;
    totalInvestments: number;
    totalInvested: number;
    totalSharedWithMusician: number;
    investmentShareRate: number;
    totalSetlists: number;
    biggestGig: {
      id: string;
      eventName: string;
      date: string;
      myEarnings: number;
    } | null;
    breakdownReceived?: {
      performance: number;
      technical: number;
      bonus: number;
      advancesApplied: number;
    };
  };
  recentGigs: Array<{
    id: string;
    eventName: string;
    date: string;
    myEarnings: number;
    paymentReceived: boolean;
  }>;
  bandMembers: Array<{
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  }>;
  investments: Array<{
    id: string;
    amount: number;
    description: string | null;
    date: string;
    sharedWithMusician: boolean;
  }>;
  topSetlists: Array<{
    id: string;
    title: string;
    items: Array<{ id: string }>;
  }>;
  settings: {
    currency: string;
    claimPerformanceFee: boolean;
    claimTechnicalFee: boolean;
  } | null;
  pendingGigs?: Array<{
    id: string;
    eventName: string;
    date: string;
    pendingAmount: number;
  }>;
}

export default function SuperAdminUserDetail({
  userId,
  userName,
  userEmail,
  userAvatar,
  token,
  onClose,
}: UserDetailProps) {
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadUserDetails = async () => {
      try {
        const response = await fetch(`/api/superadmin/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error("Failed to load user details");
        }

        const payload = await response.json();
        setData(payload);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load details");
      } finally {
        setLoading(false);
      }
    };

    loadUserDetails();
  }, [userId, token]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" message="Loading user details..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200 max-w-sm">
          <div className="font-semibold">Error</div>
          <div className="mt-2 text-sm">{error}</div>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 rounded-lg bg-rose-200 hover:bg-rose-300 dark:bg-rose-900/50 dark:hover:bg-rose-900 text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const formatCurrency = (amount: number) => {
    const currency = data.settings?.currency || "EUR";
    return new Intl.NumberFormat("nl-BE", { style: "currency", currency }).format(Number.isFinite(amount) ? amount : 0);
  };

  const safeNumber = (value: number | null | undefined) => (Number.isFinite(value ?? NaN) ? (value as number) : 0);

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black/50 backdrop-blur-sm">
      <div className="min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
          {/* Header */}
          <div className="relative overflow-hidden rounded-t-3xl bg-gradient-to-br from-cyan-600 via-blue-600 to-slate-700 px-6 py-8 sm:px-8 sm:py-12">
            <button
              onClick={onClose}
              className="absolute right-6 top-6 rounded-full bg-white/20 p-2 hover:bg-white/30 transition-colors"
            >
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white/20 shadow-lg">
                {userAvatar ? (
                  <Image src={userAvatar} alt={userName || userEmail} width={80} height={80} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-white">{(userName || userEmail || "?").charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="text-white">
                <h1 className="text-3xl font-bold">{userName || "Unnamed user"}</h1>
                <p className="mt-1 text-cyan-100">{userEmail}</p>
                <p className="mt-1 text-sm text-cyan-200">Member since {new Date(data.user.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4 border-b border-slate-200 dark:border-slate-800">
            {[
              { label: "Total Gigs", value: data.stats.totalGigs, icon: "🎵" },
              { label: "This Month", value: data.stats.gigsThisMonth, icon: "📅" },
              { label: "My Earnings (received)", value: formatCurrency(data.stats.myEarnings), icon: "💰" },
              { label: "Band Members", value: data.stats.totalBandMembers, icon: "👥" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{stat.label}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50">{stat.value}</p>
                  </div>
                  <span className="text-3xl">{stat.icon}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Tabs Content */}
          <div className="space-y-8 p-6 sm:p-8">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-900/40 dark:bg-cyan-950/20">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">Paid My Earnings</p>
                <p className="mt-2 text-2xl font-bold text-cyan-950 dark:text-cyan-100">{formatCurrency(data.stats.paidMyEarnings)}</p>
                <p className="mt-1 text-sm text-cyan-800/80 dark:text-cyan-200/80">Earnings already received from paid gigs.</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">Pending My Earnings</p>
                <p className="mt-2 text-2xl font-bold text-amber-950 dark:text-amber-100">{formatCurrency(data.stats.pendingMyEarnings)}</p>
                <p className="mt-1 text-sm text-amber-800/80 dark:text-amber-200/80">Still outstanding from unpaid gigs.</p>
              </div>
              {data.stats.breakdownReceived && (
                <div className="col-span-1 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Why received = this amount</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">{formatCurrency(data.stats.myEarnings)} — received</p>
                  <div className="mt-2 text-sm text-slate-600">
                    <div className="flex justify-between"><span>Performance</span><span>{formatCurrency(data.stats.breakdownReceived.performance)}</span></div>
                    <div className="flex justify-between"><span>Technical</span><span>{formatCurrency(data.stats.breakdownReceived.technical)}</span></div>
                    <div className="flex justify-between"><span>Bonus</span><span>{formatCurrency(data.stats.breakdownReceived.bonus)}</span></div>
                    <div className="flex justify-between"><span>Advances</span><span>{formatCurrency(data.stats.breakdownReceived.advancesApplied)}</span></div>
                  </div>
                </div>
              )}
              {data.pendingGigs && data.pendingGigs.length > 0 && (
                <div className="mt-4 lg:mt-0 lg:col-span-3">
                  <h4 className="text-sm font-semibold text-amber-700">Pending Payouts</h4>
                  <div className="mt-3 space-y-2">
                    {data.pendingGigs.map((pg) => (
                      <div key={pg.id} className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50 p-3">
                        <div>
                          <p className="font-medium text-amber-900">{pg.eventName}</p>
                          <p className="text-xs text-amber-800">{new Date(pg.date).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-amber-900">{formatCurrency(pg.pendingAmount)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Average per Gig</p>
                <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-slate-50">{formatCurrency(data.stats.averageMyEarningsPerGig)}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Average personal earnings per gig.</p>
              </div>
            </div>

            {data.stats.biggestGig && (
              <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-5 text-white shadow-xl dark:border-slate-800">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Top Gig</p>
                    <h3 className="mt-2 text-2xl font-bold">{data.stats.biggestGig.eventName}</h3>
                    <p className="mt-1 text-sm text-slate-300">{new Date(data.stats.biggestGig.date).toLocaleDateString()}</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 px-4 py-3 text-right">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-300">My Earnings</p>
                    <p className="mt-1 text-2xl font-bold">{formatCurrency(data.stats.biggestGig.myEarnings)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Gigs */}
            {data.recentGigs.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-4">Recent Gigs</h3>
                <div className="space-y-3">
                  {data.recentGigs.map((gig) => (
                    <div key={gig.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-50">{gig.eventName}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{new Date(gig.date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900 dark:text-slate-50">
                          {formatCurrency(gig.myEarnings)}
                        </p>
                        <p className={`text-sm ${gig.paymentReceived ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
                          {gig.paymentReceived ? "✓ Paid" : "⏳ Pending"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Band Members */}
            {data.bandMembers.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-4">Band Members ({data.stats.totalBandMembers})</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.bandMembers.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-white font-semibold text-sm">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-slate-50 truncate">{member.name}</p>
                        {member.email && <p className="text-xs text-slate-600 dark:text-slate-400">{member.email}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Investments */}
            {data.stats.totalInvestments > 0 && (
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-4">Investments ({data.stats.totalInvestments})</h3>
                <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 dark:border-slate-700 dark:from-slate-800/50 dark:to-slate-700/50 p-4 mb-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Total Invested</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-50">{formatCurrency(data.stats.totalInvested)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Shared with Musician</p>
                      <p className="mt-1 text-2xl font-bold text-cyan-600 dark:text-cyan-400">{data.stats.totalSharedWithMusician}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{Math.round(safeNumber(data.stats.investmentShareRate) * 100)}% of investments</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {data.investments.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-50">{inv.description || "Investment"}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{new Date(inv.date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">{formatCurrency(inv.amount)}</p>
                        {inv.sharedWithMusician && (
                          <p className="text-xs text-cyan-600 dark:text-cyan-400">shared</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Setlists */}
            {data.topSetlists.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-4">Setlists ({data.stats.totalSetlists})</h3>
                <div className="space-y-2">
                  {data.topSetlists.map((setlist) => (
                    <div key={setlist.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                      <p className="font-medium text-slate-900 dark:text-slate-50">{setlist.title}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{setlist.items.length} items</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-800 rounded-b-3xl bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Last updated: {new Date(data.user.updatedAt).toLocaleString()}
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-sm font-medium text-slate-900 dark:text-slate-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

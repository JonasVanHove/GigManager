"use client";

import { useMemo } from "react";
import type { Gig } from "@/types";
import { formatCurrency, formatDate } from "@/lib/calculations";

interface AnalyticsPageProps {
  gigs: Gig[];
  fmtCurrency: (amount: number) => string;
}

export default function AnalyticsPage({ gigs, fmtCurrency }: AnalyticsPageProps) {
  // ── Computed stats ──────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const paid = gigs.filter((g) => g.paymentReceived);
    const unpaid = gigs.filter((g) => !g.paymentReceived);
    const bandPaid = gigs.filter((g) => g.bandPaid);
    const bandUnpaid = gigs.filter((g) => !g.bandPaid);

    const totalReceived = paid.reduce((sum, g) => sum + (g.performanceFee + g.technicalFee), 0);
    const totalEarned = paid.reduce((sum, g) => {
      const perfShare = g.claimPerformanceFee ? g.performanceFee / g.numberOfMusicians : 0;
      const techShare = g.technicalFeeClaimAmount ?? (g.claimTechnicalFee ? g.technicalFee : 0);
      return sum + perfShare + techShare;
    }, 0);

    const avgGigSize = gigs.length > 0 ? totalReceived / gigs.length : 0;
    const avgEarningsPerGig = paid.length > 0 ? totalEarned / paid.length : 0;

    // Payment timeline
    const timeline = paid
      .map((g) => ({
        date: g.paymentReceivedDate ? new Date(g.paymentReceivedDate) : new Date(g.date),
        amount: g.performanceFee + g.technicalFee,
        eventName: g.eventName,
        received: g.paymentReceived,
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    // Monthly breakdown
    const monthlyData: Record<string, { count: number; total: number }> = {};
    paid.forEach((g) => {
      const date = g.paymentReceivedDate ? new Date(g.paymentReceivedDate) : new Date(g.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyData[key]) monthlyData[key] = { count: 0, total: 0 };
      monthlyData[key].count += 1;
      monthlyData[key].total += g.performanceFee + g.technicalFee;
    });

    const months = Object.entries(monthlyData)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 6)
      .reverse();

    return {
      totalGigs: gigs.length,
      paidGigs: paid.length,
      unpaidGigs: unpaid.length,
      totalReceived,
      totalEarned,
      avgGigSize,
      avgEarningsPerGig,
      bandPaidCount: bandPaid.length,
      bandUnpaidCount: bandUnpaid.length,
      timeline,
      months,
    };
  }, [gigs]);

  return (
    <div className="space-y-6 pb-6">
      {/* ── Key metrics ────────────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-4 text-xl font-bold text-slate-900">Key Metrics</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Total Gigs"
            value={stats.totalGigs.toString()}
            color="slate"
          />
          <MetricCard
            label="Gigs Paid"
            value={`${stats.paidGigs} / ${stats.totalGigs}`}
            color="emerald"
          />
          <MetricCard
            label="Total Received"
            value={fmtCurrency(stats.totalReceived)}
            color="brand"
          />
          <MetricCard
            label="Average Per Gig"
            value={fmtCurrency(stats.avgGigSize)}
            color="blue"
          />
        </div>
      </div>

      {/* ── Earnings breakdown ─────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Income</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Total Received (Clients)</span>
              <span className="font-bold text-slate-900">
                {fmtCurrency(stats.totalReceived)}
              </span>
            </div>
            <div className="h-px bg-slate-200" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Your Earnings</span>
              <span className="font-bold text-brand-700">
                {fmtCurrency(stats.totalEarned)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Band Share</span>
              <span className="font-bold text-amber-700">
                {fmtCurrency(stats.totalReceived - stats.totalEarned)}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Payment Status</h3>
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-slate-600">Client Payments</span>
                <span className="font-medium text-slate-900">
                  {stats.paidGigs} paid, {stats.unpaidGigs} pending
                </span>
              </div>
              <ProgressBar
                value={stats.paidGigs}
                max={stats.totalGigs}
                color="emerald"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-slate-600">Band Payments</span>
                <span className="font-medium text-slate-900">
                  {stats.bandPaidCount} paid, {stats.bandUnpaidCount} pending
                </span>
              </div>
              <ProgressBar
                value={stats.bandPaidCount}
                max={stats.totalGigs}
                color="blue"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Monthly trend ──────────────────────────────────────────────────── */}
      {stats.months.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">
            Monthly Income (Last 6 Months)
          </h3>
          <div className="space-y-3">
            {stats.months.map(([month, data]) => {
              const maxTotal = Math.max(...stats.months.map(([, d]) => d.total));
              const percentage = maxTotal > 0 ? (data.total / maxTotal) * 100 : 0;
              const [year, monthNum] = month.split("-");
              const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleString(
                "en-US",
                { month: "short", year: "numeric" }
              );

              return (
                <div key={month}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-slate-600">{monthName}</span>
                    <span className="font-semibold text-slate-900">
                      {fmtCurrency(data.total)} ({data.count} gigs)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Payment timeline ───────────────────────────────────────────────── */}
      {stats.timeline.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">
            Recent Payments
          </h3>
          <div className="space-y-2">
            {stats.timeline.map((payment, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-900">{payment.eventName}</p>
                  <p className="text-xs text-slate-500">
                    {formatDate(payment.date.toISOString())}
                  </p>
                </div>
                <p className="font-semibold text-brand-700">
                  {fmtCurrency(payment.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {gigs.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center">
          <svg className="mx-auto mb-4 h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" />
          </svg>
          <p className="text-slate-500">No gigs yet. Add your first performance to see analytics.</p>
        </div>
      )}
    </div>
  );
}

// ─── Helper components ──────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "slate" | "emerald" | "brand" | "blue";
}) {
  const colorMap = {
    slate: "bg-slate-50 text-slate-700 ring-slate-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    brand: "bg-brand-50 text-brand-700 ring-brand-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
  };

  return (
    <div className={`rounded-lg border ring-1 ${colorMap[color]} px-4 py-3`}>
      <p className="text-xs font-medium uppercase tracking-wider opacity-75">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function ProgressBar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: "emerald" | "blue";
}) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  const colorMap = {
    emerald: "bg-emerald-500",
    blue: "bg-blue-500",
  };

  return (
    <div className="h-2 rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full transition-all ${colorMap[color]}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

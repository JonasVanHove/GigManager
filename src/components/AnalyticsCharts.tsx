"use client";

import { useMemo } from "react";
import type { Gig } from "@/types";
import { calculateGigFinancials } from "@/lib/calculations";
import { resolveLocale } from "@/lib/preferences";
import { useSettings } from "./SettingsProvider";

interface AnalyticsChartsProps {
  gigs: Gig[];
  fmtCurrency: (amount: number) => string;
}

interface MonthlyData {
  month: string;
  earnings: number;
  gigs: number;
  averagePerGig: number;
}

interface BandPerformance {
  name: string;
  gigs: number;
  totalEarned: number;
  averageEarnings: number;
}

interface AnalyticsSummary {
  totalEarnings: number;
  totalGigs: number;
  averagePerGig: number;
  highestMonth: MonthlyData | null;
  bestBand: BandPerformance | null;
  monthlyData: MonthlyData[];
  bandPerformance: BandPerformance[];
}

export default function AnalyticsCharts({ gigs, fmtCurrency }: AnalyticsChartsProps) {
  const { language } = useSettings();
  const tr = (en: string, nl: string) => (language === "nl" ? nl : en);
  const gigCountLabel = (count: number) => (count === 1 ? tr("gig", "optreden") : tr("gigs", "optredens"));

  const analytics = useMemo<AnalyticsSummary>(() => {
    if (gigs.length === 0) {
      return {
        totalEarnings: 0,
        totalGigs: 0,
        averagePerGig: 0,
        highestMonth: null,
        bestBand: null,
        monthlyData: [],
        bandPerformance: [],
      };
    }

    // Calculate monthly data
    const monthlyMap = new Map<string, { earnings: number; gigs: number }>();
    const bandMap = new Map<string, { earnings: number; gigs: number }>();
    let totalEarnings = 0;
    let totalGigs = gigs.length;

    gigs.forEach((gig) => {
      const calc = calculateGigFinancials(
        gig.performanceFee,
        gig.technicalFee,
        gig.managerBonusType,
        gig.managerBonusAmount,
        gig.numberOfMusicians,
        gig.claimPerformanceFee,
        gig.claimTechnicalFee,
        gig.technicalFeeClaimAmount,
        gig.advanceReceivedByManager,
        gig.advanceToMusicians,
        gig.isCharity
      );

      const managerEarnings = calc.myEarnings;
      const date = new Date(gig.date);
      const monthKey = date.toLocaleDateString(resolveLocale(), { year: "numeric", month: "2-digit" });

      // Monthly aggregation
      monthlyMap.set(monthKey, {
        earnings: (monthlyMap.get(monthKey)?.earnings || 0) + managerEarnings,
        gigs: (monthlyMap.get(monthKey)?.gigs || 0) + 1,
      });

      // Band aggregation
      const performers = gig.performers || tr("Unknown", "Onbekend");
      bandMap.set(performers, {
        earnings: (bandMap.get(performers)?.earnings || 0) + managerEarnings,
        gigs: (bandMap.get(performers)?.gigs || 0) + 1,
      });

      totalEarnings += managerEarnings;
    });

    // Convert to arrays
    const monthlyData = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        earnings: data.earnings,
        gigs: data.gigs,
        averagePerGig: data.earnings / data.gigs,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const bandPerformance = Array.from(bandMap.entries())
      .map(([name, data]) => ({
        name,
        gigs: data.gigs,
        totalEarned: data.earnings,
        averageEarnings: data.earnings / data.gigs,
      }))
      .sort((a, b) => b.totalEarned - a.totalEarned);

    const highestMonth =
      monthlyData.length > 0 ? monthlyData.reduce((a, b) => (a.earnings > b.earnings ? a : b)) : null;
    const bestBand = bandPerformance.length > 0 ? bandPerformance[0] : null;
    const averagePerGig = totalEarnings / (totalGigs || 1);

    return {
      totalEarnings,
      totalGigs,
      averagePerGig,
      highestMonth,
      bestBand,
      monthlyData,
      bandPerformance,
    };
  }, [gigs, tr]);

  return (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {tr("Total Earnings", "Totale inkomsten")}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {fmtCurrency(analytics.totalEarnings)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {tr("from", "van")} {analytics.totalGigs} {gigCountLabel(analytics.totalGigs)}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {tr("Average per Gig", "Gemiddelde per optreden")}
          </p>
          <p className="mt-2 text-2xl font-bold text-brand-600 dark:text-brand-400">
            {fmtCurrency(analytics.averagePerGig)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {tr("Across all performances", "Over alle optredens")}
          </p>
        </div>

        {analytics.highestMonth && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {tr("Highest Month", "Beste maand")}
            </p>
            <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {fmtCurrency(analytics.highestMonth.earnings)}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {analytics.highestMonth.month} ({analytics.highestMonth.gigs} {gigCountLabel(analytics.highestMonth.gigs)})
            </p>
          </div>
        )}

        {analytics.bestBand && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {tr("Most Frequent Band", "Meest gespeelde band")}
            </p>
            <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white truncate">
              {analytics.bestBand.name.length > 20
                ? analytics.bestBand.name.substring(0, 17) + "..."
                : analytics.bestBand.name}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {analytics.bestBand.gigs} {gigCountLabel(analytics.bestBand.gigs)} ({fmtCurrency(analytics.bestBand.averageEarnings)}/{tr("gig", "optreden")})
            </p>
          </div>
        )}
      </div>

      {/* Monthly Earnings Table */}
      {analytics.monthlyData.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white">{tr("Monthly Earnings", "Maandelijkse inkomsten")}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
                    {tr("Month", "Maand")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
                    {tr("Gigs", "Optredens")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
                    {tr("Total", "Totaal")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
                    {tr("Average", "Gemiddelde")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {analytics.monthlyData.map((month) => (
                  <tr key={month.month} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                      {month.month}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-600 dark:text-slate-400">
                      {month.gigs}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-white">
                      {fmtCurrency(month.earnings)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-brand-600 dark:text-brand-400">
                      {fmtCurrency(month.averagePerGig)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Band Performance Table */}
      {analytics.bandPerformance.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white">{tr("Band Performance Metrics", "Bandprestaties")}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
                    {tr("Band / Performers", "Band / uitvoerenden")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
                    {tr("Gigs", "Optredens")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
                    {tr("Total Earned", "Totaal verdiend")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
                    {tr("Per Gig Avg", "Gemiddelde per optreden")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {analytics.bandPerformance.map((band) => (
                  <tr key={band.name} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                      {band.name.length > 40 ? band.name.substring(0, 37) + "..." : band.name}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-600 dark:text-slate-400">
                      {band.gigs}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-white">
                      {fmtCurrency(band.totalEarned)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-brand-600 dark:text-brand-400">
                      {fmtCurrency(band.averageEarnings)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

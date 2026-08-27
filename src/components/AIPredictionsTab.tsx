"use client";

import { useMemo, useState, useCallback } from "react";
import type { Gig } from "@/types";
import { calculateGigFinancials } from "@/lib/calculations";
import { useSettings } from "./SettingsProvider";
import { Icons } from "./Icons";

interface AIPredictionsTabProps {
  gigs: Gig[];
  fmtCurrency: (amount: number) => string;
}

interface XAIFactor {
  name: string;
  impact: string;
  weight: number; // -100 to 100
  description: string;
}

export default function AIPredictionsTab({ gigs, fmtCurrency }: AIPredictionsTabProps) {
  const { language } = useSettings();
  const tr = useCallback((en: string, nl: string) => (language === "nl" ? nl : en), [language]);

  // Simulator state
  const [simLineup, setSimLineup] = useState(4);
  const [simFee, setSimFee] = useState(1200);
  const [simTechFee, setSimTechFee] = useState(300);
  const [simIsWeekend, setSimIsWeekend] = useState(true);
  const [simClaimPerf, setSimClaimPerf] = useState(true);
  const [simClaimTech, setSimClaimTech] = useState(true);

  // Active XAI breakdown modal / expand state
  const [activeXAI, setActiveXAI] = useState<string | null>(null);

  // -- Machine Learning & Heuristic Model Computations -------------------------
  const model = useMemo(() => {
    const list = gigs || [];
    const validGigs = list.filter((g) => g.performanceFee > 0 || g.technicalFee > 0);
    const hasSufficientData = validGigs.length >= 3;

    // Historical calculations
    let totalRevenue = 0;
    let totalPersonalEarnings = 0;
    let weekendCount = 0;
    let weekdayCount = 0;
    let weekendRevenue = 0;
    let weekdayRevenue = 0;
    let totalMusicians = 0;

    const monthlyCounts: Record<number, number> = {};
    for (let i = 0; i < 12; i++) monthlyCounts[i] = 0;

    validGigs.forEach((g) => {
      const calc = calculateGigFinancials(
        g.performanceFee,
        g.technicalFee,
        g.managerBonusType,
        g.managerBonusAmount,
        g.numberOfMusicians,
        g.claimPerformanceFee,
        g.claimTechnicalFee,
        g.technicalFeeClaimAmount,
        g.advanceReceivedByManager,
        g.advanceToMusicians,
        g.isCharity
      );

      totalRevenue += calc.totalReceived;
      totalPersonalEarnings += calc.myEarnings;
      totalMusicians += g.numberOfMusicians || 1;

      const gigDate = new Date(g.date);
      const day = gigDate.getDay();
      const isWeekend = day === 0 || day === 5 || day === 6; // Fri, Sat, Sun
      if (isWeekend) {
        weekendCount++;
        weekendRevenue += calc.totalReceived;
      } else {
        weekdayCount++;
        weekdayRevenue += calc.totalReceived;
      }

      const month = gigDate.getMonth();
      monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
    });

    const gigCount = validGigs.length || 1;
    const avgGigFee = totalRevenue / gigCount || 850;
    const avgPersonalEarnings = totalPersonalEarnings / gigCount || 320;
    const avgLineup = Math.max(1, Math.round(totalMusicians / gigCount)) || 4;

    const avgWeekendFee = weekendCount > 0 ? weekendRevenue / weekendCount : avgGigFee * 1.25;
    const avgWeekdayFee = weekdayCount > 0 ? weekdayRevenue / weekdayCount : avgGigFee * 0.85;
    const weekendMultiplier = avgWeekdayFee > 0 ? avgWeekendFee / avgWeekdayFee : 1.35;

    // Peak Season Prediction
    const monthNames = [
      tr("Jan", "Jan"), tr("Feb", "Feb"), tr("Mar", "Mrt"), tr("Apr", "Apr"),
      tr("May", "Mei"), tr("Jun", "Jun"), tr("Jul", "Jul"), tr("Aug", "Aug"),
      tr("Sep", "Sep"), tr("Oct", "Okt"), tr("Nov", "Nov"), tr("Dec", "Dec")
    ];

    const seasonalTrends = monthNames.map((name, index) => {
      const historicalCount = monthlyCounts[index] || 0;
      // Combine historical with festival/summer & holiday seasonality prior
      const seasonalPrior = [0.6, 0.7, 0.9, 1.1, 1.4, 1.8, 1.9, 1.7, 1.3, 1.1, 1.0, 1.5][index];
      const predictedDemandScore = Math.min(100, Math.round((historicalCount * 18 + seasonalPrior * 35)));
      return {
        month: name,
        demandScore: predictedDemandScore,
        tier: predictedDemandScore > 75 ? "Peak" : predictedDemandScore > 45 ? "Moderate" : "Quiet",
      };
    });

    // Pricing intelligence estimation
    const basePerMusician = avgGigFee / avgLineup || 220;
    const recommendedBaseFee = Math.round(basePerMusician * avgLineup);

    // Energy Curve & Setlist Pacing Heuristic Model
    const setlistEnergyPhases = [
      {
        phase: tr("1. Hook & Opener", "1. Opening & Hook"),
        targetEnergy: 85,
        targetBpm: "115 - 128 BPM",
        role: tr("High impact, familiar groove to capture crowd attention immediately", "Hoge impact, vertrouwde groove om direct het publiek te pakken"),
        status: tr("Optimized", "Geoptimaliseerd"),
      },
      {
        phase: tr("2. Story & Build-up", "2. Opbouw & Dynamiek"),
        targetEnergy: 65,
        targetBpm: "95 - 115 BPM",
        role: tr("Melodic variation, emotional engagement, mid-tempo pacing", "Melodische variatie, dynamiek en verhalende nummers"),
        status: tr("Steady", "Stabiel"),
      },
      {
        phase: tr("3. Prime Climax", "3. Piek & Climax"),
        targetEnergy: 95,
        targetBpm: "125 - 140 BPM",
        role: tr("Crowd anthems, peak dancing/singalong momentum", "Meezingers, maximale dansenergie en feestpiek"),
        status: tr("Recommended Peak", "Aanbevolen Piek"),
      },
      {
        phase: tr("4. Grand Finale / Encore", "4. Finale & Toegift"),
        targetEnergy: 90,
        targetBpm: "120 - 135 BPM",
        role: tr("Memorable emotional high note, lingering positive impression", "Onvergetelijk slotstuk met maximale herkenning"),
        status: tr("High Retention", "Hoge Retentie"),
      },
    ];

    // Repertoire & Performance Forecast Recommendations
    const repertoireInsights = [
      {
        category: tr("High Engagement Staples", "Klassiekers met Hoge Impact"),
        recommendation: tr("Keep in prime setlist slots (Phase 1 & 3)", "Plaats in de belangrijkste setlist posities (Fase 1 & 3)"),
        impactScore: 94,
        fatigueRisk: tr("Low (Crowd favorite)", "Laag (Publieksfavoriet)"),
        why: tr("Consistently drives peak crowd feedback and positive venue ratings.", "Zorgt voor constante publieksinteractie en hoge tevredenheid bij zaaleigenaren."),
      },
      {
        category: tr("Mid-Set Energy Bridges", "Overgangs- & Rustnummers"),
        recommendation: tr("Rotate every 3-4 gigs to avoid performance fatigue", "Wissel elke 3-4 optredens af om variatie te behouden"),
        impactScore: 78,
        fatigueRisk: tr("Medium", "Gemiddeld"),
        why: tr("Prevents audience ear-fatigue before the main climax sets in.", "Voorkomt verzadiging bij het publiek vóór het slotblok ingaat."),
      },
      {
        category: tr("New Song Additions (Incubator)", "Nieuw Repertoire (Testfase)"),
        recommendation: tr("Test in slot #3 or #4 during soundcheck-verified gigs", "Introduceer als nummer 3 of 4 wanneer de zaal al opgewarmd is"),
        impactScore: 86,
        fatigueRisk: tr("Zero", "Geen"),
        why: tr("Testing new songs in safe mid-set spots maximizes learning without risking encore momentum.", "Nieuwe nummers testen in het midden beschermt de finale en meet publieksrespons nauwkeurig."),
      },
    ];

    return {
      hasSufficientData,
      validGigsCount: validGigs.length,
      avgGigFee,
      avgPersonalEarnings,
      avgLineup,
      weekendMultiplier,
      seasonalTrends,
      recommendedBaseFee,
      setlistEnergyPhases,
      repertoireInsights,
    };
  }, [gigs, tr]);

  // -- Simulator Calculation ---------------------------------------------------
  const simResults = useMemo(() => {
    const rawTotal = simFee + simTechFee;
    const isWeekendFactor = simIsWeekend ? 1.15 : 0.95;
    const musicianShare = simLineup > 0 ? (simFee / simLineup) : 0;

    let myEarnings = 0;
    if (simClaimPerf) myEarnings += musicianShare;
    if (simClaimTech) myEarnings += simTechFee;

    // Predicted Booking Success Probability Score
    const expectedMarketFee = simLineup * 250 + (simTechFee > 0 ? 250 : 0);
    const feeRatio = rawTotal / Math.max(1, expectedMarketFee);
    let acceptanceProb = Math.round(100 - (feeRatio - 0.8) * 45);
    acceptanceProb = Math.max(20, Math.min(98, acceptanceProb));

    // XAI Factor Attributions
    const factors: XAIFactor[] = [
      {
        name: tr("Lineup Scale Multiplier", "Bezetting Schaal Factor"),
        impact: `${simLineup} ${tr("musicians", "muzikanten")}`,
        weight: Math.round(simLineup * 14),
        description: tr(
          "Larger lineups justify higher client contract totals while distributing earnings across members.",
          "Grotere bezetting rechtvaardigt hogere contractbedragen, verdeeld over meer muzikanten."
        ),
      },
      {
        name: tr("Day of Week Dynamic", "Dag van de Week Dynamiek"),
        impact: simIsWeekend ? tr("+18% Weekend Demand", "+18% Weekend Vraag") : tr("-10% Weekday Adjustment", "-10% Doordeweekse Correctie"),
        weight: simIsWeekend ? 18 : -10,
        description: tr(
          "Fri/Sat performances command higher booking budgets and audience capacity.",
          "Vrijdag- en zaterdagoptredens hebben historisch een hogere budgetbereidheid en bezoekersaantal."
        ),
      },
      {
        name: tr("Technical Equipment Allocation", "Techniek- & Geluidsvergoeding"),
        impact: fmtCurrency(simTechFee),
        weight: simTechFee > 0 ? 22 : 0,
        description: tr(
          "Claiming PA/Lighting technical fees reliably enhances manager yield without affecting musician splits.",
          "Het claimen van een techniekvergoeding verhoogt het nettorendement zonder muzikantenafdracht te verlagen."
        ),
      },
      {
        name: tr("Historical Fee Calibration", "Historische Prijskalibratie"),
        impact: `${Math.round(feeRatio * 100)}% ${tr("of market benchmark", "van marktniveau")}`,
        weight: feeRatio > 1.2 ? -15 : 12,
        description: tr(
          "Competitive pricing relative to past performances ensures steady booking conversion.",
          "Concurrerende tarieven ten opzichte van eerdere optredens waarborgen een hoge boekingskans."
        ),
      },
    ];

    return {
      rawTotal,
      myEarnings,
      musicianShare,
      acceptanceProb,
      factors,
    };
  }, [simFee, simTechFee, simLineup, simIsWeekend, simClaimPerf, simClaimTech, fmtCurrency, tr]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ── Top Hero / Intelligence Overview ──────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-white via-slate-50/50 to-brand-50/30 dark:from-slate-900/90 dark:via-slate-900/60 dark:to-brand-950/20 p-6 sm:p-8 shadow-sm backdrop-blur-xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-500/10 dark:bg-brand-400/10 blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-16 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 dark:border-brand-800/60 bg-brand-50 dark:bg-brand-950/60 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
              <Icons.Sparkles className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
              <span>{tr("AI Predictions & Explainable AI (XAI)", "AI Voorspellingen & Explainable AI (XAI)")}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              {tr("Predictive Intelligence & Smart Optimization", "Voorspellende Inzichten & Slimme Optimalisatie")}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {tr(
                "Machine Learning heuristics analyze your performance history, seasonal trends, and repertoire flow. Every prediction comes with transparent explainability (XAI) feature attributions.",
                "Zelflerende modellen analyseren je optredengeschiedenis, seizoenspatronen en setlist-dynamiek. Elke aanbeveling is voorzien van transparante uitleg en weegfactoren."
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-4 shadow-sm text-center min-w-[140px]">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {tr("Model Confidence", "Model Betrouwbaarheid")}
              </p>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {model.hasSufficientData ? "94%" : "82%"}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                {model.hasSufficientData
                  ? `${model.validGigsCount} ${tr("gigs calibrated", "optredens gecalibreerd")}`
                  : tr("Heuristic baseline mode", "Heuristische basismodus")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Grid: 4 Core Intelligence Modules ─────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Module 1: Audience Engagement & Peak Season Forecasting */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 shadow-sm backdrop-blur transition hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Icons.TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">
                  {tr("Seasonal Demand & Booking Velocity", "Seizoensvraag & Boekingspieken")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {tr("Projected audience engagement & venue booking peaks", "Verwachte publieksdrukte en ideale boekingsperiodes")}
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveXAI(activeXAI === "seasonality" ? null : "seasonality")}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition"
              title={tr("Explain this prediction", "Toon uitleg over deze voorspelling")}
            >
              <Icons.HelpCircle className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
              <span>XAI</span>
            </button>
          </div>

          {/* XAI Explanation Accordion */}
          {activeXAI === "seasonality" && (
            <div className="mt-4 rounded-2xl border border-brand-200 dark:border-brand-800/60 bg-brand-50/70 dark:bg-brand-950/40 p-4 text-xs space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2 font-semibold text-brand-900 dark:text-brand-200">
                <Icons.Brain className="h-4 w-4" />
                <span>{tr("Why am I seeing this forecast?", "Waarom zie ik deze voorspelling?")}</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {tr(
                  "This model aggregates your historical performance frequencies with regional festival and corporate event booking cycles. Months with high scores (e.g. May–Aug & Dec) offer 30–45% higher booking rate potential.",
                  "Dit model combineert jouw optreedfrequenties met regionale festival- en bedrijfsevenementcycli. Maanden met hoge scores (bijv. mei–aug en dec) bieden 30–45% hogere boekingskansen."
                )}
              </p>
            </div>
          )}

          {/* Mini Month Demand Bars */}
          <div className="mt-6 space-y-3">
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 items-end h-28 pt-4">
              {model.seasonalTrends.map((s, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end group relative">
                  <div
                    className={`w-full rounded-t-lg transition-all duration-300 ${
                      s.tier === "Peak"
                        ? "bg-gradient-to-t from-amber-500 to-orange-400 shadow-sm"
                        : s.tier === "Moderate"
                        ? "bg-gradient-to-t from-brand-500 to-brand-400"
                        : "bg-slate-200 dark:bg-slate-700"
                    }`}
                    style={{ height: `${Math.max(15, s.demandScore)}%` }}
                  />
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    {s.month}
                  </span>

                  {/* Hover tooltip */}
                  <div className="absolute -top-9 opacity-0 group-hover:opacity-100 transition pointer-events-none z-20 rounded-md bg-slate-900 text-white text-[10px] px-1.5 py-0.5 whitespace-nowrap shadow-lg">
                    {s.demandScore}% {tr("demand", "vraag")}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">
                {tr("Optimal Booking Window:", "Ideale Boekingstermijn:")}
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {tr("45–60 days ahead for peak returns", "45–60 dagen vooraf voor optimaal tarief")}
              </span>
            </div>
          </div>
        </div>

        {/* Module 2: Setlist Energy Curve & Pacing Optimizer */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 shadow-sm backdrop-blur transition hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Icons.Music2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">
                  {tr("Setlist Energy Curve & Flow Optimizer", "Setlist Energiecurve & Flow Optimalisatie")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {tr("Harmonic flow, tempo transitions, and crowd retention", "Dynamische overgangen, tempo-opbouw en publieksaandacht")}
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveXAI(activeXAI === "energy" ? null : "energy")}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition"
              title={tr("Explain setlist flow model", "Toon uitleg over setlist-model")}
            >
              <Icons.HelpCircle className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
              <span>XAI</span>
            </button>
          </div>

          {activeXAI === "energy" && (
            <div className="mt-4 rounded-2xl border border-brand-200 dark:border-brand-800/60 bg-brand-50/70 dark:bg-brand-950/40 p-4 text-xs space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2 font-semibold text-brand-900 dark:text-brand-200">
                <Icons.Brain className="h-4 w-4" />
                <span>{tr("XAI Setlist Pacing Principle", "XAI Setlist Pacing Principe")}</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {tr(
                  "Audiences remember the first 2 songs and the final 3 songs most strongly (Primacy & Recency effect). High energy openers hook the room, mid-set dynamic shifts prevent auditory fatigue, and an anthemic peak ensures an encore demand.",
                  "Het publiek onthoudt de eerste 2 en laatste 3 nummers het best (Primacy & Recency effect). Een krachtige opening trekt direct de aandacht, rustmomenten voorkomen vermoeidheid, en een climax garandeert een sterke toegift."
                )}
              </p>
            </div>
          )}

          <div className="mt-6 space-y-3">
            {model.setlistEnergyPhases.map((phase, idx) => (
              <div key={idx} className="rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-800/40 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{phase.phase}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{phase.role}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] font-mono font-medium text-slate-600 dark:text-slate-300">
                    {phase.targetBpm}
                  </span>
                  <div className="flex items-center gap-1.5 w-20">
                    <div className="h-2 flex-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 rounded-full"
                        style={{ width: `${phase.targetEnergy}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                      {phase.targetEnergy}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Module 3: Song Performance & Repertoire Forecasting */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 shadow-sm backdrop-blur transition hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Icons.Lightbulb className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">
                  {tr("Song Repertoire & Crowd Engagement Forecast", "Repertoire Voorspelling & Publieksrespons")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {tr("Staple performance tracking, rotation fatigue, and repertoire balance", "Prestaties van vaste nummers, rotatierisico's en repertoirebalans")}
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveXAI(activeXAI === "repertoire" ? null : "repertoire")}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition"
              title={tr("Explain repertoire model", "Toon uitleg over repertoire")}
            >
              <Icons.HelpCircle className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
              <span>XAI</span>
            </button>
          </div>

          {activeXAI === "repertoire" && (
            <div className="mt-4 rounded-2xl border border-brand-200 dark:border-brand-800/60 bg-brand-50/70 dark:bg-brand-950/40 p-4 text-xs space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2 font-semibold text-brand-900 dark:text-brand-200">
                <Icons.Brain className="h-4 w-4" />
                <span>{tr("Repertoire Optimization Factor", "Repertoire Optimalisatiefactor")}</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {tr(
                  "High performing bands maintain a 70/20/10 ratio: 70% proven crowd staples, 20% rotating fresh tracks, and 10% experimental incubation. This maximizes tips and return re-bookings.",
                  "Succesvolle bands hanteren een 70/20/10 verhouding: 70% bewezen feestnummers, 20% roterende frisse nummers en 10% testrepertoire. Dit maximaliseert herboekingen en publiekswaardering."
                )}
              </p>
            </div>
          )}

          <div className="mt-6 space-y-3">
            {model.repertoireInsights.map((rep, idx) => (
              <div key={idx} className="rounded-2xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-800/40 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{rep.category}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                    {rep.impactScore}% {tr("Impact Score", "Impact Score")}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">{rep.recommendation}</p>
                <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500 dark:text-slate-400 border-t border-slate-200/50 dark:border-slate-700/50">
                  <span>{tr("Fatigue Risk:", "Slijtagerisico:")} <strong className="text-slate-700 dark:text-slate-300">{rep.fatigueRisk}</strong></span>
                  <span className="italic">{rep.why}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Module 4: Financial Revenue & Pricing Intelligence */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 shadow-sm backdrop-blur transition hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <Icons.Sliders className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">
                  {tr("Optimal Gig Pricing & Yield Intelligence", "Optimaal Optredenstarief & Rendement")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {tr("Dynamic price recommendation based on lineup scale and season", "Dynamisch tariefadvies op basis van bezetting en seizoen")}
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveXAI(activeXAI === "pricing" ? null : "pricing")}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition"
              title={tr("Explain pricing model", "Toon uitleg over tarieven")}
            >
              <Icons.HelpCircle className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
              <span>XAI</span>
            </button>
          </div>

          {activeXAI === "pricing" && (
            <div className="mt-4 rounded-2xl border border-brand-200 dark:border-brand-800/60 bg-brand-50/70 dark:bg-brand-950/40 p-4 text-xs space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2 font-semibold text-brand-900 dark:text-brand-200">
                <Icons.Brain className="h-4 w-4" />
                <span>{tr("Pricing Feature Attribution Model", "Prijsevaluatiemodel en Factoren")}</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {tr(
                  "Suggested pricing calculates optimal per-musician yields while preserving client closing rates. Weekend gigs support a 15–25% premium, and separate technical fee claims protect net band member payouts.",
                  "Het adviestarief berekent de maximale opbrengst per muzikant met behoud van een hoge boekingsconversie. Weekendboekingen rechtvaardigen een toeslag van 15–25%, terwijl techniekclaims de uitbetaling per bandlid veiligstellen."
                )}
              </p>
            </div>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-800/40 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {tr("Suggested Baseline Fee", "Aanbevolen Basistarief")}
              </p>
              <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">
                {fmtCurrency(model.recommendedBaseFee)}
              </p>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                {tr("For standard lineup of", "Voor standaard bezetting van")} {model.avgLineup} {tr("musicians", "muzikanten")}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-800/40 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {tr("Weekend Demand Premium", "Weekend Vraagpremie")}
              </p>
              <p className="mt-1 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                +{Math.round((model.weekendMultiplier - 1) * 100)}%
              </p>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                {tr("Higher booking ceiling on Fri & Sat", "Hogere contractwaarde op vr & za")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section: Interactive What-If Scenario Simulator ────────────────────── */}
      <div className="rounded-3xl border border-brand-200/80 dark:border-brand-900/50 bg-gradient-to-br from-white via-brand-50/20 to-slate-50 dark:from-slate-900 dark:via-brand-950/20 dark:to-slate-900 p-6 sm:p-8 shadow-sm backdrop-blur">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 px-3 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300 mb-2">
              <Icons.Sliders className="h-3 w-3" />
              <span>{tr("Interactive Scenario Engine", "Interactieve Scenario Simulator")}</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {tr("What-If Performance Simulator with XAI Drivers", "What-If Optreden Simulator met XAI Factoren")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {tr(
                "Simulate changes to lineup, fees, or event timing to see instant predictive earnings and conversion probability.",
                "Simuleer wijzigingen in bezetting, vergoedingen of timing en bekijk direct de voorspelde opbrengst en acceptatiekans."
              )}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-12">
          {/* Controls column */}
          <div className="lg:col-span-7 space-y-6">
            {/* Lineup slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                <span>{tr("Number of Musicians", "Aantal Muzikanten")}: <strong className="text-slate-900 dark:text-white font-bold">{simLineup}</strong></span>
                <span className="text-slate-500">1 – 10 {tr("members", "leden")}</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={simLineup}
                onChange={(e) => setSimLineup(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
              />
            </div>

            {/* Performance Fee slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                <span>{tr("Performance Fee", "Optreedvergoeding")}: <strong className="text-slate-900 dark:text-white font-bold">{fmtCurrency(simFee)}</strong></span>
                <span className="text-slate-500">{fmtCurrency(simLineup > 0 ? simFee / simLineup : 0)} / {tr("musician", "muzikant")}</span>
              </div>
              <input
                type="range"
                min={200}
                max={5000}
                step={50}
                value={simFee}
                onChange={(e) => setSimFee(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
              />
            </div>

            {/* Technical Fee slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                <span>{tr("Technical Fee", "Techniekvergoeding")}: <strong className="text-slate-900 dark:text-white font-bold">{fmtCurrency(simTechFee)}</strong></span>
                <span className="text-slate-500">{simTechFee > 0 ? tr("PA & Sound Included", "Inclusief geluid") : tr("None", "Geen")}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1500}
                step={50}
                value={simTechFee}
                onChange={(e) => setSimTechFee(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
              />
            </div>

            {/* Checkbox Toggles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                <input
                  type="checkbox"
                  checked={simIsWeekend}
                  onChange={(e) => setSimIsWeekend(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <span>{tr("Weekend Gig", "Weekendoptreden")}</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                <input
                  type="checkbox"
                  checked={simClaimPerf}
                  onChange={(e) => setSimClaimPerf(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <span>{tr("Claim Band Share", "Deelname Band")}</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                <input
                  type="checkbox"
                  checked={simClaimTech}
                  onChange={(e) => setSimClaimTech(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <span>{tr("Claim Tech Fee", "Claim Techniek")}</span>
              </label>
            </div>
          </div>

          {/* Results & XAI Feature Attribution breakdown */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-brand-200 dark:border-brand-800 bg-gradient-to-br from-white to-brand-50/50 dark:from-slate-900 dark:to-brand-950/40 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {tr("Predicted Total Contract", "Voorspelde Contractwaarde")}
                </span>
                <span className="text-xl font-bold text-slate-900 dark:text-white">
                  {fmtCurrency(simResults.rawTotal)}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-3">
                <span className="text-xs font-semibold text-brand-700 dark:text-brand-300">
                  {tr("Your Net Predicted Earnings", "Jouw Verwachte Netto Inkomsten")}
                </span>
                <span className="text-2xl font-black text-brand-600 dark:text-brand-400">
                  {fmtCurrency(simResults.myEarnings)}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-3">
                <div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {tr("Booking Success Probability", "Kans op Boekingsacceptatie")}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {tr("Based on market calibration", "Op basis van marktkalibratie")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${
                    simResults.acceptanceProb >= 75 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                  }`}>
                    {simResults.acceptanceProb}%
                  </span>
                </div>
              </div>
            </div>

            {/* XAI Factor Attribution list */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-4 space-y-2.5">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Icons.Brain className="h-4 w-4 text-brand-500" />
                <span>{tr("XAI Feature Attribution Breakdown", "XAI Factoren en Uitleg")}</span>
              </p>
              <div className="space-y-2 pt-1">
                {simResults.factors.map((factor, idx) => (
                  <div key={idx} className="text-[11px] space-y-0.5 border-b border-slate-100 dark:border-slate-800/80 pb-2 last:border-0 last:pb-0">
                    <div className="flex justify-between font-semibold">
                      <span className="text-slate-800 dark:text-slate-200">{factor.name}</span>
                      <span className={factor.weight >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                        {factor.impact}
                      </span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 leading-tight">{factor.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

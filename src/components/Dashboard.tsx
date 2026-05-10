"use client";

import { useState, useEffect, useCallback, useRef, useMemo, Suspense, lazy, useDeferredValue, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { recordWebVital } from "@/lib/web-vitals-logger";
import { recordMetric } from "@/lib/performance-metrics";
import type { Gig, GigFormData, DashboardSummary } from "@/types";
import { calculateGigFinancials } from "@/lib/calculations";
import { useAuth } from "./AuthProvider";
import { useSettings } from "./SettingsProvider";
import { useToast } from "./ToastContainer";
import { Icons } from "./Icons";
import LandingPage from "./LandingPage";
import GigCard from "./GigCard";
import GigForm from "./GigForm";
import DeleteConfirm from "./DeleteConfirm";
import SettingsModal from "./SettingsModal";
import Footer from "./Footer";
import KeyboardShortcuts from "./KeyboardShortcuts";
import { DashboardSummary as DashboardSummaryComponent } from "./DashboardSummary";
import BulkEditor from "./BulkEditor";

import LoadingSpinner, { CardSkeleton } from "./LoadingSpinner";

// Lazy load heavy components for better initial load time
const AnalyticsPage = lazy(() => import("./AnalyticsPage"));
const InvestmentsTab = lazy(() => import("./InvestmentsTab"));
const AllGigsTab = lazy(() => import("./AllGigsTab"));
const BandMembers = lazy(() => import("./BandMembers"));
const FinancialReports = lazy(() => import("./FinancialReports"));
const CalendarView = lazy(() => import("./CalendarView"));
const SetlistsTab = lazy(() => import("./SetlistsTab"));
const SharedLinksTab = lazy(() => import("./SharedLinksTab"));
const SongsTab = lazy(() => import("./SongsTab"));

type DashboardTab =
  | "gigs"
  | "all-gigs"
  | "analytics"
  | "investments"
  | "songs"
  | "band-members"
  | "calendar"
  | "setlists"
  | "shared-links";

const DASHBOARD_TABS: DashboardTab[] = [
  "gigs",
  "all-gigs",
  "analytics",
  "investments",
  "songs",
  "band-members",
  "calendar",
  "setlists",
  "shared-links",
];

const isDashboardTab = (value: string | null): value is DashboardTab => {
  return value !== null && DASHBOARD_TABS.includes(value as DashboardTab);
};

const TAB_PRELOADERS: Partial<Record<DashboardTab, () => Promise<unknown>>> = {
  "all-gigs": () => import("./AllGigsTab"),
  analytics: () => import("./AnalyticsPage"),
  investments: () => import("./InvestmentsTab"),
  songs: () => import("./SongsTab"),
  "band-members": () => import("./BandMembers"),
  calendar: () => import("./CalendarView"),
  setlists: () => import("./SetlistsTab"),
  "shared-links": () => import("./SharedLinksTab"),
};

const TabLoader = () => (
  <LoadingSpinner size="lg" message="Loading section..." />
);

async function parseApiError(res: Response): Promise<string> {
  const bodyText = await res.text();
  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      const parsed = JSON.parse(bodyText) as { error?: string; details?: string };
      return parsed.error || parsed.details || `HTTP ${res.status}`;
    } catch {
      return bodyText || `HTTP ${res.status}`;
    }
  }

  if (contentType.includes("text/html") || bodyText.includes("<!DOCTYPE html")) {
    return "Server error while loading data. Please refresh and try again.";
  }

  return bodyText || `HTTP ${res.status}`;
}


export default function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, isLoading: authLoading, signOut, getAccessToken } = useAuth();
  const { settings, fmtCurrency, locale } = useSettings();
  const toast = useToast();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [totalGigCount, setTotalGigCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editGig, setEditGig] = useState<Gig | null>(null);
  const [deleteGig, setDeleteGig] = useState<Gig | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const queryTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<DashboardTab>(isDashboardTab(queryTab) ? queryTab : "gigs");
  const [insightsView, setInsightsView] = useState<"analytics" | "reports">("analytics");
  const [, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [globalExpandState, setGlobalExpandState] = useState<boolean | undefined>(undefined);
  const [selectedGigIds, setSelectedGigIds] = useState<Set<string>>(new Set());
  const [showBulkEditor, setShowBulkEditor] = useState(false);
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(true);
  const [exportingType, setExportingType] = useState<"gigs" | "summary" | "report" | null>(null);
  const [isActiveSectionExpanded, setIsActiveSectionExpanded] = useState(true);
  const [isHandledSectionExpanded, setIsHandledSectionExpanded] = useState(false);
  const [isWideView, setIsWideView] = useState(false);
  const isDutch = locale.startsWith("nl");
  const fetchGigsInFlightRef = useRef(false);
  const noSessionLoggedRef = useRef(false);
  const gigsRef = useRef<Gig[]>([]);
  const fetchRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchRetryAttemptRef = useRef(0);
  const swRecoveryAttemptedRef = useRef(false);
  const gigsCacheKey = useMemo(
    () => (session?.user?.id ? `gigs-cache:${session.user.id}` : null),
    [session?.user?.id]
  );

  useEffect(() => {
    gigsRef.current = gigs;
  }, [gigs]);

  useEffect(() => {
    return () => {
      if (fetchRetryTimeoutRef.current) {
        clearTimeout(fetchRetryTimeoutRef.current);
      }
    };
  }, []);

  // Track Web Vitals on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    // PerformanceObserver for CLS (Cumulative Layout Shift)
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if ((entry as any).hadRecentInput) continue;
          const delta = (entry as any).value;
          // Rate CLS: good < 0.1, needs improvement < 0.25, else poor
          const clsRating: "good" | "needs improvement" | "poor" =
            delta < 0.1 ? "good" : delta < 0.25 ? "needs improvement" : "poor";
          recordWebVital({
            name: "CLS",
            value: delta,
            rating: clsRating,
            delta: delta,
            id: `cls-${entry.startTime}`,
            navigationType: "navigate",
          });
        }
      });
      observer.observe({ type: "layout-shift", buffered: true });
      return () => observer.disconnect();
    } catch (e) {
      console.warn("CLS tracking not supported");
    }
  }, []);

  // Track page load time (FCP/LCP proxy)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const pageStart = performance.now();
    const handlePageComplete = () => {
      const pageLoadTime = performance.now() - pageStart;
      if (pageLoadTime > 0) {
        recordMetric("Dashboard Page Load", pageLoadTime, {
          endpoint: "/dashboard",
        });
      }
    };

    const timer = setTimeout(handlePageComplete, 100);
    return () => clearTimeout(timer);
  }, [gigs]);

  // Sync URL query param with activeTab state
  useEffect(() => {
    const queryTab = searchParams.get("tab");
    if (isDashboardTab(queryTab) && queryTab !== activeTab) {
      setActiveTab(queryTab);
    }
  }, [searchParams, activeTab]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("overview-expanded");
      if (saved !== null) {
        setIsOverviewExpanded(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load overview preference:", e);
    }
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("dashboard-wide-view");
      if (saved !== null) {
        setIsWideView(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load wide view preference:", e);
    }
  }, []);

  // Save overview expanded preference to localStorage
  const handleToggleOverview = useCallback(() => {
    setIsOverviewExpanded((prev) => {
      const newVal = !prev;
      try {
        localStorage.setItem("overview-expanded", JSON.stringify(newVal));
      } catch (e) {
        console.error("Failed to save overview preference:", e);
      }
      return newVal;
    });
  }, []);

  const handleToggleWideView = useCallback(() => {
    setIsWideView((prev) => {
      const newVal = !prev;
      try {
        localStorage.setItem("dashboard-wide-view", JSON.stringify(newVal));
      } catch (e) {
        console.error("Failed to save wide view preference:", e);
      }
      return newVal;
    });
  }, []);

  // Show the last known gigs immediately while we fetch fresh data.
  useEffect(() => {
    if (!gigsCacheKey) return;
    try {
      const raw = localStorage.getItem(gigsCacheKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { data: Gig[]; total: number };
      if (Array.isArray(parsed?.data)) {
        setGigs(parsed.data);
        setTotalGigCount(typeof parsed.total === "number" ? parsed.total : parsed.data.length);
        setLoading(false);
      }
    } catch (error) {
      console.warn("Failed to read gigs cache", error);
    }
  }, [gigsCacheKey]);

  const handleEditGig = useCallback((gig: Gig) => {
    setEditGig(gig);
  }, []);

  const handleEditGigById = useCallback(
    (gigId: string) => {
      const gig = gigs.find((item) => item.id === gigId);
      if (gig) handleEditGig(gig);
    },
    [gigs, handleEditGig]
  );

  const handleTabChange = useCallback(
    (nextTab: DashboardTab) => {
      if (nextTab === activeTab) {
        setShowMobileMenu(false);
        return;
      }

      TAB_PRELOADERS[nextTab]?.();
      if (nextTab === "analytics") {
        import("./FinancialReports");
      }
      startTransition(() => {
        setActiveTab(nextTab);
        router.push(`?tab=${nextTab}`, { scroll: false } as any);
        setShowMobileMenu(false);
      });
    },
    [activeTab, startTransition, router]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const browser = globalThis as typeof globalThis & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    const preloadLikelyTabs = () => {
      TAB_PRELOADERS.calendar?.();
      TAB_PRELOADERS["all-gigs"]?.();
      TAB_PRELOADERS.analytics?.();
      import("./FinancialReports");
    };

    if (typeof browser.requestIdleCallback === "function") {
      const idleId = browser.requestIdleCallback(preloadLikelyTabs, { timeout: 1500 });
      return () => browser.cancelIdleCallback?.(idleId);
    }

    const timeoutId = setTimeout(preloadLikelyTabs, 1200);
    return () => clearTimeout(timeoutId);
  }, []);

  // -- Data fetching ----------------------------------------------------------

  const fetchGigs = useCallback(async () => {
    if (fetchGigsInFlightRef.current) {
      return;
    }

    // Wait until auth bootstrap completes to avoid noisy initial no-session calls.
    if (authLoading) {
      return;
    }

    if (!session?.user) {
      if (!noSessionLoggedRef.current) {
        console.log("[fetchGigs] No user session");
        noSessionLoggedRef.current = true;
      }
      setGigs([]);
      setTotalGigCount(0);
      setLoading(false);
      return;
    }

    noSessionLoggedRef.current = false;

    try {
      fetchGigsInFlightRef.current = true;
      setLoading(gigsRef.current.length === 0);
      console.log("[fetchGigs] Getting access token for user:", session.user.email);
      const token = await getAccessToken();

      if (!token) {
        // Token not available yet — wait a bit and retry
        console.warn("[fetchGigs] No token available, retrying in 500ms...");
        setLoading(false);
        setTimeout(fetchGigs, 500);
        return;
      }

      console.log("[fetchGigs] Got token, fetching gigs...");
      const res = await fetch("/api/gigs", {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      console.log("[fetchGigs] Response status:", res.status);

      if (!res.ok) {
        if (res.status === 401) {
          console.warn("[fetchGigs] Got 401, attempting token refresh and retry...");
          // Token might be expired — try to refresh
          const newToken = await getAccessToken();
          if (newToken && newToken !== token) {
            console.log("[fetchGigs] Got new token after refresh, retrying...");
            const retryRes = await fetch("/api/gigs", {
              cache: "no-store",
              headers: {
                Authorization: `Bearer ${newToken}`,
                Accept: "application/json",
              },
            });
            if (retryRes.ok) {
              const json = await retryRes.json();
              const nextData = json.data ?? json;
              setGigs(nextData);
              setTotalGigCount(json.total ?? nextData.length);
              if (gigsCacheKey) {
                try {
                  localStorage.setItem(gigsCacheKey, JSON.stringify({
                    data: nextData,
                    total: json.total ?? nextData.length,
                  }));
                } catch (error) {
                  console.warn("Failed to write gigs cache", error);
                }
              }
              console.log("[fetchGigs] Success after retry:", (json.data ?? json).length, "gigs");
              fetchRetryAttemptRef.current = 0;
              return;
            }
          }
          toast.error("Session expired. Please sign out and sign in again.");
        } else if (res.status === 503) {
          // Service unavailable - retry with exponential backoff and cap attempts
          console.warn("[fetchGigs] Got 503, handling temporary service outage...");
          const errorText = await res.text();
          const errorObj = (() => { try { return JSON.parse(errorText); } catch { return { error: errorText || 'Service temporarily unavailable' }; } })();
          
          if (errorObj.error === "Offline - cached data unavailable") {
            if (!swRecoveryAttemptedRef.current) {
              swRecoveryAttemptedRef.current = true;
              console.warn("[fetchGigs] Old Service Worker detected. Unregistering and reloading once...");
              if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                for (const reg of regs) {
                  await reg.unregister();
                }
              }
              window.location.reload();
              return;
            }
          }

          fetchRetryAttemptRef.current += 1;
          const attempt = fetchRetryAttemptRef.current;
          const maxRetries = 5;
          const retryDelayMs = Math.min(1000 * 2 ** (attempt - 1), 30000);
          const hasCachedData = gigsRef.current.length > 0;

          if (attempt > maxRetries) {
            toast.error(errorObj.error || "Service tijdelijk niet beschikbaar.");
            return;
          }

          toast.error(
            hasCachedData
              ? `${errorObj.error || "Service tijdelijk niet beschikbaar"}. We tonen je laatst geladen data en proberen opnieuw...`
              : `${errorObj.error || "Service tijdelijk niet beschikbaar"}. Opnieuw proberen (${attempt}/${maxRetries})...`
          );

          if (fetchRetryTimeoutRef.current) {
            clearTimeout(fetchRetryTimeoutRef.current);
          }
          fetchRetryTimeoutRef.current = setTimeout(() => {
            fetchGigs();
          }, retryDelayMs);
          return;
        } else {
            const errorText = await parseApiError(res);
            console.error("[fetchGigs] Error response:", errorText);
            const short = errorText ? String(errorText).slice(0, 200) : res.statusText || String(res.status);
            const containsOfflineCacheMessage =
              short.includes("Offline - cached data unavailable") ||
              short.includes("Unable to load data. Please check your connection and try again.");

            if (containsOfflineCacheMessage) {
              toast.error("Service tijdelijk niet beschikbaar. Probeer het zo opnieuw.");
            } else {
              toast.error(`Failed to load gigs (${res.status}): ${short}`);
            }
          }
        setGigs([]);
        setTotalGigCount(0);
      } else {
        const json = await res.json();
        console.log("[fetchGigs] Success:", json.total || (json.data ?? json).length, "gigs");
        const nextData = json.data ?? json;
        setGigs(nextData);
        setTotalGigCount(json.total ?? nextData.length);
        fetchRetryAttemptRef.current = 0;
        if (gigsCacheKey) {
          try {
            localStorage.setItem(gigsCacheKey, JSON.stringify({
              data: nextData,
              total: json.total ?? nextData.length,
            }));
          } catch (error) {
            console.warn("Failed to write gigs cache", error);
          }
        }
      }
    } catch (err) {
      console.error("Fetch gigs error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to load gigs: ${msg}`);
    } finally {
      fetchGigsInFlightRef.current = false;
      setLoading(false);
    }
  }, [authLoading, session?.user, getAccessToken, gigsCacheKey, toast]);

  useEffect(() => {
    fetchGigs();
  }, [fetchGigs]);

  // Filter gigs based on search query
  const filteredGigs = useMemo(() => {
    if (!deferredSearchQuery.trim()) return gigs;
    const query = deferredSearchQuery.toLowerCase();
    return gigs.filter((gig) =>
      gig.eventName.toLowerCase().includes(query) ||
      gig.performers.toLowerCase().includes(query) ||
      (gig.notes && gig.notes.toLowerCase().includes(query)) ||
      (gig.performanceLineup && gig.performanceLineup.toLowerCase().includes(query))
    );
  }, [gigs, deferredSearchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // -- CRUD handlers ----------------------------------------------------------

  const handleCreate = async (data: GigFormData) => {
    try {
      const token = await getAccessToken();

      if (!token) {
        toast.error("Could not get session. Please sign out and sign in again.");
        return;
      }

      const res = await fetch("/api/gigs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          paymentReceivedDate: data.paymentReceivedDate || null,
          bandPaidDate: data.bandPaidDate || null,
          notes: data.notes || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create gig");
      }

      setShowForm(false);
      toast.success("Performance added successfully!");
      fetchGigs();
    } catch (err: any) {
      toast.error(err.message || "Failed to create performance. Please try again.");
    }
  };

  const handleUpdate = async (data: GigFormData) => {
    if (!editGig) return;
    try {
      const token = await getAccessToken();

      if (!token) {
        toast.error("Could not get session. Please sign out and sign in again.");
        return;
      }

      const res = await fetch(`/api/gigs/${editGig.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          paymentReceivedDate: data.paymentReceivedDate || null,
          bandPaidDate: data.bandPaidDate || null,
          notes: data.notes || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update gig");
      }

      setEditGig(null);
      toast.success("Performance updated successfully!");
      fetchGigs();
    } catch (err: any) {
      toast.error(err.message || "Failed to update performance. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (!deleteGig) return;
    const deletedName = deleteGig.eventName;
    // Optimistic: remove from UI immediately
    const prev = gigs;
    setGigs((g) => g.filter((x) => x.id !== deleteGig.id));
    setDeleteGig(null);
    try {
      const token = await getAccessToken();

      if (!token) {
        setGigs(prev);
        toast.error("Could not get session. Please sign out and sign in again.");
        return;
      }

      const res = await fetch(`/api/gigs/${deleteGig.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error();
      toast.success(`Performance "${deletedName}" deleted successfully.`, {
        label: "Undo",
        onClick: () => {
          setGigs(prev);
          toast.info("Deletion cancelled - performance restored.");
        }
      });
      fetchGigs(); // re-sync
    } catch {
      setGigs(prev); // rollback on failure
      toast.error("Delete failed — performance restored.");
    }
  };

  const handleExpandAll = () => {
    setGlobalExpandState(true);
    toast.info("Expanded all performances");
  };

  const handleCollapseAll = () => {
    setGlobalExpandState(false);
    toast.info("Collapsed all performances");
  };

  const getDownloadFilename = (
    contentDisposition: string | null,
    fallbackType: "gigs" | "summary" | "report",
    fallbackFormat: "csv" | "json"
  ) => {
    const utf8Match = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i);
    const quotedMatch = contentDisposition?.match(/filename="?([^";]+)"?/i);
    const rawName = utf8Match?.[1] || quotedMatch?.[1];

    if (rawName) {
      try {
        return decodeURIComponent(rawName);
      } catch {
        return rawName;
      }
    }

    const datePart = new Date().toISOString().split("T")[0];
    return `${fallbackType}-${datePart}.${fallbackFormat}`;
  };

  const handleExport = async (type: "gigs" | "summary" | "report") => {
    if (exportingType) return;

    setExportingType(type);
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error("Could not get session. Please sign out and sign in again.");
        return;
      }

      const format = type === "report" ? "json" : "csv";
      const typeLabel = type === "gigs" ? "Gig export" : type === "summary" ? "Summary export" : "Report export";
      const responsePromise = fetch(`/api/exports/summary?type=${type}&format=${format}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.info(`Generating ${typeLabel.toLowerCase()}...`);
      const response = await responsePromise;

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const filename = getDownloadFilename(response.headers.get("Content-Disposition"), type, format);

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`${typeLabel} downloaded.`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Export failed";
      console.error("[handleExport]", msg);
      toast.error(msg);
    } finally {
      setExportingType(null);
    }
  };

  const handleToggleGigSelection = (gigId: string) => {
    const newSelected = new Set(selectedGigIds);
    if (newSelected.has(gigId)) {
      newSelected.delete(gigId);
    } else {
      newSelected.add(gigId);
    }
    setSelectedGigIds(newSelected);
  };

  const handleSelectAll = () => {
    if (gigs.length > 0) {
      const allIds = new Set(gigs.map((g) => g.id));
      setSelectedGigIds(allIds);
      toast.success(`Selected all ${gigs.length} performances`);
    }
  };

  const handleClearSelection = () => {
    setSelectedGigIds(new Set());
    toast.info("Selection cleared");
  };

  // Keyboard shortcuts
  const shortcuts = [
    {
      keys: ["n"],
      description: "New performance",
      action: () => setShowForm(true),
    },
  ];

  // -- Summary calculation ----------------------------------------------------

  const summary: DashboardSummary = useMemo(
    () =>
      gigs.reduce(
        (acc, g) => {
          const c = calculateGigFinancials(
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
          acc.totalGigs += 1;
          acc.totalEarnings += c.myEarnings;
          if (g.paymentReceived) {
            // Full payment received
            acc.totalEarningsReceived += c.myEarnings;
          } else {
            // Only advance received so far, rest is still pending
            acc.totalEarningsReceived += c.myEarningsAlreadyReceived;
            acc.totalEarningsPending += c.myEarningsStillOwed;

            // Track pending amount by band/performer
            const bandName = g.performers || "Unknown";
            const totalGigValue = c.totalReceived;
            const pendingAmount = Math.max(0, totalGigValue - g.advanceReceivedByManager);
            const existing = acc.pendingByBand.find((b) => b.band === bandName);
            if (existing) {
              existing.amount += pendingAmount;
              existing.count += 1;
            } else {
              acc.pendingByBand.push({
                band: bandName,
                amount: pendingAmount,
                count: 1,
              });
            }
          }
          if (!g.paymentReceived) acc.pendingClientPayments += 1;
          if (!g.bandPaid && g.managerHandlesDistribution) acc.outstandingToBand += c.amountOwedToOthers;
          return acc;
        },
        {
          totalGigs: 0,
          totalEarnings: 0,
          totalEarningsReceived: 0,
          totalEarningsPending: 0,
          pendingClientPayments: 0,
          outstandingToBand: 0,
          pendingByBand: [],
        } as DashboardSummary
      ),
    [gigs]
  );

  const { activeGigs, handledGigs } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const active = filteredGigs
      .filter((gig) => {
        const gigDate = new Date(gig.date);
        gigDate.setHours(0, 0, 0, 0);
        const isUpcoming = gigDate >= today;
        const isUnpaid = !gig.paymentReceived || !gig.bandPaid;
        return isUpcoming || isUnpaid;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const handled = filteredGigs
      .filter((gig) => {
        const gigDate = new Date(gig.date);
        gigDate.setHours(0, 0, 0, 0);
        const isPast = gigDate < today;
        const isFullyPaid = gig.paymentReceived && gig.bandPaid;
        return isPast && isFullyPaid;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { activeGigs: active, handledGigs: handled };
  }, [filteredGigs]);

  // -- Render -----------------------------------------------------------------

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div style={{ backgroundColor: "#0f172a" }} className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading dashboard..." />
      </div>
    );
  }

  // Show login if not authenticated
  if (!session?.user) {
    return <LandingPage />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors">
      {/* -- Navbar -------------------------------------------------------- */}
      <header className="sticky top-0 z-30 border-b border-slate-200/40 dark:border-slate-700/40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl dark:backdrop-blur-xl shadow-md dark:shadow-lg transition-colors">
        <div className={`mx-auto flex w-full items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 lg:px-6 ${isWideView ? "max-w-none 2xl:px-8" : "max-w-[1800px]"}`}>
          {/* Left: Hamburger (mobile) + Logo */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
            {/* Mobile hamburger */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition flex-shrink-0"
              title="Menu"
            >
              {showMobileMenu ? (
                <Icons.Close className="h-5 w-5" />
              ) : (
                <Icons.Menu className="h-5 w-5" />
              )}
            </button>
            
            <Image
              src="/favicon.png"
              alt="GigsManager"
              width={36}
              height={36}
              className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 rounded-lg"
            />
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
              Gigs<span className="text-gold-600 dark:text-gold-400">Manager</span>
            </h1>
          </div>

          {/* Center: Search (desktop) */}
          <div className="hidden md:block flex-1 max-w-md mx-4">
            <div className="relative">
              <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search gigs..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50/50 backdrop-blur focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:backdrop-blur dark:focus:bg-slate-900 dark:text-slate-100 transition duration-200"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                  title="Clear search"
                >
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Right: Navigation toggles + Add + Profile (always visible) */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
            {/* Notes - visible on tablet+ with label, icon-only on mobile */}
            <button
              onClick={() => handleTabChange("songs")}
              className={`inline-flex items-center gap-1.5 md:gap-2 rounded-lg border px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm font-medium transition duration-200 ${
                activeTab === "songs"
                  ? "border-brand-500 bg-brand-50/80 backdrop-blur text-brand-700 dark:border-brand-400 dark:bg-brand-950/40 dark:backdrop-blur dark:text-brand-300"
                  : "border-slate-200/60 bg-white/50 backdrop-blur text-slate-700 hover:bg-slate-100/50 dark:border-slate-700/60 dark:bg-slate-800/30 dark:backdrop-blur dark:text-slate-200 dark:hover:bg-slate-700/30"
              }`}
              title={isDutch ? "Notities" : "Notes"}
            >
              <Icons.Document className="h-4 w-4 md:h-4 md:w-4 shrink-0" />
              <span className="hidden md:inline whitespace-nowrap">{isDutch ? "Notities" : "Notes"}</span>
            </button>

            {/* Layout toggle - visible on tablet+ with label, icon-only on mobile */}
            <button
              onClick={handleToggleWideView}
              className={`inline-flex items-center gap-1.5 md:gap-2 rounded-lg border px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm font-medium transition duration-200 ${
                isWideView
                  ? "border-brand-500 bg-brand-50/80 backdrop-blur text-brand-700 dark:border-brand-400 dark:bg-brand-950/40 dark:backdrop-blur dark:text-brand-300"
                  : "border-slate-200/60 bg-white/50 backdrop-blur text-slate-700 hover:bg-slate-100/50 dark:border-slate-700/60 dark:bg-slate-800/30 dark:backdrop-blur dark:text-slate-200 dark:hover:bg-slate-700/30"
              }`}
              title={isWideView ? "Standard layout" : "Fullscreen layout"}
            >
              <Icons.Expand className="h-4 w-4 md:h-4 md:w-4 shrink-0" />
              <span className="hidden md:inline whitespace-nowrap text-xs">{isWideView ? "Standard" : "Fullscreen"}</span>
            </button>



            {/* Add Performance - icon only on mobile, button on desktop */}
            <button
              onClick={() => {
                setEditGig(null);
                setShowForm(true);
              }}
              className="p-1.5 sm:p-0 sm:px-3 sm:py-2 rounded-lg bg-gradient-to-br from-brand-600 to-brand-700 text-white shadow-md hover:shadow-lg transition duration-200 hover:from-brand-700 hover:to-brand-800 active:shadow-inner flex-shrink-0"
              title="Add Performance"
            >
              <Icons.Plus className="h-4 w-4 sm:hidden shrink-0" />
              <span className="hidden sm:inline-flex items-center gap-1 text-sm font-medium">
                <Icons.Plus className="h-4 w-4 shrink-0" />
                Add
              </span>
            </button>

            {/* Profile menu (merged with settings & sign out) */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu((open) => !open)}
                title="Profile & Settings"
                className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-sm font-semibold text-slate-700 shadow-md hover:shadow-lg transition duration-200 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600 flex-shrink-0"
              >
                {session.user?.user_metadata?.avatar_url ? (
                  <Image
                    src={session.user.user_metadata.avatar_url}
                    alt="Profile avatar"
                    width={32}
                    height={32}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  (session.user?.user_metadata?.name || session.user?.email || "?").charAt(0).toUpperCase()
                )}
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200/50 bg-white/95 backdrop-blur text-sm shadow-xl dark:border-slate-700/50 dark:bg-slate-900/95 dark:backdrop-blur overflow-hidden">
                  {/* Profile info header */}
                  <div className="border-b border-slate-200 dark:border-slate-700 p-3">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                      {session.user?.user_metadata?.name || "Profile"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {session.user?.email}
                    </p>
                  </div>
                  {/* Menu items */}
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setShowSettings(true);
                        setShowProfileMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Settings
                    </button>
                    <button
                      onClick={() => {
                        setShowKeyboardShortcuts(true);
                        setShowProfileMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Keyboard shortcuts
                    </button>
                    <div className="border-t border-slate-200 dark:border-slate-700 mt-2 pt-2">
                      <button
                        onClick={async () => {
                          setShowProfileMenu(false);
                          await signOut();
                        }}
                        className="w-full px-3 py-2 text-left text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-900/20 font-medium"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay - OUTSIDE header for full viewport coverage */}
      {showMobileMenu && (
        <>
          <div className="lg:hidden fixed inset-0 z-[100] bg-black/50" onClick={() => setShowMobileMenu(false)} />
          {/* Responsive menu width: phone (84vw) → tablet (60vw) → large tablet (50vw) */}
          <div className="lg:hidden fixed left-0 top-0 bottom-0 z-[101] w-[84vw] max-w-[19rem] tablet:w-[60vw] tablet:max-w-[30rem] tablet-lg:w-[50vw] tablet-lg:max-w-[40rem] bg-white dark:bg-slate-900 shadow-xl overflow-y-auto">
            <div className="p-4 tablet:p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Menu</h2>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <Icons.Close className="h-5 w-5" />
                </button>
              </div>

              {/* Action buttons - grid on small, flex on tablet */}
              <div className="mb-4 grid grid-cols-2 tablet:grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    setEditGig(null);
                    setShowForm(true);
                  }}
                  className="inline-flex items-center justify-center gap-1 tablet:gap-2 rounded-lg bg-brand-600 px-2 tablet:px-3 py-2 text-xs tablet:text-sm font-medium text-white transition hover:bg-brand-700"
                >
                  <Icons.Plus className="h-4 w-4 shrink-0" />
                  <span className="hidden tablet:inline">Add gig</span>
                  <span className="tablet:hidden">Add</span>
                </button>
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    handleToggleWideView();
                  }}
                  className={`inline-flex items-center justify-center gap-1 tablet:gap-2 rounded-lg border px-2 tablet:px-3 py-2 text-xs tablet:text-sm font-medium transition ${
                    isWideView
                      ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-950/30 dark:text-brand-300"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <Icons.Expand className="h-4 w-4 shrink-0" />
                  <span className="hidden tablet:inline">{isWideView ? "Normal" : "XL"}</span>
                </button>
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    handleTabChange("songs");
                  }}
                  className="inline-flex items-center justify-center gap-1 tablet:gap-2 rounded-lg border border-slate-200 bg-white px-2 tablet:px-3 py-2 text-xs tablet:text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  <Icons.Document className="h-4 w-4 shrink-0" />
                  <span className="hidden tablet:inline">Notes</span>
                </button>
              </div>
              
              {/* Mobile search - visible on phones, hidden on tablets (search in header) */}
              <div className="mb-4 tablet:hidden">
                <div className="relative">
                  <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search gigs..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                    >
                      <Icons.Close className="h-4 w-4 text-slate-400" />
                    </button>
                  )}
                </div>
              </div>

              {/* Quick toggles */}
              <div className="mb-4 flex gap-2">
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    handleTabChange("songs");
                  }}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition ${
                    activeTab === "songs"
                      ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-950/30 dark:text-brand-300"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  }`}
                  title={isDutch ? "Notities" : "Notes"}
                >
                  <Icons.Document className="h-4 w-4 shrink-0" />
                  <span>{isDutch ? "Notities" : "Notes"}</span>
                </button>
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    handleToggleWideView();
                  }}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition ${
                    isWideView
                      ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-950/30 dark:text-brand-300"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  }`}
                  title={isWideView ? "Standard layout" : "Fullscreen layout"}
                >
                  <Icons.Expand className="h-4 w-4 shrink-0" />
                  <span>{isWideView ? "Normal" : "Full"}</span>
                </button>
              </div>

              {/* Navigation */}
              <nav className="space-y-1">
                <div className="px-3 py-2 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Overview
                </div>
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    handleTabChange("gigs");
                  }}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    activeTab === "gigs" 
                      ? "bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300" 
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icons.GridView className="h-5 w-5 shrink-0" />
                  <span>Overview</span>
                </button>
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    handleTabChange("calendar");
                  }}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    activeTab === "calendar" 
                      ? "bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300" 
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icons.Calendar className="h-5 w-5 shrink-0" />
                  <span>Calendar</span>
                </button>
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    handleTabChange("all-gigs");
                  }}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    activeTab === "all-gigs" 
                      ? "bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300" 
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icons.ListView className="h-5 w-5 shrink-0" />
                  <span>All Gigs</span>
                </button>
                <div className="px-3 py-2 pt-3 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Band & Setlists
                </div>
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    handleTabChange("band-members");
                  }}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    activeTab === "band-members" 
                      ? "bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300" 
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icons.People className="h-5 w-5 shrink-0" />
                  <span>Band Members</span>
                </button>
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    handleTabChange("setlists");
                  }}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    activeTab === "setlists" 
                      ? "bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300" 
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icons.Music className="h-5 w-5 shrink-0" />
                  <span>Setlists</span>
                </button>
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    handleTabChange("songs");
                  }}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    activeTab === "songs" 
                      ? "bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300" 
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icons.Document className="h-5 w-5 shrink-0" />
                  <span>{isDutch ? "Notities" : "Notes"}</span>
                </button>
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    handleTabChange("shared-links");
                  }}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    activeTab === "shared-links" 
                      ? "bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300" 
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icons.Link className="h-5 w-5 shrink-0" />
                  <span>Share</span>
                </button>

                <div className="px-3 py-2 pt-3 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Analytics
                </div>
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    handleTabChange("analytics");
                  }}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    activeTab === "analytics" 
                      ? "bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300" 
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icons.Analytics className="h-5 w-5 shrink-0" />
                  <span>Insights</span>
                </button>

                <div className="px-3 py-2 pt-3 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Finance
                </div>
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    handleTabChange("investments");
                  }}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    activeTab === "investments" 
                      ? "bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300" 
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icons.Wallet className="h-5 w-5 shrink-0" />
                  <span>Investments</span>
                </button>
              </nav>
            </div>
          </div>
        </>
      )}

      <main className={`mx-auto w-full px-3 sm:px-4 lg:px-6 py-4 sm:py-8 dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950 min-h-screen transition-colors ${isWideView ? "max-w-none 2xl:px-10" : "max-w-[1800px]"}`}>
        {/* Search results indicator */}
        {searchQuery && (
          <div className="mb-4 flex items-center justify-between rounded-lg bg-brand-50 px-4 py-2 text-sm dark:bg-brand-950/30">
            <span className="text-brand-700 dark:text-brand-300">
              Found {filteredGigs.length} {filteredGigs.length === 1 ? 'gig' : 'gigs'} matching "{searchQuery}"
            </span>
            <button
              onClick={() => setSearchQuery("")}
              className="text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium"
            >
              Clear
            </button>
          </div>
        )}
        {/* -- Premium Summary Cards ----------------------------------- */}
        <div className="mb-4 sm:mb-8">
          {/* Overview collapse header with export actions */}
          <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Overview</h2>
            <div className="flex items-center gap-1.5">
              {/* Export buttons */}
              <button
                onClick={() => handleExport("gigs")}
                disabled={Boolean(exportingType)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition disabled:opacity-60 disabled:cursor-not-allowed"
                title="Export all gigs as CSV"
              >
                {exportingType === "gigs" ? (
                  <Icons.Spinner className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Icons.Download className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                onClick={() => handleExport("summary")}
                disabled={Boolean(exportingType)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition disabled:opacity-60 disabled:cursor-not-allowed"
                title="Export financial summary as CSV"
              >
                {exportingType === "summary" ? (
                  <Icons.Spinner className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Icons.ChartLine className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">Summary</span>
              </button>
              <button
                onClick={() => handleExport("report")}
                disabled={Boolean(exportingType)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition disabled:opacity-60 disabled:cursor-not-allowed"
                title="Export financial report as JSON"
              >
                {exportingType === "report" ? (
                  <Icons.Spinner className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Icons.Document className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">Report</span>
              </button>
              {/* Collapse/expand toggle */}
              <button
                onClick={handleToggleOverview}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 ml-1"
                title={isOverviewExpanded ? "Collapse overview" : "Expand overview"}
              >
                <svg
                  className={`h-4 w-4 transition-transform duration-200 ${isOverviewExpanded ? "rotate-0" : "-rotate-90"}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>
            </div>
          </div>
          {/* Collapsible content */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isOverviewExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <DashboardSummaryComponent summary={summary} gigs={gigs} fmtCurrency={fmtCurrency} />
          </div>
        </div>

        {/* -- Tabs (desktop only) ----------------------------------------------------- */}
        <div className="mb-6 hidden lg:flex gap-1 sm:gap-2 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
          <div className="flex items-center px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            Core
          </div>
          {/* Overview */}
          <button
            onClick={() => handleTabChange("gigs")}
            className={`px-2 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition whitespace-nowrap ${
              activeTab === "gigs"
                ? "border-b-2 border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6Zm0 9.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25v-2.25Zm9-9.75A2.25 2.25 0 0 1 15 3.75H17.25a2.25 2.25 0 0 1 2.25 2.25V6A2.25 2.25 0 0 1 17.25 8.25H15a2.25 2.25 0 0 1-2.25-2.25V6Zm0 9.75A2.25 2.25 0 0 1 15 13.5H17.25a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 17.25 20.25H15a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
              </svg>
              <span className="hidden sm:inline">Overview</span>
            </span>
          </button>
          {/* Calendar */}
          <button
            onClick={() => handleTabChange("calendar")}
            className={`px-2 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition whitespace-nowrap ${
              activeTab === "calendar"
                ? "border-b-2 border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
              <span className="hidden sm:inline">Calendar</span>
            </span>
          </button>
          {/* All Gigs */}
          <button
            onClick={() => handleTabChange("all-gigs")}
            className={`px-2 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition whitespace-nowrap ${
              activeTab === "all-gigs"
                ? "border-b-2 border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              <span className="hidden sm:inline">All Gigs</span>
            </span>
          </button>
          <div className="flex items-center px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            Band
          </div>
          {/* Band Members */}
          <button
            onClick={() => handleTabChange("band-members")}
            className={`px-2 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition whitespace-nowrap ${
              activeTab === "band-members"
                ? "border-b-2 border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <Icons.People className="h-4 w-4" />
              <span className="hidden sm:inline">Band</span>
            </span>
          </button>
          {/* Setlists */}
          <button
            onClick={() => handleTabChange("setlists")}
            className={`px-2 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition whitespace-nowrap ${
              activeTab === "setlists"
                ? "border-b-2 border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <Icons.Music className="h-4 w-4" />
              <span className="hidden sm:inline">Setlists</span>
            </span>
          </button>
          <div className="flex items-center px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            Insights
          </div>
          {/* Shared Links */}
          <button
            onClick={() => handleTabChange("shared-links")}
            className={`px-2 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition whitespace-nowrap ${
              activeTab === "shared-links"
                ? "border-b-2 border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <Icons.Link className="h-4 w-4" />
              <span className="hidden sm:inline">Shared Links</span>
            </span>
          </button>
          {/* Insights */}
          <button
            onClick={() => handleTabChange("analytics")}
            className={`px-2 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition whitespace-nowrap ${
              activeTab === "analytics"
                ? "border-b-2 border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <Icons.Analytics className="h-4 w-4" />
              <span className="hidden sm:inline">Insights</span>
            </span>
          </button>
          {/* Investments */}
          <button
            onClick={() => handleTabChange("investments")}
            className={`px-2 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition whitespace-nowrap ${
              activeTab === "investments"
                ? "border-b-2 border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <Icons.Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Invest</span>
            </span>
          </button>
        </div>



        {/* -- Content -------------------------------------------------- */}
        {activeTab === "gigs" ? (
          <>
            {/* -- Overview: Smart sorted performances ---------------------- */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <LoadingSpinner size="lg" message="Loading performances..." />
              </div>
            ) : filteredGigs.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 py-20 text-center">
                <Icons.Music2 className="mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                  {searchQuery ? "No matching performances" : "No performances yet"}
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {searchQuery ? `No gigs found matching "${searchQuery}"` : "Add your first gig to start tracking."}
                </p>
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 dark:hover:bg-brand-700"
                  >
                    Clear Search
                  </button>
                ) : (
                  <button
                    onClick={() => setShowForm(true)}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 dark:hover:bg-brand-700"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Add Performance
                  </button>
                )}
              </div>
            ) : (
              <div className={isWideView ? "grid gap-6 xl:grid-cols-2 2xl:gap-8" : "space-y-6"}>
                {/* Active Gigs Section */}
                {activeGigs.length > 0 && (
                  <div className="min-w-0">
                          <div className="mb-4 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setIsActiveSectionExpanded((prev) => !prev)}
                                className="rounded p-1 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200"
                                title={isActiveSectionExpanded ? "Collapse section" : "Expand section"}
                              >
                                <svg
                                  className={`h-4 w-4 transition-transform ${isActiveSectionExpanded ? "rotate-0" : "-rotate-90"}`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={2}
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                                Active Performances
                              </h3>
                              <span className="rounded-full bg-brand-100 dark:bg-brand-900/40 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:text-brand-300">
                                {activeGigs.length}
                              </span>
                            </div>
                            {activeGigs.length > 0 && isActiveSectionExpanded && (
                              <div className="flex gap-1">
                                <button
                                  onClick={handleExpandAll}
                                  title="Expand all (Cmd+E)"
                                  className="rounded p-1 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300 text-xs"
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                                  </svg>
                                </button>
                                <button
                                  onClick={handleCollapseAll}
                                  title="Collapse all (Cmd+C)"
                                  className="rounded p-1 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300 text-xs"
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                                <div className="mx-1 w-px bg-slate-200 dark:bg-slate-700" />
                                <button
                                  onClick={handleSelectAll}
                                  title="Select all performances"
                                  className="rounded p-1 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300 text-xs"
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </button>
                                {selectedGigIds.size > 0 && (
                                  <>
                                    <button
                                      onClick={() => setShowBulkEditor(true)}
                                      title={`Bulk edit (${selectedGigIds.size} selected)`}
                                      className="rounded p-1 text-blue-500 transition hover:bg-blue-50 dark:hover:bg-blue-900/20 text-xs"
                                    >
                                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 9.75a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={handleClearSelection}
                                      title="Clear selection"
                                      className="rounded px-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300 text-xs"
                                    >
                                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          {isActiveSectionExpanded && (
                            <div className={isWideView ? "grid gap-4 lg:grid-cols-1 2xl:grid-cols-2" : "grid gap-5 xl:grid-cols-2 2xl:grid-cols-3"}>
                              {activeGigs.map((gig) => (
                                <GigCard
                                  key={gig.id}
                                  gig={gig}
                                  onEdit={handleEditGig}
                                  fmtCurrency={fmtCurrency}
                                  claimPerformanceFee={gig.claimPerformanceFee}
                                  claimTechnicalFee={gig.claimTechnicalFee}
                                  isExpandedGlobal={globalExpandState}
                                  isSelected={selectedGigIds.has(gig.id)}
                                  onSelect={handleToggleGigSelection}
                                />
                              ))}
                            </div>
                          )}
                  </div>
                )}

                {/* Handled Gigs Section */}
                {handledGigs.length > 0 && (
                  <div className="min-w-0">
                          <div className="mb-4 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setIsHandledSectionExpanded((prev) => !prev)}
                                className="rounded p-1 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200"
                                title={isHandledSectionExpanded ? "Collapse section" : "Expand section"}
                              >
                                <svg
                                  className={`h-4 w-4 transition-transform ${isHandledSectionExpanded ? "rotate-0" : "-rotate-90"}`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={2}
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                                Handled Performances
                              </h3>
                              <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                                {handledGigs.length}
                              </span>
                            </div>
                            {handledGigs.length > 0 && isHandledSectionExpanded && (
                              <div className="flex gap-1">
                                <button
                                  onClick={handleExpandAll}
                                  title="Expand all (Cmd+E)"
                                  className="rounded p-1 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300 text-xs"
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                                  </svg>
                                </button>
                                <button
                                  onClick={handleCollapseAll}
                                  title="Collapse all (Cmd+C)"
                                  className="rounded p-1 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300 text-xs"
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                          {isHandledSectionExpanded && (
                            <div className={isWideView ? "grid gap-4 lg:grid-cols-1 2xl:grid-cols-2" : "grid gap-5 xl:grid-cols-2 2xl:grid-cols-3"}>
                              {handledGigs.map((gig) => (
                                <GigCard
                                  key={gig.id}
                                  gig={gig}
                                  onEdit={handleEditGig}
                                  fmtCurrency={fmtCurrency}
                                  claimPerformanceFee={gig.claimPerformanceFee}
                                  claimTechnicalFee={gig.claimTechnicalFee}
                                  isExpandedGlobal={globalExpandState}
                                  isSelected={selectedGigIds.has(gig.id)}
                                  onSelect={handleToggleGigSelection}
                                />
                              ))}
                            </div>
                          )}
                  </div>
                )}
              </div>
            )}
          </>
        ) : activeTab === "all-gigs" ? (
          <Suspense fallback={<TabLoader />}>
            <AllGigsTab 
              gigs={gigs}
              onEdit={handleEditGig}
              fmtCurrency={fmtCurrency}
              loading={loading}
            />
          </Suspense>
        ) : activeTab === "analytics" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 p-2">
              <button
                onClick={() => setInsightsView("analytics")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  insightsView === "analytics"
                    ? "bg-brand-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                Analytics
              </button>
              <button
                onClick={() => setInsightsView("reports")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  insightsView === "reports"
                    ? "bg-brand-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                Reports
              </button>
            </div>
            <Suspense fallback={<TabLoader />}>
              {insightsView === "analytics" ? (
                <AnalyticsPage gigs={gigs} fmtCurrency={fmtCurrency} />
              ) : (
                <FinancialReports fmtCurrency={fmtCurrency} />
              )}
            </Suspense>
          </div>
        ) : activeTab === "investments" ? (
          <Suspense fallback={<TabLoader />}>
            <InvestmentsTab fmtCurrency={fmtCurrency} />
          </Suspense>
        ) : activeTab === "band-members" ? (
          <Suspense fallback={<TabLoader />}>
            <BandMembers fmtCurrency={fmtCurrency} gigs={gigs} />
          </Suspense>
        ) : activeTab === "setlists" ? (
          <Suspense fallback={<TabLoader />}>
            <SetlistsTab />
          </Suspense>
        ) : activeTab === "songs" ? (
          <Suspense fallback={<TabLoader />}>
            <SongsTab />
          </Suspense>
        ) : activeTab === "shared-links" ? (
          <Suspense fallback={<TabLoader />}>
            <SharedLinksTab />
          </Suspense>
        ) : activeTab === "calendar" ? (
          <Suspense fallback={<TabLoader />}>
            <CalendarView 
              fmtCurrency={fmtCurrency} 
              gigs={gigs}
              onEditGig={handleEditGigById} 
            />
          </Suspense>
        ) : null}
      </main>

      {/* -- Modals ----------------------------------------------------- */}
      {showForm && (
        <GigForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      )}
      {editGig && (
        <GigForm
          gig={editGig}
          onSubmit={handleUpdate}
          onCancel={() => setEditGig(null)}
          onDelete={(gig) => {
            setEditGig(null);
            setDeleteGig(gig);
          }}
        />
      )}
      {deleteGig && (
        <DeleteConfirm
          gigName={deleteGig.eventName}
          onConfirm={handleDelete}
          onCancel={() => setDeleteGig(null)}
        />
      )}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
      {showBulkEditor && (
        <BulkEditor
          gigs={gigs}
          selectedIds={selectedGigIds}
          onClose={() => setShowBulkEditor(false)}
          onSuccess={() => {
            setSelectedGigIds(new Set());
            toast.success("Gigs updated successfully!");
            fetchGigs();
          }}
        />
      )}
      {/* -- Keyboard Shortcuts ----------------------------------------- */}
      {showKeyboardShortcuts && (
        <KeyboardShortcuts
          shortcuts={shortcuts}
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
          isOpen={showKeyboardShortcuts}
          onClose={() => setShowKeyboardShortcuts(false)}
        />
      )}

      {/* -- Footer ------------------------------------------------------ */}
      <Footer />
    </div>
  );
}

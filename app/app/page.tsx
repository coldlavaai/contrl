"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { getSavedCharts, getSavedChartsCloud, SavedChart } from "@/lib/chartStorage";
import { calculateSpc } from "@/lib/spc";
import {
  BarChart2,
  Shield,
  AlertTriangle,
  Activity,
  Plus,
  BookOpen,
  ArrowRight,
  Database,
  Search,
  Filter,
  ChevronDown,
} from "lucide-react";

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const CHART_TYPE_LABELS: Record<string, string> = {
  xmr: "XmR",
  cusum: "CuSum",
  pchart: "p-Chart",
  npchart: "np-Chart",
  cchart: "c-Chart",
  uchart: "u-Chart",
  pareto: "Pareto",
  "xbar-r": "X̄-R",
  "xbar-s": "X̄-S",
  ewma: "EWMA",
  run: "Run",
  "moving-avg": "MA",
};

type ChartStatus = "stable" | "warning" | "alert";

interface ChartMeta {
  chart: SavedChart;
  status: ChartStatus;
  signalCount: number;
  beyondLimits: number;
  sparklineValues: number[];
}

function getChartMeta(chart: SavedChart): ChartMeta {
  const vals = chart.measure.values;
  const dates = chart.measure.dates;
  const spc = calculateSpc(vals, dates, chart.splitIndices ?? []);

  let signalCount = 0;
  let beyondLimits = 0;

  spc.points.forEach((p) => {
    if (p.signal !== "none") signalCount++;
    if (p.signalDetails?.some((d) => d.rule === 1)) beyondLimits++;
  });

  let status: ChartStatus = "stable";
  if (beyondLimits > 0) status = "alert";
  else if (signalCount > 0) status = "warning";

  // Sparkline: last 20 values normalized
  const sparkLen = Math.min(20, vals.length);
  const sparklineValues = vals.slice(-sparkLen);

  return { chart, status, signalCount, beyondLimits, sparklineValues };
}

function MiniSparkline({ values, status }: { values: number[]; status: ChartStatus }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const h = 28;
  const w = 80;
  const step = w / (values.length - 1);

  const points = values.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");

  const color = status === "alert" ? "#ef4444" : status === "warning" ? "#f59e0b" : "#6366f1";

  return (
    <svg width={w} height={h} className="opacity-60">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatusDot({ status }: { status: ChartStatus }) {
  const colors = {
    stable: "bg-emerald-400 shadow-emerald-400/40",
    warning: "bg-amber-400 shadow-amber-400/40",
    alert: "bg-red-400 shadow-red-400/40",
  };
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full shadow-[0_0_6px] ${colors[status]}`}
    />
  );
}

export default function DashboardPage() {
  const [charts, setCharts] = useState<SavedChart[]>([]);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  useEffect(() => {
    const local = getSavedCharts();
    setCharts(local);
    setMounted(true);

    // Also try to sync from cloud
    getSavedChartsCloud().then((cloud) => {
      if (cloud.length > 0) {
        const merged = new Map<string, SavedChart>();
        for (const c of local) merged.set(c.id, c);
        for (const c of cloud) merged.set(c.id, c);
        const sorted = Array.from(merged.values()).sort((a, b) => b.savedAt - a.savedAt);
        setCharts(sorted);
      }
    }).catch(() => {});
  }, []);

  // Compute metadata for all charts
  const chartMetas: ChartMeta[] = useMemo(() => {
    return charts.map(getChartMeta);
  }, [charts]);

  // Unique chart types for filter
  const uniqueTypes = useMemo(() => {
    const types = new Set(charts.map((c) => c.chartType || "xmr"));
    return Array.from(types).sort();
  }, [charts]);

  // Apply filters
  const filtered = useMemo(() => {
    return chartMetas.filter((m) => {
      if (search) {
        const q = search.toLowerCase();
        if (!m.chart.title.toLowerCase().includes(q)) return false;
      }
      if (typeFilter !== "all") {
        if ((m.chart.chartType || "xmr") !== typeFilter) return false;
      }
      if (statusFilter !== "all") {
        if (m.status !== statusFilter) return false;
      }
      return true;
    });
  }, [chartMetas, search, typeFilter, statusFilter]);

  // Summary stats
  const totalCharts = chartMetas.length;
  const stableCount = chartMetas.filter((m) => m.status === "stable").length;
  const inControlPct = totalCharts > 0 ? Math.round((stableCount / totalCharts) * 100) : 0;
  const totalSignals = chartMetas.reduce((a, m) => a + m.signalCount, 0);
  const mostRecent = chartMetas[0];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Statistical Process Control · Overview of all your charts
        </p>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 text-indigo-400 bg-indigo-950/40 border-indigo-500/20">
            <BarChart2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{mounted ? totalCharts : "—"}</div>
            <div className="text-sm text-gray-400 mt-0.5">Total Charts</div>
          </div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 text-emerald-400 bg-emerald-950/40 border-emerald-500/20">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {mounted ? `${inControlPct}%` : "—"}
            </div>
            <div className="text-sm text-gray-400 mt-0.5">In Control</div>
            <div className="text-xs text-gray-600 mt-0.5">
              {mounted ? `${stableCount} of ${totalCharts} stable` : ""}
            </div>
          </div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 text-amber-400 bg-amber-950/40 border-amber-500/20">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{mounted ? totalSignals : "—"}</div>
            <div className="text-sm text-gray-400 mt-0.5">Total Signals</div>
            <div className="text-xs text-gray-600 mt-0.5">across all charts</div>
          </div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 text-purple-400 bg-purple-950/40 border-purple-500/20">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white truncate">
              {mounted && mostRecent
                ? formatRelative(mostRecent.chart.savedAt)
                : "—"}
            </div>
            <div className="text-sm text-gray-400 mt-0.5">Last Activity</div>
            <div className="text-xs text-gray-600 mt-0.5 truncate max-w-[140px]">
              {mounted && mostRecent ? mostRecent.chart.title : "no charts yet"}
            </div>
          </div>
        </div>
      </div>

      {/* Filters + Quick Actions */}
      {mounted && totalCharts > 0 && (
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 w-4 h-4" />
            <input
              type="text"
              placeholder="Search charts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Type filter */}
          <div className="relative">
            <button
              onClick={() => setShowTypeDropdown(!showTypeDropdown)}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white hover:border-white/20 transition-colors"
            >
              <Filter className="w-3.5 h-3.5" />
              {typeFilter === "all" ? "All Types" : CHART_TYPE_LABELS[typeFilter] || typeFilter}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showTypeDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowTypeDropdown(false)} />
                <div className="absolute top-full mt-1 left-0 z-20 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl py-1 min-w-[140px]">
                  <button
                    onClick={() => { setTypeFilter("all"); setShowTypeDropdown(false); }}
                    className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${typeFilter === "all" ? "text-indigo-400 bg-indigo-950/30" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
                  >
                    All Types
                  </button>
                  {uniqueTypes.map((t) => (
                    <button
                      key={t}
                      onClick={() => { setTypeFilter(t); setShowTypeDropdown(false); }}
                      className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${typeFilter === t ? "text-indigo-400 bg-indigo-950/30" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
                    >
                      {CHART_TYPE_LABELS[t] || t}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Status filter */}
          <div className="flex items-center rounded-lg border border-white/10 bg-white/5 overflow-hidden">
            {(["all", "stable", "warning", "alert"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 text-xs font-semibold transition-all select-none flex items-center gap-1.5 ${
                  statusFilter === s
                    ? "bg-indigo-600 text-white"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {s === "stable" && <StatusDot status="stable" />}
                {s === "warning" && <StatusDot status="warning" />}
                {s === "alert" && <StatusDot status="alert" />}
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* Result count */}
          {(search || typeFilter !== "all" || statusFilter !== "all") && (
            <span className="text-xs text-gray-600">
              {filtered.length} of {totalCharts} chart{totalCharts !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* Chart Status Grid */}
      {mounted && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-8">
          {filtered.map((meta) => (
            <Link
              key={meta.chart.id}
              href="/app/library"
              className="group relative flex flex-col p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-indigo-500/30 hover:bg-white/[0.04] transition-all duration-150"
            >
              {/* Top row: status + type badge */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <StatusDot status={meta.status} />
                  <span className="text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition-colors max-w-[150px]">
                    {meta.chart.title}
                  </span>
                </div>
                {meta.chart.chartType && (
                  <span className="shrink-0 text-[9px] font-bold text-indigo-400 bg-indigo-950/40 border border-indigo-500/20 px-1.5 py-0.5 rounded uppercase tracking-wide">
                    {CHART_TYPE_LABELS[meta.chart.chartType] || meta.chart.chartType}
                  </span>
                )}
              </div>

              {/* Sparkline */}
              <div className="mb-2">
                <MiniSparkline values={meta.sparklineValues} status={meta.status} />
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-3 text-[11px] text-gray-600">
                <span>{meta.chart.measure.values.length} pts</span>
                <span className="text-gray-700">·</span>
                {meta.signalCount > 0 ? (
                  <span className={meta.status === "alert" ? "text-red-400" : "text-amber-400"}>
                    {meta.signalCount} signal{meta.signalCount !== 1 ? "s" : ""}
                  </span>
                ) : (
                  <span className="text-emerald-500/70">stable</span>
                )}
                <span className="text-gray-700">·</span>
                <span>{formatRelative(meta.chart.savedAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* No results for filters */}
      {mounted && totalCharts > 0 && filtered.length === 0 && (
        <div className="py-12 text-center text-gray-600 text-sm mb-8">
          No charts matching your filters
        </div>
      )}

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Quick Actions
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <Link
            href="/app/new"
            className="group relative flex flex-col gap-3 p-5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-indigo-500/40 hover:bg-indigo-950/10 transition-all duration-150"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center">
              <Plus className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
                Create New Chart
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Upload data or enter manually
              </div>
            </div>
            <ArrowRight className="absolute top-5 right-5 h-4 w-4 text-gray-700 group-hover:text-indigo-500 transition-colors" />
          </Link>

          <Link
            href="/app/new?demo=1"
            className="group relative flex flex-col gap-3 p-5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-purple-500/40 hover:bg-purple-950/10 transition-all duration-150"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/20 flex items-center justify-center">
              <Database className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">
                Load Demo Data
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Explore with the demo dataset
              </div>
            </div>
            <ArrowRight className="absolute top-5 right-5 h-4 w-4 text-gray-700 group-hover:text-purple-500 transition-colors" />
          </Link>

          <Link
            href="/app/library"
            className="group relative flex flex-col gap-3 p-5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-amber-500/40 hover:bg-amber-950/10 transition-all duration-150"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/20 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white group-hover:text-amber-300 transition-colors">
                Browse Library
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {mounted && totalCharts > 0
                  ? `View your ${totalCharts} saved chart${totalCharts !== 1 ? "s" : ""}`
                  : "Save and revisit your SPC charts"}
              </div>
            </div>
            <ArrowRight className="absolute top-5 right-5 h-4 w-4 text-gray-700 group-hover:text-amber-500 transition-colors" />
          </Link>
        </div>
      </div>

      {/* Empty state */}
      {mounted && charts.length === 0 && (
        <div className="border border-white/[0.05] rounded-2xl p-10 text-center bg-white/[0.01]">
          <div className="w-16 h-16 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 flex items-center justify-center mx-auto mb-5">
            <BarChart2 className="h-8 w-8 text-indigo-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-300 mb-2">No charts yet</h3>
          <p className="text-sm text-gray-600 max-w-sm mx-auto mb-6">
            Upload your data or load the demo dataset to create your first SPC chart.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/app/new"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
            >
              Create your first chart
            </Link>
            <Link
              href="/app/new?demo=1"
              className="px-5 py-2.5 rounded-xl border border-white/10 hover:border-white/20 text-gray-400 hover:text-white text-sm font-medium transition-colors"
            >
              Try demo data
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

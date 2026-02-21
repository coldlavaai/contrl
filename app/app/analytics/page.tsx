"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { getSavedCharts, SavedChart } from "@/lib/chartStorage";
import { calculateSpc, SpcSegment } from "@/lib/spc";

const SpcChart = dynamic(() => import("@/components/SpcChart"), { ssr: false });

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface ChartStats {
  chart: SavedChart;
  totalPoints: number;
  ucl: number;
  lcl: number;
  mean: number;
  signalCount: number;
  withinLimitsCount: number;
}

function computeStats(chart: SavedChart): ChartStats {
  const spc = calculateSpc(
    chart.measure.values,
    chart.measure.dates,
    chart.splitIndices ?? [],
    {
      method: chart.method ?? "mean",
      splitModes: chart.splitModes ?? {},
      frozenLimits: chart.frozenLimits ?? false,
      omittedIndices: chart.omittedIndices ?? [],
    }
  );

  // Use first segment for summary UCL/LCL/mean
  const firstSeg: SpcSegment | undefined = spc.segments[0];

  // Count signals: points outside UCL or LCL across all segments
  let signalCount = 0;
  let withinLimitsCount = 0;

  for (let i = 0; i < spc.points.length; i++) {
    const v = spc.points[i].value;
    const ucl = spc.uclLine[i];
    const lcl = spc.lclLine[i];
    if (ucl !== null && lcl !== null) {
      if (v > ucl || v < lcl) {
        signalCount++;
      } else {
        withinLimitsCount++;
      }
    }
  }

  return {
    chart,
    totalPoints: chart.measure.values.length,
    ucl: firstSeg?.ucl ?? 0,
    lcl: firstSeg?.lcl ?? 0,
    mean: firstSeg?.mean ?? 0,
    signalCount,
    withinLimitsCount,
  };
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "indigo" | "emerald" | "amber" | "red";
}

function StatCard({ label, value, sub, accent = "indigo" }: StatCardProps) {
  const accentMap = {
    indigo: "text-indigo-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    red: "text-red-400",
  };
  return (
    <div className="bg-white/[0.025] border border-white/8 rounded-xl p-5">
      <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-2 font-medium">{label}</div>
      <div className={`text-3xl font-bold ${accentMap[accent]}`}>{value}</div>
      {sub && <div className="text-xs text-gray-600 mt-1">{sub}</div>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [charts, setCharts] = useState<SavedChart[]>([]);
  const [mounted, setMounted] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [measureFilter, setMeasureFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    setCharts(getSavedCharts());
    setMounted(true);
  }, []);

  // Apply date range filter (based on chart's savedAt)
  const dateFilteredCharts = useMemo(() => {
    return charts.filter((c) => {
      if (dateFrom) {
        const from = new Date(dateFrom).getTime();
        if (c.savedAt < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo).getTime() + 86_400_000; // inclusive end-of-day
        if (c.savedAt > to) return false;
      }
      return true;
    });
  }, [charts, dateFrom, dateTo]);

  // Apply measure filter
  const filteredCharts = useMemo(() => {
    if (!measureFilter.trim()) return dateFilteredCharts;
    const q = measureFilter.toLowerCase();
    return dateFilteredCharts.filter(
      (c) =>
        c.measure.name.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q)
    );
  }, [dateFilteredCharts, measureFilter]);

  // Compute per-chart stats
  const chartStats = useMemo<ChartStats[]>(() => {
    if (!mounted) return [];
    return filteredCharts.map(computeStats);
  }, [filteredCharts, mounted]);

  // Summary stats (based on filtered charts)
  const summary = useMemo(() => {
    const totalCharts = chartStats.length;
    const totalPoints = chartStats.reduce((s, cs) => s + cs.totalPoints, 0);
    const chartsWithSignals = chartStats.filter((cs) => cs.signalCount > 0).length;

    const totalWithinLimits = chartStats.reduce((s, cs) => s + cs.withinLimitsCount, 0);
    const totalInLimitRange = chartStats.reduce((s, cs) => s + cs.withinLimitsCount + cs.signalCount, 0);
    const avgStability =
      totalInLimitRange > 0
        ? Math.round((totalWithinLimits / totalInLimitRange) * 100)
        : 0;

    return { totalCharts, totalPoints, chartsWithSignals, avgStability };
  }, [chartStats]);

  const inputClass =
    "bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-gray-600";

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">
          Process performance overview across all your saved charts
        </p>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-end gap-4 mb-8">
        {/* Date range */}
        <div className="flex items-end gap-2">
          <div>
            <label className="block text-[11px] text-gray-500 mb-1 uppercase tracking-wider">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={inputClass}
              style={{ colorScheme: "dark" }}
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 mb-1 uppercase tracking-wider">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={inputClass}
              style={{ colorScheme: "dark" }}
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(""); setDateTo(""); }}
              className="text-gray-500 hover:text-gray-300 text-sm transition-colors pb-2"
            >
              Clear
            </button>
          )}
        </div>

        {/* Measure filter */}
        <div className="flex-1 min-w-48">
          <label className="block text-[11px] text-gray-500 mb-1 uppercase tracking-wider">Filter by measure</label>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
              width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="e.g. Cycle Time, Revenue…"
              value={measureFilter}
              onChange={(e) => setMeasureFilter(e.target.value)}
              className={`${inputClass} pl-8 w-full`}
            />
          </div>
        </div>
      </div>

      {/* Summary stats */}
      {mounted && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Charts"
            value={summary.totalCharts}
            sub={charts.length !== summary.totalCharts ? `of ${charts.length} total` : undefined}
            accent="indigo"
          />
          <StatCard
            label="Total Data Points"
            value={summary.totalPoints.toLocaleString()}
            sub="across filtered charts"
            accent="emerald"
          />
          <StatCard
            label="Charts with Signals"
            value={summary.chartsWithSignals}
            sub={summary.chartsWithSignals > 0 ? "outside control limits" : "all in control"}
            accent={summary.chartsWithSignals > 0 ? "amber" : "emerald"}
          />
          <StatCard
            label="Avg Process Stability"
            value={`${summary.avgStability}%`}
            sub="points within limits"
            accent={summary.avgStability >= 95 ? "emerald" : summary.avgStability >= 80 ? "amber" : "red"}
          />
        </div>
      )}

      {/* Loading skeleton */}
      {!mounted && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-white/[0.02] border border-white/5 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {mounted && charts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/3 border border-white/8 flex items-center justify-center mb-4 text-3xl">
            📊
          </div>
          <h3 className="text-base font-semibold text-gray-300 mb-2">No charts yet</h3>
          <p className="text-sm text-gray-600 max-w-xs">
            Save a chart from the chart view to start seeing analytics.
          </p>
        </div>
      )}

      {/* No results after filtering */}
      {mounted && charts.length > 0 && filteredCharts.length === 0 && (
        <div className="py-12 text-center text-gray-600 text-sm">
          No charts match the current filters.
        </div>
      )}

      {/* Chart table / list */}
      {mounted && chartStats.length > 0 && (
        <div className="space-y-2">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-2 text-[10px] text-gray-600 uppercase tracking-wider font-semibold">
            <div>Chart / Measure</div>
            <div className="text-right">Points</div>
            <div className="text-right">UCL</div>
            <div className="text-right">LCL</div>
            <div className="text-right">Mean</div>
            <div className="text-right">Signals</div>
            <div className="text-right">Last Updated</div>
          </div>

          {chartStats.map(({ chart, totalPoints, ucl, lcl, mean, signalCount }) => {
            const isExpanded = expandedId === chart.id;
            const stability =
              totalPoints > 0
                ? Math.round(((totalPoints - signalCount) / totalPoints) * 100)
                : 100;

            return (
              <div key={chart.id}>
                {/* Row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : chart.id)}
                  className={`cursor-pointer rounded-xl border transition-all duration-150
                    ${isExpanded
                      ? "border-indigo-500/50 bg-indigo-950/15 rounded-b-none border-b-0"
                      : "border-white/8 bg-white/[0.02] hover:border-indigo-500/25 hover:bg-white/[0.035]"
                    }`}
                >
                  {/* Mobile layout */}
                  <div className="md:hidden p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-semibold text-white">{chart.title}</div>
                        <div className="text-[11px] text-gray-500">{chart.measure.name}{chart.measure.unit ? ` (${chart.measure.unit})` : ""}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {signalCount > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/40 text-amber-400 border border-amber-500/20 font-medium">
                            {signalCount} signal{signalCount !== 1 ? "s" : ""}
                          </span>
                        )}
                        <span className={`text-[10px] transition-transform ${isExpanded ? "rotate-180" : ""}`}>▾</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      <div><span className="text-gray-600">Points:</span> <span className="text-gray-300">{totalPoints}</span></div>
                      <div><span className="text-gray-600">UCL:</span> <span className="text-red-400">{ucl.toFixed(2)}</span></div>
                      <div><span className="text-gray-600">LCL:</span> <span className="text-red-400">{lcl.toFixed(2)}</span></div>
                      <div><span className="text-gray-600">Mean:</span> <span className="text-gray-300">{mean.toFixed(2)}</span></div>
                      <div><span className="text-gray-600">Stability:</span> <span className={stability >= 95 ? "text-emerald-400" : stability >= 80 ? "text-amber-400" : "text-red-400"}>{stability}%</span></div>
                      <div><span className="text-gray-600">Saved:</span> <span className="text-gray-400">{formatDate(chart.savedAt)}</span></div>
                    </div>
                  </div>

                  {/* Desktop layout */}
                  <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3.5 items-center">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white truncate">{chart.title}</div>
                      <div className="text-[11px] text-gray-500 truncate">
                        {chart.measure.name}{chart.measure.unit ? ` (${chart.measure.unit})` : ""}
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-300">{totalPoints}</div>
                    <div className="text-right text-sm text-red-400">{ucl.toFixed(2)}</div>
                    <div className="text-right text-sm text-red-400">{lcl.toFixed(2)}</div>
                    <div className="text-right text-sm text-gray-300">{mean.toFixed(2)}</div>
                    <div className="text-right">
                      {signalCount > 0 ? (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-950/40 text-amber-400 border border-amber-500/20 font-medium">
                          {signalCount}
                        </span>
                      ) : (
                        <span className="text-[11px] text-emerald-500">✓ None</span>
                      )}
                    </div>
                    <div className="text-right text-[11px] text-gray-500">{formatDate(chart.savedAt)}</div>
                  </div>
                </div>

                {/* Expanded chart view */}
                {isExpanded && (
                  <div className="border border-indigo-500/50 border-t-0 rounded-b-xl bg-indigo-950/10 p-4 md:p-6">
                    <SpcChart
                      values={chart.measure.values}
                      dates={chart.measure.dates}
                      title={chart.title}
                      unit={chart.measure.unit}
                      splitIndices={chart.splitIndices}
                      annotations={chart.annotations}
                      initialMethod={chart.method ?? "mean"}
                      initialSplitModes={chart.splitModes ?? {}}
                      initialFrozenLimits={chart.frozenLimits ?? false}
                      initialTargetLines={chart.targetLines ?? []}
                      omittedIndices={chart.omittedIndices ?? []}
                      initialShowTrendLine={chart.showTrendLine ?? false}
                      initialXAxisLabel={chart.xAxisLabel}
                      initialYAxisLabel={chart.yAxisLabel}
                      initialCustomColors={chart.customColors}
                      readOnly
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

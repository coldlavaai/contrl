"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  getSavedCharts,
  getSavedChartsCloud,
  deleteChart,
  deleteChartCloud,
  updateChart,
  bulkSaveChartsCloud,
  SavedChart,
} from "@/lib/chartStorage";
import { calculateSpc } from "@/lib/spc";
import FileUpload, { WorkbookData } from "@/components/FileUpload";
import ColumnMapper, { MappedDataset } from "@/components/ColumnMapper";
import { ParsedSheet } from "@/components/FileUpload";

const SpcChart = dynamic(() => import("@/components/SpcChart"), { ssr: false });
const EwmaChart = dynamic(() => import("@/components/EwmaChart"), { ssr: false });
const RunChartComponent = dynamic(() => import("@/components/RunChart"), { ssr: false });
const MovingAverageChart = dynamic(() => import("@/components/MovingAverageChart"), { ssr: false });

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type AppendStep = "upload" | "map";
type SyncStatus = "idle" | "syncing" | "synced" | "error" | "migrating";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

export default function LibraryPage() {
  const [charts, setCharts] = useState<SavedChart[]>([]);
  const [selected, setSelected] = useState<SavedChart | null>(null);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [migrationCount, setMigrationCount] = useState(0);

  // Append Data flow
  const [appendTarget, setAppendTarget] = useState<SavedChart | null>(null);
  const [appendStep, setAppendStep] = useState<AppendStep>("upload");
  const [appendWorkbook, setAppendWorkbook] = useState<WorkbookData | null>(null);
  const [appendSheet, setAppendSheet] = useState<ParsedSheet | null>(null);
  const [selectedSheetName, setSelectedSheetName] = useState<string>("");

  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [toastCounter, setToastCounter] = useState(0);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = toastCounter + 1;
    setToastCounter(id);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, [toastCounter]);

  useEffect(() => {
    // Load local charts immediately
    const localCharts = getSavedCharts();
    setCharts(localCharts);
    setMounted(true);

    // Then sync with cloud
    async function syncCloud() {
      setSyncStatus("syncing");
      try {
        const cloudCharts = await getSavedChartsCloud();

        if (cloudCharts.length === 0 && localCharts.length === 0) {
          setSyncStatus("synced");
          return;
        }

        // Build a map of cloud charts by id
        const cloudMap = new Map(cloudCharts.map((c) => [c.id, c]));
        const localMap = new Map(localCharts.map((c) => [c.id, c]));

        // Find local-only charts (not in cloud) — these need migration
        const localOnly = localCharts.filter((c) => !cloudMap.has(c.id));

        if (localOnly.length > 0) {
          setSyncStatus("migrating");
          setMigrationCount(localOnly.length);
          await bulkSaveChartsCloud(localOnly);
          setMigrationCount(0);
        }

        // Merge: cloud is source of truth for shared ids, local-only included
        const merged = new Map<string, SavedChart>();

        // Start with local
        for (const chart of localCharts) {
          merged.set(chart.id, chart);
        }

        // Cloud overrides (source of truth)
        for (const chart of cloudCharts) {
          merged.set(chart.id, chart);
        }

        // Sort by savedAt descending
        const mergedCharts = Array.from(merged.values()).sort(
          (a, b) => b.savedAt - a.savedAt
        );

        setCharts(mergedCharts);

        // Update localStorage with merged cloud data
        const { default: ls } = await import("@/lib/chartStorage").then(
          async (m) => ({ default: m })
        );
        if (typeof window !== "undefined") {
          localStorage.setItem("contrl_charts", JSON.stringify(mergedCharts));
        }

        // Add any cloud-only charts to the local map notification
        const cloudOnlyCount = cloudCharts.filter((c) => !localMap.has(c.id)).length;
        if (cloudOnlyCount > 0) {
          // Charts synced from cloud
        }

        setSyncStatus("synced");
      } catch {
        setSyncStatus("error");
      }
    }

    syncCloud();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteChart(id);
    setCharts(getSavedCharts());
    if (selected?.id === id) setSelected(null);
  };

  const filtered = charts.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.measure.name.toLowerCase().includes(search.toLowerCase())
  );

  // Open the append modal for a given chart
  const openAppend = (chart: SavedChart, e: React.MouseEvent) => {
    e.stopPropagation();
    setAppendTarget(chart);
    setAppendStep("upload");
    setAppendWorkbook(null);
    setAppendSheet(null);
    setSelectedSheetName("");
  };

  const closeAppend = () => {
    setAppendTarget(null);
    setAppendWorkbook(null);
    setAppendSheet(null);
    setSelectedSheetName("");
  };

  const handleWorkbookParsed = (data: WorkbookData) => {
    setAppendWorkbook(data);
    const firstName = data.sheetNames[0];
    setSelectedSheetName(firstName);
    setAppendSheet(data.sheets[firstName]);
    setAppendStep("map");
  };

  const handleSheetSelect = (name: string) => {
    setSelectedSheetName(name);
    if (appendWorkbook) {
      setAppendSheet(appendWorkbook.sheets[name]);
    }
  };

  const handleAppendConfirm = (dataset: MappedDataset) => {
    if (!appendTarget) return;

    // Take first measure from the new dataset
    const newMeasure = dataset.measures[0];
    if (!newMeasure) {
      showToast("No valid measure columns found in the new file.", "error");
      return;
    }

    const existingValues = appendTarget.measure.values;
    const existingDates = appendTarget.measure.dates;
    const joinIndex = existingValues.length; // index where new data begins

    const mergedDates = [...existingDates, ...dataset.dates];
    const mergedValues = [...existingValues, ...newMeasure.data];

    // Add split marker at the join point
    const existingSplits = appendTarget.splitIndices ?? [];
    const mergedSplits = [...existingSplits];
    if (!mergedSplits.includes(joinIndex)) {
      mergedSplits.push(joinIndex);
      mergedSplits.sort((a, b) => a - b);
    }

    const updatedChart = updateChart(appendTarget.id, {
      measure: {
        ...appendTarget.measure,
        dates: mergedDates,
        values: mergedValues,
      },
      splitIndices: mergedSplits,
      savedAt: Date.now(),
    });

    if (!updatedChart) {
      showToast("Failed to update chart. Please try again.", "error");
      return;
    }

    // Refresh state
    setCharts(getSavedCharts());
    // Update selected view if it's the same chart
    if (selected?.id === appendTarget.id) {
      setSelected(updatedChart);
    }

    closeAppend();
    showToast(
      `Appended ${newMeasure.data.length} data points to "${appendTarget.title}". Split marker added at point ${joinIndex + 1}.`,
      "success"
    );
  };

  // Sync status indicator
  const SyncIndicator = () => {
    if (!mounted) return null;
    if (syncStatus === "syncing") {
      return (
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Syncing…
        </div>
      );
    }
    if (syncStatus === "migrating") {
      return (
        <div className="flex items-center gap-1.5 text-[11px] text-amber-500">
          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Migrating {migrationCount} chart{migrationCount !== 1 ? "s" : ""} to cloud…
        </div>
      );
    }
    if (syncStatus === "synced") {
      return (
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-600">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Synced
        </div>
      );
    }
    if (syncStatus === "error") {
      return (
        <div className="flex items-center gap-1.5 text-[11px] text-gray-600" title="Cloud sync unavailable — local only">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
            <path d="M17.5 19H9a7 7 0 01-7-7 7 7 0 017-7c.294 0 .585.018.87.053A5 5 0 0121 10a5 5 0 01-3.5 9z"/>
            <line x1="12" y1="13" x2="12" y2="17"/>
            <line x1="12" y1="9" x2="12.01" y2="9"/>
          </svg>
          Local only
        </div>
      );
    }
    return null;
  };

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-xl border text-sm font-medium shadow-xl pointer-events-auto transition-all duration-300
              ${toast.type === "success"
                ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-300"
                : "bg-red-950/90 border-red-500/30 text-red-300"
              }`}
          >
            {toast.type === "success" ? "✓ " : "✕ "}{toast.message}
          </div>
        ))}
      </div>

      {/* Append Data Modal */}
      {appendTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeAppend}
          />
          <div className="relative z-10 w-full max-w-2xl bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <div>
                <h2 className="text-base font-semibold text-white">Append Data</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Adding to: <span className="text-gray-300">{appendTarget.title}</span>
                  {" · "}{appendTarget.measure.values.length} existing points
                </p>
              </div>
              <button
                onClick={closeAppend}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {appendStep === "upload" && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-400">
                    Upload a new Excel or CSV file. The new data will be appended after the existing {appendTarget.measure.values.length} data points, with a split marker automatically added at the join point.
                  </p>
                  <FileUpload onWorkbookParsed={handleWorkbookParsed} />
                </div>
              )}

              {appendStep === "map" && appendWorkbook && appendSheet && (
                <div className="space-y-4">
                  {/* Sheet selector */}
                  {appendWorkbook.sheetNames.length > 1 && (
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Sheet</label>
                      <select
                        value={selectedSheetName}
                        onChange={(e) => handleSheetSelect(e.target.value)}
                        className="w-full bg-[#141414] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                      >
                        {appendWorkbook.sheetNames.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <ColumnMapper
                    sheet={appendSheet}
                    onConfirm={handleAppendConfirm}
                  />
                  <button
                    onClick={() => setAppendStep("upload")}
                    className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
                  >
                    ← Upload different file
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full-view modal for selected chart */}
      {selected && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-white">{selected.title}</h2>
              <p className="text-xs text-gray-500 mt-1">
                Saved {formatDate(selected.savedAt)} · {selected.measure.values.length} data points
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => openAppend(selected, e)}
                className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 hover:border-indigo-500/60 px-3 py-1.5 rounded-lg transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Append Data
              </button>
              <button
                onClick={() => setSelected(null)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Close
              </button>
            </div>
          </div>
          <div className="bg-white/[0.02] border border-white/8 rounded-2xl p-6">
            {(!selected.chartType || selected.chartType === "xmr" || selected.chartType === "cusum") && (
              <SpcChart
                values={selected.measure.values}
                dates={selected.measure.dates}
                title={selected.title}
                unit={selected.measure.unit}
                splitIndices={selected.splitIndices}
                annotations={selected.annotations}
                initialMethod={selected.method ?? "mean"}
                initialSplitModes={selected.splitModes ?? {}}
                initialFrozenLimits={selected.frozenLimits ?? false}
                initialTargetLines={selected.targetLines ?? []}
                omittedIndices={selected.omittedIndices ?? []}
                initialShowTrendLine={selected.showTrendLine ?? false}
                initialXAxisLabel={selected.xAxisLabel}
                initialYAxisLabel={selected.yAxisLabel}
                initialCustomColors={selected.customColors}
                initialLsl={selected.lsl}
                initialUsl={selected.usl}
                readOnly
              />
            )}
            {selected.chartType === "ewma" && (
              <EwmaChart
                values={selected.measure.values}
                dates={selected.measure.dates}
                title={selected.title}
                unit={selected.measure.unit}
                readOnly
              />
            )}
            {selected.chartType === "run" && (
              <RunChartComponent
                values={selected.measure.values}
                dates={selected.measure.dates}
                title={selected.title}
                unit={selected.measure.unit}
                readOnly
              />
            )}
            {selected.chartType === "moving-avg" && (
              <MovingAverageChart
                values={selected.measure.values}
                dates={selected.measure.dates}
                title={selected.title}
                unit={selected.measure.unit}
                readOnly
              />
            )}
            {(selected.chartType === "xbar-r" || selected.chartType === "xbar-s") && (
              <div className="text-sm text-gray-400 p-8 text-center">
                Subgroup chart view — saved for reference. Re-upload data from New Chart to interact.
              </div>
            )}
          </div>
          <div className="my-8 border-t border-white/5" />
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Saved Charts
              {mounted && charts.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({charts.length})
                </span>
              )}
            </h1>
            <SyncIndicator />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Browse and revisit your saved SPC charts
          </p>
        </div>

        {/* Search bar */}
        {mounted && charts.length > 0 && (
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search charts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 w-56"
            />
          </div>
        )}
      </div>

      {/* Empty state */}
      {mounted && charts.length === 0 && syncStatus !== "syncing" && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/3 border border-white/8 flex items-center justify-center mb-4 text-3xl">
            📚
          </div>
          <h3 className="text-base font-semibold text-gray-300 mb-2">No saved charts yet</h3>
          <p className="text-sm text-gray-600 max-w-xs">
            Save a chart from the chart view using the{" "}
            <span className="text-gray-400 font-medium">Save Chart</span> button.
          </p>
        </div>
      )}

      {/* No results */}
      {mounted && charts.length > 0 && filtered.length === 0 && (
        <div className="py-12 text-center text-gray-600 text-sm">
          No charts matching &ldquo;{search}&rdquo;
        </div>
      )}

      {/* Loading skeleton */}
      {(!mounted || syncStatus === "syncing") && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-xl bg-white/[0.02] border border-white/5 animate-pulse" />
          ))}
        </div>
      )}

      {/* Chart cards */}
      {mounted && syncStatus !== "syncing" && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((chart) => {
            const spc = calculateSpc(chart.measure.values, chart.measure.dates, chart.splitIndices);
            const firstSeg = spc.segments[0];
            const isSelected = selected?.id === chart.id;

            return (
              <div
                key={chart.id}
                onClick={() => setSelected(isSelected ? null : chart)}
                className={`relative group cursor-pointer rounded-xl border p-5 transition-all duration-150
                  ${isSelected
                    ? "border-indigo-500/60 bg-indigo-950/20 shadow-[0_0_0_1px_rgba(99,102,241,0.15)]"
                    : "border-white/8 bg-white/[0.025] hover:border-indigo-500/30 hover:bg-white/[0.04]"
                  }
                `}
              >
                {/* Card action buttons */}
                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => openAppend(chart, e)}
                    title="Append data"
                    className="w-6 h-6 flex items-center justify-center rounded-md text-gray-500 hover:text-indigo-400 hover:bg-indigo-950/30 border border-transparent hover:border-indigo-500/20 transition-colors"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => handleDelete(chart.id, e)}
                    title="Delete chart"
                    className="w-6 h-6 flex items-center justify-center rounded-md text-gray-500 hover:text-red-400 hover:bg-red-950/30 border border-transparent hover:border-red-500/20 transition-colors"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                <h3 className="text-sm font-semibold text-white pr-16 mb-1 truncate">
                  {chart.title}
                </h3>
                <p className="text-[11px] text-gray-600 mb-4">
                  {formatDate(chart.savedAt)}
                </p>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                  <div>
                    <div className="text-[10px] text-gray-600 mb-0.5">Data Points</div>
                    <div className="text-sm font-semibold text-gray-300">
                      {chart.measure.values.length}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-600 mb-0.5">Segments</div>
                    <div className="text-sm font-semibold text-gray-300">
                      {spc.segments.length}
                    </div>
                  </div>
                  {firstSeg && (
                    <>
                      <div>
                        <div className="text-[10px] text-gray-600 mb-0.5">UCL</div>
                        <div className="text-sm font-semibold text-red-400">
                          {firstSeg.ucl.toFixed(2)}
                          {chart.measure.unit ? ` ${chart.measure.unit}` : ""}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-600 mb-0.5">LCL</div>
                        <div className="text-sm font-semibold text-red-400">
                          {firstSeg.lcl.toFixed(2)}
                          {chart.measure.unit ? ` ${chart.measure.unit}` : ""}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {chart.annotations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <span className="text-[11px] text-amber-400/80">
                      {chart.annotations.length} note{chart.annotations.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}

                <div className={`mt-3 text-[11px] transition-colors ${isSelected ? "text-indigo-400" : "text-gray-700 group-hover:text-gray-500"}`}>
                  {isSelected ? "↑ Viewing above" : "Click to view →"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

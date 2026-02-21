"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  calculateXbarR,
  calculateXbarS,
  type XbarRResult,
  type XbarSResult,
  type SubgroupPoint,
} from "@/lib/subgroupSpc";
import { saveChart } from "@/lib/chartStorage";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface SubgroupChartProps {
  subgroups: number[][];
  labels: string[];
  title?: string;
  unit?: string;
  chartType: "xbar-r" | "xbar-s";
  readOnly?: boolean;
}

export default function SubgroupChart({
  subgroups,
  labels,
  title = "Subgroup Chart",
  unit = "",
  chartType,
  readOnly = false,
}: SubgroupChartProps) {
  const [savedFlash, setSavedFlash] = useState(false);

  const xbarR: XbarRResult | null = useMemo(
    () => (chartType === "xbar-r" ? calculateXbarR(subgroups, labels) : null),
    [subgroups, labels, chartType]
  );

  const xbarS: XbarSResult | null = useMemo(
    () => (chartType === "xbar-s" ? calculateXbarS(subgroups, labels) : null),
    [subgroups, labels, chartType]
  );

  const points: SubgroupPoint[] = xbarR?.points ?? xbarS?.points ?? [];
  const grandMean = xbarR?.grandMean ?? xbarS?.grandMean ?? 0;
  const xbarUcl = xbarR?.xbarUcl ?? xbarS?.xbarUcl ?? 0;
  const xbarLcl = xbarR?.xbarLcl ?? xbarS?.xbarLcl ?? 0;
  const subgroupSize = xbarR?.subgroupSize ?? xbarS?.subgroupSize ?? 2;

  // Bottom chart values
  const bottomValues = chartType === "xbar-r"
    ? points.map((p) => p.range)
    : points.map((p) => p.stdDev);
  const bottomCenter = chartType === "xbar-r" ? (xbarR?.rBar ?? 0) : (xbarS?.sBar ?? 0);
  const bottomUcl = chartType === "xbar-r" ? (xbarR?.rUcl ?? 0) : (xbarS?.sUcl ?? 0);
  const bottomLcl = chartType === "xbar-r" ? (xbarR?.rLcl ?? 0) : (xbarS?.sLcl ?? 0);
  const bottomSignals = chartType === "xbar-r" ? (xbarR?.rangeSignals ?? []) : (xbarS?.sSignals ?? []);
  const bottomLabel = chartType === "xbar-r" ? "Range (R)" : "Std Dev (S)";
  const bottomCenterLabel = chartType === "xbar-r" ? "R̄" : "S̄";

  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No subgroup data to display
      </div>
    );
  }

  const dateLabels = points.map((p) => p.label);
  const means = points.map((p) => p.mean);

  // Partition X̄ points by signal
  const normalXbar = points.filter((p) => p.signal === "none");
  const runXbar = points.filter((p) => p.signal === "run");
  const trendXbar = points.filter((p) => p.signal === "trend");

  // Partition bottom chart points by signal
  const normalBottom = points.filter((_, i) => bottomSignals[i] === "none");
  const runBottom = points.filter((_, i) => bottomSignals[i] === "run");
  const trendBottom = points.filter((_, i) => bottomSignals[i] === "trend");

  const commonMarker = { size: 7, line: { width: 1, color: "#1e1e2e" } };

  // Sparse ticks
  const tickStep = Math.max(1, Math.ceil(dateLabels.length / 8));
  const sparseTicks = dateLabels.filter((_, i) => i % tickStep === 0);

  // ── X̄ Chart Traces ──────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const xbarData: any[] = [
    // Connecting line
    {
      type: "scatter", mode: "lines",
      x: dateLabels, y: means,
      name: "", showlegend: false,
      line: { color: "#6366f1", width: 2 },
      hoverinfo: "skip",
    },
    // Mean line
    {
      type: "scatter", mode: "lines",
      name: "X̿ (Grand Mean)",
      x: dateLabels,
      y: Array(dateLabels.length).fill(grandMean),
      line: { color: "#22d3ee", width: 2, dash: "dash" },
      hovertemplate: `X̿: ${grandMean.toFixed(3)}<extra></extra>`,
    },
    // UCL
    {
      type: "scatter", mode: "lines",
      name: "UCL",
      x: dateLabels,
      y: Array(dateLabels.length).fill(xbarUcl),
      line: { color: "#ef4444", width: 1.5, dash: "dash" },
      hovertemplate: `UCL: ${xbarUcl.toFixed(3)}<extra></extra>`,
    },
    // LCL
    {
      type: "scatter", mode: "lines",
      name: "LCL",
      x: dateLabels,
      y: Array(dateLabels.length).fill(xbarLcl),
      line: { color: "#ef4444", width: 1.5, dash: "dash" },
      hovertemplate: `LCL: ${xbarLcl.toFixed(3)}<extra></extra>`,
    },
    // Normal points
    {
      type: "scatter", mode: "markers",
      name: "Subgroup Mean",
      x: normalXbar.map((p) => p.label),
      y: normalXbar.map((p) => p.mean),
      marker: { ...commonMarker, color: "#6366f1" },
      hovertemplate: `<b>%{x}</b><br>X̄: %{y:.3f} ${unit}<br>n=${subgroupSize}<extra></extra>`,
    },
    // Run signal points
    {
      type: "scatter", mode: "markers",
      name: "Run Signal",
      x: runXbar.map((p) => p.label),
      y: runXbar.map((p) => p.mean),
      marker: { ...commonMarker, color: "#ef4444", size: 10 },
      hovertemplate: `<b>%{x}</b><br>X̄: %{y:.3f} ${unit}<br><span style="color:#ef4444">⚠ Run signal</span><extra></extra>`,
    },
    // Trend signal points
    {
      type: "scatter", mode: "markers",
      name: "Trend Signal",
      x: trendXbar.map((p) => p.label),
      y: trendXbar.map((p) => p.mean),
      marker: { ...commonMarker, color: "#f97316", size: 10 },
      hovertemplate: `<b>%{x}</b><br>X̄: %{y:.3f} ${unit}<br><span style="color:#f97316">⚠ Trend signal</span><extra></extra>`,
    },
  ];

  const xbarLayout: Partial<Plotly.Layout> = {
    paper_bgcolor: "#0a0a0a",
    plot_bgcolor: "#0a0a0a",
    font: { color: "#9ca3af", family: "Inter, sans-serif" },
    xaxis: {
      type: "category" as const,
      tickvals: sparseTicks,
      ticktext: sparseTicks,
      gridcolor: "#1f2028",
      linecolor: "#333340",
      tickfont: { color: "#6b7280", size: 10 },
      tickangle: 0,
      automargin: true,
      showticklabels: false,
    },
    yaxis: {
      gridcolor: "#1f2028",
      linecolor: "#2d2d2d",
      tickfont: { color: "#6b7280", size: 11 },
      title: { text: `X̄ ${unit ? `(${unit})` : ""}`, font: { color: "#6b7280", size: 12 } },
      zeroline: false,
    },
    legend: {
      font: { color: "#9ca3af", size: 11 },
      bgcolor: "rgba(15,15,20,0.75)",
      bordercolor: "rgba(255,255,255,0.06)",
      borderwidth: 1,
      orientation: "h" as const,
      x: 0, xanchor: "left" as const,
      y: -0.15, yanchor: "top" as const,
    },
    margin: { l: 55, r: 20, t: 20, b: 50 },
    hoverlabel: {
      bgcolor: "#1e1e2e",
      bordercolor: "#22d3ee",
      font: { color: "#fff", size: 13 },
    },
    hovermode: "closest" as const,
  };

  // ── Bottom Chart Traces (R or S) ────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bottomData: any[] = [
    // Connecting line
    {
      type: "scatter", mode: "lines",
      x: dateLabels, y: bottomValues,
      name: "", showlegend: false,
      line: { color: "#a855f7", width: 2 },
      hoverinfo: "skip",
    },
    // Center line
    {
      type: "scatter", mode: "lines",
      name: `${bottomCenterLabel}`,
      x: dateLabels,
      y: Array(dateLabels.length).fill(bottomCenter),
      line: { color: "#22d3ee", width: 2, dash: "dash" },
      hovertemplate: `${bottomCenterLabel}: ${bottomCenter.toFixed(3)}<extra></extra>`,
    },
    // UCL
    {
      type: "scatter", mode: "lines",
      name: `${bottomLabel} UCL`,
      x: dateLabels,
      y: Array(dateLabels.length).fill(bottomUcl),
      line: { color: "#ef4444", width: 1.5, dash: "dash" },
      hovertemplate: `UCL: ${bottomUcl.toFixed(3)}<extra></extra>`,
    },
    // LCL
    {
      type: "scatter", mode: "lines",
      name: `${bottomLabel} LCL`,
      x: dateLabels,
      y: Array(dateLabels.length).fill(bottomLcl),
      line: { color: "#ef4444", width: 1.5, dash: "dash" },
      hovertemplate: `LCL: ${bottomLcl.toFixed(3)}<extra></extra>`,
    },
    // Normal points
    {
      type: "scatter", mode: "markers",
      name: bottomLabel,
      x: normalBottom.map((p) => p.label),
      y: normalBottom.map((p) => chartType === "xbar-r" ? p.range : p.stdDev),
      marker: { ...commonMarker, color: "#a855f7" },
      hovertemplate: `<b>%{x}</b><br>${bottomLabel}: %{y:.3f}<extra></extra>`,
    },
    // Run signal points
    {
      type: "scatter", mode: "markers",
      name: `${bottomLabel} Run`,
      x: runBottom.map((p) => p.label),
      y: runBottom.map((p) => chartType === "xbar-r" ? p.range : p.stdDev),
      marker: { ...commonMarker, color: "#ef4444", size: 10 },
      hovertemplate: `<b>%{x}</b><br>${bottomLabel}: %{y:.3f}<br><span style="color:#ef4444">⚠ Run</span><extra></extra>`,
    },
    // Trend signal points
    {
      type: "scatter", mode: "markers",
      name: `${bottomLabel} Trend`,
      x: trendBottom.map((p) => p.label),
      y: trendBottom.map((p) => chartType === "xbar-r" ? p.range : p.stdDev),
      marker: { ...commonMarker, color: "#f97316", size: 10 },
      hovertemplate: `<b>%{x}</b><br>${bottomLabel}: %{y:.3f}<br><span style="color:#f97316">⚠ Trend</span><extra></extra>`,
    },
  ];

  const bottomLayout: Partial<Plotly.Layout> = {
    paper_bgcolor: "#0a0a0a",
    plot_bgcolor: "#0a0a0a",
    font: { color: "#9ca3af", family: "Inter, sans-serif" },
    xaxis: {
      type: "category" as const,
      tickvals: sparseTicks,
      ticktext: sparseTicks,
      gridcolor: "#1f2028",
      linecolor: "#333340",
      tickfont: { color: "#6b7280", size: 10 },
      tickangle: 0,
      automargin: true,
      title: { text: "Subgroup", font: { color: "#6b7280", size: 12 } },
    },
    yaxis: {
      gridcolor: "#1f2028",
      linecolor: "#2d2d2d",
      tickfont: { color: "#6b7280", size: 11 },
      title: { text: bottomLabel, font: { color: "#6b7280", size: 12 } },
      zeroline: false,
      rangemode: "tozero" as const,
    },
    legend: {
      font: { color: "#9ca3af", size: 10 },
      bgcolor: "rgba(15,15,20,0.75)",
      bordercolor: "rgba(255,255,255,0.06)",
      borderwidth: 1,
      orientation: "h" as const,
      x: 0, xanchor: "left" as const,
      y: -0.25, yanchor: "top" as const,
    },
    margin: { l: 55, r: 20, t: 4, b: 70 },
    hoverlabel: {
      bgcolor: "#1e1e2e",
      bordercolor: "#22d3ee",
      font: { color: "#fff", size: 12 },
    },
    hovermode: "closest" as const,
  };

  const config: Partial<Plotly.Config> = {
    displayModeBar: true,
    modeBarButtonsToRemove: ["lasso2d", "select2d", "autoScale2d"],
    displaylogo: false,
    responsive: true,
    toImageButtonOptions: { filename: title.replace(/\s+/g, "_") },
  };

  const handleSave = () => {
    // Flatten subgroup data for storage
    const allValues = subgroups.flat();
    saveChart({
      title,
      chartType: chartType === "xbar-r" ? "xbar-r" : "xbar-s",
      measure: {
        name: title,
        unit,
        dates: labels,
        values: allValues,
      },
      splitIndices: [],
      annotations: [],
    });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const chartTypeLabel = chartType === "xbar-r" ? "X̄-R" : "X̄-S";

  // Count signals
  const meanSignalCount = points.filter((p) => p.signal !== "none").length;
  const bottomSignalCount = bottomSignals.filter((s) => s !== "none").length;

  return (
    <div className="w-full space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {chartTypeLabel} Chart · n = {subgroupSize} · {points.length} subgroups
          </p>
        </div>
        {!readOnly && (
          <button
            onClick={handleSave}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all duration-200
              ${savedFlash
                ? "bg-green-700/50 border-green-500/60 text-green-300"
                : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/8 hover:text-gray-200 hover:border-white/20"
              }`}
          >
            {savedFlash ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Saved!
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                Save
              </>
            )}
          </button>
        )}
      </div>

      {/* Signal legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
          Normal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
          Run signal (8+ same side)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
          Trend signal (6+ consecutive)
        </span>
      </div>

      {/* X̄ Chart */}
      <div className="w-full rounded-xl overflow-hidden border border-white/5">
        <div className="flex items-center gap-2 px-4 pt-3 pb-0">
          <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">
            X̄ Chart (Subgroup Means)
          </span>
          <span className="text-[10px] text-gray-600">
            X̿ = {grandMean.toFixed(3)} · UCL = {xbarUcl.toFixed(3)} · LCL = {xbarLcl.toFixed(3)}
          </span>
        </div>
        <Plot
          data={xbarData}
          layout={xbarLayout}
          config={config}
          style={{ width: "100%", minHeight: "320px" }}
          useResizeHandler
        />
      </div>

      {/* R or S Chart */}
      <div className="w-full rounded-xl overflow-hidden border border-white/5">
        <div className="flex items-center gap-2 px-4 pt-3 pb-0">
          <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">
            {bottomLabel} Chart
          </span>
          <span className="text-[10px] text-gray-600">
            {bottomCenterLabel} = {bottomCenter.toFixed(3)} · UCL = {bottomUcl.toFixed(3)} · LCL = {bottomLcl.toFixed(3)}
          </span>
        </div>
        <Plot
          data={bottomData}
          layout={bottomLayout}
          config={{
            ...config,
            toImageButtonOptions: { filename: `${title.replace(/\s+/g, "_")}_${chartType === "xbar-r" ? "R" : "S"}` },
          }}
          style={{ width: "100%", minHeight: "240px" }}
          useResizeHandler
        />
      </div>

      {/* Statistics Panel */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="bg-white/[0.03] border border-white/8 rounded-xl p-4 space-y-3">
          <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
            X̄ Chart Statistics
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <div className="text-[10px] text-gray-600 mb-0.5">X̿ (Grand Mean)</div>
              <div className="text-sm font-semibold text-indigo-400">{grandMean.toFixed(3)}{unit ? ` ${unit}` : ""}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-600 mb-0.5">Subgroup Size</div>
              <div className="text-sm font-semibold text-gray-300">n = {subgroupSize}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-600 mb-0.5">UCL</div>
              <div className="text-sm font-semibold text-red-400">{xbarUcl.toFixed(3)}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-600 mb-0.5">LCL</div>
              <div className="text-sm font-semibold text-red-400">{xbarLcl.toFixed(3)}</div>
            </div>
          </div>
          <div className="pt-2 border-t border-white/5">
            {meanSignalCount === 0 ? (
              <span className="text-[11px] text-green-400/70">✓ No signals detected</span>
            ) : (
              <span className="text-[11px] text-red-400">
                ⚠ {meanSignalCount} signal{meanSignalCount > 1 ? "s" : ""} detected
              </span>
            )}
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/8 rounded-xl p-4 space-y-3">
          <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
            {bottomLabel} Chart Statistics
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <div className="text-[10px] text-gray-600 mb-0.5">{bottomCenterLabel}</div>
              <div className="text-sm font-semibold text-purple-400">{bottomCenter.toFixed(3)}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-600 mb-0.5">Subgroups</div>
              <div className="text-sm font-semibold text-gray-300">{points.length}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-600 mb-0.5">UCL</div>
              <div className="text-sm font-semibold text-red-400">{bottomUcl.toFixed(3)}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-600 mb-0.5">LCL</div>
              <div className="text-sm font-semibold text-red-400">{bottomLcl.toFixed(3)}</div>
            </div>
          </div>
          <div className="pt-2 border-t border-white/5">
            {bottomSignalCount === 0 ? (
              <span className="text-[11px] text-green-400/70">✓ No signals detected</span>
            ) : (
              <span className="text-[11px] text-red-400">
                ⚠ {bottomSignalCount} signal{bottomSignalCount > 1 ? "s" : ""} detected
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

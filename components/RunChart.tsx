"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { calculateRunChart } from "@/lib/subgroupSpc";
import { saveChart } from "@/lib/chartStorage";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface RunChartProps {
  values: number[];
  dates: string[];
  title?: string;
  unit?: string;
  readOnly?: boolean;
}

export default function RunChart({
  values,
  dates,
  title = "Run Chart",
  unit = "",
  readOnly = false,
}: RunChartProps) {
  const [savedFlash, setSavedFlash] = useState(false);

  const result = useMemo(
    () => calculateRunChart(values, dates),
    [values, dates]
  );

  if (values.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No data to display
      </div>
    );
  }

  const { points, median, longestRun, expectedRuns, actualRuns } = result;
  const dateLabels = points.map((p) => p.label);

  // Partition by signal
  const normalPoints = points.filter((p) => p.signal === "none");
  const signalPoints = points.filter((p) => p.signal === "run");

  const commonMarker = { size: 7, line: { width: 1, color: "#1e1e2e" } };

  // Sparse ticks
  const tickStep = Math.max(1, Math.ceil(dateLabels.length / 8));
  const sparseTicks = dateLabels.filter((_, i) => i % tickStep === 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any[] = [
    // Connecting line
    {
      type: "scatter", mode: "lines",
      x: dateLabels, y: values,
      name: "", showlegend: false,
      line: { color: "#6366f1", width: 2 },
      hoverinfo: "skip",
    },
    // Median line
    {
      type: "scatter", mode: "lines",
      name: "Median",
      x: dateLabels,
      y: Array(dateLabels.length).fill(median),
      line: { color: "#22d3ee", width: 2, dash: "dash" },
      hovertemplate: `Median: ${median.toFixed(3)}<extra></extra>`,
    },
    // Normal points
    {
      type: "scatter", mode: "markers",
      name: "Data",
      x: normalPoints.map((p) => p.label),
      y: normalPoints.map((p) => p.value),
      marker: { ...commonMarker, color: "#6366f1" },
      hovertemplate: `<b>%{x}</b><br>Value: %{y:.3f} ${unit}<extra></extra>`,
    },
    // Signal points (long runs)
    {
      type: "scatter", mode: "markers",
      name: "Long Run",
      x: signalPoints.map((p) => p.label),
      y: signalPoints.map((p) => p.value),
      marker: { ...commonMarker, color: "#ef4444", size: 10 },
      hovertemplate: `<b>%{x}</b><br>Value: %{y:.3f} ${unit}<br><span style="color:#ef4444">⚠ Long run</span><extra></extra>`,
    },
  ];

  const layout: Partial<Plotly.Layout> = {
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
      title: { text: "Period", font: { color: "#6b7280", size: 12 } },
    },
    yaxis: {
      gridcolor: "#1f2028",
      linecolor: "#2d2d2d",
      tickfont: { color: "#6b7280", size: 11 },
      title: { text: unit || "Value", font: { color: "#6b7280", size: 12 } },
      zeroline: false,
    },
    legend: {
      font: { color: "#9ca3af", size: 11 },
      bgcolor: "rgba(15,15,20,0.75)",
      bordercolor: "rgba(255,255,255,0.06)",
      borderwidth: 1,
      orientation: "h" as const,
      x: 0, xanchor: "left" as const,
      y: -0.22, yanchor: "top" as const,
    },
    margin: { l: 55, r: 20, t: 20, b: 90 },
    hoverlabel: {
      bgcolor: "#1e1e2e",
      bordercolor: "#22d3ee",
      font: { color: "#fff", size: 13 },
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
    saveChart({
      title,
      chartType: "run",
      measure: { name: title, unit, dates, values },
      splitIndices: [],
      annotations: [],
    });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  return (
    <div className="w-full space-y-4">
      {/* Title & Save */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Run Chart · {points.length} data points · Median = {median.toFixed(3)}
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
            {savedFlash ? "✓ Saved!" : "Save"}
          </button>
        )}
      </div>

      {/* Chart */}
      <div className="w-full rounded-xl overflow-hidden border border-white/5">
        <Plot
          data={data}
          layout={layout}
          config={config}
          style={{ width: "100%", minHeight: "420px" }}
          useResizeHandler
        />
      </div>

      {/* Statistics */}
      <div className="bg-white/[0.03] border border-white/8 rounded-xl p-4">
        <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-3">
          Run Analysis
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
          <div>
            <div className="text-[10px] text-gray-600 mb-0.5">Median</div>
            <div className="text-sm font-semibold text-indigo-400">{median.toFixed(3)}{unit ? ` ${unit}` : ""}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-600 mb-0.5">Longest Run</div>
            <div className={`text-sm font-semibold ${longestRun >= 7 ? "text-red-400" : "text-gray-300"}`}>
              {longestRun}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-gray-600 mb-0.5">Actual Runs</div>
            <div className="text-sm font-semibold text-gray-300">{actualRuns}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-600 mb-0.5">Expected Runs</div>
            <div className="text-sm font-semibold text-gray-300">{expectedRuns.toFixed(1)}</div>
          </div>
        </div>
        <div className="mt-3 pt-2 border-t border-white/5">
          {signalPoints.length === 0 ? (
            <span className="text-[11px] text-green-400/70">✓ No unusual runs detected</span>
          ) : (
            <span className="text-[11px] text-red-400">
              ⚠ {signalPoints.length} point{signalPoints.length > 1 ? "s" : ""} in unusually long runs (≥7)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

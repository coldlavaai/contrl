"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { calculateMovingAverage } from "@/lib/subgroupSpc";
import { saveChart } from "@/lib/chartStorage";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface MovingAverageChartProps {
  values: number[];
  dates: string[];
  title?: string;
  unit?: string;
  readOnly?: boolean;
  initialWindowSize?: number;
}

export default function MovingAverageChart({
  values,
  dates,
  title = "Moving Average Chart",
  unit = "",
  readOnly = false,
  initialWindowSize = 5,
}: MovingAverageChartProps) {
  const [windowSize, setWindowSize] = useState(initialWindowSize);
  const [savedFlash, setSavedFlash] = useState(false);

  const result = useMemo(
    () => calculateMovingAverage(values, dates, windowSize),
    [values, dates, windowSize]
  );

  if (values.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No data to display
      </div>
    );
  }

  const { points, mean: xBar } = result;
  const dateLabels = points.map((p) => p.label);
  const maPoints = points.filter((p) => p.movingAvg !== null);

  // Partition MA points by signal
  const normalMa = maPoints.filter((p) => p.signal === "none");
  const runMa = maPoints.filter((p) => p.signal === "run");
  const trendMa = maPoints.filter((p) => p.signal === "trend");

  const commonMarker = { size: 6, line: { width: 1, color: "#1e1e2e" } };

  // Sparse ticks
  const tickStep = Math.max(1, Math.ceil(dateLabels.length / 8));
  const sparseTicks = dateLabels.filter((_, i) => i % tickStep === 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any[] = [
    // Raw data as faint line
    {
      type: "scatter", mode: "lines+markers",
      name: "Individual Values",
      x: dateLabels, y: values,
      line: { color: "rgba(99,102,241,0.25)", width: 1 },
      marker: { size: 4, color: "rgba(99,102,241,0.3)" },
      hovertemplate: `<b>%{x}</b><br>Value: %{y:.3f} ${unit}<extra></extra>`,
    },
    // Moving average line
    {
      type: "scatter", mode: "lines",
      name: `MA(${windowSize})`,
      x: maPoints.map((p) => p.label),
      y: maPoints.map((p) => p.movingAvg),
      line: { color: "#6366f1", width: 2.5 },
      hovertemplate: `<b>%{x}</b><br>MA(${windowSize}): %{y:.3f}<extra></extra>`,
    },
    // UCL
    {
      type: "scatter", mode: "lines",
      name: "UCL",
      x: maPoints.map((p) => p.label),
      y: maPoints.map((p) => p.ucl),
      line: { color: "#ef4444", width: 1.5, dash: "dash" },
      hovertemplate: `UCL: %{y:.3f}<extra></extra>`,
    },
    // LCL
    {
      type: "scatter", mode: "lines",
      name: "LCL",
      x: maPoints.map((p) => p.label),
      y: maPoints.map((p) => p.lcl),
      line: { color: "#ef4444", width: 1.5, dash: "dash" },
      hovertemplate: `LCL: %{y:.3f}<extra></extra>`,
    },
    // Mean line
    {
      type: "scatter", mode: "lines",
      name: "X̄ (Mean)",
      x: dateLabels,
      y: Array(dateLabels.length).fill(xBar),
      line: { color: "#22d3ee", width: 1.5, dash: "dash" },
      hovertemplate: `Mean: ${xBar.toFixed(3)}<extra></extra>`,
    },
    // Normal MA markers
    {
      type: "scatter", mode: "markers",
      name: "Normal",
      x: normalMa.map((p) => p.label),
      y: normalMa.map((p) => p.movingAvg),
      marker: { ...commonMarker, color: "#6366f1" },
      showlegend: false,
      hoverinfo: "skip",
    },
    // Run signals
    {
      type: "scatter", mode: "markers",
      name: "Run Signal",
      x: runMa.map((p) => p.label),
      y: runMa.map((p) => p.movingAvg),
      marker: { ...commonMarker, color: "#ef4444", size: 10 },
      hovertemplate: `<b>%{x}</b><br>MA: %{y:.3f}<br><span style="color:#ef4444">⚠ Run</span><extra></extra>`,
    },
    // Trend signals
    {
      type: "scatter", mode: "markers",
      name: "Trend Signal",
      x: trendMa.map((p) => p.label),
      y: trendMa.map((p) => p.movingAvg),
      marker: { ...commonMarker, color: "#f97316", size: 10 },
      hovertemplate: `<b>%{x}</b><br>MA: %{y:.3f}<br><span style="color:#f97316">⚠ Trend</span><extra></extra>`,
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
      title: { text: `MA(${windowSize}) ${unit ? `(${unit})` : ""}`, font: { color: "#6b7280", size: 12 } },
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
      chartType: "moving-avg",
      measure: { name: title, unit, dates, values },
      splitIndices: [],
      annotations: [],
    });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const maxWindow = Math.max(2, Math.floor(values.length / 2));
  const signalCount = runMa.length + trendMa.length;

  return (
    <div className="w-full space-y-4">
      {/* Title & Save */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Moving Average Chart · Window = {windowSize} · {points.length} points
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

      {/* Window Size Control */}
      {!readOnly && (
        <div className="flex items-center gap-4 p-3 rounded-xl border border-white/8 bg-white/[0.02]">
          <label className="text-xs text-gray-400 font-medium shrink-0">
            Window Size
          </label>
          <input
            type="range"
            min="2"
            max={Math.min(maxWindow, 50)}
            step="1"
            value={windowSize}
            onChange={(e) => setWindowSize(parseInt(e.target.value))}
            className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-500"
          />
          <span className="text-sm font-mono text-indigo-400 w-8 text-right">
            {windowSize}
          </span>
          <div className="flex gap-1">
            {[3, 5, 7, 10, 15].filter((v) => v <= maxWindow).map((v) => (
              <button
                key={v}
                onClick={() => setWindowSize(v)}
                className={`px-2 py-1 rounded text-[10px] font-semibold transition-all ${
                  windowSize === v
                    ? "bg-indigo-600 text-white"
                    : "text-gray-500 hover:text-white hover:bg-white/10"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      )}

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
          Moving Average Statistics
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
          <div>
            <div className="text-[10px] text-gray-600 mb-0.5">X̄ (Mean)</div>
            <div className="text-sm font-semibold text-indigo-400">{xBar.toFixed(3)}{unit ? ` ${unit}` : ""}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-600 mb-0.5">Window Size</div>
            <div className="text-sm font-semibold text-gray-300">{windowSize}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-600 mb-0.5">Data Points</div>
            <div className="text-sm font-semibold text-gray-300">{values.length}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-600 mb-0.5">Signals</div>
            <div className={`text-sm font-semibold ${signalCount === 0 ? "text-green-400" : "text-red-400"}`}>
              {signalCount === 0 ? "✓ None" : `⚠ ${signalCount}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

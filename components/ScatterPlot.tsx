"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface Measure {
  name: string;
  unit: string;
  data: number[];
}

interface ScatterPlotProps {
  measures: Measure[];
  dates: string[];
  onClose: () => void;
}

function calcRegression(xs: number[], ys: number[]) {
  const n = xs.length;
  if (n < 2) return { slope: 0, intercept: 0, r: 0 };

  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;

  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - xMean) * (ys[i] - yMean);
    sxx += (xs[i] - xMean) ** 2;
    syy += (ys[i] - yMean) ** 2;
  }

  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = yMean - slope * xMean;
  const r = sxx === 0 || syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy);

  return { slope, intercept, r };
}

function interpretR(r: number): { label: string; color: string } {
  const abs = Math.abs(r);
  const direction = r > 0 ? "positive" : "negative";
  if (abs >= 0.7) return { label: `Strong ${direction} correlation`, color: r > 0 ? "#22c55e" : "#ef4444" };
  if (abs >= 0.3) return { label: `Moderate ${direction} correlation`, color: r > 0 ? "#86efac" : "#fca5a5" };
  return { label: "No meaningful correlation", color: "#9ca3af" };
}

export default function ScatterPlot({ measures, dates, onClose }: ScatterPlotProps) {
  const [xMeasure, setXMeasure] = useState(measures[0]?.name ?? "");
  const [yMeasure, setYMeasure] = useState(measures[1]?.name ?? measures[0]?.name ?? "");

  const xM = measures.find((m) => m.name === xMeasure);
  const yM = measures.find((m) => m.name === yMeasure);

  const { xs, ys, labels } = useMemo(() => {
    if (!xM || !yM) return { xs: [], ys: [], labels: [] };
    const n = Math.min(xM.data.length, yM.data.length, dates.length);
    return {
      xs: xM.data.slice(0, n),
      ys: yM.data.slice(0, n),
      labels: dates.slice(0, n),
    };
  }, [xM, yM, dates]);

  const { slope, intercept, r } = useMemo(() => calcRegression(xs, ys), [xs, ys]);
  const { label: rLabel, color: rColor } = interpretR(r);

  // Regression line: span min to max of xs
  const { regX, regY } = useMemo(() => {
    if (xs.length < 2) return { regX: [], regY: [] };
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    return {
      regX: [xMin, xMax],
      regY: [slope * xMin + intercept, slope * xMax + intercept],
    };
  }, [xs, slope, intercept]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plotData: any[] = [
    {
      type: "scatter",
      mode: "markers",
      name: "Data points",
      x: xs,
      y: ys,
      text: labels,
      marker: {
        color: "rgba(99, 102, 241, 0.7)",
        size: 8,
        line: { color: "rgba(99, 102, 241, 1)", width: 1 },
      },
      hovertemplate: `<b>%{text}</b><br>${xMeasure}: %{x:.2f}${xM?.unit ? ` ${xM.unit}` : ""}<br>${yMeasure}: %{y:.2f}${yM?.unit ? ` ${yM.unit}` : ""}<extra></extra>`,
    },
    {
      type: "scatter",
      mode: "lines",
      name: "Regression line",
      x: regX,
      y: regY,
      line: { color: "rgba(34, 197, 94, 0.8)", width: 2, dash: "dash" },
      hoverinfo: "skip",
    },
  ];

  const layout: Partial<Plotly.Layout> = {
    paper_bgcolor: "#141414",
    plot_bgcolor: "#141414",
    font: { color: "#9ca3af", family: "Inter, sans-serif" },
    xaxis: {
      title: { text: `${xMeasure}${xM?.unit ? ` (${xM.unit})` : ""}`, font: { color: "#6b7280", size: 12 } },
      gridcolor: "#1f1f1f",
      linecolor: "#2d2d2d",
      tickfont: { color: "#6b7280", size: 11 },
    },
    yaxis: {
      title: { text: `${yMeasure}${yM?.unit ? ` (${yM.unit})` : ""}`, font: { color: "#6b7280", size: 12 } },
      gridcolor: "#1f1f1f",
      linecolor: "#2d2d2d",
      tickfont: { color: "#6b7280", size: 11 },
    },
    legend: {
      font: { color: "#9ca3af", size: 12 },
      bgcolor: "rgba(0,0,0,0)",
      orientation: "h",
      y: -0.2,
    },
    margin: { l: 65, r: 20, t: 20, b: 80 },
    hoverlabel: {
      bgcolor: "#1e1e2e",
      bordercolor: "#6366f1",
      font: { color: "#fff", size: 13 },
    },
    hovermode: "closest",
  };

  const config: Partial<Plotly.Config> = {
    displayModeBar: true,
    modeBarButtonsToRemove: ["lasso2d", "select2d", "autoScale2d"],
    displaylogo: false,
    responsive: true,
    toImageButtonOptions: { filename: `scatter_${xMeasure}_vs_${yMeasure}`.replace(/\s+/g, "_") },
  };

  const selectClass = "bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-400/50 transition-colors";

  return (
    <div className="rounded-2xl border border-indigo-500/25 bg-indigo-950/10 p-5 space-y-4 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-sm font-semibold text-indigo-300 uppercase tracking-wider">
            Compare Measures — Scatter Plot
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            Explore relationships between two measures
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          Close
        </button>
      </div>

      {/* Dropdowns */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">X Axis</label>
          <select
            value={xMeasure}
            onChange={(e) => setXMeasure(e.target.value)}
            className={selectClass}
          >
            {measures.map((m) => (
              <option key={m.name} value={m.name} className="bg-[#1a1a2e]">{m.name}</option>
            ))}
          </select>
        </div>
        <div className="text-gray-600 mt-5">vs</div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">Y Axis</label>
          <select
            value={yMeasure}
            onChange={(e) => setYMeasure(e.target.value)}
            className={selectClass}
          >
            {measures.map((m) => (
              <option key={m.name} value={m.name} className="bg-[#1a1a2e]">{m.name}</option>
            ))}
          </select>
        </div>

        {/* Correlation summary */}
        {xs.length > 1 && (
          <div className="ml-auto flex items-center gap-3 bg-white/3 border border-white/8 rounded-xl px-4 py-2.5">
            <div>
              <div className="text-[10px] text-gray-600 uppercase tracking-wider">Correlation (r)</div>
              <div className="text-xl font-bold" style={{ color: rColor }}>
                {r >= 0 ? "+" : ""}{r.toFixed(3)}
              </div>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div>
              <div className="text-[10px] text-gray-600 uppercase tracking-wider">Interpretation</div>
              <div className="text-sm font-medium" style={{ color: rColor }}>{rLabel}</div>
            </div>
          </div>
        )}
      </div>

      {/* Chart */}
      {xs.length > 0 ? (
        <div className="w-full rounded-xl overflow-hidden border border-white/5">
          <Plot
            data={plotData}
            layout={layout}
            config={config}
            style={{ width: "100%", minHeight: "360px" }}
            useResizeHandler
          />
        </div>
      ) : (
        <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
          Select two different measures to compare
        </div>
      )}

      {/* Regression info */}
      {xs.length > 1 && (
        <div className="text-[11px] text-gray-600 px-1">
          Regression: <span className="text-gray-400 font-mono">
            y = {slope >= 0 ? "+" : ""}{slope.toFixed(3)}x {intercept >= 0 ? "+" : ""}{intercept.toFixed(3)}
          </span>
          {"  ·  "}
          r² = <span className="text-gray-400">{(r * r).toFixed(3)}</span>
          {"  ·  "}
          n = <span className="text-gray-400">{xs.length}</span>
        </div>
      )}
    </div>
  );
}

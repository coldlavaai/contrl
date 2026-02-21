"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { calculateCusum } from "@/lib/cusum";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface CusumChartProps {
  values: number[];
  dates: string[];
  title?: string;
}

export default function CusumChart({ values, dates, title }: CusumChartProps) {
  const defaultMu0 = useMemo(
    () => (values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0),
    [values]
  );

  const [mu0Input, setMu0Input] = useState<string>("");
  const [hInput, setHInput] = useState<string>("");

  const mu0 = mu0Input !== "" ? parseFloat(mu0Input) : undefined;
  const h = hInput !== "" ? parseFloat(hInput) : undefined;

  const result = useMemo(
    () => calculateCusum(values, dates, mu0, undefined, h),
    [values, dates, mu0, h]
  );

  const { points, h: decisionH } = result;

  const dateLabels = points.map((p) => p.date);
  const cusuPosValues = points.map((p) => p.cusuPos);
  const cusuNegValues = points.map((p) => p.cusuNeg);

  // Signal colors
  const posColors = points.map((p) =>
    p.signalPos ? "#ef4444" : "#6366f1"
  );
  const negColors = points.map((p) =>
    p.signalNeg ? "#ef4444" : "#a855f7"
  );

  const hLine = new Array(points.length).fill(decisionH);
  const negHLine = new Array(points.length).fill(-decisionH);
  const zeroLine = new Array(points.length).fill(0);

  const traces: Plotly.Data[] = [
    // Zero line
    {
      x: dateLabels,
      y: zeroLine,
      type: "scatter",
      mode: "lines",
      line: { color: "rgba(255,255,255,0.2)", width: 1, dash: "dot" },
      name: "Zero",
      hoverinfo: "skip",
    },
    // +h decision interval
    {
      x: dateLabels,
      y: hLine,
      type: "scatter",
      mode: "lines",
      line: { color: "#ef4444", width: 1.5, dash: "dash" },
      name: `+h (${decisionH.toFixed(2)})`,
      hoverinfo: "skip",
    },
    // -h decision interval
    {
      x: dateLabels,
      y: negHLine,
      type: "scatter",
      mode: "lines",
      line: { color: "#ef4444", width: 1.5, dash: "dash" },
      name: `-h (${(-decisionH).toFixed(2)})`,
      hoverinfo: "skip",
    },
    // C+ line
    {
      x: dateLabels,
      y: cusuPosValues,
      type: "scatter",
      mode: "lines+markers",
      name: "C⁺ (positive CuSum)",
      line: { color: "#6366f1", width: 2 },
      marker: {
        color: posColors,
        size: 7,
        line: { color: posColors, width: 1 },
      },
      hovertemplate: "C⁺: %{y:.3f}<br>%{x}<extra></extra>",
    },
    // C- line
    {
      x: dateLabels,
      y: cusuNegValues,
      type: "scatter",
      mode: "lines+markers",
      name: "C⁻ (negative CuSum)",
      line: { color: "#a855f7", width: 2 },
      marker: {
        color: negColors,
        size: 7,
        line: { color: negColors, width: 1 },
      },
      hovertemplate: "C⁻: %{y:.3f}<br>%{x}<extra></extra>",
    },
  ];

  const layout: Partial<Plotly.Layout> = {
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: { color: "#e5e7eb", family: "Inter, sans-serif", size: 12 },
    title: {
      text: title ? `${title} — CuSum Chart` : "CuSum Chart",
      font: { color: "#ffffff", size: 15, family: "Inter, sans-serif" },
      x: 0.01,
      xanchor: "left",
    },
    xaxis: {
      gridcolor: "rgba(255,255,255,0.05)",
      linecolor: "rgba(255,255,255,0.1)",
      tickcolor: "rgba(255,255,255,0.1)",
      tickfont: { color: "#9ca3af", size: 11 },
      showgrid: true,
    },
    yaxis: {
      gridcolor: "rgba(255,255,255,0.05)",
      linecolor: "rgba(255,255,255,0.1)",
      tickcolor: "rgba(255,255,255,0.1)",
      tickfont: { color: "#9ca3af", size: 11 },
      zeroline: false,
      title: { text: "Cumulative Sum", font: { color: "#9ca3af", size: 12 } },
    },
    legend: {
      bgcolor: "rgba(0,0,0,0)",
      font: { color: "#9ca3af", size: 11 },
      orientation: "h",
      x: 0,
      y: -0.15,
    },
    margin: { t: 50, r: 20, b: 60, l: 60 },
    height: 380,
  };

  const signalCount = points.filter((p) => p.signalPos || p.signalNeg).length;

  return (
    <div className="bg-white/[0.025] border border-white/8 rounded-2xl overflow-hidden">
      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-4 px-5 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Target mean (μ₀)</label>
          <input
            type="number"
            step="any"
            placeholder={defaultMu0.toFixed(3)}
            value={mu0Input}
            onChange={(e) => setMu0Input(e.target.value)}
            className="w-28 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Decision interval (h)</label>
          <input
            type="number"
            step="any"
            placeholder={result.h.toFixed(3)}
            value={hInput}
            onChange={(e) => setHInput(e.target.value)}
            className="w-28 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
        {(mu0Input || hInput) && (
          <button
            onClick={() => { setMu0Input(""); setHInput(""); }}
            className="text-xs text-gray-500 hover:text-white transition-colors"
          >
            Reset
          </button>
        )}
        <div className="ml-auto text-xs text-gray-500">
          k = {result.k.toFixed(3)} · σ̂ = {result.sigma.toFixed(3)}
          {signalCount > 0 && (
            <span className="ml-3 text-red-400 font-medium">
              {signalCount} signal{signalCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500 px-5 py-2 border-b border-white/5">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-indigo-500 inline-block" />
          C⁺ (positive CuSum)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-purple-500 inline-block" />
          C⁻ (negative CuSum)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 border-t border-dashed border-red-500 inline-block" />
          Decision interval (±h)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
          Signal
        </span>
      </div>

      <Plot
        data={traces}
        layout={layout}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: "100%" }}
      />
    </div>
  );
}

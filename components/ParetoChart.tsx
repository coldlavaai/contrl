"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { buildParetoData } from "@/lib/attributeCharts";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface ParetoChartProps {
  categories: string[];
  counts: number[];
  title?: string;
}

export default function ParetoChart({ categories, counts, title }: ParetoChartProps) {
  const data = useMemo(() => buildParetoData(categories, counts), [categories, counts]);

  const labels = data.map((d) => d.category);
  const barCounts = data.map((d) => d.count);
  const cumPct = data.map((d) => d.cumulativePct);
  const barColors = data.map((d) =>
    d.isVitalFew ? "rgba(239,68,68,0.75)" : "rgba(99,102,241,0.5)"
  );

  const total = counts.reduce((a, b) => a + b, 0);

  const traces: Plotly.Data[] = [
    // Bars
    {
      x: labels,
      y: barCounts,
      type: "bar",
      name: "Count",
      marker: {
        color: barColors,
        line: { color: barColors.map((c) => c.replace("0.75", "1").replace("0.5", "1")), width: 1 },
      },
      hovertemplate: "%{x}: %{y}<extra></extra>",
      yaxis: "y",
    },
    // 80% line
    {
      x: [labels[0] ?? "", labels[labels.length - 1] ?? ""],
      y: [80, 80],
      type: "scatter",
      mode: "lines",
      name: "80% line",
      line: { color: "#f59e0b", width: 1.5, dash: "dash" },
      yaxis: "y2",
      hoverinfo: "skip",
    },
    // Cumulative % line
    {
      x: labels,
      y: cumPct,
      type: "scatter",
      mode: "lines+markers",
      name: "Cumulative %",
      line: { color: "#f97316", width: 2.5 },
      marker: { color: "#f97316", size: 6 },
      yaxis: "y2",
      hovertemplate: "%{x}: %{y:.1f}%<extra></extra>",
    },
  ];

  const layout: Partial<Plotly.Layout> = {
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: { color: "#e5e7eb", family: "Inter, sans-serif", size: 12 },
    title: {
      text: title ? `${title} — Pareto Chart` : "Pareto Chart",
      font: { color: "#ffffff", size: 15, family: "Inter, sans-serif" },
      x: 0.01,
      xanchor: "left",
    },
    xaxis: {
      gridcolor: "rgba(255,255,255,0.04)",
      linecolor: "rgba(255,255,255,0.1)",
      tickcolor: "rgba(255,255,255,0.1)",
      tickfont: { color: "#9ca3af", size: 11 },
      showgrid: false,
    },
    yaxis: {
      gridcolor: "rgba(255,255,255,0.05)",
      linecolor: "rgba(255,255,255,0.1)",
      tickcolor: "rgba(255,255,255,0.1)",
      tickfont: { color: "#9ca3af", size: 11 },
      zeroline: false,
      title: { text: "Count", font: { color: "#9ca3af", size: 12 } },
    },
    yaxis2: {
      overlaying: "y",
      side: "right",
      range: [0, 105],
      ticksuffix: "%",
      gridcolor: "rgba(255,255,255,0.02)",
      linecolor: "rgba(255,255,255,0.1)",
      tickfont: { color: "#9ca3af", size: 11 },
      zeroline: false,
      title: { text: "Cumulative %", font: { color: "#9ca3af", size: 12 } },
    },
    legend: {
      bgcolor: "rgba(0,0,0,0)",
      font: { color: "#9ca3af", size: 11 },
      orientation: "h",
      x: 0,
      y: -0.15,
    },
    margin: { t: 50, r: 60, b: 60, l: 60 },
    height: 400,
    bargap: 0.2,
  };

  const vitalFewCount = data.filter((d) => d.isVitalFew).length;

  return (
    <div className="bg-white/[0.025] border border-white/8 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-500/75 inline-block" />
            Vital few (top 80%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500/50 inline-block" />
            Useful many
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-amber-500 inline-block" />
            80% threshold
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-orange-500 inline-block" />
            Cumulative %
          </span>
        </div>
        <div className="text-xs text-gray-500 shrink-0 ml-4">
          {vitalFewCount} vital few · {data.length - vitalFewCount} useful many · {total} total
        </div>
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

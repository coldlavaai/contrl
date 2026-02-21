"use client";

import { useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import {
  calculatePChart,
  calculateNpChart,
  calculateCChart,
  calculateUChart,
} from "@/lib/attributeCharts";
import ExportDropdown from "@/components/ExportDropdown";
import { ExportStats } from "@/lib/exportUtils";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

// ─── p-Chart ─────────────────────────────────────────────────────────────────

interface PChartProps {
  defectives: number[];
  sampleSizes: number[];
  dates: string[];
  title?: string;
}

export function PChartComponent({ defectives, sampleSizes, dates, title }: PChartProps) {
  const result = useMemo(
    () => calculatePChart(defectives, sampleSizes, dates),
    [defectives, sampleSizes, dates]
  );

  const { points, pBar } = result;
  const dateLabels = points.map((p) => p.date);
  const proportions = points.map((p) => p.proportion);
  const ucls = points.map((p) => p.ucl);
  const lcls = points.map((p) => p.lcl);
  const pBarLine = new Array(points.length).fill(pBar);
  const signalColors = points.map((p) => (p.signal ? "#ef4444" : "#6366f1"));
  const signalCount = points.filter((p) => p.signal).length;

  const traces: Plotly.Data[] = [
    {
      x: dateLabels,
      y: ucls,
      type: "scatter",
      mode: "lines",
      line: { color: "rgba(239,68,68,0.7)", width: 1.5, dash: "dash" },
      name: "UCL",
      hovertemplate: "UCL: %{y:.4f}<extra></extra>",
    },
    {
      x: dateLabels,
      y: lcls,
      type: "scatter",
      mode: "lines",
      line: { color: "rgba(239,68,68,0.7)", width: 1.5, dash: "dash" },
      name: "LCL",
      hovertemplate: "LCL: %{y:.4f}<extra></extra>",
    },
    {
      x: dateLabels,
      y: pBarLine,
      type: "scatter",
      mode: "lines",
      line: { color: "rgba(99,102,241,0.6)", width: 1.5 },
      name: `p̄ = ${pBar.toFixed(4)}`,
      hoverinfo: "skip",
    },
    {
      x: dateLabels,
      y: proportions,
      type: "scatter",
      mode: "lines+markers",
      name: "Proportion defective",
      line: { color: "#6366f1", width: 2 },
      marker: { color: signalColors, size: 7 },
      hovertemplate: "p: %{y:.4f}<br>%{x}<extra></extra>",
    },
  ];

  return <BaseAttributeChart traces={traces} dateLabels={dateLabels} title={title} subtitle="p-Chart — Proportion Defective" yAxisTitle="Proportion (p)" signalCount={signalCount} stats={`p̄ = ${pBar.toFixed(4)}`} exportStats={{ mean: pBar, signalCount, dataPoints: points.length }} />;
}

// ─── np-Chart ────────────────────────────────────────────────────────────────

interface NpChartProps {
  defectives: number[];
  sampleSize: number;
  dates: string[];
  title?: string;
}

export function NpChartComponent({ defectives, sampleSize, dates, title }: NpChartProps) {
  const result = useMemo(
    () => calculateNpChart(defectives, sampleSize, dates),
    [defectives, sampleSize, dates]
  );

  const { points, npBar, ucl, lcl } = result;
  const dateLabels = points.map((p) => p.date);
  const counts = points.map((p) => p.defectives);
  const npBarLine = new Array(points.length).fill(npBar);
  const uclLine = new Array(points.length).fill(ucl);
  const lclLine = new Array(points.length).fill(lcl);
  const signalColors = points.map((p) => (p.signal ? "#ef4444" : "#6366f1"));
  const signalCount = points.filter((p) => p.signal).length;

  const traces: Plotly.Data[] = [
    {
      x: dateLabels,
      y: uclLine,
      type: "scatter",
      mode: "lines",
      line: { color: "rgba(239,68,68,0.7)", width: 1.5, dash: "dash" },
      name: `UCL = ${ucl.toFixed(2)}`,
      hoverinfo: "skip",
    },
    {
      x: dateLabels,
      y: lclLine,
      type: "scatter",
      mode: "lines",
      line: { color: "rgba(239,68,68,0.7)", width: 1.5, dash: "dash" },
      name: `LCL = ${lcl.toFixed(2)}`,
      hoverinfo: "skip",
    },
    {
      x: dateLabels,
      y: npBarLine,
      type: "scatter",
      mode: "lines",
      line: { color: "rgba(99,102,241,0.6)", width: 1.5 },
      name: `n̄p̄ = ${npBar.toFixed(2)}`,
      hoverinfo: "skip",
    },
    {
      x: dateLabels,
      y: counts,
      type: "scatter",
      mode: "lines+markers",
      name: "Count defective",
      line: { color: "#6366f1", width: 2 },
      marker: { color: signalColors, size: 7 },
      hovertemplate: "Count: %{y}<br>%{x}<extra></extra>",
    },
  ];

  return <BaseAttributeChart traces={traces} dateLabels={dateLabels} title={title} subtitle={`np-Chart — Count Defective (n=${sampleSize})`} yAxisTitle="Count of Defectives" signalCount={signalCount} stats={`n̄p̄ = ${npBar.toFixed(2)} · UCL = ${ucl.toFixed(2)} · LCL = ${lcl.toFixed(2)}`} exportStats={{ mean: npBar, ucl, lcl, signalCount, dataPoints: points.length }} />;
}

// ─── c-Chart ─────────────────────────────────────────────────────────────────

interface CChartProps {
  defects: number[];
  dates: string[];
  title?: string;
}

export function CChartComponent({ defects, dates, title }: CChartProps) {
  const result = useMemo(
    () => calculateCChart(defects, dates),
    [defects, dates]
  );

  const { points, cBar, ucl, lcl } = result;
  const dateLabels = points.map((p) => p.date);
  const counts = points.map((p) => p.defects);
  const cBarLine = new Array(points.length).fill(cBar);
  const uclLine = new Array(points.length).fill(ucl);
  const lclLine = new Array(points.length).fill(lcl);
  const signalColors = points.map((p) => (p.signal ? "#ef4444" : "#6366f1"));
  const signalCount = points.filter((p) => p.signal).length;

  const traces: Plotly.Data[] = [
    {
      x: dateLabels,
      y: uclLine,
      type: "scatter",
      mode: "lines",
      line: { color: "rgba(239,68,68,0.7)", width: 1.5, dash: "dash" },
      name: `UCL = ${ucl.toFixed(2)}`,
      hoverinfo: "skip",
    },
    {
      x: dateLabels,
      y: lclLine,
      type: "scatter",
      mode: "lines",
      line: { color: "rgba(239,68,68,0.7)", width: 1.5, dash: "dash" },
      name: `LCL = ${lcl.toFixed(2)}`,
      hoverinfo: "skip",
    },
    {
      x: dateLabels,
      y: cBarLine,
      type: "scatter",
      mode: "lines",
      line: { color: "rgba(99,102,241,0.6)", width: 1.5 },
      name: `c̄ = ${cBar.toFixed(2)}`,
      hoverinfo: "skip",
    },
    {
      x: dateLabels,
      y: counts,
      type: "scatter",
      mode: "lines+markers",
      name: "Defect count",
      line: { color: "#6366f1", width: 2 },
      marker: { color: signalColors, size: 7 },
      hovertemplate: "Defects: %{y}<br>%{x}<extra></extra>",
    },
  ];

  return <BaseAttributeChart traces={traces} dateLabels={dateLabels} title={title} subtitle="c-Chart — Defect Count per Period" yAxisTitle="Count of Defects" signalCount={signalCount} stats={`c̄ = ${cBar.toFixed(2)} · UCL = ${ucl.toFixed(2)} · LCL = ${lcl.toFixed(2)}`} exportStats={{ mean: cBar, ucl, lcl, signalCount, dataPoints: points.length }} />;
}

// ─── u-Chart ─────────────────────────────────────────────────────────────────

interface UChartProps {
  defects: number[];
  units: number[];
  dates: string[];
  title?: string;
}

export function UChartComponent({ defects, units, dates, title }: UChartProps) {
  const result = useMemo(
    () => calculateUChart(defects, units, dates),
    [defects, units, dates]
  );

  const { points, uBar } = result;
  const dateLabels = points.map((p) => p.date);
  const rates = points.map((p) => p.rate);
  const ucls = points.map((p) => p.ucl);
  const lcls = points.map((p) => p.lcl);
  const uBarLine = new Array(points.length).fill(uBar);
  const signalColors = points.map((p) => (p.signal ? "#ef4444" : "#6366f1"));
  const signalCount = points.filter((p) => p.signal).length;

  const traces: Plotly.Data[] = [
    {
      x: dateLabels,
      y: ucls,
      type: "scatter",
      mode: "lines",
      line: { color: "rgba(239,68,68,0.7)", width: 1.5, dash: "dash" },
      name: "UCL",
      hovertemplate: "UCL: %{y:.4f}<extra></extra>",
    },
    {
      x: dateLabels,
      y: lcls,
      type: "scatter",
      mode: "lines",
      line: { color: "rgba(239,68,68,0.7)", width: 1.5, dash: "dash" },
      name: "LCL",
      hovertemplate: "LCL: %{y:.4f}<extra></extra>",
    },
    {
      x: dateLabels,
      y: uBarLine,
      type: "scatter",
      mode: "lines",
      line: { color: "rgba(99,102,241,0.6)", width: 1.5 },
      name: `ū = ${uBar.toFixed(4)}`,
      hoverinfo: "skip",
    },
    {
      x: dateLabels,
      y: rates,
      type: "scatter",
      mode: "lines+markers",
      name: "Defect rate (u)",
      line: { color: "#6366f1", width: 2 },
      marker: { color: signalColors, size: 7 },
      hovertemplate: "u: %{y:.4f}<br>%{x}<extra></extra>",
    },
  ];

  return <BaseAttributeChart traces={traces} dateLabels={dateLabels} title={title} subtitle="u-Chart — Defect Rate per Unit" yAxisTitle="Defects per Unit (u)" signalCount={signalCount} stats={`ū = ${uBar.toFixed(4)}`} exportStats={{ mean: uBar, signalCount, dataPoints: points.length }} />;
}

// ─── Shared base chart ────────────────────────────────────────────────────────

interface BaseAttributeChartProps {
  traces: Plotly.Data[];
  dateLabels: string[];
  title?: string;
  subtitle: string;
  yAxisTitle: string;
  signalCount: number;
  stats: string;
  /** Export stats for PDF generation */
  exportStats?: ExportStats;
}

function BaseAttributeChart({
  traces,
  title,
  subtitle,
  yAxisTitle,
  signalCount,
  stats,
  exportStats,
}: BaseAttributeChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const layout: Partial<Plotly.Layout> = {
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: { color: "#e5e7eb", family: "Inter, sans-serif", size: 12 },
    title: {
      text: title ? `${title} — ${subtitle}` : subtitle,
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
      title: { text: yAxisTitle, font: { color: "#9ca3af", size: 12 } },
    },
    legend: {
      bgcolor: "rgba(0,0,0,0)",
      font: { color: "#9ca3af", size: 11 },
      orientation: "h",
      x: 0,
      y: -0.18,
    },
    margin: { t: 50, r: 20, b: 70, l: 65 },
    height: 380,
  };

  const displayTitle = title ? `${title} — ${subtitle}` : subtitle;

  return (
    <div className="bg-white/[0.025] border border-white/8 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
            In control
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            Signal (out of control)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-red-500 inline-block" />
            Control limits
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <div className="text-xs text-gray-500">
            {stats}
            {signalCount > 0 && (
              <span className="ml-3 text-red-400 font-medium">
                {signalCount} signal{signalCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {exportStats && (
            <ExportDropdown
              chartContainerRef={chartRef}
              title={displayTitle}
              stats={exportStats}
            />
          )}
        </div>
      </div>
      <div ref={chartRef}>
        <Plot
          data={traces}
          layout={layout}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: "100%" }}
        />
      </div>
    </div>
  );
}

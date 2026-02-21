"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useChartColors } from "@/hooks/useChartColors";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface HistogramChartProps {
  values: number[];
  title: string;
  unit: string;
}

function calcStats(values: number[]) {
  const n = values.length;
  if (n === 0) return { mean: 0, std: 0, skewness: 0, kurtosis: 0 };

  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);

  const skewness =
    std === 0
      ? 0
      : values.reduce((a, b) => a + ((b - mean) / std) ** 3, 0) / n;

  const kurtosis =
    std === 0
      ? 0
      : values.reduce((a, b) => a + ((b - mean) / std) ** 4, 0) / n - 3;

  return { mean, std, skewness, kurtosis };
}

function sturgesBins(n: number): number {
  return Math.max(5, Math.ceil(Math.log2(n) + 1));
}

function normalPdf(x: number, mean: number, std: number): number {
  if (std === 0) return 0;
  return (
    (1 / (std * Math.sqrt(2 * Math.PI))) *
    Math.exp(-0.5 * ((x - mean) / std) ** 2)
  );
}

export default function HistogramChart({ values, title, unit }: HistogramChartProps) {
  const colors = useChartColors();
  const { mean, std, skewness, kurtosis } = useMemo(() => calcStats(values), [values]);

  const { binCounts, binCenters, binWidth } = useMemo(() => {
    if (values.length === 0) return { binCounts: [], binCenters: [], binWidth: 1 };

    const n = values.length;
    const k = sturgesBins(n);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const range = maxV - minV || 1;
    const bw = range / k;

    const counts = new Array(k).fill(0);
    for (const v of values) {
      const bin = Math.min(Math.floor((v - minV) / bw), k - 1);
      counts[bin]++;
    }

    const centers = Array.from({ length: k }, (_, i) => minV + (i + 0.5) * bw);
    return { binCounts: counts, binCenters: centers, binWidth: bw };
  }, [values]);

  // Normal distribution curve (scaled to match histogram area)
  const { curveX, curveY } = useMemo(() => {
    if (values.length === 0 || std === 0) return { curveX: [], curveY: [] };
    const n = 200;
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const padding = (maxV - minV) * 0.15;
    const xs = Array.from({ length: n }, (_, i) => minV - padding + ((maxV - minV + 2 * padding) * i) / (n - 1));
    // Scale PDF so area matches histogram: area = n * binWidth
    const ys = xs.map((x) => normalPdf(x, mean, std) * values.length * binWidth);
    return { curveX: xs, curveY: ys };
  }, [values, mean, std, binWidth]);

  const isNormal = Math.abs(skewness) < 0.5 && Math.abs(kurtosis) < 1;
  const interpretation = isNormal
    ? "Data appears approximately normal"
    : "Data is skewed/non-normal — interpret control limits with care";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any[] = [
    {
      type: "bar",
      name: "Frequency",
      x: binCenters,
      y: binCounts,
      width: binWidth * 0.9,
      marker: {
        color: colors.dataPoints + "99", // Add transparency
        line: { color: colors.dataPoints, width: 1 },
      },
      hovertemplate: `Value: %{x:.2f}<br>Count: %{y}<extra></extra>`,
    },
    {
      type: "scatter",
      mode: "lines",
      name: "Normal curve",
      x: curveX,
      y: curveY,
      line: { color: "rgba(251, 191, 36, 0.85)", width: 2 },
      hoverinfo: "skip",
    },
  ];

  const layout: Partial<Plotly.Layout> = {
    paper_bgcolor: colors.background,
    plot_bgcolor: colors.background,
    font: { color: "#9ca3af", family: "Inter, sans-serif" },
    xaxis: {
      title: { text: unit || "Value", font: { color: "#6b7280", size: 12 } },
      gridcolor: "#1f1f1f",
      linecolor: "#2d2d2d",
      tickfont: { color: "#6b7280", size: 11 },
    },
    yaxis: {
      title: { text: "Frequency", font: { color: "#6b7280", size: 12 } },
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
    margin: { l: 55, r: 20, t: 20, b: 80 },
    bargap: 0.05,
    hoverlabel: {
      bgcolor: "#1e1e2e",
      bordercolor: colors.meanLine,
      font: { color: "#fff", size: 13 },
    },
    hovermode: "closest",
  };

  const config: Partial<Plotly.Config> = {
    displayModeBar: true,
    modeBarButtonsToRemove: ["lasso2d", "select2d", "autoScale2d"],
    displaylogo: false,
    responsive: true,
    toImageButtonOptions: { filename: `${title.replace(/\s+/g, "_")}_distribution` },
  };

  if (values.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No data to display
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Histogram plot */}
      <div className="w-full rounded-xl overflow-hidden border border-white/5">
        <div className="flex items-center gap-2 px-4 pt-3 pb-0">
          <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
            Distribution
          </span>
          <span className="text-[10px] text-gray-600">
            n = {values.length} · {sturgesBins(values.length)} bins
          </span>
        </div>
        <Plot
          data={data}
          layout={layout}
          config={config}
          style={{ width: "100%", minHeight: "320px" }}
          useResizeHandler
        />
      </div>

      {/* Normality stats card */}
      <div className={`rounded-xl border p-4 space-y-3 ${
        isNormal
          ? "border-green-500/20 bg-green-950/10"
          : "border-amber-500/20 bg-amber-950/10"
      }`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${
              isNormal ? "text-green-400" : "text-amber-400"
            }`}>
              Normality Assessment
            </div>
            <div className={`text-sm font-medium ${isNormal ? "text-green-300" : "text-amber-300"}`}>
              {isNormal ? "✓ " : "⚠ "}{interpretation}
            </div>
          </div>
          <div className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border ${
            isNormal
              ? "bg-green-500/10 border-green-500/25 text-green-400"
              : "bg-amber-500/10 border-amber-500/25 text-amber-400"
          }`}>
            {isNormal ? "NORMAL" : "NON-NORMAL"}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-white/5">
          <div>
            <div className="text-[10px] text-gray-600 mb-0.5">Mean (X̄)</div>
            <div className="text-sm font-semibold text-indigo-400">
              {mean.toFixed(3)}{unit ? ` ${unit}` : ""}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-gray-600 mb-0.5">Std Dev (σ)</div>
            <div className="text-sm font-semibold text-gray-300">
              {std.toFixed(3)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-gray-600 mb-0.5">Skewness</div>
            <div className={`text-sm font-semibold ${Math.abs(skewness) < 0.5 ? "text-green-400" : "text-amber-400"}`}>
              {skewness >= 0 ? "+" : ""}{skewness.toFixed(3)}
            </div>
            <div className="text-[9px] text-gray-600 mt-0.5">
              {Math.abs(skewness) < 0.5 ? "symmetric" : skewness > 0 ? "right-skewed" : "left-skewed"}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-gray-600 mb-0.5">Excess Kurtosis</div>
            <div className={`text-sm font-semibold ${Math.abs(kurtosis) < 1 ? "text-green-400" : "text-amber-400"}`}>
              {kurtosis >= 0 ? "+" : ""}{kurtosis.toFixed(3)}
            </div>
            <div className="text-[9px] text-gray-600 mt-0.5">
              {Math.abs(kurtosis) < 1 ? "normal tails" : kurtosis > 0 ? "heavy tails" : "light tails"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useChartColors } from "@/hooks/useChartColors";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface BoxPlotProps {
  values: number[];
  dates: string[];
  title: string;
  unit: string;
  splitIndices?: number[];
}

function quartiles(sorted: number[]): { q1: number; median: number; q3: number } {
  const n = sorted.length;
  if (n === 0) return { q1: 0, median: 0, q3: 0 };
  if (n === 1) return { q1: sorted[0], median: sorted[0], q3: sorted[0] };

  const median = n % 2 !== 0
    ? sorted[Math.floor(n / 2)]
    : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;

  const lowerHalf = sorted.slice(0, Math.floor(n / 2));
  const upperHalf = sorted.slice(Math.ceil(n / 2));

  const q1 = lowerHalf.length % 2 !== 0
    ? lowerHalf[Math.floor(lowerHalf.length / 2)]
    : lowerHalf.length > 0
      ? (lowerHalf[lowerHalf.length / 2 - 1] + lowerHalf[lowerHalf.length / 2]) / 2
      : median;

  const q3 = upperHalf.length % 2 !== 0
    ? upperHalf[Math.floor(upperHalf.length / 2)]
    : upperHalf.length > 0
      ? (upperHalf[upperHalf.length / 2 - 1] + upperHalf[upperHalf.length / 2]) / 2
      : median;

  return { q1, median, q3 };
}

interface SegmentStats {
  label: string;
  values: number[];
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  iqr: number;
  outlierCount: number;
}

export default function BoxPlot({ values, dates, title, unit, splitIndices = [] }: BoxPlotProps) {
  const colors = useChartColors();

  const segments: SegmentStats[] = useMemo(() => {
    if (values.length === 0) return [];

    const boundaries = [0, ...splitIndices, values.length].sort((a, b) => a - b);
    // Deduplicate
    const uniqueBounds = boundaries.filter((b, i) => i === 0 || b !== boundaries[i - 1]);

    const segs: SegmentStats[] = [];
    for (let i = 0; i < uniqueBounds.length - 1; i++) {
      const start = uniqueBounds[i];
      const end = uniqueBounds[i + 1];
      const slice = values.slice(start, end);
      if (slice.length === 0) continue;

      const sorted = [...slice].sort((a, b) => a - b);
      const { q1, median: med, q3 } = quartiles(sorted);
      const iqr = q3 - q1;
      const lowerFence = q1 - 1.5 * iqr;
      const upperFence = q3 + 1.5 * iqr;
      const outliers = slice.filter((v) => v < lowerFence || v > upperFence);

      const label = uniqueBounds.length <= 2
        ? "All Data"
        : `Segment ${i + 1}`;

      segs.push({
        label,
        values: slice,
        min: sorted[0],
        q1,
        median: med,
        q3,
        max: sorted[sorted.length - 1],
        iqr,
        outlierCount: outliers.length,
      });
    }
    return segs;
  }, [values, splitIndices]);

  if (values.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No data to display
      </div>
    );
  }

  const segmentColors = [
    colors.dataPoints,
    "#a78bfa", // violet
    "#34d399", // emerald
    "#fbbf24", // amber
    "#f87171", // red
    "#38bdf8", // sky
    "#fb923c", // orange
    "#c084fc", // purple
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any[] = segments.map((seg, i) => ({
    type: "box",
    name: seg.label,
    y: seg.values,
    boxpoints: "outliers",
    jitter: 0.3,
    pointpos: -1.8,
    marker: {
      color: segmentColors[i % segmentColors.length],
      outliercolor: "#ef4444",
      size: 5,
      line: { color: "#1e1e2e", width: 1 },
    },
    line: {
      color: segmentColors[i % segmentColors.length],
      width: 2,
    },
    fillcolor: segmentColors[i % segmentColors.length] + "20",
    whiskerwidth: 0.5,
    hoveron: "boxes+points",
    hovertemplate: `<b>${seg.label}</b><br>Value: %{y:.2f}${unit ? ` ${unit}` : ""}<extra></extra>`,
  }));

  const layout: Partial<Plotly.Layout> = {
    paper_bgcolor: colors.background,
    plot_bgcolor: colors.background,
    font: { color: "#9ca3af", family: "Inter, sans-serif" },
    xaxis: {
      gridcolor: "#1f2028",
      linecolor: "#333340",
      tickfont: { color: "#6b7280", size: 11 },
    },
    yaxis: {
      title: { text: unit || "Value", font: { color: "#6b7280", size: 12 } },
      gridcolor: "#1f2028",
      linecolor: "#2d2d2d",
      tickfont: { color: "#6b7280", size: 11 },
      zeroline: false,
    },
    legend: {
      font: { color: "#9ca3af", size: 11 },
      bgcolor: "rgba(15,15,20,0.75)",
      bordercolor: "rgba(255,255,255,0.06)",
      borderwidth: 1,
      orientation: "h" as const,
      x: 0,
      xanchor: "left" as const,
      y: -0.15,
      yanchor: "top" as const,
    },
    margin: { l: 55, r: 20, t: 20, b: 60 },
    showlegend: segments.length > 1,
    hoverlabel: {
      bgcolor: "#1e1e2e",
      bordercolor: colors.meanLine,
      font: { color: "#fff", size: 13 },
    },
    hovermode: "closest" as const,
  };

  const config: Partial<Plotly.Config> = {
    displayModeBar: true,
    modeBarButtonsToRemove: ["lasso2d", "select2d", "autoScale2d"],
    displaylogo: false,
    responsive: true,
    toImageButtonOptions: { filename: `${title.replace(/\s+/g, "_")}_boxplot` },
  };

  return (
    <div className="space-y-4">
      {/* Box plot */}
      <div className="w-full rounded-xl overflow-hidden border border-white/5">
        <div className="flex items-center gap-2 px-4 pt-3 pb-0">
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
            Box Plot
          </span>
          <span className="text-[10px] text-gray-600">
            n = {values.length}
            {segments.length > 1 && ` · ${segments.length} segments`}
          </span>
        </div>
        <Plot
          data={data}
          layout={layout}
          config={config}
          style={{ width: "100%", minHeight: "360px" }}
          useResizeHandler
        />
      </div>

      {/* Statistics cards */}
      <div className={`grid gap-3 ${segments.length > 1 ? "sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 max-w-md"}`}>
        {segments.map((seg, i) => (
          <div
            key={i}
            className="bg-white/[0.03] border border-white/8 rounded-xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                {seg.label}
              </div>
              <span className="text-[10px] text-gray-600">n = {seg.values.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <div className="text-[10px] text-gray-600 mb-0.5">Min</div>
                <div className="text-sm font-semibold text-gray-300">{seg.min.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-600 mb-0.5">Max</div>
                <div className="text-sm font-semibold text-gray-300">{seg.max.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-600 mb-0.5">Q1 (25th)</div>
                <div className="text-sm font-semibold text-gray-300">{seg.q1.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-600 mb-0.5">Q3 (75th)</div>
                <div className="text-sm font-semibold text-gray-300">{seg.q3.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-600 mb-0.5">Median</div>
                <div className="text-sm font-semibold text-indigo-400">{seg.median.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-600 mb-0.5">IQR</div>
                <div className="text-sm font-semibold text-gray-300">{seg.iqr.toFixed(2)}</div>
              </div>
            </div>
            {seg.outlierCount > 0 && (
              <div className="pt-2 border-t border-white/5">
                <span className="text-[11px] text-red-400">
                  {seg.outlierCount} outlier{seg.outlierCount !== 1 ? "s" : ""} detected
                </span>
              </div>
            )}
            {seg.outlierCount === 0 && (
              <div className="pt-2 border-t border-white/5">
                <span className="text-[11px] text-green-400/70">✓ No outliers</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

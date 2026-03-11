"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { calculateSpc, SpcResult } from "@/lib/spc";
import { Annotation, TargetLine, saveChart, ChartColors } from "@/lib/chartStorage";
import HistogramChart from "@/components/HistogramChart";
import { usePerChartColors, type ColorKey } from "@/hooks/usePerChartColors";
import { ChartColorPickerModal } from "@/components/ChartColorPickerModal";
import { ChartValuesDisplay } from "@/components/ChartValuesDisplay";

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

export type { Annotation };

interface SpcChartProps {
  values: number[];
  dates: string[];
  title?: string;
  unit?: string;
  splitIndices?: number[];
  onAddSplit?: (index: number) => void;
  onClearSplits?: () => void;
  onTitleChange?: (newTitle: string) => void;
  annotations?: Annotation[];
  onAnnotationsChange?: (annotations: Annotation[]) => void;
  /** When true, disables all editing controls (library view) */
  readOnly?: boolean;
  // Restored state (for library view)
  initialMethod?: "mean" | "median";
  initialSplitModes?: Record<number, "run">;
  initialFrozenLimits?: boolean;
  initialTargetLines?: TargetLine[];
  // Feature 2: Omit points
  omittedIndices?: number[];
  onOmittedChange?: (indices: number[]) => void;
  // Feature 3: Trend line
  initialShowTrendLine?: boolean;
  // Feature 4: Axis labels
  initialXAxisLabel?: string;
  initialYAxisLabel?: string;
  onXAxisLabelChange?: (label: string) => void;
  onYAxisLabelChange?: (label: string) => void;
  // Per-chart custom colors
  initialCustomColors?: ChartColors;
  onCustomColorsChange?: (colors: ChartColors) => void;
  // Feature 5: Segment labels
  initialSegmentLabels?: Record<number, string>;
  onSegmentLabelsChange?: (labels: Record<number, string>) => void;
}

interface PopoverState {
  dateIndex: number;
  existingText: string;
  x: number;
  y: number;
}

interface TargetDraft {
  value: string;
  label: string;
  color: "red" | "amber" | "green" | "blue";
}

const TARGET_COLORS: Record<"red" | "amber" | "green" | "blue", string> = {
  red: "#ef4444",
  amber: "#f59e0b",
  green: "#22c55e",
  blue: "#3b82f6",
};

/** Calculate linear regression (returns slope, intercept, fitted values) */
function linearRegression(indices: number[], vals: number[]) {
  const n = indices.length;
  if (n < 2) return { slope: 0, intercept: vals[0] ?? 0, fitted: vals.map(() => vals[0] ?? 0) };
  const xMean = indices.reduce((a, b) => a + b, 0) / n;
  const yMean = vals.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (indices[i] - xMean) * (vals[i] - yMean);
    sxx += (indices[i] - xMean) ** 2;
  }
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = yMean - slope * xMean;
  const fitted = indices.map((xi) => slope * xi + intercept);
  return { slope, intercept, fitted };
}

export default function SpcChart({
  values,
  dates,
  title = "SPC Chart",
  unit = "",
  splitIndices = [],
  onAddSplit,
  onClearSplits,
  onTitleChange,
  annotations = [],
  onAnnotationsChange,
  readOnly = false,
  initialMethod = "mean",
  initialSplitModes = {},
  initialFrozenLimits = false,
  initialTargetLines = [],
  omittedIndices = [],
  onOmittedChange,
  initialShowTrendLine = false,
  initialXAxisLabel,
  initialYAxisLabel,
  onXAxisLabelChange,
  onYAxisLabelChange,
  initialCustomColors,
  onCustomColorsChange,
  initialSegmentLabels = {},
  onSegmentLabelsChange,
}: SpcChartProps) {
  // ── Color settings (per-chart with global fallback) ───────────────────────
  const { colors, customColors, updateColor, resetToDefaults, hasCustomizations } = usePerChartColors(initialCustomColors);
  
  // Notify parent of color changes
  useEffect(() => {
    if (onCustomColorsChange && hasCustomizations) {
      onCustomColorsChange(customColors);
    }
  }, [customColors, hasCustomizations, onCustomColorsChange]);

  // ── Color picker modal state ───────────────────────────────────────────────
  const [colorPickerState, setColorPickerState] = useState<{
    colorKey: ColorKey;
    label: string;
    position: { x: number; y: number };
  } | null>(null);

  // ── Title editing ──────────────────────────────────────────────────────────
  const [editingTitle, setEditingTitle] = useState(false);
  const [localTitle, setLocalTitle] = useState(title);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setLocalTitle(title); }, [title]);
  useEffect(() => { if (editingTitle) titleInputRef.current?.focus(); }, [editingTitle]);

  const commitTitle = () => {
    setEditingTitle(false);
    const trimmed = localTitle.trim() || title;
    setLocalTitle(trimmed);
    if (trimmed !== title) onTitleChange?.(trimmed);
  };

  // ── Axis label editing ─────────────────────────────────────────────────────
  const [editingXAxis, setEditingXAxis] = useState(false);
  const [editingYAxis, setEditingYAxis] = useState(false);
  const [xAxisLabel, setXAxisLabel] = useState(initialXAxisLabel ?? "Period");
  const [yAxisLabel, setYAxisLabel] = useState(initialYAxisLabel ?? unit);
  const xAxisInputRef = useRef<HTMLInputElement>(null);
  const yAxisInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editingXAxis) xAxisInputRef.current?.focus(); }, [editingXAxis]);
  useEffect(() => { if (editingYAxis) yAxisInputRef.current?.focus(); }, [editingYAxis]);

  const commitXAxis = () => {
    setEditingXAxis(false);
    const trimmed = xAxisLabel.trim() || "Period";
    setXAxisLabel(trimmed);
    onXAxisLabelChange?.(trimmed);
  };

  const commitYAxis = () => {
    setEditingYAxis(false);
    const trimmed = yAxisLabel.trim() || unit;
    setYAxisLabel(trimmed);
    onYAxisLabelChange?.(trimmed);
  };

  // ── Mode toggles ───────────────────────────────────────────────────────────
  const [addSplitMode, setAddSplitMode] = useState(false);
  const [addNoteMode, setAddNoteMode] = useState(false);
  const [omitMode, setOmitMode] = useState(false);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [popoverDraft, setPopoverDraft] = useState("");
  const popoverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (popover !== null) {
      popoverDraft;
      popoverInputRef.current?.focus();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popover]);

  // ── Feature: Mean ↔ Median ───────────────────────────────────────────────
  const [method, setMethod] = useState<"mean" | "median">(initialMethod);

  // ── Feature: Split Modes ────────────────────────────────────────────────
  const [splitModes, setSplitModes] = useState<Record<number, "run">>(initialSplitModes);

  // ── Feature: Freeze Limits ─────────────────────────────────────────────
  const [frozenLimits, setFrozenLimits] = useState(initialFrozenLimits);

  // ── Feature: Target Lines ───────────────────────────────────────────────
  const [targetLines, setTargetLines] = useState<TargetLine[]>(initialTargetLines);
  const [showTargetInput, setShowTargetInput] = useState(false);
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [targetDraft, setTargetDraft] = useState<TargetDraft>({
    value: "",
    label: "",
    color: "blue",
  });
  const targetValueRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showTargetInput) targetValueRef.current?.focus();
  }, [showTargetInput]);

  // ── Feature: MR Chart visibility ────────────────────────────────────────
  const [showMrChart, setShowMrChart] = useState(true);

  // ── Feature 3: Trend Line ────────────────────────────────────────────────
  const [showTrendLine, setShowTrendLine] = useState(initialShowTrendLine);

  // ── Feature 5: Segment Labels ─────────────────────────────────────────────
  const [segmentLabels, setSegmentLabels] = useState<Record<number, string>>(initialSegmentLabels);
  const [editingSegmentLabel, setEditingSegmentLabel] = useState<number | null>(null);
  const [segmentLabelDraft, setSegmentLabelDraft] = useState("");
  const segmentLabelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingSegmentLabel !== null) segmentLabelInputRef.current?.focus();
  }, [editingSegmentLabel]);

  const startEditingSegmentLabel = (segmentIndex: number) => {
    setEditingSegmentLabel(segmentIndex);
    setSegmentLabelDraft(segmentLabels[segmentIndex] || "");
  };

  const commitSegmentLabel = () => {
    if (editingSegmentLabel === null) return;
    const trimmed = segmentLabelDraft.trim();
    const newLabels = { ...segmentLabels };
    if (trimmed) {
      newLabels[editingSegmentLabel] = trimmed;
    } else {
      delete newLabels[editingSegmentLabel];
    }
    setSegmentLabels(newLabels);
    onSegmentLabelsChange?.(newLabels);
    setEditingSegmentLabel(null);
    setSegmentLabelDraft("");
  };

  // ── Chart tabs: Control Chart vs Distribution ─────────────────────────────
  const [activeTab, setActiveTab] = useState<"control" | "distribution">("control");

  // ── Save feedback ──────────────────────────────────────────────────────────
  const [savedFlash, setSavedFlash] = useState(false);

  const handleSave = () => {
    saveChart({
      title: localTitle,
      measure: { name: localTitle, unit, dates, values },
      splitIndices,
      annotations,
      targetLines,
      method,
      splitModes,
      frozenLimits,
      omittedIndices,
      showTrendLine,
      xAxisLabel,
      yAxisLabel,
      segmentLabels: Object.keys(segmentLabels).length > 0 ? segmentLabels : undefined,
      customColors: hasCustomizations ? customColors : undefined,
    });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  // ── SPC calculation (uses omittedIndices) ──────────────────────────────────
  const omittedSet = useMemo(() => new Set(omittedIndices), [omittedIndices]);

  const spc: SpcResult = useMemo(
    () => calculateSpc(values, dates, splitIndices, { method, splitModes, frozenLimits, omittedIndices }),
    [values, dates, splitIndices, method, splitModes, frozenLimits, omittedIndices]
  );

  const segmentSignals = useMemo(
    () =>
      spc.segments.map((seg) => {
        const pts = spc.points.slice(seg.startIndex, seg.endIndex + 1)
          .filter((p) => !omittedSet.has(p.index));
        return {
          runCount: pts.filter((p) => p.signal === "run").length,
          trendCount: pts.filter((p) => p.signal === "trend").length,
        };
      }),
    [spc, omittedSet]
  );

  // ── Feature 3: Trend line calculations ──────────────────────────────────
  const trendTraces = useMemo(() => {
    if (!showTrendLine) return { traces: [], slopes: [] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const traces: any[] = [];
    const slopes: number[] = [];

    spc.segments.forEach((seg, i) => {
      // Collect non-omitted points in this segment
      const segPts = spc.points.slice(seg.startIndex, seg.endIndex + 1)
        .filter((p) => !omittedSet.has(p.index));
      if (segPts.length < 2) {
        slopes.push(0);
        return;
      }

      const segIndices = segPts.map((p) => p.index);
      const segVals = segPts.map((p) => p.value);
      const { slope, fitted } = linearRegression(segIndices, segVals);
      slopes.push(slope);

      traces.push({
        type: "scatter",
        mode: "lines",
        name: "Trend",
        legendgroup: "trend",
        showlegend: i === 0,
        x: segPts.map((p) => p.date),
        y: fitted,
        line: { color: "rgba(34, 197, 94, 0.8)", width: 2 },
        hovertemplate: `Trend: ${slope >= 0 ? "+" : ""}${slope.toFixed(3)} per period<extra></extra>`,
      });
    });

    return { traces, slopes };
  }, [showTrendLine, spc, omittedSet]);

  // Partition points
  const normalPoints = spc.points.filter((p) => p.signal === "none" && !omittedSet.has(p.index));
  const runPoints = spc.points.filter((p) => p.signal === "run" && !omittedSet.has(p.index));
  const trendPoints = spc.points.filter((p) => p.signal === "trend" && !omittedSet.has(p.index));
  const omittedPoints = spc.points.filter((p) => omittedSet.has(p.index));

  // Dynamic marker sizing based on dataset volume (Feedback #4)
  const datasetLength = values.length;
  const baseMarkerSize = datasetLength > 200 ? 5 : datasetLength > 100 ? 6 : 7;
  const runMarkerSize = datasetLength > 200 ? 3 : datasetLength > 100 ? 4 : 5;
  const trendMarkerSize = datasetLength > 200 ? 4 : datasetLength > 100 ? 5 : 6;

  const commonMarker = { size: baseMarkerSize, line: { width: 1, color: "#1e1e2e" } };

  // ── Split shapes ──────────────────────────────────────────────────────────
  const splitShapes = splitIndices.map((idx) => ({
    type: "line" as const,
    x0: dates[idx],
    x1: dates[idx],
    y0: 0,
    y1: 1,
    yref: "paper" as const,
    line: { color: "#a855f7", width: 2, dash: "dot" as const },
  }));

  // ── Target line shapes ────────────────────────────────────────────────────
  const targetShapes = targetLines.map((t) => ({
    type: "line" as const,
    x0: 0,
    x1: 1,
    xref: "paper" as const,
    y0: t.value,
    y1: t.value,
    line: { color: TARGET_COLORS[t.color], width: 1.5, dash: "dashdot" as const },
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const targetAnnotations: any[] = targetLines.map((t) => ({
    x: 1,
    xref: "paper",
    y: t.value,
    text: t.label || `${t.value.toFixed(2)}`,
    showarrow: false,
    xanchor: "right",
    yanchor: "bottom",
    font: { color: TARGET_COLORS[t.color], size: 10 },
    bgcolor: "rgba(20,20,20,0.7)",
    bordercolor: TARGET_COLORS[t.color],
    borderwidth: 1,
    captureevents: false,
  }));

  // ── Segment line traces ───────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const segmentLineTraces: any[] = [];
  spc.segments.forEach((seg, i) => {
    // Include all dates in segment range (including omitted positions — line spans continuously)
    const segDates = dates.slice(seg.startIndex, seg.endIndex + 1);
    const n = seg.endIndex - seg.startIndex + 1;
    const isFirst = i === 0;

    segmentLineTraces.push({
      type: "scatter",
      mode: "lines",
      name: method === "median" ? "M̃ (Median)" : "Mean (X\u0304)",
      legendgroup: "mean",
      showlegend: isFirst,
      x: segDates,
      y: Array(n).fill(seg.mean),
      line: { color: method === "median" ? colors.medianLine : colors.meanLine, width: 2, dash: "dash" },
      hovertemplate: `${method === "median" ? "Median" : "Mean"}: ${seg.mean.toFixed(2)}<extra></extra>`,
    });

    if (!seg.runSplitMode) {
      segmentLineTraces.push(
        {
          type: "scatter",
          mode: "lines",
          name: "UCL",
          legendgroup: "ucl",
          showlegend: isFirst,
          x: segDates,
          y: Array(n).fill(seg.ucl),
          line: { color: colors.uclLine, width: 1.5, dash: "dash" },
          hovertemplate: `UCL: ${seg.ucl.toFixed(2)}<extra></extra>`,
        },
        {
          type: "scatter",
          mode: "lines",
          name: "LCL",
          legendgroup: "lcl",
          showlegend: isFirst,
          x: segDates,
          y: Array(n).fill(seg.lcl),
          line: { color: colors.lclLine, width: 1.5, dash: "dash" },
          hovertemplate: `LCL: ${seg.lcl.toFixed(2)}<extra></extra>`,
        }
      );
    }
  });

  // ── Plotly annotations ────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plotlyAnnotations: any[] = [
    ...annotations.map((ann) => ({
      x: dates[ann.dateIndex],
      y: values[ann.dateIndex],
      text: ann.text,
      showarrow: true,
      arrowhead: 2,
      ax: 0,
      ay: -36,
      font: { color: "#fbbf24", size: 11 },
      bgcolor: "rgba(30,30,30,0.85)",
      bordercolor: "#fbbf24",
      borderwidth: 1,
      captureevents: false,
    })),
    ...targetAnnotations,
  ];

  // ── Non-omitted data connecting line ──────────────────────────────────────
  // Build x/y with nulls at omitted positions to break the line
  const lineX = dates.map((d, i) => (omittedSet.has(i) ? null : d));
  const lineY = values.map((v, i) => (omittedSet.has(i) ? null : v));

  // ── Main chart data ───────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any[] = [
    // 1. Segment lines (mean/UCL/LCL)
    ...segmentLineTraces,
    // 2. Trend lines (if enabled)
    ...trendTraces.traces,
    // 3. Main data connecting line (with gaps at omitted positions)
    {
      type: "scatter",
      mode: "lines",
      x: lineX,
      y: lineY,
      name: "",
      showlegend: false,
      line: { color: colors.dataPoints, width: 2 },
      hoverinfo: "skip",
      connectgaps: false,
    },
    // 4. Normal data points
    {
      type: "scatter",
      mode: "markers",
      name: "Data",
      x: normalPoints.map((p) => p.date),
      y: normalPoints.map((p) => p.value),
      marker: { ...commonMarker, color: colors.dataPoints },
      hovertemplate: `<b>%{x}</b><br>Value: %{y:.1f} ${unit}<extra></extra>`,
    },
    // 5. Omitted points — hollow grey circles
    {
      type: "scatter",
      mode: "markers",
      name: "Omitted",
      x: omittedPoints.map((p) => p.date),
      y: omittedPoints.map((p) => p.value),
      marker: {
        size: 10,
        color: "rgba(0,0,0,0)",
        line: { color: "#4b5563", width: 2 },
      },
      hovertemplate: `<b>%{x}</b><br>Value: %{y:.1f} ${unit}<br><span style="color:#6b7280">⊘ Omitted</span><extra></extra>`,
    },
    // 6. Signal dots — rendered LAST so they appear on top (Feedback #3: smaller run markers)
    {
      type: "scatter",
      mode: "markers",
      name: "Run Signal",
      x: runPoints.map((p) => p.date),
      y: runPoints.map((p) => p.value),
      marker: { ...commonMarker, color: "#ef4444", size: runMarkerSize },
      hovertemplate: `<b>%{x}</b><br>Value: %{y:.1f} ${unit}<br><span style="color:#ef4444">⚠ Run signal</span><extra></extra>`,
    },
    {
      type: "scatter",
      mode: "markers",
      name: "Trend Signal",
      x: trendPoints.map((p) => p.date),
      y: trendPoints.map((p) => p.value),
      marker: { ...commonMarker, color: "#f97316", size: trendMarkerSize },
      hovertemplate: `<b>%{x}</b><br>Value: %{y:.1f} ${unit}<br><span style="color:#f97316">⚠ Trend signal</span><extra></extra>`,
    },
  ];

  // Sparse ticks: max 8 evenly-spaced labels regardless of dataset size
  const tickStep = Math.max(1, Math.ceil(dates.length / 8));
  const sparseTicks = dates.filter((_, i) => i % tickStep === 0);

  const layout: Partial<Plotly.Layout> = {
    paper_bgcolor: colors.background,
    plot_bgcolor: colors.background,
    font: { color: "#9ca3af", family: "Inter, sans-serif" },
    xaxis: {
      // Force category type so Plotly treats dates as labels, not date ranges
      type: "category" as const,
      tickvals: sparseTicks,
      ticktext: sparseTicks,
      gridcolor: "#1f2028",
      linecolor: "#333340",
      tickfont: { color: "#6b7280", size: 10 },
      tickangle: 0,
      automargin: true,
      title: { text: xAxisLabel, font: { color: "#6b7280", size: 12 } },
    },
    yaxis: {
      gridcolor: "#1f2028",
      linecolor: "#2d2d2d",
      tickfont: { color: "#6b7280", size: 11 },
      title: { text: yAxisLabel, font: { color: "#6b7280", size: 12 } },
      zeroline: false,
    },
    legend: {
      font: { color: "#9ca3af", size: 11 },
      bgcolor: "rgba(15,15,20,0.75)",
      bordercolor: "rgba(255,255,255,0.06)",
      borderwidth: 1,
      // Horizontal legend below the chart — never overlaps data
      orientation: "h",
      x: 0,
      xanchor: "left",
      y: -0.22,
      yanchor: "top",
    },
    margin: { l: 55, r: 20, t: 20, b: 90 },
    shapes: [...splitShapes, ...targetShapes],
    annotations: plotlyAnnotations,
    hoverlabel: {
      bgcolor: "#1e1e2e",
      bordercolor: method === "median" ? colors.medianLine : colors.meanLine,
      font: { color: "#fff", size: 13 },
    },
    hovermode: "closest",
  };

  const config: Partial<Plotly.Config> = {
    displayModeBar: true,
    modeBarButtonsToRemove: ["lasso2d", "select2d", "autoScale2d"],
    displaylogo: false,
    responsive: true,
    toImageButtonOptions: { filename: localTitle.replace(/\s+/g, "_") },
  };

  // ── MR Chart data ─────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mrData: any[] = [
    {
      type: "bar",
      name: "Moving Range",
      x: dates,
      y: spc.movingRanges,
      marker: {
        color: spc.movingRanges.map((v, i) =>
          omittedSet.has(i) ? "#374151" : v > spc.mrUcl ? colors.uclLine : colors.dataPoints
        ),
        opacity: 0.8,
      },
      hovertemplate: `<b>%{x}</b><br>MR: %{y:.2f}<extra></extra>`,
    },
    {
      type: "scatter",
      mode: "lines",
      name: "MR Mean (R̄)",
      x: dates,
      y: Array(dates.length).fill(spc.mrMean),
      line: { color: method === "median" ? colors.medianLine : colors.meanLine, width: 1.5, dash: "dash" },
      hovertemplate: `R̄: ${spc.mrMean.toFixed(3)}<extra></extra>`,
    },
    {
      type: "scatter",
      mode: "lines",
      name: "MR UCL",
      x: dates,
      y: Array(dates.length).fill(spc.mrUcl),
      line: { color: colors.uclLine, width: 1.5, dash: "dash" },
      hovertemplate: `MR UCL: ${spc.mrUcl.toFixed(3)}<extra></extra>`,
    },
  ];

  const mrLayout: Partial<Plotly.Layout> = {
    paper_bgcolor: colors.background,
    plot_bgcolor: colors.background,
    font: { color: "#9ca3af", family: "Inter, sans-serif" },
    xaxis: {
      type: "category" as const,
      gridcolor: "#1f2028",
      linecolor: "#333340",
      showticklabels: false,
      showline: false,
      automargin: false,
    },
    yaxis: {
      gridcolor: "#1f2028",
      linecolor: "#2d2d2d",
      tickfont: { color: "#6b7280", size: 10 },
      title: { text: "MR", font: { color: "#6b7280", size: 11 } },
      rangemode: "tozero" as const,
      zeroline: false,
    },
    legend: {
      font: { color: "#9ca3af", size: 10 },
      bgcolor: "rgba(15,15,20,0.75)",
      bordercolor: "rgba(255,255,255,0.06)",
      borderwidth: 1,
      orientation: "v",
      x: 1,
      xanchor: "right",
      y: 1,
      yanchor: "top",
    },
    margin: { l: 55, r: 20, t: 4, b: 10 },
    hoverlabel: {
      bgcolor: "#1e1e2e",
      bordercolor: method === "median" ? colors.medianLine : colors.meanLine,
      font: { color: "#fff", size: 12 },
    },
    hovermode: "closest",
  };

  // ── Click handler ─────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleClick = (event: any) => {
    const point = event?.points?.[0];
    if (!point) return;

    // Check if clicked on a line trace (not a data point)
    const traceName = point.data?.name;
    const mouseEvt = event?.event as MouseEvent | undefined;
    const isLineClick = traceName && 
      (traceName.includes("Mean") || 
       traceName.includes("Median") || 
       traceName === "UCL" || 
       traceName === "LCL" ||
       traceName === "Data");

    // If not in any mode and clicked on a line, open color picker
    if (!addSplitMode && !addNoteMode && !omitMode && isLineClick && !readOnly && mouseEvt) {
      let colorKey: ColorKey | null = null;
      let label = traceName;

      if (traceName.includes("Mean") || traceName.includes("X̄")) {
        colorKey = "meanLine";
        label = "Mean Line";
      } else if (traceName.includes("Median") || traceName.includes("M̃")) {
        colorKey = "medianLine";
        label = "Median Line";
      } else if (traceName === "UCL") {
        colorKey = "uclLine";
        label = "Upper Control Limit";
      } else if (traceName === "LCL") {
        colorKey = "lclLine";
        label = "Lower Control Limit";
      } else if (traceName === "Data") {
        colorKey = "dataPoints";
        label = "Data Points";
      }

      if (colorKey) {
        setColorPickerState({
          colorKey,
          label,
          position: { x: mouseEvt.clientX, y: mouseEvt.clientY },
        });
        return;
      }
    }

    const clickedX = point.x;
    const actualIndex = dates.indexOf(String(clickedX));
    if (actualIndex === -1) return;

    // Omit mode
    if (omitMode && onOmittedChange) {
      const updated = omittedSet.has(actualIndex)
        ? omittedIndices.filter((i) => i !== actualIndex)
        : [...omittedIndices, actualIndex].sort((a, b) => a - b);
      onOmittedChange(updated);
      return;
    }

    if (addNoteMode) {
      const px = mouseEvt ? mouseEvt.clientX : window.innerWidth / 2;
      const py = mouseEvt ? mouseEvt.clientY : window.innerHeight / 2;
      const existing = annotations.find((a) => a.dateIndex === actualIndex);
      setPopoverDraft(existing?.text ?? "");
      setPopover({ dateIndex: actualIndex, existingText: existing?.text ?? "", x: px, y: py });
      return;
    }

    if (addSplitMode && onAddSplit) {
      onAddSplit(actualIndex);
    }
  };

  // ── Annotation CRUD ───────────────────────────────────────────────────────
  const commitAnnotation = () => {
    if (!popover) return;
    const trimmed = popoverDraft.trim();
    const updated = annotations.filter((a) => a.dateIndex !== popover.dateIndex);
    if (trimmed) updated.push({ dateIndex: popover.dateIndex, text: trimmed });
    updated.sort((a, b) => a.dateIndex - b.dateIndex);
    onAnnotationsChange?.(updated);
    setPopover(null);
  };

  const deleteAnnotation = () => {
    if (!popover) return;
    const updated = annotations.filter((a) => a.dateIndex !== popover.dateIndex);
    onAnnotationsChange?.(updated);
    setPopover(null);
  };

  // ── Target line CRUD ──────────────────────────────────────────────────────
  const openNewTarget = () => {
    setEditingTargetId(null);
    setTargetDraft({ value: "", label: "", color: "blue" });
    setShowTargetInput(true);
    setAddSplitMode(false);
    setAddNoteMode(false);
    setOmitMode(false);
  };

  const openEditTarget = (t: TargetLine) => {
    setEditingTargetId(t.id);
    setTargetDraft({ value: String(t.value), label: t.label, color: t.color });
    setShowTargetInput(true);
  };

  const commitTarget = () => {
    const val = parseFloat(targetDraft.value);
    if (isNaN(val)) return;
    if (editingTargetId) {
      setTargetLines((prev) =>
        prev.map((t) =>
          t.id === editingTargetId
            ? { ...t, value: val, label: targetDraft.label, color: targetDraft.color }
            : t
        )
      );
    } else {
      setTargetLines((prev) => [
        ...prev,
        { id: crypto.randomUUID(), value: val, label: targetDraft.label, color: targetDraft.color },
      ]);
    }
    setShowTargetInput(false);
    setEditingTargetId(null);
  };

  const deleteTarget = (id: string) => {
    setTargetLines((prev) => prev.filter((t) => t.id !== id));
    if (editingTargetId === id) {
      setShowTargetInput(false);
      setEditingTargetId(null);
    }
  };

  // ── Run Split toggle ──────────────────────────────────────────────────────
  const toggleRunSplit = (splitIndex: number) => {
    setSplitModes((prev) => {
      const next = { ...prev };
      if (next[splitIndex] === "run") {
        delete next[splitIndex];
      } else {
        next[splitIndex] = "run";
      }
      return next;
    });
  };

  // ── Early return ───────────────────────────────────────────────────────────
  if (values.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No data to display
      </div>
    );
  }

  const hasMultipleSegments = spc.segments.length > 1;
  const activeMode = addSplitMode || addNoteMode || omitMode;
  const centreLabel = method === "median" ? "M̃ (Median)" : "X\u0304 (Mean)";

  // Values used for histogram (all, including omitted — they represent the real data distribution)
  const histogramValues = values;

  // ── Toolbar button style helper ───────────────────────────────────────────
  const toolbarBtn = (active: boolean, activeStyle: string) =>
    `relative flex items-center gap-2.5 px-4 py-2 rounded-lg text-sm font-semibold border transition-all duration-150 select-none ${
      active
        ? activeStyle
        : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/8 hover:text-gray-200 hover:border-white/20"
    }`;

  const onOffBadge = (active: boolean) =>
    `text-[10px] font-bold tracking-wide px-1.5 py-0.5 rounded ${
      active ? "bg-white/20 text-white" : "bg-white/5 text-gray-600"
    }`;

  return (
    <div className="w-full space-y-4">

      {/* ── Editable Title ── */}
      <div className="flex items-center gap-2 group/title">
        {editingTitle && !readOnly ? (
          <input
            ref={titleInputRef}
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitle();
              if (e.key === "Escape") { setLocalTitle(title); setEditingTitle(false); }
            }}
            className="text-lg font-semibold text-white bg-transparent border-b border-indigo-400 outline-none w-full max-w-md pb-0.5"
            style={{ fontFamily: "Inter, sans-serif" }}
          />
        ) : (
          <>
            <span
              className="text-lg font-semibold text-white cursor-default select-none"
              onDoubleClick={() => !readOnly && setEditingTitle(true)}
            >
              {localTitle}
            </span>
            {!readOnly && (
              <button
                onClick={() => setEditingTitle(true)}
                title="Edit chart title"
                className="opacity-0 group-hover/title:opacity-100 transition-opacity text-gray-500 hover:text-indigo-400 p-0.5 rounded"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Axis Label Editors ── */}
      {!readOnly && (
        <div className="flex items-center gap-4 text-xs">
          {/* X-Axis Label */}
          <div className="flex items-center gap-2 group/xaxis">
            <span className="text-gray-600 shrink-0">X-Axis:</span>
            {editingXAxis ? (
              <input
                ref={xAxisInputRef}
                value={xAxisLabel}
                onChange={(e) => setXAxisLabel(e.target.value)}
                onBlur={commitXAxis}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitXAxis();
                  if (e.key === "Escape") { setXAxisLabel(initialXAxisLabel ?? "Period"); setEditingXAxis(false); }
                }}
                className="text-sm text-white bg-transparent border-b border-indigo-400 outline-none w-40 pb-0.5"
                placeholder="X-axis label"
              />
            ) : (
              <>
                <span
                  className="text-sm text-gray-400 cursor-default select-none"
                  onDoubleClick={() => setEditingXAxis(true)}
                >
                  {xAxisLabel}
                </span>
                <button
                  onClick={() => setEditingXAxis(true)}
                  title="Edit X-axis label"
                  className="opacity-0 group-hover/xaxis:opacity-100 transition-opacity text-gray-600 hover:text-indigo-400 p-0.5 rounded"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* Y-Axis Label */}
          <div className="flex items-center gap-2 group/yaxis">
            <span className="text-gray-600 shrink-0">Y-Axis:</span>
            {editingYAxis ? (
              <input
                ref={yAxisInputRef}
                value={yAxisLabel}
                onChange={(e) => setYAxisLabel(e.target.value)}
                onBlur={commitYAxis}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitYAxis();
                  if (e.key === "Escape") { setYAxisLabel(initialYAxisLabel ?? unit); setEditingYAxis(false); }
                }}
                className="text-sm text-white bg-transparent border-b border-indigo-400 outline-none w-40 pb-0.5"
                placeholder="Y-axis label"
              />
            ) : (
              <>
                <span
                  className="text-sm text-gray-400 cursor-default select-none"
                  onDoubleClick={() => setEditingYAxis(true)}
                >
                  {yAxisLabel}
                </span>
                <button
                  onClick={() => setEditingYAxis(true)}
                  title="Edit Y-axis label"
                  className="opacity-0 group-hover/yaxis:opacity-100 transition-opacity text-gray-600 hover:text-indigo-400 p-0.5 rounded"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Toolbar ── */}
      {!readOnly && (
        <div className="flex items-center gap-2 flex-wrap">

          {/* Add Split toggle */}
          {onAddSplit && (
            <button
              onClick={() => { setAddNoteMode(false); setOmitMode(false); setAddSplitMode((v) => !v); }}
              className={toolbarBtn(addSplitMode, "bg-indigo-600 border-indigo-500 text-white shadow-[0_0_14px_rgba(99,102,241,0.45)]")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className={addSplitMode ? "text-white" : "text-gray-500"}>
                <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
                <line x1="20" y1="4" x2="8.12" y2="15.88" />
                <line x1="14.47" y1="14.48" x2="20" y2="20" />
                <line x1="8.12" y1="8.12" x2="12" y2="12" />
              </svg>
              <span>Add Split</span>
              <span className={onOffBadge(addSplitMode)}>{addSplitMode ? "ON" : "OFF"}</span>
            </button>
          )}

          {/* Add Note toggle */}
          {onAnnotationsChange && (
            <button
              onClick={() => { setAddSplitMode(false); setOmitMode(false); setPopover(null); setAddNoteMode((v) => !v); }}
              className={toolbarBtn(addNoteMode, "bg-amber-600/80 border-amber-500 text-white shadow-[0_0_14px_rgba(251,191,36,0.35)]")}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className={addNoteMode ? "text-white" : "text-gray-500"}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>Add Note</span>
              <span className={onOffBadge(addNoteMode)}>{addNoteMode ? "ON" : "OFF"}</span>
            </button>
          )}

          {/* ── Feature 2: Omit Point toggle ── */}
          {onOmittedChange && (
            <button
              onClick={() => { setAddSplitMode(false); setAddNoteMode(false); setPopover(null); setOmitMode((v) => !v); }}
              className={toolbarBtn(omitMode, "bg-red-700/70 border-red-500/70 text-white shadow-[0_0_14px_rgba(239,68,68,0.3)]")}
              title="Click data points to omit/restore them from calculations"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className={omitMode ? "text-white" : "text-gray-500"}>
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
              <span>Omit Point</span>
              <span className={onOffBadge(omitMode)}>{omitMode ? "ON" : "OFF"}</span>
            </button>
          )}

          {/* Restore all omitted */}
          {omittedIndices.length > 0 && onOmittedChange && (
            <button
              onClick={() => onOmittedChange([])}
              className="px-3 py-2 rounded-lg text-sm border border-red-500/20 text-red-400 hover:text-red-300 hover:border-red-500/40 transition-all bg-red-950/10"
            >
              Restore all ({omittedIndices.length})
            </button>
          )}

          {/* ── Mean / Median pill ── */}
          <div className="flex items-center rounded-lg border border-white/10 bg-white/5 overflow-hidden">
            <button
              onClick={() => setMethod("mean")}
              className={`px-3 py-2 text-sm font-semibold transition-all duration-150 select-none ${
                method === "mean"
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Mean
            </button>
            <button
              onClick={() => setMethod("median")}
              className={`px-3 py-2 text-sm font-semibold transition-all duration-150 select-none ${
                method === "median"
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Median
            </button>
          </div>

          {/* ── Freeze Limits ── */}
          {splitIndices.length > 0 && (
            <button
              onClick={() => setFrozenLimits((v) => !v)}
              title="Freeze Limits: new data after last split inherits previous segment's UCL/LCL"
              className={toolbarBtn(frozenLimits, "bg-cyan-700/70 border-cyan-500/70 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]")}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className={frozenLimits ? "text-white" : "text-gray-500"}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Freeze Limits</span>
              <span className={onOffBadge(frozenLimits)}>{frozenLimits ? "ON" : "OFF"}</span>
            </button>
          )}

          {/* ── Feature 3: Trend Line toggle ── */}
          <button
            onClick={() => setShowTrendLine((v) => !v)}
            className={toolbarBtn(showTrendLine, "bg-green-700/60 border-green-500/60 text-white shadow-[0_0_12px_rgba(34,197,94,0.25)]")}
            title="Show linear regression trend line"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={showTrendLine ? "text-white" : "text-gray-500"}>
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
            <span>Trend Line</span>
            <span className={onOffBadge(showTrendLine)}>{showTrendLine ? "ON" : "OFF"}</span>
          </button>

          {/* ── Add Target ── */}
          <button
            onClick={openNewTarget}
            className={toolbarBtn(showTargetInput && !editingTargetId, "bg-emerald-700/60 border-emerald-500/60 text-white")}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={showTargetInput && !editingTargetId ? "text-white" : "text-gray-500"}>
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
            <span>Add Target</span>
          </button>

          {/* ── Show MR Chart toggle ── */}
          <button
            onClick={() => setShowMrChart((v) => !v)}
            className={toolbarBtn(showMrChart, "bg-violet-700/60 border-violet-500/60 text-white")}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={showMrChart ? "text-white" : "text-gray-500"}>
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            <span>MR Chart</span>
            <span className={onOffBadge(showMrChart)}>{showMrChart ? "ON" : "OFF"}</span>
          </button>

          {/* Clear all splits */}
          {splitIndices.length > 0 && onClearSplits && (
            <button
              onClick={() => { setAddSplitMode(false); onClearSplits(); }}
              className="px-3 py-2 rounded-lg text-sm border border-red-500/20 text-red-400 hover:text-red-300 hover:border-red-500/40 transition-all bg-red-950/10"
            >
              Clear splits
            </button>
          )}

          {/* Reset colors button */}
          {hasCustomizations && (
            <button
              onClick={resetToDefaults}
              className="px-3 py-2 rounded-lg text-sm border border-indigo-500/20 text-indigo-400 hover:text-indigo-300 hover:border-indigo-500/40 transition-all bg-indigo-950/10"
              title="Reset to default colors from settings"
            >
              Reset Colors
            </button>
          )}

          {/* Contextual hints */}
          {!activeMode && !readOnly && (
            <span className="text-xs text-gray-600/80 italic">Click any line to customize its color</span>
          )}
          {addSplitMode && (
            <span className="text-xs text-indigo-300/60 italic">Click a data point to place split</span>
          )}
          {addNoteMode && (
            <span className="text-xs text-amber-300/60 italic">Click a data point to add note</span>
          )}
          {omitMode && (
            <span className="text-xs text-red-300/60 italic">Click a data point to omit/restore it</span>
          )}

          {/* Spacer + Print + Save */}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => window.print()}
              title="Print chart"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border bg-white/5 border-white/10 text-gray-400 hover:bg-white/8 hover:text-gray-200 hover:border-white/20 transition-all duration-200"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print
            </button>
            <button
              onClick={handleSave}
              title="Save chart to library"
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
                  Save Chart
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Target line input panel ── */}
      {showTargetInput && !readOnly && (
        <div className="flex items-end gap-3 p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/10 flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
              Target Value
            </label>
            <input
              ref={targetValueRef}
              type="number"
              value={targetDraft.value}
              onChange={(e) => setTargetDraft((d) => ({ ...d, value: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Enter") commitTarget(); if (e.key === "Escape") setShowTargetInput(false); }}
              placeholder="e.g. 42.5"
              className="w-32 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-emerald-400/50 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
              Label (optional)
            </label>
            <input
              type="text"
              value={targetDraft.label}
              onChange={(e) => setTargetDraft((d) => ({ ...d, label: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Enter") commitTarget(); if (e.key === "Escape") setShowTargetInput(false); }}
              placeholder="e.g. Target"
              className="w-36 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-emerald-400/50 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
              Colour
            </label>
            <div className="flex gap-1.5">
              {(["red", "amber", "green", "blue"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setTargetDraft((d) => ({ ...d, color: c }))}
                  title={c}
                  className={`w-7 h-7 rounded-md border-2 transition-all ${
                    targetDraft.color === c ? "border-white scale-110" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: TARGET_COLORS[c] }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pb-0.5">
            <button
              onClick={commitTarget}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600/80 hover:bg-emerald-600 text-white border border-emerald-500/50 transition-colors"
            >
              {editingTargetId ? "Update" : "Add"}
            </button>
            <button
              onClick={() => { setShowTargetInput(false); setEditingTargetId(null); }}
              className="px-3 py-2 rounded-lg text-sm text-gray-400 border border-white/10 hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            {editingTargetId && (
              <button
                onClick={() => deleteTarget(editingTargetId)}
                className="px-3 py-2 rounded-lg text-sm text-red-400 border border-red-500/20 hover:border-red-500/40 bg-red-950/20 transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Active target lines list ── */}
      {targetLines.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-gray-600 uppercase tracking-wider font-semibold">Targets:</span>
          {targetLines.map((t) => (
            <button
              key={t.id}
              onClick={() => !readOnly && openEditTarget(t)}
              disabled={readOnly}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-all hover:opacity-80"
              style={{
                borderColor: TARGET_COLORS[t.color] + "60",
                color: TARGET_COLORS[t.color],
                backgroundColor: TARGET_COLORS[t.color] + "15",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: TARGET_COLORS[t.color] }} />
              {t.label || `${t.value.toFixed(2)}`}
              {t.label && <span className="text-[10px] opacity-60">({t.value.toFixed(2)})</span>}
            </button>
          ))}
        </div>
      )}

      {/* ── Tab navigation (Control Chart / Distribution) ── */}
      <div className="flex items-center gap-0 rounded-lg border border-white/10 bg-white/5 overflow-hidden w-fit">
        <button
          onClick={() => setActiveTab("control")}
          className={`px-5 py-2 text-sm font-semibold transition-all duration-150 select-none flex items-center gap-2 ${
            activeTab === "control"
              ? "bg-indigo-600 text-white"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          Control Chart
        </button>
        <button
          onClick={() => setActiveTab("distribution")}
          className={`px-5 py-2 text-sm font-semibold transition-all duration-150 select-none flex items-center gap-2 ${
            activeTab === "distribution"
              ? "bg-indigo-600 text-white"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="4" height="18" rx="1" />
            <rect x="9" y="7" width="4" height="14" rx="1" />
            <rect x="16" y="11" width="4" height="10" rx="1" />
          </svg>
          Distribution
        </button>
      </div>

      {/* ── Tab: Control Chart ── */}
      {activeTab === "control" && (
        <>
          {/* Main Chart */}
          <div
            className={`w-full rounded-xl overflow-hidden border transition-all duration-150 ${
              activeMode
                ? omitMode
                  ? "border-red-500/50 shadow-[0_0_0_1px_rgba(239,68,68,0.12),0_0_20px_rgba(239,68,68,0.07)]"
                  : addNoteMode
                  ? "border-amber-500/50 shadow-[0_0_0_1px_rgba(251,191,36,0.12),0_0_20px_rgba(251,191,36,0.07)]"
                  : "border-indigo-500/50 shadow-[0_0_0_1px_rgba(99,102,241,0.15),0_0_20px_rgba(99,102,241,0.08)]"
                : "border-white/5"
            }`}
          >
            <Plot
              data={data}
              layout={layout}
              config={config}
              onClick={handleClick}
              style={{
                width: "100%",
                minHeight: "420px",
                cursor: activeMode ? "crosshair" : "default",
              }}
              useResizeHandler
            />
          </div>

          {/* Moving Range Chart */}
          {showMrChart && (
            <div className="w-full rounded-xl overflow-hidden border border-white/5">
              <div className="flex items-center gap-2 px-4 pt-3 pb-0">
                <span className="text-[11px] font-semibold text-violet-400 uppercase tracking-wider">
                  Moving Range
                </span>
                <span className="text-[10px] text-gray-600">
                  R̄ = {spc.mrMean.toFixed(3)}
                  {"  ·  "}
                  UCL = {spc.mrUcl.toFixed(3)}
                  {omittedIndices.length > 0 && (
                    <span className="ml-2 text-gray-700">
                      · {omittedIndices.length} omitted
                    </span>
                  )}
                </span>
              </div>
              <Plot
                data={mrData}
                layout={mrLayout}
                config={{
                  ...config,
                  toImageButtonOptions: { filename: `${localTitle.replace(/\s+/g, "_")}_MR` },
                }}
                style={{ width: "100%", height: "180px" }}
                useResizeHandler
              />
            </div>
          )}
        </>
      )}

      {/* ── Tab: Distribution (Histogram) ── */}
      {activeTab === "distribution" && (
        <HistogramChart
          values={histogramValues}
          title={localTitle}
          unit={unit}
        />
      )}

      {/* ── Chart Values Display ── */}
      {activeTab === "control" && (
        <ChartValuesDisplay
          spc={spc}
          method={method}
          unit={unit}
          splitModes={splitModes}
          colors={colors}
        />
      )}

      {/* ── Color Picker Modal ── */}
      {colorPickerState && (
        <ChartColorPickerModal
          colorKey={colorPickerState.colorKey}
          currentColor={colors[colorPickerState.colorKey]}
          label={colorPickerState.label}
          onColorChange={updateColor}
          onClose={() => setColorPickerState(null)}
          position={colorPickerState.position}
        />
      )}

      {/* ── Annotation Popover ── */}
      {popover !== null && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPopover(null)} />
          <div
            className="fixed z-50 bg-[#1c1c2e] border border-amber-500/40 rounded-xl shadow-2xl p-4 w-72"
            style={{
              left: Math.min(popover.x, window.innerWidth - 300),
              top: Math.min(popover.y - 10, window.innerHeight - 160),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xs text-amber-400 font-semibold mb-2">
              {popover.existingText
                ? `Edit note — ${dates[popover.dateIndex]}`
                : `Add note — ${dates[popover.dateIndex]}`}
            </div>
            <input
              ref={popoverInputRef}
              value={popoverDraft}
              onChange={(e) => setPopoverDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commitAnnotation(); if (e.key === "Escape") setPopover(null); }}
              placeholder={`Note for ${dates[popover.dateIndex]}…`}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-amber-400/50 transition-colors"
            />
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={commitAnnotation}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-amber-600/80 hover:bg-amber-600 text-white border border-amber-500/50 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setPopover(null)}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 transition-colors"
              >
                Cancel
              </button>
              {popover.existingText && (
                <button
                  onClick={deleteAnnotation}
                  title="Delete this note"
                  className="py-1.5 px-2.5 rounded-lg text-xs text-red-400 border border-red-500/20 hover:border-red-500/40 bg-red-950/20 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Segment Label Editing Popover ── */}
      {editingSegmentLabel !== null && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setEditingSegmentLabel(null)} />
          <div
            className="fixed z-50 bg-[#1c1c2e] border border-cyan-500/40 rounded-xl shadow-2xl p-4 w-80"
            style={{
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xs text-cyan-400 font-semibold mb-2">
              Label Segment {editingSegmentLabel + 1}
            </div>
            <input
              ref={segmentLabelInputRef}
              value={segmentLabelDraft}
              onChange={(e) => setSegmentLabelDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitSegmentLabel();
                if (e.key === "Escape") setEditingSegmentLabel(null);
              }}
              placeholder="e.g., Normal Service, Experimental Redesign..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-cyan-400/50 transition-colors"
            />
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={commitSegmentLabel}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600/80 hover:bg-cyan-600 text-white border border-cyan-500/50 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setEditingSegmentLabel(null)}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 transition-colors"
              >
                Cancel
              </button>
              {segmentLabels[editingSegmentLabel] && (
                <button
                  onClick={() => {
                    const newLabels = { ...segmentLabels };
                    delete newLabels[editingSegmentLabel];
                    setSegmentLabels(newLabels);
                    onSegmentLabelsChange?.(newLabels);
                    setEditingSegmentLabel(null);
                  }}
                  title="Remove label"
                  className="py-1.5 px-2.5 rounded-lg text-xs text-red-400 border border-red-500/20 hover:border-red-500/40 bg-red-950/20 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Segment statistics cards ── */}
      {spc.segments.length > 0 && activeTab === "control" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-0.5">
              {hasMultipleSegments ? "Segment Statistics" : "Process Statistics"}
            </h3>
            {hasMultipleSegments && (
              <span className="text-xs text-gray-600">
                {spc.segments.length} segments · {splitIndices.length} split{splitIndices.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div
            className={`grid gap-3 ${
              hasMultipleSegments ? "sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 max-w-sm"
            }`}
          >
            {spc.segments.map((seg, i) => {
              const sigInfo = segmentSignals[i];
              const splitAfter = splitIndices[i];
              const n = seg.endIndex - seg.startIndex + 1;
              const startDate = dates[seg.startIndex] ?? `Point ${seg.startIndex + 1}`;
              const endDate = dates[seg.endIndex] ?? `Point ${seg.endIndex + 1}`;
              const totalSignals = sigInfo.runCount + sigInfo.trendCount;
              const openingSplitIdx = i > 0 ? splitIndices[i - 1] : null;
              const isRunSplit = openingSplitIdx !== null && splitModes[openingSplitIdx] === "run";

              // Trend slope for this segment
              const slope = showTrendLine ? (trendTraces.slopes[i] ?? 0) : null;
              const trendLabel =
                slope !== null
                  ? slope > 0.1
                    ? `↑ Upward trend`
                    : slope < -0.1
                    ? `↓ Downward trend`
                    : `→ Stable`
                  : null;

              return (
                <div
                  key={i}
                  className={`bg-white/[0.03] border rounded-xl p-4 space-y-3 transition-colors ${
                    isRunSplit ? "border-purple-500/30" : "border-white/8"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Segment label (if set) */}
                        {segmentLabels[i] && (
                          <div className="text-sm font-semibold text-cyan-400">
                            {segmentLabels[i]}
                          </div>
                        )}
                        <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
                          {hasMultipleSegments ? `Segment ${i + 1}` : "Overall"}
                        </div>
                        {/* Label edit button */}
                        {!readOnly && (
                          <button
                            onClick={() => startEditingSegmentLabel(i)}
                            title="Label this segment"
                            className="text-[10px] text-gray-600 hover:text-cyan-400 transition-colors"
                          >
                            {segmentLabels[i] ? "✎" : "+ Label"}
                          </button>
                        )}
                        {isRunSplit && (
                          <span className="text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded uppercase tracking-wider">
                            Run Split
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-300 font-medium">
                        {startDate}
                        {startDate !== endDate && (
                          <> <span className="text-gray-600">→</span> {endDate}</>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-600 mt-0.5">
                        <span className="font-medium text-gray-500">Data Volume:</span> {n} data point{n !== 1 ? "s" : ""}
                        {omittedIndices.filter((oi) => oi >= seg.startIndex && oi <= seg.endIndex).length > 0 && (
                          <span className="ml-1.5 text-gray-700">
                            ({omittedIndices.filter((oi) => oi >= seg.startIndex && oi <= seg.endIndex).length} omitted)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {!readOnly && openingSplitIdx !== null && (
                        <button
                          onClick={() => toggleRunSplit(openingSplitIdx)}
                          title={isRunSplit ? "Disable Run Split (restore UCL/LCL)" : "Enable Run Split (hide UCL/LCL for transition period)"}
                          className={`text-[10px] font-semibold px-2 py-1 rounded-md border transition-colors ${
                            isRunSplit
                              ? "bg-purple-500/20 border-purple-500/40 text-purple-300 hover:bg-purple-500/30"
                              : "border-white/10 text-gray-600 hover:text-purple-400 hover:border-purple-500/30 bg-white/3"
                          }`}
                        >
                          {isRunSplit ? "↺ Restore limits" : "Run split"}
                        </button>
                      )}

                      {!readOnly && i < spc.segments.length - 1 && splitAfter !== undefined && onAddSplit && (
                        <button
                          onClick={() => onAddSplit(splitAfter)}
                          title={`Remove split at ${dates[splitAfter]}`}
                          className="text-[11px] text-red-400/60 hover:text-red-400 transition-colors border border-red-500/15 hover:border-red-500/40 rounded-md px-2 py-1 bg-red-950/10"
                        >
                          ✕ Remove
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div>
                      <div className="text-[10px] text-gray-600 mb-0.5">{centreLabel}</div>
                      <div className="text-sm font-semibold text-indigo-400">
                        {seg.mean.toFixed(2)}{unit ? ` ${unit}` : ""}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-600 mb-0.5">R̄ Avg Range</div>
                      <div className="text-sm font-semibold text-gray-300">
                        {seg.avgMovingRange.toFixed(2)}
                      </div>
                    </div>
                    {!isRunSplit && (
                      <>
                        <div>
                          <div className="text-[10px] text-gray-600 mb-0.5">UCL</div>
                          <div className="text-sm font-semibold text-red-400">{seg.ucl.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-600 mb-0.5">LCL</div>
                          <div className="text-sm font-semibold text-red-400">{seg.lcl.toFixed(2)}</div>
                        </div>
                      </>
                    )}
                    {isRunSplit && (
                      <div className="col-span-2">
                        <div className="text-[10px] text-purple-400/70 italic">
                          UCL/LCL hidden — transition period
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Feature 3: Trend info */}
                  {slope !== null && trendLabel && (
                    <div className="pt-2 border-t border-white/5">
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] font-medium ${
                          slope > 0.1 ? "text-amber-400" : slope < -0.1 ? "text-blue-400" : "text-green-400"
                        }`}>
                          {trendLabel}
                        </span>
                        <span className="text-[10px] text-gray-600 font-mono">
                          {slope >= 0 ? "+" : ""}{slope.toFixed(3)} / period
                        </span>
                      </div>
                    </div>
                  )}

                  <div className={`pt-2 border-t border-white/5 ${slope !== null ? "!pt-0 !border-t-0" : ""}`}>
                    {totalSignals === 0 ? (
                      <span className="text-[11px] text-green-400/70">✓ No signals detected</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {sigInfo.runCount > 0 && (
                          <span className="text-[11px] text-red-400 bg-red-950/30 border border-red-500/15 px-2 py-0.5 rounded-md">
                            {sigInfo.runCount} run signal{sigInfo.runCount > 1 ? "s" : ""}
                          </span>
                        )}
                        {sigInfo.trendCount > 0 && (
                          <span className="text-[11px] text-orange-400 bg-orange-950/30 border border-orange-500/15 px-2 py-0.5 rounded-md">
                            {sigInfo.trendCount} trend signal{sigInfo.trendCount > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

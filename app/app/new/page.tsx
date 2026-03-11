"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import FileUpload, { WorkbookData, ParsedSheet } from "@/components/FileUpload";
import ColumnMapper, { MappedDataset } from "@/components/ColumnMapper";
import ManualDataEntry from "@/components/ManualDataEntry";
import { dummyDataset } from "@/lib/dummyData";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { Annotation } from "@/lib/chartStorage";

const SpcChart = dynamic(() => import("@/components/SpcChart"), { ssr: false });
const ScatterPlot = dynamic(() => import("@/components/ScatterPlot"), { ssr: false });
const CusumChart = dynamic(() => import("@/components/CusumChart"), { ssr: false });
const ParetoChart = dynamic(() => import("@/components/ParetoChart"), { ssr: false });
const AttributeChartDyn = dynamic(() => import("@/components/AttributeChartWrapper"), { ssr: false });
const SubgroupChart = dynamic(() => import("@/components/SubgroupChart"), { ssr: false });
const EwmaChart = dynamic(() => import("@/components/EwmaChart"), { ssr: false });
const RunChartComponent = dynamic(() => import("@/components/RunChart"), { ssr: false });
const MovingAverageChart = dynamic(() => import("@/components/MovingAverageChart"), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

type ChartType = "xmr" | "cusum" | "pchart" | "npchart" | "cchart" | "uchart" | "pareto" | "xbar-r" | "xbar-s" | "ewma" | "run" | "moving-avg";
type AppState = "type-select" | "upload" | "sheet-select" | "mapping" | "charts";

interface AttributeConfig {
  col1: string;   // primary data column index
  col2: string;   // secondary (sample size / units) column index
  fixedN: string; // for np-chart
}

// ─── Chart type definitions ───────────────────────────────────────────────────

const CHART_TYPES: Array<{
  type: ChartType;
  label: string;
  icon: string;
  desc: string;
  detail: string;
  cols: "single" | "double" | "double-opt";
}> = [
  {
    type: "xmr",
    label: "XmR Chart",
    icon: "📈",
    desc: "Continuous data",
    detail: "The classic Individual and Moving Range chart. Best for most continuous measurements over time.",
    cols: "single",
  },
  {
    type: "cusum",
    label: "CuSum",
    icon: "🔎",
    desc: "Detect small shifts",
    detail: "Cumulative Sum chart. Excellent for detecting small, sustained shifts in the process mean.",
    cols: "single",
  },
  {
    type: "pchart",
    label: "p-Chart",
    icon: "📉",
    desc: "Proportion defective",
    detail: "Proportion of defective items. Use when sample sizes vary between periods.",
    cols: "double",
  },
  {
    type: "npchart",
    label: "np-Chart",
    icon: "🔢",
    desc: "Count defective",
    detail: "Count of defective items with a fixed sample size. Simpler than p-chart when n is constant.",
    cols: "double-opt",
  },
  {
    type: "cchart",
    label: "c-Chart",
    icon: "🐛",
    desc: "Defect count",
    detail: "Count of defects per fixed inspection area or time period. Based on Poisson distribution.",
    cols: "single",
  },
  {
    type: "uchart",
    label: "u-Chart",
    icon: "📐",
    desc: "Defects per unit",
    detail: "Defects per inspection unit when the number of units inspected varies.",
    cols: "double",
  },
  {
    type: "pareto",
    label: "Pareto",
    icon: "📊",
    desc: "Vital few causes",
    detail: "Bar chart sorted by frequency with cumulative % line. Identifies the vital few causes.",
    cols: "double",
  },
  {
    type: "xbar-r",
    label: "X̄-R Chart",
    icon: "📐",
    desc: "Subgroup means & ranges",
    detail: "Subgroup means and ranges. For when you measure multiple samples per time period.",
    cols: "single",
  },
  {
    type: "xbar-s",
    label: "X̄-S Chart",
    icon: "📏",
    desc: "Subgroup means & std dev",
    detail: "Subgroup means and standard deviations. Better for larger subgroups (n>10).",
    cols: "single",
  },
  {
    type: "ewma",
    label: "EWMA",
    icon: "🎯",
    desc: "Detect small shifts",
    detail: "Exponentially weighted moving average. Detects small, sustained shifts in the process mean.",
    cols: "single",
  },
  {
    type: "run",
    label: "Run Chart",
    icon: "〰️",
    desc: "Pattern detection",
    detail: "Simple time series with median. No control limits — just pattern detection.",
    cols: "single",
  },
  {
    type: "moving-avg",
    label: "Moving Average",
    icon: "📉",
    desc: "Smoothed trend",
    detail: "Smoothed trend with moving window. Reduces noise in volatile data.",
    cols: "single",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildDatasetFromDummy(): MappedDataset {
  return {
    name: dummyDataset.name,
    dates: dummyDataset.dates,
    measures: dummyDataset.measures.map((m) => ({
      name: m.name,
      unit: m.unit,
      data: m.data,
    })),
  };
}

function sheetPreview(sheet: ParsedSheet) {
  const nonEmpty = sheet.rawRows.filter((r) =>
    r.some((v) => v !== null && v !== undefined && v !== "")
  );
  const maxCols = Math.max(0, ...sheet.rawRows.slice(0, 20).map((r) => r.length));
  return { rows: nonEmpty.length, cols: maxCols };
}

/** Build column labels from first few rows */
function buildColumnOptions(rawRows: (string | number | null)[][]) {
  const maxCols = Math.max(0, ...rawRows.slice(0, 20).map((r) => r.length));
  return Array.from({ length: maxCols }, (_, colIdx) => {
    let label = "";
    for (let rowIdx = 0; rowIdx < Math.min(3, rawRows.length); rowIdx++) {
      const v = rawRows[rowIdx]?.[colIdx];
      if (v !== null && v !== undefined && v !== "" && typeof v === "string") {
        label = v;
        break;
      }
    }
    const letter = colLetter(colIdx);
    return { index: colIdx, display: label ? `Col ${letter} – ${label}` : `Col ${letter}` };
  });
}

function colLetter(idx: number): string {
  let letter = "";
  let i = idx;
  while (i >= 0) {
    letter = String.fromCharCode(65 + (i % 26)) + letter;
    i = Math.floor(i / 26) - 1;
  }
  return letter;
}

// ─── Column mapper for attribute charts ──────────────────────────────────────

interface AttributeColMapProps {
  sheet: ParsedSheet;
  chartType: ChartType;
  onConfirm: (config: AttributeConfig & { dates: string[]; dateCol: string }) => void;
}

function AttributeColMap({ sheet, chartType, onConfirm }: AttributeColMapProps) {
  const [dateCol, setDateCol] = useState("");
  const [col1, setCol1] = useState("");
  const [col2, setCol2] = useState("");
  const [fixedN, setFixedN] = useState("100");

  const opts = buildColumnOptions(sheet.rawRows);

  const getLabel1 = () => {
    if (chartType === "pchart") return "Defectives count column";
    if (chartType === "npchart") return "Defectives count column";
    if (chartType === "cchart") return "Defect count column";
    if (chartType === "uchart") return "Defects column";
    if (chartType === "pareto") return "Category / label column";
    return "Data column";
  };

  const getLabel2 = () => {
    if (chartType === "pchart") return "Sample size column";
    if (chartType === "uchart") return "Inspection units column";
    if (chartType === "pareto") return "Count / frequency column";
    return "";
  };

  const needsCol2 = ["pchart", "uchart", "pareto"].includes(chartType);
  const needsFixedN = chartType === "npchart";

  const isValid =
    dateCol !== "" &&
    col1 !== "" &&
    (!needsCol2 || col2 !== "") &&
    (!needsFixedN || parseFloat(fixedN) > 0);

  const handleConfirm = () => {
    const dateIdx = parseInt(dateCol, 10);
    const dataRows = sheet.rawRows.filter((row) => {
      const v = row[dateIdx];
      return v !== null && v !== undefined && v !== "";
    });
    const dates = dataRows.map((row) => String(row[dateIdx] ?? ""));
    onConfirm({ col1, col2, fixedN, dates, dateCol });
  };

  return (
    <div className="space-y-5 p-6 bg-white/3 border border-white/8 rounded-xl">
      <h3 className="text-white font-semibold">Map your columns</h3>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Period / date column</label>
        <select
          value={dateCol}
          onChange={(e) => setDateCol(e.target.value)}
          className="w-full bg-[#141414] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="">— Select column —</option>
          {opts.map((o) => (
            <option key={o.index} value={String(o.index)}>{o.display}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">{getLabel1()}</label>
        <select
          value={col1}
          onChange={(e) => setCol1(e.target.value)}
          className="w-full bg-[#141414] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="">— Select column —</option>
          {opts.map((o) => (
            <option key={o.index} value={String(o.index)}>{o.display}</option>
          ))}
        </select>
      </div>

      {needsCol2 && (
        <div>
          <label className="block text-xs text-gray-400 mb-1">{getLabel2()}</label>
          <select
            value={col2}
            onChange={(e) => setCol2(e.target.value)}
            className="w-full bg-[#141414] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="">— Select column —</option>
            {opts.map((o) => (
              <option key={o.index} value={String(o.index)}>{o.display}</option>
            ))}
          </select>
        </div>
      )}

      {needsFixedN && (
        <div>
          <label className="block text-xs text-gray-400 mb-1">Fixed sample size (n)</label>
          <input
            type="number"
            min="1"
            value={fixedN}
            onChange={(e) => setFixedN(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>
      )}

      <button
        disabled={!isValid}
        onClick={handleConfirm}
        className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
      >
        Build Chart
      </button>
    </div>
  );
}

// ─── Attribute chart data state ───────────────────────────────────────────────

interface AttributeData {
  dates: string[];
  col1Values: number[];
  col1Strings: string[];
  col2Values: number[];
  fixedN: number;
  col1: string;
  col2: string;
}

function extractColValues(sheet: ParsedSheet, colStr: string, dateCol: string): number[] {
  const dateIdx = parseInt(dateCol, 10);
  const colIdx = parseInt(colStr, 10);
  return sheet.rawRows
    .filter((row) => {
      const v = row[dateIdx];
      return v !== null && v !== undefined && v !== "";
    })
    .map((row) => {
      const v = row[colIdx];
      return typeof v === "number" ? v : parseFloat(String(v ?? "0")) || 0;
    });
}

function extractColStrings(sheet: ParsedSheet, colStr: string, dateCol: string): string[] {
  const dateIdx = parseInt(dateCol, 10);
  const colIdx = parseInt(colStr, 10);
  return sheet.rawRows
    .filter((row) => {
      const v = row[dateIdx];
      return v !== null && v !== undefined && v !== "";
    })
    .map((row) => String(row[colIdx] ?? ""));
}

// ─── Subgroup Column Mapper ───────────────────────────────────────────────────

interface SubgroupColMapProps {
  sheet: ParsedSheet;
  onConfirm: (data: { subgroups: number[][]; labels: string[] }) => void;
}

function SubgroupColMap({ sheet, onConfirm }: SubgroupColMapProps) {
  const [mode, setMode] = useState<"columns" | "grouping">("columns");
  const [labelCol, setLabelCol] = useState("");
  const [measureCols, setMeasureCols] = useState<string[]>([]);
  const [groupCol, setGroupCol] = useState("");
  const [valueCol, setValueCol] = useState("");

  const opts = buildColumnOptions(sheet.rawRows);

  const toggleMeasureCol = (colStr: string) => {
    setMeasureCols((prev) =>
      prev.includes(colStr) ? prev.filter((c) => c !== colStr) : [...prev, colStr]
    );
  };

  const isValid = mode === "columns"
    ? labelCol !== "" && measureCols.length >= 2
    : labelCol !== "" && groupCol !== "" && valueCol !== "";

  const handleConfirm = () => {
    if (mode === "columns") {
      // Each row is a subgroup, measurement columns are the values
      const labelIdx = parseInt(labelCol, 10);
      const colIndices = measureCols.map((c) => parseInt(c, 10));
      const subgroups: number[][] = [];
      const labels: string[] = [];

      for (const row of sheet.rawRows) {
        const lbl = row[labelIdx];
        if (lbl === null || lbl === undefined || lbl === "") continue;
        const vals = colIndices.map((ci) => {
          const v = row[ci];
          return typeof v === "number" ? v : parseFloat(String(v ?? "0")) || 0;
        });
        // Skip if all zeros/NaN
        if (vals.some((v) => !isNaN(v))) {
          subgroups.push(vals);
          labels.push(String(lbl));
        }
      }
      onConfirm({ subgroups, labels });
    } else {
      // Grouping mode: group by one column, measurements from another
      const labelIdx = parseInt(labelCol, 10);
      const groupIdx = parseInt(groupCol, 10);
      const valIdx = parseInt(valueCol, 10);

      const groupMap = new Map<string, number[]>();
      const groupOrder: string[] = [];

      for (const row of sheet.rawRows) {
        const lbl = row[labelIdx];
        if (lbl === null || lbl === undefined || lbl === "") continue;
        const group = String(row[groupIdx] ?? "");
        const val = typeof row[valIdx] === "number" ? row[valIdx] : parseFloat(String(row[valIdx] ?? "0"));
        if (isNaN(val as number)) continue;

        if (!groupMap.has(group)) {
          groupMap.set(group, []);
          groupOrder.push(group);
        }
        groupMap.get(group)!.push(val as number);
      }

      const subgroups = groupOrder.map((g) => groupMap.get(g)!);
      onConfirm({ subgroups, labels: groupOrder });
    }
  };

  return (
    <div className="space-y-5 p-6 bg-white/3 border border-white/8 rounded-xl">
      <h3 className="text-white font-semibold">Map your subgroup data</h3>

      {/* Mode toggle */}
      <div className="flex items-center rounded-lg border border-white/10 bg-white/5 overflow-hidden w-fit">
        <button
          onClick={() => setMode("columns")}
          className={`px-4 py-2 text-sm font-semibold transition-all ${
            mode === "columns" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Multiple Columns
        </button>
        <button
          onClick={() => setMode("grouping")}
          className={`px-4 py-2 text-sm font-semibold transition-all ${
            mode === "grouping" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Grouping Column
        </button>
      </div>

      <p className="text-xs text-gray-500">
        {mode === "columns"
          ? "Each row is a subgroup. Select the columns that contain your measurements."
          : "Data is stacked — one row per measurement. Group by a column to form subgroups."}
      </p>

      {/* Label column */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          {mode === "columns" ? "Subgroup label column" : "Label / Date column"}
        </label>
        <select
          value={labelCol}
          onChange={(e) => setLabelCol(e.target.value)}
          className="w-full bg-[#141414] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="">— Select column —</option>
          {opts.map((o) => (
            <option key={o.index} value={String(o.index)}>{o.display}</option>
          ))}
        </select>
      </div>

      {mode === "columns" ? (
        <div>
          <label className="block text-xs text-gray-400 mb-2">
            Measurement columns (select 2+)
          </label>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {opts.map((o) => {
              const colStr = String(o.index);
              const isSelected = measureCols.includes(colStr);
              return (
                <button
                  key={o.index}
                  onClick={() => toggleMeasureCol(colStr)}
                  className={`text-left px-3 py-2 rounded-lg text-sm border transition-all ${
                    isSelected
                      ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-300"
                      : "bg-white/3 border-white/8 text-gray-400 hover:border-white/20"
                  }`}
                >
                  {isSelected && "✓ "}{o.display}
                </button>
              );
            })}
          </div>
          {measureCols.length > 0 && (
            <p className="text-xs text-indigo-400 mt-2">
              {measureCols.length} columns selected → subgroup size n = {measureCols.length}
            </p>
          )}
        </div>
      ) : (
        <>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Grouping column</label>
            <select
              value={groupCol}
              onChange={(e) => setGroupCol(e.target.value)}
              className="w-full bg-[#141414] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="">— Select column —</option>
              {opts.map((o) => (
                <option key={o.index} value={String(o.index)}>{o.display}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Measurement value column</label>
            <select
              value={valueCol}
              onChange={(e) => setValueCol(e.target.value)}
              className="w-full bg-[#141414] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="">— Select column —</option>
              {opts.map((o) => (
                <option key={o.index} value={String(o.index)}>{o.display}</option>
              ))}
            </select>
          </div>
        </>
      )}

      <button
        disabled={!isValid}
        onClick={handleConfirm}
        className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
      >
        Build Chart
      </button>
    </div>
  );
}

// ─── Main page component ──────────────────────────────────────────────────────

function NewChartPageInner() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type") as ChartType | null;
  const demoParam = searchParams.get("demo");

  const [chartType, setChartType] = useState<ChartType | null>(typeParam ?? null);
  const [state, setState] = useState<AppState>(
    typeParam ? "upload" : "type-select"
  );

  const [workbookData, setWorkbookData] = useState<WorkbookData | null>(null);
  const [parsedSheet, setParsedSheet] = useState<ParsedSheet | null>(null);

  // XmR / CuSum dataset
  const [dataset, setDataset] = useState<MappedDataset | null>(null);
  const [splitIndicesMap, setSplitIndicesMap] = useState<Record<string, number[]>>({});
  const [annotationsMap, setAnnotationsMap] = useState<Record<string, Annotation[]>>({});
  const [titlesMap, setTitlesMap] = useState<Record<string, string>>({});
  const [omittedMap, setOmittedMap] = useState<Record<string, number[]>>({});
  const [xAxisLabelsMap, setXAxisLabelsMap] = useState<Record<string, string>>({});
  const [yAxisLabelsMap, setYAxisLabelsMap] = useState<Record<string, string>>({});
  const [segmentLabelsMap, setSegmentLabelsMap] = useState<Record<string, Record<number, string>>>({});
  const [showScatter, setShowScatter] = useState(false);
  const [usingDemo, setUsingDemo] = useState(false);

  // Attribute chart data
  const [attrData, setAttrData] = useState<AttributeData | null>(null);

  // Load demo if ?demo=1
  useEffect(() => {
    if (demoParam === "1") {
      const d = buildDatasetFromDummy();
      setDataset(d);
      setChartType("xmr");
      setUsingDemo(true);
      setState("charts");
    }
  }, [demoParam]);

  const handleSelectType = (t: ChartType) => {
    setChartType(t);
    setState("upload");
  };

  const handleWorkbookParsed = (data: WorkbookData) => {
    setWorkbookData(data);
    setUsingDemo(false);
    if (data.sheetNames.length === 1) {
      setParsedSheet(data.sheets[data.sheetNames[0]]);
      setState("mapping");
    } else {
      setState("sheet-select");
    }
  };

  const handleSheetSelected = (sheetName: string) => {
    if (!workbookData) return;
    setParsedSheet(workbookData.sheets[sheetName]);
    setState("mapping");
  };

  const handleConfirmXmr = (mapped: MappedDataset) => {
    setDataset(mapped);
    setSplitIndicesMap({});
    setAnnotationsMap({});
    setTitlesMap({});
    setOmittedMap({});
    setXAxisLabelsMap({});
    setYAxisLabelsMap({});
    setSegmentLabelsMap({});
    setShowScatter(false);
    setState("charts");
  };

  const handleAttributeConfirm = (
    config: AttributeConfig & { dates: string[]; dateCol: string }
  ) => {
    if (!parsedSheet) return;
    const col1Values = extractColValues(parsedSheet, config.col1, config.dateCol);
    const col1Strings = extractColStrings(parsedSheet, config.col1, config.dateCol);
    const col2Values = config.col2
      ? extractColValues(parsedSheet, config.col2, config.dateCol)
      : [];
    setAttrData({
      dates: config.dates,
      col1Values,
      col1Strings,
      col2Values,
      fixedN: parseFloat(config.fixedN) || 100,
      col1: config.col1,
      col2: config.col2,
    });
    setState("charts");
  };

  const handleReset = () => {
    setParsedSheet(null);
    setWorkbookData(null);
    setDataset(null);
    setAttrData(null);
    setSubgroupData(null);
    setSplitIndicesMap({});
    setAnnotationsMap({});
    setTitlesMap({});
    setOmittedMap({});
    setXAxisLabelsMap({});
    setYAxisLabelsMap({});
    setShowScatter(false);
    setUsingDemo(false);
    setState(chartType ? "upload" : "type-select");
  };

  const handleAddSplit = (measureName: string, pointIndex: number) => {
    setSplitIndicesMap((prev) => {
      const current = prev[measureName] ?? [];
      if (current.includes(pointIndex)) {
        return { ...prev, [measureName]: current.filter((i) => i !== pointIndex) };
      }
      return { ...prev, [measureName]: [...current, pointIndex].sort((a, b) => a - b) };
    });
  };

  const isAttributeType = chartType && ["pchart", "npchart", "cchart", "uchart", "pareto"].includes(chartType);
  const isSubgroupType = chartType && ["xbar-r", "xbar-s"].includes(chartType);
  const isSimpleAdvancedType = chartType && ["ewma", "run", "moving-avg"].includes(chartType);
  const ctDef = CHART_TYPES.find((c) => c.type === chartType);

  // Subgroup data state
  const [subgroupData, setSubgroupData] = useState<{ subgroups: number[][]; labels: string[] } | null>(null);

  return (
    <div className="px-4 sm:px-6 py-8 max-w-5xl mx-auto">
      {/* Header row */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">New Chart</h1>
          {chartType && ctDef && (
            <p className="text-sm text-gray-500 mt-1">
              {ctDef.icon} {ctDef.label} — {ctDef.desc}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {usingDemo && (
            <Badge variant="outline" className="text-xs text-amber-400 border-amber-400/30 bg-amber-400/5">
              Demo data
            </Badge>
          )}
          {state !== "type-select" && state !== "upload" && (
            <button
              onClick={handleReset}
              className="text-sm text-gray-500 hover:text-white transition-colors"
            >
              ↑ Start over
            </button>
          )}
          {chartType && state === "upload" && (
            <button
              onClick={() => { setChartType(null); setState("type-select"); }}
              className="text-sm text-gray-500 hover:text-white transition-colors"
            >
              ← Change type
            </button>
          )}
        </div>
      </div>

      {/* Step: Type selection */}
      {state === "type-select" && (
        <div>
          <p className="text-sm text-gray-500 mb-6">
            What type of data do you have? Choose the right chart for your situation.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CHART_TYPES.map((ct) => (
              <button
                key={ct.type}
                onClick={() => handleSelectType(ct.type)}
                className="group flex flex-col items-start gap-2 p-5 rounded-2xl border border-white/8 bg-white/[0.025] hover:border-indigo-500/40 hover:bg-indigo-950/10 text-left transition-all duration-150"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{ct.icon}</span>
                  <span className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {ct.label}
                  </span>
                  <span className="text-[10px] text-gray-600 bg-white/5 px-1.5 py-0.5 rounded">
                    {ct.desc}
                  </span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{ct.detail}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step: Upload */}
      {state === "upload" && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold text-white mb-1">Add your data</h2>
            <p className="text-gray-500 text-sm">
              Upload a file, enter data manually, or load the demo dataset
            </p>
          </div>

          {/* Upload & Create Chart */}
          <FileUpload onWorkbookParsed={handleWorkbookParsed} />

          {/* Manual Entry — only for single-column chart types */}
          {(chartType === "xmr" || chartType === "cusum" || chartType === "ewma" || chartType === "run" || chartType === "moving-avg" || chartType === "cchart") && (
            <>
              <div className="flex items-center gap-4">
                <div className="flex-1 border-t border-white/8" />
                <span className="text-xs text-gray-600">or enter data manually</span>
                <div className="flex-1 border-t border-white/8" />
              </div>

              <div className="p-5 rounded-xl border border-white/8 bg-white/[0.02]">
                <ManualDataEntry
                  onConfirm={({ dates, values: vals }) => {
                    const d: MappedDataset = {
                      name: "Manual Entry",
                      dates,
                      measures: [{ name: "Value", unit: "", data: vals }],
                    };
                    setDataset(d);
                    setSplitIndicesMap({});
                    setAnnotationsMap({});
                    setTitlesMap({});
                    setOmittedMap({});
                    setXAxisLabelsMap({});
                    setYAxisLabelsMap({});
                    setShowScatter(false);
                    setUsingDemo(false);
                    setState("charts");
                  }}
                  valueLabel="Value"
                  valuePlaceholder="e.g. 42.5"
                />
              </div>
            </>
          )}

          {(chartType === "xmr" || chartType === "cusum" || chartType === "ewma" || chartType === "run" || chartType === "moving-avg") && (
            <>
              <div className="flex items-center gap-4">
                <div className="flex-1 border-t border-white/8" />
                <span className="text-xs text-gray-600">or</span>
                <div className="flex-1 border-t border-white/8" />
              </div>
              <button
                onClick={() => {
                  const d = buildDatasetFromDummy();
                  setDataset(d);
                  setUsingDemo(true);
                  setState("charts");
                }}
                className="w-full py-3 px-4 rounded-xl border border-indigo-500/30 bg-indigo-950/20 text-indigo-400 hover:bg-indigo-950/40 hover:border-indigo-400/50 transition-all text-sm font-medium"
              >
                Load demo dataset — Weekly Operations
              </button>
            </>
          )}
        </div>
      )}

      {/* Step: Sheet select */}
      {state === "sheet-select" && workbookData && (
        <div className="max-w-2xl mx-auto">
          <div className="mb-6 text-center">
            <h2 className="text-lg font-semibold text-white mb-1">Select a sheet</h2>
            <p className="text-gray-500 text-sm">
              {workbookData.sheetNames.length} sheets found — pick the one with your data
            </p>
          </div>
          <div className="grid gap-3">
            {workbookData.sheetNames.map((name) => {
              const preview = sheetPreview(workbookData.sheets[name]);
              return (
                <button
                  key={name}
                  onClick={() => handleSheetSelected(name)}
                  className="flex items-center justify-between w-full p-4 rounded-xl border border-white/10 bg-white/3 hover:border-indigo-500/50 hover:bg-indigo-950/20 text-left transition-all group"
                >
                  <span className="text-white font-medium group-hover:text-indigo-300 transition-colors">{name}</span>
                  <span className="text-xs text-gray-500 shrink-0 ml-4">
                    {preview.cols} col{preview.cols !== 1 ? "s" : ""} · {preview.rows} row{preview.rows !== 1 ? "s" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step: Column mapping */}
      {state === "mapping" && parsedSheet && (
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-1">Map your columns</h2>
            <p className="text-gray-500 text-sm">{parsedSheet.rawRows.length} rows detected</p>
          </div>
          {isSubgroupType ? (
            <SubgroupColMap
              sheet={parsedSheet}
              onConfirm={(data) => {
                setSubgroupData(data);
                setState("charts");
              }}
            />
          ) : isAttributeType ? (
            <AttributeColMap
              sheet={parsedSheet}
              chartType={chartType!}
              onConfirm={handleAttributeConfirm}
            />
          ) : (
            <ColumnMapper sheet={parsedSheet} onConfirm={handleConfirmXmr} />
          )}
        </div>
      )}

      {/* Step: Charts */}
      {state === "charts" && (
        <div className="space-y-6">
          {/* XmR charts */}
          {(chartType === "xmr" || chartType === null) && dataset && (
            <XmrChartView
              dataset={dataset}
              splitIndicesMap={splitIndicesMap}
              annotationsMap={annotationsMap}
              titlesMap={titlesMap}
              omittedMap={omittedMap}
              xAxisLabelsMap={xAxisLabelsMap}
              yAxisLabelsMap={yAxisLabelsMap}
              segmentLabelsMap={segmentLabelsMap}
              showScatter={showScatter}
              setShowScatter={setShowScatter}
              onAddSplit={handleAddSplit}
              onClearSplits={(name) => setSplitIndicesMap((p) => ({ ...p, [name]: [] }))}
              onAnnotationsChange={(name, a) => setAnnotationsMap((p) => ({ ...p, [name]: a }))}
              onTitleChange={(name, t) => setTitlesMap((p) => ({ ...p, [name]: t }))}
              onOmittedChange={(name, idx) => setOmittedMap((p) => ({ ...p, [name]: idx }))}
              onXAxisLabelChange={(name, label) => setXAxisLabelsMap((p) => ({ ...p, [name]: label }))}
              onYAxisLabelChange={(name, label) => setYAxisLabelsMap((p) => ({ ...p, [name]: label }))}
              onSegmentLabelsChange={(name, labels) => setSegmentLabelsMap((p) => ({ ...p, [name]: labels }))}
            />
          )}

          {/* CuSum chart */}
          {chartType === "cusum" && dataset && (
            <div className="space-y-6">
              <div className="mb-2">
                <h2 className="text-xl font-semibold text-white">{dataset.name}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {dataset.dates[0]} — {dataset.dates[dataset.dates.length - 1]} · {dataset.dates.length} points
                </p>
              </div>
              {dataset.measures.map((m) => (
                <CusumChart
                  key={m.name}
                  values={m.data}
                  dates={dataset.dates}
                  title={m.name}
                />
              ))}
            </div>
          )}

          {/* Attribute charts */}
          {isAttributeType && attrData && (
            <AttributeChartDyn
              chartType={chartType!}
              dates={attrData.dates}
              col1Values={attrData.col1Values}
              col1Strings={attrData.col1Strings}
              col2Values={attrData.col2Values}
              fixedN={attrData.fixedN}
            />
          )}

          {/* Subgroup charts (X̄-R, X̄-S) */}
          {isSubgroupType && subgroupData && (
            <div className="space-y-6">
              <div className="mb-2">
                <h2 className="text-xl font-semibold text-white">Subgroup Analysis</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {subgroupData.subgroups.length} subgroups · n = {subgroupData.subgroups[0]?.length ?? 0}
                </p>
              </div>
              <SubgroupChart
                subgroups={subgroupData.subgroups}
                labels={subgroupData.labels}
                title={`${chartType === "xbar-r" ? "X̄-R" : "X̄-S"} Chart`}
                chartType={chartType as "xbar-r" | "xbar-s"}
              />
            </div>
          )}

          {/* EWMA chart */}
          {chartType === "ewma" && dataset && (
            <div className="space-y-6">
              <div className="mb-2">
                <h2 className="text-xl font-semibold text-white">{dataset.name}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {dataset.dates[0]} — {dataset.dates[dataset.dates.length - 1]} · {dataset.dates.length} points
                </p>
              </div>
              {dataset.measures.map((m) => (
                <EwmaChart
                  key={m.name}
                  values={m.data}
                  dates={dataset.dates}
                  title={m.name}
                  unit={m.unit}
                />
              ))}
            </div>
          )}

          {/* Run chart */}
          {chartType === "run" && dataset && (
            <div className="space-y-6">
              <div className="mb-2">
                <h2 className="text-xl font-semibold text-white">{dataset.name}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {dataset.dates[0]} — {dataset.dates[dataset.dates.length - 1]} · {dataset.dates.length} points
                </p>
              </div>
              {dataset.measures.map((m) => (
                <RunChartComponent
                  key={m.name}
                  values={m.data}
                  dates={dataset.dates}
                  title={m.name}
                  unit={m.unit}
                />
              ))}
            </div>
          )}

          {/* Moving Average chart */}
          {chartType === "moving-avg" && dataset && (
            <div className="space-y-6">
              <div className="mb-2">
                <h2 className="text-xl font-semibold text-white">{dataset.name}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {dataset.dates[0]} — {dataset.dates[dataset.dates.length - 1]} · {dataset.dates.length} points
                </p>
              </div>
              {dataset.measures.map((m) => (
                <MovingAverageChart
                  key={m.name}
                  values={m.data}
                  dates={dataset.dates}
                  title={m.name}
                  unit={m.unit}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── XmR chart view (extracted to keep file manageable) ──────────────────────

interface XmrChartViewProps {
  dataset: MappedDataset;
  splitIndicesMap: Record<string, number[]>;
  annotationsMap: Record<string, Annotation[]>;
  titlesMap: Record<string, string>;
  omittedMap: Record<string, number[]>;
  xAxisLabelsMap: Record<string, string>;
  yAxisLabelsMap: Record<string, string>;
  showScatter: boolean;
  setShowScatter: (v: boolean) => void;
  onAddSplit: (name: string, idx: number) => void;
  onClearSplits: (name: string) => void;
  onAnnotationsChange: (name: string, a: Annotation[]) => void;
  onTitleChange: (name: string, t: string) => void;
  onOmittedChange: (name: string, idx: number[]) => void;
  onXAxisLabelChange: (name: string, label: string) => void;
  onYAxisLabelChange: (name: string, label: string) => void;
  segmentLabelsMap: Record<string, Record<number, string>>;
  onSegmentLabelsChange: (name: string, labels: Record<number, string>) => void;
}

function XmrChartView({
  dataset,
  splitIndicesMap,
  annotationsMap,
  titlesMap,
  omittedMap,
  xAxisLabelsMap,
  yAxisLabelsMap,
  showScatter,
  setShowScatter,
  onAddSplit,
  onClearSplits,
  onAnnotationsChange,
  onTitleChange,
  onOmittedChange,
  onXAxisLabelChange,
  onYAxisLabelChange,
  segmentLabelsMap,
  onSegmentLabelsChange,
}: XmrChartViewProps) {
  const hasMultipleMeasures = dataset.measures.length >= 2;

  return (
    <div className="space-y-2">
      {/* Dataset header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">{dataset.name}</h2>
        <p className="text-sm text-gray-500 mt-1">
          {dataset.dates[0]} — {dataset.dates[dataset.dates.length - 1]}
          {"  ·  "}
          {dataset.dates.length} data points
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        {hasMultipleMeasures && (
          <button
            onClick={() => setShowScatter(!showScatter)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all duration-150 select-none ${
              showScatter
                ? "bg-indigo-600 border-indigo-500 text-white shadow-[0_0_14px_rgba(99,102,241,0.4)]"
                : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/8 hover:text-gray-200 hover:border-white/20"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="7.5" cy="7.5" r="1.5" />
              <circle cx="18.5" cy="5.5" r="1.5" />
              <circle cx="11.5" cy="11.5" r="1.5" />
              <circle cx="7.5" cy="16.5" r="1.5" />
              <circle cx="17.5" cy="13.5" r="1.5" />
            </svg>
            Compare Measures
            {showScatter && (
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-bold">ON</span>
            )}
          </button>
        )}
      </div>

      {showScatter && hasMultipleMeasures && (
        <ScatterPlot
          measures={dataset.measures}
          dates={dataset.dates}
          onClose={() => setShowScatter(false)}
        />
      )}

      <Tabs defaultValue={dataset.measures[0].name} className="w-full">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <TabsList className="bg-white/5 border border-white/8 h-auto p-1">
            {dataset.measures.map((m) => (
              <TabsTrigger
                key={m.name}
                value={m.name}
                className="text-sm px-4 py-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-gray-400"
              >
                {m.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {dataset.measures.map((m) => {
          const splits = splitIndicesMap[m.name] ?? [];
          const anns = annotationsMap[m.name] ?? [];
          const omitted = omittedMap[m.name] ?? [];
          return (
            <TabsContent key={m.name} value={m.name} className="mt-0 space-y-3">
              <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
                  Normal
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                  Run signal (8+ above/below mean)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
                  Trend signal (6+ consecutive)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                  Process split
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full border-2 border-gray-500 bg-transparent inline-block" />
                  Omitted point
                </span>
              </div>
              <SpcChart
                values={m.data}
                dates={dataset.dates}
                title={titlesMap[m.name] ?? m.name}
                unit={m.unit}
                splitIndices={splits}
                onAddSplit={(idx) => onAddSplit(m.name, idx)}
                onClearSplits={() => onClearSplits(m.name)}
                onTitleChange={(t) => onTitleChange(m.name, t)}
                annotations={anns}
                onAnnotationsChange={(a) => onAnnotationsChange(m.name, a)}
                omittedIndices={omitted}
                onOmittedChange={(indices) => onOmittedChange(m.name, indices)}
                initialXAxisLabel={xAxisLabelsMap[m.name] ?? "Period"}
                initialYAxisLabel={yAxisLabelsMap[m.name] ?? m.unit}
                onXAxisLabelChange={(label) => onXAxisLabelChange(m.name, label)}
                onYAxisLabelChange={(label) => onYAxisLabelChange(m.name, label)}
                initialSegmentLabels={segmentLabelsMap[m.name] ?? {}}
                onSegmentLabelsChange={(labels) => onSegmentLabelsChange(m.name, labels)}
              />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

// ─── Page wrapper with Suspense ───────────────────────────────────────────────

export default function NewChartPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64 text-gray-600">
        Loading…
      </div>
    }>
      <NewChartPageInner />
    </Suspense>
  );
}

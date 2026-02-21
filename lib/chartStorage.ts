// Chart Library — localStorage persistence + Supabase cloud sync

export interface Annotation {
  dateIndex: number; // index into the dates array
  text: string;
}

export interface TargetLine {
  id: string;
  value: number;
  label: string;
  color: "red" | "amber" | "green" | "blue";
}

export interface ChartColors {
  background?: string;
  meanLine?: string;
  medianLine?: string;
  uclLine?: string;
  lclLine?: string;
  dataPoints?: string;
}

export interface SavedChart {
  id: string; // uuid
  title: string;
  savedAt: number; // unix ms timestamp
  measure: {
    name: string;
    unit: string;
    dates: string[];
    values: number[];
  };
  splitIndices: number[];
  annotations: Annotation[];
  // Extended chart state (optional for backwards compatibility)
  targetLines?: TargetLine[];
  method?: "mean" | "median";
  splitModes?: Record<number, "run">;
  frozenLimits?: boolean;
  // Priority 2 features
  omittedIndices?: number[];
  showTrendLine?: boolean;
  // Chart type identifier (e.g. "xmr", "cusum", "pchart", etc.)
  chartType?: string;
  // Axis labels
  xAxisLabel?: string;
  yAxisLabel?: string;
  // Per-chart custom colors (overrides global defaults)
  customColors?: ChartColors;
}

const STORAGE_KEY = "contrl_charts";

// ─── localStorage (sync, SSR-safe) ───────────────────────────────────────────

export function getSavedCharts(): SavedChart[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedChart[]) : [];
  } catch {
    return [];
  }
}

function setLocalCharts(charts: SavedChart[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(charts));
}

export function saveChart(
  chart: Omit<SavedChart, "id" | "savedAt">
): SavedChart {
  const charts = getSavedCharts();
  const newChart: SavedChart = {
    ...chart,
    id: crypto.randomUUID(),
    savedAt: Date.now(),
  };
  // Newest first
  charts.unshift(newChart);
  setLocalCharts(charts);
  // Fire-and-forget cloud save
  saveChartCloud(newChart).catch(console.error);
  return newChart;
}

export function deleteChart(id: string): void {
  const charts = getSavedCharts().filter((c) => c.id !== id);
  setLocalCharts(charts);
  // Fire-and-forget cloud delete
  deleteChartCloud(id).catch(console.error);
}

export function updateChart(
  id: string,
  partial: Partial<Omit<SavedChart, "id">>
): SavedChart | null {
  const charts = getSavedCharts();
  const idx = charts.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const updated: SavedChart = { ...charts[idx], ...partial, id };
  charts[idx] = updated;
  setLocalCharts(charts);
  // Fire-and-forget cloud update
  updateChartCloud(id, partial).catch(console.error);
  return updated;
}

// ─── Supabase cloud (async) ───────────────────────────────────────────────────

function chartToRow(chart: SavedChart, userId: string) {
  return {
    id: chart.id,
    user_id: userId,
    title: chart.title,
    saved_at: chart.savedAt,
    measure: chart.measure,
    split_indices: chart.splitIndices ?? [],
    annotations: chart.annotations ?? [],
    target_lines: chart.targetLines ?? [],
    method: chart.method ?? "mean",
    split_modes: chart.splitModes ?? {},
    frozen_limits: chart.frozenLimits ?? false,
    omitted_indices: chart.omittedIndices ?? [],
    show_trend_line: chart.showTrendLine ?? false,
    chart_type: chart.chartType ?? "xmr",
    x_axis_label: chart.xAxisLabel ?? null,
    y_axis_label: chart.yAxisLabel ?? null,
    custom_colors: chart.customColors ?? null,
  };
}

function rowToChart(row: Record<string, unknown>): SavedChart {
  return {
    id: row.id as string,
    title: row.title as string,
    savedAt: row.saved_at as number,
    measure: row.measure as SavedChart["measure"],
    splitIndices: (row.split_indices as number[]) ?? [],
    annotations: (row.annotations as Annotation[]) ?? [],
    targetLines: (row.target_lines as TargetLine[]) ?? [],
    method: (row.method as "mean" | "median") ?? "mean",
    splitModes: (row.split_modes as Record<number, "run">) ?? {},
    frozenLimits: (row.frozen_limits as boolean) ?? false,
    omittedIndices: (row.omitted_indices as number[]) ?? [],
    showTrendLine: (row.show_trend_line as boolean) ?? false,
    chartType: (row.chart_type as string) ?? "xmr",
    xAxisLabel: (row.x_axis_label as string) ?? undefined,
    yAxisLabel: (row.y_axis_label as string) ?? undefined,
    customColors: (row.custom_colors as ChartColors) ?? undefined,
  };
}

async function getSupabaseClient() {
  const { createClient } = await import("@/lib/supabase");
  return createClient();
}

async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = await getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

export async function getSavedChartsCloud(): Promise<SavedChart[]> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const supabase = await getSupabaseClient();
    const { data, error } = await supabase
      .from("charts")
      .select("*")
      .order("saved_at", { ascending: false });

    if (error) {
      console.error("Cloud fetch error:", error);
      return [];
    }

    return (data ?? []).map((row) => rowToChart(row as Record<string, unknown>));
  } catch (err) {
    console.error("getSavedChartsCloud failed:", err);
    return [];
  }
}

export async function saveChartCloud(chart: SavedChart): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const supabase = await getSupabaseClient();
    const { error } = await supabase
      .from("charts")
      .upsert(chartToRow(chart, userId), { onConflict: "id" });

    if (error) console.error("Cloud save error:", error);
  } catch (err) {
    console.error("saveChartCloud failed:", err);
  }
}

export async function deleteChartCloud(id: string): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const supabase = await getSupabaseClient();
    const { error } = await supabase
      .from("charts")
      .delete()
      .eq("id", id);

    if (error) console.error("Cloud delete error:", error);
  } catch (err) {
    console.error("deleteChartCloud failed:", err);
  }
}

export async function updateChartCloud(
  id: string,
  partial: Partial<Omit<SavedChart, "id">>
): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const supabase = await getSupabaseClient();
    const updateData: Record<string, unknown> = {};
    if (partial.title !== undefined) updateData.title = partial.title;
    if (partial.savedAt !== undefined) updateData.saved_at = partial.savedAt;
    if (partial.measure !== undefined) updateData.measure = partial.measure;
    if (partial.splitIndices !== undefined) updateData.split_indices = partial.splitIndices;
    if (partial.annotations !== undefined) updateData.annotations = partial.annotations;
    if (partial.targetLines !== undefined) updateData.target_lines = partial.targetLines;
    if (partial.method !== undefined) updateData.method = partial.method;
    if (partial.splitModes !== undefined) updateData.split_modes = partial.splitModes;
    if (partial.frozenLimits !== undefined) updateData.frozen_limits = partial.frozenLimits;
    if (partial.omittedIndices !== undefined) updateData.omitted_indices = partial.omittedIndices;
    if (partial.showTrendLine !== undefined) updateData.show_trend_line = partial.showTrendLine;
    if (partial.chartType !== undefined) updateData.chart_type = partial.chartType;
    if (partial.xAxisLabel !== undefined) updateData.x_axis_label = partial.xAxisLabel;
    if (partial.yAxisLabel !== undefined) updateData.y_axis_label = partial.yAxisLabel;
    if (partial.customColors !== undefined) updateData.custom_colors = partial.customColors;
    updateData.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from("charts")
      .update(updateData)
      .eq("id", id);

    if (error) console.error("Cloud update error:", error);
  } catch (err) {
    console.error("updateChartCloud failed:", err);
  }
}

export async function bulkSaveChartsCloud(charts: SavedChart[]): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const supabase = await getSupabaseClient();
    const rows = charts.map((c) => chartToRow(c, userId));
    const { error } = await supabase
      .from("charts")
      .upsert(rows, { onConflict: "id" });

    if (error) console.error("Bulk cloud save error:", error);
  } catch (err) {
    console.error("bulkSaveChartsCloud failed:", err);
  }
}

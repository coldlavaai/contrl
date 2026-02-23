// Global chart color settings — localStorage persistence

export interface ChartColors {
  background: string;
  meanLine: string;
  medianLine: string;
  uclLine: string;
  lclLine: string;
  dataPoints: string;
  sigma1Line: string;
  sigma2Line: string;
}

export const DEFAULT_COLORS: ChartColors = {
  background: "#141414",
  meanLine: "#6366f1", // Indigo
  medianLine: "#6366f1", // Same as mean by default
  uclLine: "#ef4444", // Red
  lclLine: "#ef4444", // Red
  dataPoints: "#a5b4fc", // Light indigo
  sigma1Line: "#4b5563", // Gray-600 (faint)
  sigma2Line: "#6b7280", // Gray-500 (slightly brighter)
};

const STORAGE_KEY = "contrl_chart_colors";

// ─── localStorage persistence ───────────────────────────────────────────────

export function getChartColors(): ChartColors {
  if (typeof window === "undefined") return DEFAULT_COLORS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_COLORS;
    const parsed = JSON.parse(raw) as Partial<ChartColors>;
    // Merge with defaults to handle missing keys
    return { ...DEFAULT_COLORS, ...parsed };
  } catch {
    return DEFAULT_COLORS;
  }
}

export function saveChartColors(colors: ChartColors): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
  // Dispatch event so components can react to changes
  window.dispatchEvent(new CustomEvent("chartColorsChanged", { detail: colors }));
}

export function resetChartColors(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("chartColorsChanged", { detail: DEFAULT_COLORS }));
}

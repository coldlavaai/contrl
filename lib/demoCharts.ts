// Demo charts — pre-seeded on first visit so the app looks alive out of the box
// Seven showcase charts demonstrating ALL SPC features: Nelson Rules, trend limits,
// split segments, zone lines, annotations, target lines.

import { SavedChart } from "./chartStorage";

function weeklyDates(count: number, startISO = "2023-01-09"): string[] {
  const out: string[] = [];
  const d = new Date(startISO);
  for (let i = 0; i < count; i++) {
    out.push(
      d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    );
    d.setDate(d.getDate() + 7);
  }
  return out;
}

function monthlyDates(count: number, startISO = "2023-01-01"): string[] {
  const out: string[] = [];
  const d = new Date(startISO);
  for (let i = 0; i < count; i++) {
    out.push(
      d.toLocaleDateString("en-GB", { month: "short", year: "numeric" })
    );
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}

function dailyDates(count: number, startISO = "2024-01-01"): string[] {
  const out: string[] = [];
  const d = new Date(startISO);
  for (let i = 0; i < count; i++) {
    out.push(
      d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    );
    d.setDate(d.getDate() + 1);
  }
  return out;
}

// ─── Chart 1: 6-Point Trend Detection (Nelson Rule 3) ────────────────────────
// Data with a clear ascending run of 7 points AND a descending run of 7 points.
// XmR detection: 6 consecutive increases or 6 consecutive decreases triggers Rule 3.
//
// Layout: ~40 points, normal variation ~50 ± random
// Points 8-14: strictly ascending  (7 increases → triggers at point 13, i.e. 6th increase)
// Points 22-28: strictly descending (7 decreases)
const trendDates = weeklyDates(40, "2024-01-08");
const trendValues = [
  50, 48, 53, 51, 49, 52, 50, 47,
  // Ascending run: indices 8→14 (7 points, 6 consecutive increases)
  42, 44, 46, 48, 51, 54, 57,
  // Return to normal
  52, 49, 53, 50, 48, 51, 53,
  // Descending run: indices 22→28 (7 points, 6 consecutive decreases)
  58, 55, 52, 49, 46, 43, 40,
  // Normal finish
  45, 48, 50, 47, 51, 49, 52, 48, 50, 53, 47,
];

const chart1: Omit<SavedChart, "id"> = {
  title: "6-Point Trend Detection",
  savedAt: Date.now() - 1000 * 60 * 60 * 24 * 6,
  measure: {
    name: "Daily Output",
    unit: "units",
    dates: trendDates,
    values: trendValues,
  },
  splitIndices: [],
  splitModes: {},
  annotations: [
    { dateIndex: 8, text: "Ascending trend starts" },
    { dateIndex: 22, text: "Descending trend starts" },
  ],
  targetLines: [],
  method: "mean",
  frozenLimits: false,
  omittedIndices: [],
  showTrendLine: false,
  chartType: "xmr",
  chartTitle: "6-Point Trend Detection — Nelson Rule 3",
  yAxisLabel: "Units",
  xAxisLabel: "Week",
};

// ─── Chart 2: Near-Limit Clusters (Nelson Rule 5) ────────────────────────────
// We need 2 out of 3 consecutive points beyond 2σ on the same side.
// Strategy: create stable data so we can calculate σ, then plant points
// in the 2σ-3σ band.
//
// Data: 30 points centred around 100, with moving range ~3-4
// Mean ≈ 100, R̄ ≈ 3.5, so 3σ = 3.5 × 2.66 ≈ 9.31, σ ≈ 3.1
// 2σ boundary ≈ 106.2, UCL ≈ 109.3
// So points at 107-109 are in the 2σ-3σ band (upper side).
//
// Mean ≈ 100, R̄ ≈ 3, 3σ ≈ 8.0, σ ≈ 2.66
// 2σ boundary ≈ 105.3, UCL ≈ 108.0
// Points at 106-107 are in the 2σ-3σ band (upper side).
// Indices 10-12: put 2 of 3 in the upper 2σ-3σ band → triggers Rule 5
// Index 20: single near-limit point (1 of 1) → does NOT trigger
const clusterDates = weeklyDates(30, "2024-03-04");
const clusterValues = [
  100, 102, 98, 101, 99, 100, 101, 99, 100, 101,
  // Indices 10-12: cluster — two in 2σ-3σ band (upper)
  107, 100, 106,
  // Back to normal
  99, 101, 98, 100, 102, 99, 101,
  // Index 20: single near-limit point (not significant alone)
  105,
  // Normal finish
  100, 101, 99, 100, 102, 98, 101, 99, 100,
];

const chart2: Omit<SavedChart, "id"> = {
  title: "Near-Limit Clusters",
  savedAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
  measure: {
    name: "Referrals per Day",
    unit: "referrals",
    dates: clusterDates,
    values: clusterValues,
  },
  splitIndices: [],
  splitModes: {},
  annotations: [
    { dateIndex: 10, text: "2-of-3 near upper limit — Rule 5" },
    { dateIndex: 20, text: "Single near-limit point (not significant)" },
  ],
  targetLines: [],
  method: "mean",
  frozenLimits: false,
  omittedIndices: [],
  showTrendLine: false,
  showZoneLines: true,
  chartType: "xmr",
  chartTitle: "Near-Limit Clusters — Nelson Rule 5",
  yAxisLabel: "Referrals",
  xAxisLabel: "Week",
};

// ─── Chart 3: Trend Control Limits (Diagonal Limits) ─────────────────────────
// First 30 points: stable process ~27 (horizontal limits).
// Split at index 30 with splitModes: { 30: "trend" }.
// Points 30-59: steadily trending upward from ~28 to ~48.
// This shows diagonal UCL/Mean/LCL like Jim's screenshot.
const trendLimitDates = weeklyDates(60, "2023-07-03");

// Segment 1: stable around 27, small variation ±3
const seg1Vals = [
  25, 28, 26, 29, 24, 27, 30, 26, 28, 25,
  27, 29, 24, 28, 26, 30, 25, 27, 29, 26,
  28, 24, 27, 30, 26, 28, 25, 29, 27, 26,
];
// Segment 2: trending upward from ~28 to ~48, with ±2 noise
const seg2Vals: number[] = [];
for (let i = 0; i < 30; i++) {
  const trend = 28 + (i * 20) / 29; // 28 → 48 linear
  const noise = [1, -1, 2, -2, 0, 1, -1, 2, -2, 0, 1, -1, 2, -2, 0, 1, -1, 2, -2, 0, 1, -1, 2, -2, 0, 1, -1, 2, -2, 0][i];
  seg2Vals.push(Math.round((trend + noise) * 10) / 10);
}

const chart3: Omit<SavedChart, "id"> = {
  title: "Trend Control Limits",
  savedAt: Date.now() - 1000 * 60 * 60 * 24 * 4,
  measure: {
    name: "Campaign Metric",
    unit: "score",
    dates: trendLimitDates,
    values: [...seg1Vals, ...seg2Vals],
  },
  splitIndices: [30],
  splitModes: { 30: "trend" },
  annotations: [
    { dateIndex: 30, text: "Trend limits applied — diagonal UCL/Mean/LCL" },
  ],
  targetLines: [],
  method: "mean",
  frozenLimits: false,
  omittedIndices: [],
  showTrendLine: false,
  showZoneLines: true,
  chartType: "xmr",
  chartTitle: "Trend Control Limits — Diagonal UCL/Mean/LCL",
  yAxisLabel: "Score",
  xAxisLabel: "Week",
};

// ─── Chart 4: Process Improvement — Before & After ───────────────────────────
// Classic SPC use case: step change from ~45 to ~30 with tighter variation.
// Split at index 26 with a "run" mode (standard recalculated limits).
const improvementDates = weeklyDates(52, "2023-01-09");

// Before: 26 points ~45 with ±6 variation
const beforeVals = [
  47, 42, 50, 44, 39, 48, 43, 51, 46, 40,
  49, 44, 38, 47, 52, 41, 45, 50, 43, 48,
  39, 46, 51, 44, 42, 47,
];
// After: 26 points ~30 with ±3 variation (tighter)
const afterVals = [
  31, 28, 32, 29, 27, 31, 30, 33, 28, 30,
  32, 27, 31, 29, 33, 28, 30, 32, 29, 27,
  31, 30, 28, 32, 29, 31,
];

const chart4: Omit<SavedChart, "id"> = {
  title: "Process Improvement — Before & After",
  savedAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
  measure: {
    name: "Complaint Resolution Time",
    unit: "days",
    dates: improvementDates,
    values: [...beforeVals, ...afterVals],
  },
  splitIndices: [26],
  splitModes: {},
  annotations: [
    { dateIndex: 26, text: "New process introduced" },
  ],
  targetLines: [
    { id: "t1", value: 35, label: "Target: 35 days", color: "green" },
  ],
  method: "mean",
  frozenLimits: false,
  omittedIndices: [],
  showTrendLine: false,
  chartType: "xmr",
  chartTitle: "Process Improvement — Before & After",
  yAxisLabel: "Days",
  xAxisLabel: "Week",
};

// ─── Chart 5: Monthly Revenue ─────────────────────────────────────────────────
// 24 months, seasonal pattern with strong Q4 spikes, target line.
const revenueDates = monthlyDates(24, "2023-01-01");
const revenueValues = [
  38, 41, 44, 42, 43, 40, 39, 43, 45, 47,
  52, 58, // Year 1 — Q4 spike
  40, 43, 45, 42, 44, 41, 40, 44, 46, 48,
  53, 61, // Year 2 — stronger Q4
];

const chart5: Omit<SavedChart, "id"> = {
  title: "Monthly Revenue",
  savedAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
  measure: {
    name: "Monthly Revenue",
    unit: "£k",
    dates: revenueDates,
    values: revenueValues,
  },
  splitIndices: [],
  splitModes: {},
  annotations: [
    { dateIndex: 10, text: "Black Friday campaign" },
    { dateIndex: 22, text: "New enterprise contract" },
  ],
  targetLines: [
    { id: "t1", value: 50, label: "£50k target", color: "green" },
  ],
  method: "mean",
  frozenLimits: false,
  omittedIndices: [],
  showTrendLine: true,
  chartType: "xmr",
  chartTitle: "Monthly Revenue — Seasonal Pattern",
  yAxisLabel: "Revenue (£k)",
  xAxisLabel: "Month",
};

// ─── Chart 6: Points Beyond Control Limits (Nelson Rule 1) ───────────────────
// Stable data ~60 with R̄ ≈ 3, so 3σ ≈ 8 → UCL ≈ 68, LCL ≈ 52
// Plant 2 clear breaches: one well above UCL, one well below LCL.
const breachDates = dailyDates(35, "2024-06-01");
const breachValues = [
  60, 62, 59, 61, 58, 61, 60, 62, 59, 61,
  // Index 10: UCL breach (75, well above UCL ~68)
  75,
  // Normal
  60, 59, 62, 60, 61, 58, 61, 62, 59,
  // Index 20: LCL breach (45, well below LCL ~52)
  45,
  // Normal finish
  61, 59, 62, 60, 58, 61, 60, 62, 59, 61, 60, 62, 58, 61,
];

const chart6: Omit<SavedChart, "id"> = {
  title: "Points Beyond Control Limits",
  savedAt: Date.now() - 1000 * 60 * 60 * 24,
  measure: {
    name: "Wait Time",
    unit: "minutes",
    dates: breachDates,
    values: breachValues,
  },
  splitIndices: [],
  splitModes: {},
  annotations: [
    { dateIndex: 10, text: "UCL breach — special cause" },
    { dateIndex: 20, text: "LCL breach — special cause" },
  ],
  targetLines: [
    { id: "t1", value: 65, label: "Max acceptable: 65 min", color: "red" },
  ],
  method: "mean",
  frozenLimits: false,
  omittedIndices: [],
  showTrendLine: false,
  chartType: "xmr",
  chartTitle: "Points Beyond Control Limits — Nelson Rule 1",
  yAxisLabel: "Minutes",
  xAxisLabel: "Day",
};

// ─── Chart 7: 8 Points Same Side of Mean (Nelson Rule 2) ────────────────────
// Rule 2 uses default count of 9 consecutive points same side of mean.
// Data ~50. Plant 10 consecutive points ALL above mean starting at index 10.
// Mean ≈ 50, so all points 10-19 need to be > 50.
//
// Strategy: keep normal data tightly around 50 (some above, some below),
// then indices 10-19: all above 50 (values 51-55 range).
const runDates = weeklyDates(35, "2024-02-05");
const runValues = [
  49, 52, 48, 51, 47, 50, 53, 48, 51, 49,
  // Indices 10-19: 10 consecutive points above mean (~50)
  // All values 51-56 — strictly above 50
  52, 54, 51, 53, 55, 52, 54, 51, 53, 55,
  // Return to normal variation
  48, 50, 47, 52, 49, 51, 48, 50, 47, 53,
  49, 51, 48, 50, 52,
];

const chart7: Omit<SavedChart, "id"> = {
  title: "9 Points Same Side of Mean",
  savedAt: Date.now() - 1000 * 60 * 60 * 12,
  measure: {
    name: "Cycle Time",
    unit: "hours",
    dates: runDates,
    values: runValues,
  },
  splitIndices: [],
  splitModes: {},
  annotations: [
    { dateIndex: 10, text: "Run starts — 10 points above mean (Rule 2)" },
  ],
  targetLines: [],
  method: "mean",
  frozenLimits: false,
  omittedIndices: [],
  showTrendLine: false,
  chartType: "xmr",
  chartTitle: "9 Points Same Side of Mean — Nelson Rule 2",
  yAxisLabel: "Hours",
  xAxisLabel: "Week",
};

export const DEMO_CHARTS: Omit<SavedChart, "id">[] = [
  chart1,
  chart2,
  chart3,
  chart4,
  chart5,
  chart6,
  chart7,
];

export const DEMO_SEED_KEY = "contrl_demo_seeded_v2";

/** Seed demo charts into localStorage if the user has no charts yet */
export function seedDemoChartsIfEmpty(): void {
  if (typeof window === "undefined") return;
  // Only seed once per version
  if (localStorage.getItem(DEMO_SEED_KEY)) return;

  // Seed the demo charts with stable IDs, merging with any existing user charts
  const seeded = DEMO_CHARTS.map((c, i) => ({
    ...c,
    id: `demo-${i + 1}`,
  }));

  // Keep any non-demo user charts
  const existing = localStorage.getItem("contrl_charts");
  let userCharts: Array<{ id: string }> = [];
  if (existing) {
    try {
      const parsed = JSON.parse(existing);
      if (Array.isArray(parsed)) {
        userCharts = parsed.filter((c: { id: string }) => !c.id?.startsWith("demo-"));
      }
    } catch {
      // ignore
    }
  }

  localStorage.setItem("contrl_charts", JSON.stringify([...seeded, ...userCharts]));
  localStorage.setItem(DEMO_SEED_KEY, "1");
}

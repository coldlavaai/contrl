// Demo charts — pre-seeded on first visit so the app looks alive out of the box
// Three realistic business datasets with signals, splits, and annotations

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

// ─── Chart 1: Customer Complaint Resolution Time ─────────────────────────────
// Social housing council — days to close complaints
// Baseline ~18 days → intervention at week 26 → drops to ~11 days
const complaintDates = weeklyDates(52, "2023-01-09");
const complaintValues = [
  19, 22, 17, 21, 18, 24, 20, 16, 23, 19,
  25, 21, 18, 22, 26, 20, 19, 24, 21, 17,
  23, 20, 18, 22, 24, 19, // pre-intervention (weeks 1–26)
  // Post-intervention: new process introduced
  12, 10, 13, 11, 14, 9, 12, 11, 10, 13,
  11, 14, 10, 12, 9, 11, 13, 10, 14, 11,
  12, 9, 10, 13, 11, 10,
];

const chart1: Omit<SavedChart, "id"> = {
  title: "Complaint Resolution Time",
  savedAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
  measure: {
    name: "Complaint Resolution Time",
    unit: "days",
    dates: complaintDates,
    values: complaintValues,
  },
  splitIndices: [26],
  splitModes: {},
  annotations: [
    { dateIndex: 26, text: "New triage process introduced" },
  ],
  targetLines: [
    { id: "t1", value: 10, label: "Target: 10 days", color: "green" },
  ],
  method: "mean",
  frozenLimits: false,
  omittedIndices: [],
  showTrendLine: false,
  chartType: "xmr",
};

// ─── Chart 2: Void Property Turnaround (weeks) ───────────────────────────────
// Housing association — weeks to re-let a void property
// Baseline ~7.5 weeks, long run above mean mid-year, trend improvement Q4
const voidDates = weeklyDates(48, "2023-01-16");
const voidValues = [
  7, 8, 6, 9, 7, 8, 7, 6, 8, 7,
  8, 10, 11, 9, 12, 10, 11, 9, 10, 11, // run above mean (8+ consecutive)
  12, 10, 9, 11, 10, 9,
  8, 7, 6, 7, 5, 6, 7, 6, 5, 7, // trend down (6+ decreasing)
  6, 5, 4, 6, 5, 4, 5, 6, 4, 5,
  5, 6,
];

const chart2: Omit<SavedChart, "id"> = {
  title: "Void Property Turnaround",
  savedAt: Date.now() - 1000 * 60 * 60 * 24,
  measure: {
    name: "Void Property Turnaround",
    unit: "weeks",
    dates: voidDates,
    values: voidValues,
  },
  splitIndices: [],
  splitModes: {},
  annotations: [
    { dateIndex: 11, text: "Contractor delays Q2" },
    { dateIndex: 27, text: "Fast-track repairs pilot" },
  ],
  targetLines: [
    { id: "t1", value: 6, label: "Target: 6 wks", color: "green" },
    { id: "t2", value: 10, label: "Threshold", color: "red" },
  ],
  method: "mean",
  frozenLimits: false,
  omittedIndices: [],
  showTrendLine: true,
  chartType: "xmr",
};

// ─── Chart 3: Monthly Revenue (£k) ───────────────────────────────────────────
// Small services business — 24 months of monthly revenue
// Baseline ~£42k, strong Q4 seasonality, one signal in Nov 2023
const revenueDates = monthlyDates(24, "2023-01-01");
const revenueValues = [
  38, 41, 44, 42, 43, 40, 39, 43, 45, 47,
  52, 58, // Nov/Dec 2023 — Q4 spike (signal in Nov)
  40, 43, 45, 42, 44, 41, 40, 44, 46, 48,
  53, 61, // Nov/Dec 2024 — stronger Q4
];

const chart3: Omit<SavedChart, "id"> = {
  title: "Monthly Revenue",
  savedAt: Date.now() - 1000 * 60 * 60 * 12,
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
  showTrendLine: false,
  chartType: "xmr",
};

export const DEMO_CHARTS: Omit<SavedChart, "id">[] = [chart1, chart2, chart3];

export const DEMO_SEED_KEY = "contrl_demo_seeded";

/** Seed demo charts into localStorage if the user has no charts yet */
export function seedDemoChartsIfEmpty(): void {
  if (typeof window === "undefined") return;
  // Only seed once per browser
  if (localStorage.getItem(DEMO_SEED_KEY)) return;
  // Only seed if no real charts exist
  const existing = localStorage.getItem("contrl_charts");
  if (existing) {
    try {
      const parsed = JSON.parse(existing);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // User already has charts — mark as seeded and skip
        localStorage.setItem(DEMO_SEED_KEY, "1");
        return;
      }
    } catch {
      // malformed — fall through to seed
    }
  }

  // Seed the demo charts with stable IDs
  const seeded = DEMO_CHARTS.map((c, i) => ({
    ...c,
    id: `demo-${i + 1}`,
  }));
  localStorage.setItem("contrl_charts", JSON.stringify(seeded));
  localStorage.setItem(DEMO_SEED_KEY, "1");
}

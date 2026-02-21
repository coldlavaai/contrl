// Subgroup SPC Calculation Engine for Contrl
// Supports X̄-R, X̄-S, EWMA, Run Chart, and Moving Average chart types

// ── SPC Constants Tables ───────────────────────────────────────────────────────

/** A2 constants for X̄-R chart (subgroup sizes 2–25) */
export const A2: Record<number, number> = {
  2: 1.880, 3: 1.023, 4: 0.729, 5: 0.577, 6: 0.483, 7: 0.419,
  8: 0.373, 9: 0.337, 10: 0.308, 11: 0.285, 12: 0.266, 13: 0.249,
  14: 0.235, 15: 0.223, 16: 0.212, 17: 0.203, 18: 0.194, 19: 0.187,
  20: 0.180, 21: 0.173, 22: 0.167, 23: 0.162, 24: 0.157, 25: 0.153,
};

/** D3 constants for R-chart LCL (subgroup sizes 2–25) */
export const D3: Record<number, number> = {
  2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0.076,
  8: 0.136, 9: 0.184, 10: 0.223, 11: 0.256, 12: 0.283, 13: 0.307,
  14: 0.328, 15: 0.347, 16: 0.363, 17: 0.378, 18: 0.391, 19: 0.403,
  20: 0.415, 21: 0.425, 22: 0.434, 23: 0.443, 24: 0.451, 25: 0.459,
};

/** D4 constants for R-chart UCL (subgroup sizes 2–25) */
export const D4: Record<number, number> = {
  2: 3.267, 3: 2.574, 4: 2.282, 5: 2.114, 6: 2.004, 7: 1.924,
  8: 1.864, 9: 1.816, 10: 1.777, 11: 1.744, 12: 1.717, 13: 1.693,
  14: 1.672, 15: 1.653, 16: 1.637, 17: 1.622, 18: 1.608, 19: 1.597,
  20: 1.585, 21: 1.575, 22: 1.566, 23: 1.557, 24: 1.548, 25: 1.541,
};

/** A3 constants for X̄-S chart (subgroup sizes 2–25) */
export const A3: Record<number, number> = {
  2: 2.659, 3: 1.954, 4: 1.628, 5: 1.427, 6: 1.287, 7: 1.182,
  8: 1.099, 9: 1.032, 10: 0.975, 11: 0.927, 12: 0.886, 13: 0.850,
  14: 0.817, 15: 0.789, 16: 0.763, 17: 0.739, 18: 0.718, 19: 0.698,
  20: 0.680, 21: 0.663, 22: 0.647, 23: 0.633, 24: 0.619, 25: 0.606,
};

/** B3 constants for S-chart LCL (subgroup sizes 2–25) */
export const B3: Record<number, number> = {
  2: 0, 3: 0, 4: 0, 5: 0, 6: 0.030, 7: 0.118,
  8: 0.185, 9: 0.239, 10: 0.284, 11: 0.321, 12: 0.354, 13: 0.382,
  14: 0.406, 15: 0.428, 16: 0.448, 17: 0.466, 18: 0.482, 19: 0.497,
  20: 0.510, 21: 0.523, 22: 0.534, 23: 0.545, 24: 0.555, 25: 0.565,
};

/** B4 constants for S-chart UCL (subgroup sizes 2–25) */
export const B4: Record<number, number> = {
  2: 3.267, 3: 2.568, 4: 2.266, 5: 2.089, 6: 1.970, 7: 1.882,
  8: 1.815, 9: 1.761, 10: 1.716, 11: 1.679, 12: 1.646, 13: 1.618,
  14: 1.594, 15: 1.572, 16: 1.552, 17: 1.534, 18: 1.518, 19: 1.503,
  20: 1.490, 21: 1.477, 22: 1.466, 23: 1.455, 24: 1.445, 25: 1.435,
};

// ── Interfaces ─────────────────────────────────────────────────────────────────

export interface SubgroupPoint {
  index: number;
  label: string;
  values: number[];
  mean: number;
  range: number;
  stdDev: number;
  signal: "none" | "run" | "trend";
}

export interface XbarRResult {
  points: SubgroupPoint[];
  subgroupSize: number;
  // X̄ chart
  grandMean: number;         // X̿
  xbarUcl: number;
  xbarLcl: number;
  // R chart
  rBar: number;              // R̄
  rUcl: number;
  rLcl: number;
  // Signal arrays for the range chart
  rangeSignals: Array<"none" | "run" | "trend">;
}

export interface XbarSResult {
  points: SubgroupPoint[];
  subgroupSize: number;
  // X̄ chart
  grandMean: number;         // X̿
  xbarUcl: number;
  xbarLcl: number;
  // S chart
  sBar: number;              // S̄
  sUcl: number;
  sLcl: number;
  // Signal arrays for the S chart
  sSignals: Array<"none" | "run" | "trend">;
}

export interface EwmaPoint {
  index: number;
  label: string;
  value: number;
  ewma: number;
  ucl: number;
  lcl: number;
  signal: "none" | "run" | "trend";
}

export interface EwmaResult {
  points: EwmaPoint[];
  mean: number;
  lambda: number;
  L: number;
  sigma: number;
}

export interface RunChartPoint {
  index: number;
  label: string;
  value: number;
  aboveMedian: boolean;
  signal: "none" | "run";
}

export interface RunChartResult {
  points: RunChartPoint[];
  median: number;
  longestRun: number;
  expectedRuns: number;
  actualRuns: number;
}

export interface MovingAvgPoint {
  index: number;
  label: string;
  value: number;
  movingAvg: number | null;
  ucl: number | null;
  lcl: number | null;
  signal: "none" | "run" | "trend";
}

export interface MovingAvgResult {
  points: MovingAvgPoint[];
  windowSize: number;
  mean: number;
  mrMean: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const ss = values.reduce((acc, v) => acc + (v - m) ** 2, 0);
  return Math.sqrt(ss / (values.length - 1));
}

function range(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.max(...values) - Math.min(...values);
}

function medianValue(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Detect run signals: 8+ consecutive points above or below center line
 */
function detectRunSignals(
  values: number[],
  centerLine: number
): Array<"none" | "run"> {
  const signals: Array<"none" | "run"> = new Array(values.length).fill("none");
  let runStart = 0;
  let runDirection: "above" | "below" | null = null;
  let runCount = 0;

  for (let i = 0; i < values.length; i++) {
    const above = values[i] > centerLine;
    const below = values[i] < centerLine;
    const dir = above ? "above" : below ? "below" : null;

    if (dir === runDirection && dir !== null) {
      runCount++;
    } else {
      runStart = i;
      runDirection = dir;
      runCount = 1;
    }

    if (runCount >= 8) {
      for (let j = runStart; j <= i; j++) {
        signals[j] = "run";
      }
    }
  }
  return signals;
}

/**
 * Detect trend signals: 6+ consecutive increasing or decreasing
 */
function detectTrendSignals(
  values: number[]
): Array<"none" | "trend"> {
  const signals: Array<"none" | "trend"> = new Array(values.length).fill("none");
  let trendStart = 0;
  let trendDir: "up" | "down" | null = null;
  let trendCount = 1;

  for (let i = 1; i < values.length; i++) {
    const dir = values[i] > values[i - 1] ? "up" : values[i] < values[i - 1] ? "down" : null;
    if (dir !== null && dir === trendDir) {
      trendCount++;
    } else {
      trendStart = i - 1;
      trendDir = dir;
      trendCount = 2;
    }
    if (trendCount >= 6) {
      for (let j = trendStart; j <= i; j++) {
        signals[j] = "trend";
      }
    }
  }
  return signals;
}

/**
 * Combine run + trend signals (run takes priority)
 */
function combineSignals(
  values: number[],
  centerLine: number
): Array<"none" | "run" | "trend"> {
  const runs = detectRunSignals(values, centerLine);
  const trends = detectTrendSignals(values);
  return values.map((_, i) => {
    if (runs[i] === "run") return "run";
    if (trends[i] === "trend") return "trend";
    return "none";
  });
}

// ── X̄-R Chart Calculation ──────────────────────────────────────────────────────

export function calculateXbarR(
  subgroups: number[][],
  labels: string[]
): XbarRResult {
  const n = subgroups.length > 0 ? subgroups[0].length : 2;
  const clampedN = Math.min(Math.max(n, 2), 25);

  const points: SubgroupPoint[] = subgroups.map((sg, i) => ({
    index: i,
    label: labels[i] ?? `Subgroup ${i + 1}`,
    values: sg,
    mean: mean(sg),
    range: range(sg),
    stdDev: stdDev(sg),
    signal: "none",
  }));

  const means = points.map((p) => p.mean);
  const ranges = points.map((p) => p.range);

  const grandMean = mean(means);
  const rBar = mean(ranges);

  const a2 = A2[clampedN] ?? A2[25];
  const d3 = D3[clampedN] ?? D3[25];
  const d4 = D4[clampedN] ?? D4[25];

  const xbarUcl = grandMean + a2 * rBar;
  const xbarLcl = grandMean - a2 * rBar;
  const rUcl = d4 * rBar;
  const rLcl = d3 * rBar;

  // Detect signals on means
  const meanSignals = combineSignals(means, grandMean);
  points.forEach((p, i) => { p.signal = meanSignals[i]; });

  // Detect signals on ranges
  const rangeSignals = combineSignals(ranges, rBar);

  return {
    points,
    subgroupSize: clampedN,
    grandMean,
    xbarUcl,
    xbarLcl,
    rBar,
    rUcl,
    rLcl,
    rangeSignals,
  };
}

// ── X̄-S Chart Calculation ──────────────────────────────────────────────────────

export function calculateXbarS(
  subgroups: number[][],
  labels: string[]
): XbarSResult {
  const n = subgroups.length > 0 ? subgroups[0].length : 2;
  const clampedN = Math.min(Math.max(n, 2), 25);

  const points: SubgroupPoint[] = subgroups.map((sg, i) => ({
    index: i,
    label: labels[i] ?? `Subgroup ${i + 1}`,
    values: sg,
    mean: mean(sg),
    range: range(sg),
    stdDev: stdDev(sg),
    signal: "none",
  }));

  const means = points.map((p) => p.mean);
  const stdDevs = points.map((p) => p.stdDev);

  const grandMean = mean(means);
  const sBar = mean(stdDevs);

  const a3 = A3[clampedN] ?? A3[25];
  const b3 = B3[clampedN] ?? B3[25];
  const b4 = B4[clampedN] ?? B4[25];

  const xbarUcl = grandMean + a3 * sBar;
  const xbarLcl = grandMean - a3 * sBar;
  const sUcl = b4 * sBar;
  const sLcl = b3 * sBar;

  // Detect signals on means
  const meanSignals = combineSignals(means, grandMean);
  points.forEach((p, i) => { p.signal = meanSignals[i]; });

  // Detect signals on std devs
  const sSignals = combineSignals(stdDevs, sBar);

  return {
    points,
    subgroupSize: clampedN,
    grandMean,
    xbarUcl,
    xbarLcl,
    sBar,
    sUcl,
    sLcl,
    sSignals,
  };
}

// ── EWMA Chart Calculation ─────────────────────────────────────────────────────

export function calculateEwma(
  values: number[],
  labels: string[],
  lambda: number = 0.2,
  L: number = 3
): EwmaResult {
  if (values.length === 0) {
    return { points: [], mean: 0, lambda, L, sigma: 0 };
  }

  const xBar = mean(values);

  // Estimate sigma from moving ranges (same as XmR)
  let mrSum = 0;
  for (let i = 1; i < values.length; i++) {
    mrSum += Math.abs(values[i] - values[i - 1]);
  }
  const mrMean = values.length > 1 ? mrSum / (values.length - 1) : 0;
  const sigma = mrMean / 1.128; // d2 for n=2

  const points: EwmaPoint[] = [];
  let ewmaPrev = xBar;

  for (let i = 0; i < values.length; i++) {
    const ewma = lambda * values[i] + (1 - lambda) * ewmaPrev;
    const t = i + 1;
    const factor = Math.sqrt((lambda / (2 - lambda)) * (1 - Math.pow(1 - lambda, 2 * t)));
    const ucl = xBar + L * sigma * factor;
    const lcl = xBar - L * sigma * factor;

    points.push({
      index: i,
      label: labels[i] ?? `Point ${i + 1}`,
      value: values[i],
      ewma,
      ucl,
      lcl,
      signal: "none",
    });

    ewmaPrev = ewma;
  }

  // Detect signals: EWMA outside control limits
  points.forEach((p) => {
    if (p.ewma > p.ucl || p.ewma < p.lcl) {
      p.signal = "run";
    }
  });

  return { points, mean: xBar, lambda, L, sigma };
}

// ── Run Chart Calculation ──────────────────────────────────────────────────────

export function calculateRunChart(
  values: number[],
  labels: string[]
): RunChartResult {
  if (values.length === 0) {
    return { points: [], median: 0, longestRun: 0, expectedRuns: 0, actualRuns: 0 };
  }

  const med = medianValue(values);

  const points: RunChartPoint[] = values.map((v, i) => ({
    index: i,
    label: labels[i] ?? `Point ${i + 1}`,
    value: v,
    aboveMedian: v > med,
    signal: "none",
  }));

  // Detect runs above/below median
  let currentRun = 1;
  let longestRun = 1;
  let actualRuns = 1;

  // Count direction switches → number of runs
  for (let i = 1; i < points.length; i++) {
    // Exclude points exactly on median
    if (values[i] === med || values[i - 1] === med) {
      continue;
    }
    if (points[i].aboveMedian === points[i - 1].aboveMedian) {
      currentRun++;
    } else {
      actualRuns++;
      currentRun = 1;
    }
    longestRun = Math.max(longestRun, currentRun);
  }

  // Expected runs based on number of observations
  // Non-median count
  const nonMedianCount = values.filter((v) => v !== med).length;
  const aboveCount = values.filter((v) => v > med).length;
  const belowCount = values.filter((v) => v < med).length;
  const expectedRuns = nonMedianCount > 0
    ? 1 + (2 * aboveCount * belowCount) / nonMedianCount
    : 0;

  // Mark long runs (7+ consecutive above or below median) as signals
  let runStart = 0;
  let runDir: boolean | null = null;
  let runCount = 0;

  for (let i = 0; i < points.length; i++) {
    if (values[i] === med) continue;
    const above = points[i].aboveMedian;
    if (above === runDir) {
      runCount++;
    } else {
      runStart = i;
      runDir = above;
      runCount = 1;
    }
    if (runCount >= 7) {
      for (let j = runStart; j <= i; j++) {
        points[j].signal = "run";
      }
    }
  }

  return { points, median: med, longestRun, expectedRuns, actualRuns };
}

// ── Moving Average Chart Calculation ───────────────────────────────────────────

export function calculateMovingAverage(
  values: number[],
  labels: string[],
  windowSize: number = 5
): MovingAvgResult {
  if (values.length === 0) {
    return { points: [], windowSize, mean: 0, mrMean: 0 };
  }

  const xBar = mean(values);

  // Calculate moving ranges for sigma estimation
  let mrSum = 0;
  for (let i = 1; i < values.length; i++) {
    mrSum += Math.abs(values[i] - values[i - 1]);
  }
  const mrMean = values.length > 1 ? mrSum / (values.length - 1) : 0;
  const sigma = mrMean / 1.128;

  const points: MovingAvgPoint[] = values.map((v, i) => {
    let movingAvg: number | null = null;
    let ucl: number | null = null;
    let lcl: number | null = null;

    if (i >= windowSize - 1) {
      const window = values.slice(i - windowSize + 1, i + 1);
      movingAvg = mean(window);
      // UCL/LCL for moving average: X̄ ± 3σ/√w
      const spread = 3 * sigma / Math.sqrt(windowSize);
      ucl = xBar + spread;
      lcl = xBar - spread;
    }

    return {
      index: i,
      label: labels[i] ?? `Point ${i + 1}`,
      value: v,
      movingAvg,
      ucl,
      lcl,
      signal: "none" as const,
    };
  });

  // Detect signals on moving average values
  const maValues = points
    .filter((p) => p.movingAvg !== null)
    .map((p) => p.movingAvg!);

  if (maValues.length > 0) {
    const maSignals = combineSignals(maValues, xBar);
    let maIdx = 0;
    for (const p of points) {
      if (p.movingAvg !== null) {
        p.signal = maSignals[maIdx];
        maIdx++;
      }
    }
  }

  return { points, windowSize, mean: xBar, mrMean };
}

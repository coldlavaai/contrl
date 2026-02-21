// SPC Calculation Engine for Contrl
// Uses the XmR (X-bar Moving Range) method as per Vanguard/Wheeler methodology.
// Mean method:   UCL = X̄ + (R̄ × 2.66), LCL = X̄ − (R̄ × 2.66)
// Median method: UCL = M̃ + (MR̃ × 3.14), LCL = max(0, M̃ − (MR̃ × 3.14))

export interface SpcPoint {
  index: number;
  value: number;
  date: string;
  signal: "none" | "run" | "trend"; // run = 8+ above/below mean (red), trend = 6+ consecutive (orange)
}

export interface SpcSegment {
  startIndex: number;
  endIndex: number;
  mean: number;          // X̄ (mean method) or M̃ (median method)
  ucl: number;
  lcl: number;
  avgMovingRange: number; // R̄
  runSplitMode?: boolean; // if true, only centre line is shown (no UCL/LCL)
}

export interface SpcResult {
  points: SpcPoint[];
  segments: SpcSegment[];
  // Flat arrays for plotting — null values break lines between segments in Plotly
  meanLine: (number | null)[];
  uclLine: (number | null)[];
  lclLine: (number | null)[];
  // Moving Range chart data
  movingRanges: number[]; // |value[i] - value[i-1]|, first entry is always 0
  mrMean: number;          // R̄ averaged across all data
  mrUcl: number;           // D4 × R̄ = 3.267 × R̄
}

/** XmR constant for mean method: 3 / d2 where d2 = 1.128 for n=2 */
const XMR_CONSTANT = 2.66;
/** Constant for median method */
const MEDIAN_CONSTANT = 3.14;
/** D4 constant for MR chart UCL */
const D4 = 3.267;

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculate average moving range (R̄): mean of absolute differences between consecutive values.
 */
function avgMovingRange(values: number[]): number {
  if (values.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < values.length; i++) {
    total += Math.abs(values[i] - values[i - 1]);
  }
  return total / (values.length - 1);
}

function calculateSegment(
  values: number[],
  startIndex: number,
  method: "mean" | "median" = "mean",
  frozenStats?: { ucl: number; lcl: number }
): SpcSegment {
  const rBar = avgMovingRange(values);
  let center: number;
  let ucl: number;
  let lcl: number;

  if (method === "median") {
    center = median(values);
    const mrs = values.slice(1).map((v, i) => Math.abs(v - values[i]));
    const medMR = mrs.length > 0 ? median(mrs) : 0;
    const spread = medMR * MEDIAN_CONSTANT;
    ucl = frozenStats ? frozenStats.ucl : center + spread;
    lcl = frozenStats ? frozenStats.lcl : Math.max(0, center - spread);
  } else {
    center = mean(values);
    const spread = rBar * XMR_CONSTANT;
    ucl = frozenStats ? frozenStats.ucl : center + spread;
    lcl = frozenStats ? frozenStats.lcl : Math.max(0, center - spread);
  }

  return {
    startIndex,
    endIndex: startIndex + values.length - 1,
    mean: center,
    ucl,
    lcl,
    avgMovingRange: rBar,
  };
}

/**
 * Detect signals across all data points given a mean.
 * - Run: 8+ consecutive points all above OR all below mean → "run" (red)
 * - Trend: 6+ consecutive points continuously increasing OR decreasing → "trend" (orange)
 */
function detectSignals(
  values: number[],
  segmentMeans: number[]
): Array<"none" | "run" | "trend"> {
  const signals: Array<"none" | "run" | "trend"> = new Array(values.length).fill("none");

  // --- Run detection (8+ consecutive above or below mean) ---
  let runStart = 0;
  let runDirection: "above" | "below" | null = null;
  let runCount = 0;

  for (let i = 0; i < values.length; i++) {
    const above = values[i] > segmentMeans[i];
    const below = values[i] < segmentMeans[i];
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
        if (signals[j] === "none") signals[j] = "run";
      }
    }
  }

  // --- Trend detection (6+ consecutive increasing or decreasing) ---
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
        if (signals[j] === "none") signals[j] = "trend";
      }
    }
  }

  return signals;
}

export interface SpcOptions {
  /** Calculation method: mean (default) or median */
  method?: "mean" | "median";
  /** Map of split index → 'run' to flag Run Split segments (only centre line shown) */
  splitModes?: Record<number, "run">;
  /** When true, the last segment inherits UCL/LCL from the previous segment */
  frozenLimits?: boolean;
  /** Indices to omit from UCL/LCL/mean calculations (shown hollow on chart) */
  omittedIndices?: number[];
}

/**
 * Main SPC calculation function.
 * @param values - array of numeric data points
 * @param dates - corresponding date labels
 * @param splitIndices - optional array of indices where the process splits
 * @param options - optional calculation options
 */
// ── Capability Indices & PPM ─────────────────────────────────────────────────

export interface CapabilityResult {
  cp: number | null;
  cpk: number | null;
  pp: number | null;
  ppk: number | null;
  ppm: number | null;
  sigmaShort: number;   // σ̂ = R̄ / d2
  sigmaLong: number;    // s (sample std dev)
}

/** d2 constant for n=2 subgroup (XmR chart) */
const D2 = 1.128;

/**
 * Standard normal CDF approximation (Abramowitz & Stegun 26.2.17).
 * Max error ≈ 7.5 × 10⁻⁸.
 */
function normalCdf(x: number): number {
  if (x < -8) return 0;
  if (x > 8) return 1;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const z = Math.abs(x) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * z);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
  return 0.5 * (1.0 + sign * y);
}

/**
 * Calculate process capability indices (Cp, Cpk, Pp, Ppk) and PPM.
 *
 * @param values - All data values
 * @param rBar - Average moving range (R̄) from SPC calculation
 * @param xBar - Process mean (X̄)
 * @param lsl - Lower Specification Limit (optional)
 * @param usl - Upper Specification Limit (optional)
 */
export function calculateCapability(
  values: number[],
  rBar: number,
  xBar: number,
  lsl?: number | null,
  usl?: number | null,
): CapabilityResult {
  const sigmaShort = rBar / D2; // σ̂ (within-subgroup / short-term)

  // Long-term sigma: sample standard deviation
  const n = values.length;
  const sigmaLong =
    n > 1
      ? Math.sqrt(values.reduce((acc, v) => acc + (v - xBar) ** 2, 0) / (n - 1))
      : 0;

  const hasLsl = lsl != null && !isNaN(lsl);
  const hasUsl = usl != null && !isNaN(usl);
  const hasBoth = hasLsl && hasUsl;

  let cp: number | null = null;
  let cpk: number | null = null;
  let pp: number | null = null;
  let ppk: number | null = null;
  let ppm: number | null = null;

  if (hasBoth && sigmaShort > 0) {
    cp = (usl! - lsl!) / (6 * sigmaShort);
    cpk = Math.min(
      (usl! - xBar) / (3 * sigmaShort),
      (xBar - lsl!) / (3 * sigmaShort),
    );
  } else if (sigmaShort > 0) {
    // One-sided Cpk
    if (hasUsl) cpk = (usl! - xBar) / (3 * sigmaShort);
    if (hasLsl) cpk = (xBar - lsl!) / (3 * sigmaShort);
  }

  if (hasBoth && sigmaLong > 0) {
    pp = (usl! - lsl!) / (6 * sigmaLong);
    ppk = Math.min(
      (usl! - xBar) / (3 * sigmaLong),
      (xBar - lsl!) / (3 * sigmaLong),
    );
  } else if (sigmaLong > 0) {
    if (hasUsl) ppk = (usl! - xBar) / (3 * sigmaLong);
    if (hasLsl) ppk = (xBar - lsl!) / (3 * sigmaLong);
  }

  // PPM using normal distribution approximation (long-term sigma)
  if ((hasLsl || hasUsl) && sigmaLong > 0) {
    let pBelow = 0;
    let pAbove = 0;
    if (hasLsl) pBelow = normalCdf((lsl! - xBar) / sigmaLong);
    if (hasUsl) pAbove = 1 - normalCdf((usl! - xBar) / sigmaLong);
    ppm = (pBelow + pAbove) * 1_000_000;
  }

  return { cp, cpk, pp, ppk, ppm, sigmaShort, sigmaLong };
}

export function calculateSpc(
  values: number[],
  dates: string[],
  splitIndices: number[] = [],
  options: SpcOptions = {}
): SpcResult {
  const { method = "mean", splitModes = {}, frozenLimits = false, omittedIndices = [] } = options;

  if (values.length === 0) {
    return {
      points: [],
      segments: [],
      meanLine: [],
      uclLine: [],
      lclLine: [],
      movingRanges: [],
      mrMean: 0,
      mrUcl: 0,
    };
  }

  // ── Omitted indices: filter, calculate, then map back ─────────────────────
  if (omittedIndices.length > 0) {
    const omittedSet = new Set(omittedIndices);
    const filteredValues: number[] = [];
    const filteredDates: string[] = [];
    const filteredToOriginal: number[] = [];
    const originalToFiltered: number[] = new Array(values.length).fill(-1);

    for (let i = 0; i < values.length; i++) {
      if (!omittedSet.has(i)) {
        originalToFiltered[i] = filteredValues.length;
        filteredToOriginal.push(i);
        filteredValues.push(values[i]);
        filteredDates.push(dates[i] ?? `Week ${i + 1}`);
      }
    }

    // Adjust split indices: map to filtered space, skip splits at omitted points
    const filteredSplitIndices = splitIndices
      .filter((idx) => !omittedSet.has(idx) && originalToFiltered[idx] !== -1)
      .map((idx) => originalToFiltered[idx]);

    // Adjust split modes: map keys to filtered space
    const filteredSplitModes: Record<number, "run"> = {};
    for (const [origIdxStr, mode] of Object.entries(splitModes)) {
      const origIdx = Number(origIdxStr);
      const filtIdx = originalToFiltered[origIdx];
      if (filtIdx !== -1) {
        filteredSplitModes[filtIdx] = mode as "run";
      }
    }

    // Calculate SPC on filtered data (no omittedIndices to avoid recursion)
    const filtered = calculateSpc(filteredValues, filteredDates, filteredSplitIndices, {
      method,
      splitModes: filteredSplitModes,
      frozenLimits,
    });

    // Map points back to original space
    const points: SpcPoint[] = values.map((v, i) => {
      if (omittedSet.has(i)) {
        return { index: i, value: v, date: dates[i] ?? `Week ${i + 1}`, signal: "none" };
      }
      const filtIdx = originalToFiltered[i];
      const fp = filtered.points[filtIdx];
      return { index: i, value: v, date: dates[i] ?? `Week ${i + 1}`, signal: fp.signal };
    });

    // Map segments back to original space
    const segments: SpcSegment[] = filtered.segments.map((seg) => ({
      ...seg,
      startIndex: filteredToOriginal[seg.startIndex],
      endIndex: filteredToOriginal[seg.endIndex],
    }));

    // Map meanLine/uclLine/lclLine back to original indices
    const meanLine: (number | null)[] = new Array(values.length).fill(null);
    const uclLine: (number | null)[] = new Array(values.length).fill(null);
    const lclLine: (number | null)[] = new Array(values.length).fill(null);

    filtered.meanLine.forEach((v, filtIdx) => {
      const origIdx = filteredToOriginal[filtIdx];
      if (origIdx !== undefined) meanLine[origIdx] = v;
    });
    filtered.uclLine.forEach((v, filtIdx) => {
      const origIdx = filteredToOriginal[filtIdx];
      if (origIdx !== undefined) uclLine[origIdx] = v;
    });
    filtered.lclLine.forEach((v, filtIdx) => {
      const origIdx = filteredToOriginal[filtIdx];
      if (origIdx !== undefined) lclLine[origIdx] = v;
    });

    // Map movingRanges back (omitted positions get 0)
    const movingRanges: number[] = new Array(values.length).fill(0);
    filtered.movingRanges.forEach((v, filtIdx) => {
      const origIdx = filteredToOriginal[filtIdx];
      if (origIdx !== undefined) movingRanges[origIdx] = v;
    });

    return {
      points,
      segments,
      meanLine,
      uclLine,
      lclLine,
      movingRanges,
      mrMean: filtered.mrMean,
      mrUcl: filtered.mrUcl,
    };
  }

  // ── Global Moving Ranges ──────────────────────────────────────────────────
  const movingRanges: number[] = [0];
  for (let i = 1; i < values.length; i++) {
    movingRanges.push(Math.abs(values[i] - values[i - 1]));
  }
  const mrValuesOnly = movingRanges.slice(1);
  const mrMean =
    mrValuesOnly.length > 0
      ? mrValuesOnly.reduce((a, b) => a + b, 0) / mrValuesOnly.length
      : 0;
  const mrUcl = D4 * mrMean;

  // ── Build Segments ────────────────────────────────────────────────────────
  const boundaries = [0, ...splitIndices, values.length].sort((a, b) => a - b);
  const segments: SpcSegment[] = [];

  for (let s = 0; s < boundaries.length - 1; s++) {
    const start = boundaries[s];
    const end = boundaries[s + 1];
    const slice = values.slice(start, end);
    if (slice.length === 0) continue;

    // Last segment with frozenLimits: inherit previous segment's UCL/LCL
    const isLast = s === boundaries.length - 2;
    const frozenStats =
      isLast && frozenLimits && segments.length > 0
        ? {
            ucl: segments[segments.length - 1].ucl,
            lcl: segments[segments.length - 1].lcl,
          }
        : undefined;

    const seg = calculateSegment(slice, start, method, frozenStats);

    // Mark run-split segments (segment s was opened by splitIndices[s-1])
    if (s > 0) {
      const openingSplit = splitIndices[s - 1];
      if (splitModes[openingSplit] === "run") {
        seg.runSplitMode = true;
      }
    }

    segments.push(seg);
  }

  // ── Per-point mean array for signal detection ─────────────────────────────
  const segmentMeans = new Array(values.length).fill(0);
  for (const seg of segments) {
    for (let i = seg.startIndex; i <= seg.endIndex; i++) {
      segmentMeans[i] = seg.mean;
    }
  }

  const signals = detectSignals(values, segmentMeans);

  // ── Flat line arrays ──────────────────────────────────────────────────────
  const meanLine: (number | null)[] = new Array(values.length).fill(null);
  const uclLine: (number | null)[] = new Array(values.length).fill(null);
  const lclLine: (number | null)[] = new Array(values.length).fill(null);

  for (const seg of segments) {
    for (let i = seg.startIndex; i <= seg.endIndex; i++) {
      meanLine[i] = seg.mean;
      if (!seg.runSplitMode) {
        uclLine[i] = seg.ucl;
        lclLine[i] = seg.lcl;
      }
    }
  }

  // Insert null at each split boundary to break lines between segments.
  for (const splitIdx of splitIndices) {
    if (splitIdx > 0 && splitIdx < values.length) {
      meanLine[splitIdx] = null;
      uclLine[splitIdx] = null;
      lclLine[splitIdx] = null;
    }
  }

  const points: SpcPoint[] = values.map((v, i) => ({
    index: i,
    value: v,
    date: dates[i] ?? `Week ${i + 1}`,
    signal: signals[i],
  }));

  return { points, segments, meanLine, uclLine, lclLine, movingRanges, mrMean, mrUcl };
}

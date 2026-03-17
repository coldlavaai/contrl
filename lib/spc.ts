// SPC Calculation Engine for Contrl
// Uses the XmR (X-bar Moving Range) method as per Vanguard/Wheeler methodology.
// Mean method:   UCL = X̄ + (R̄ × 2.66), LCL = X̄ − (R̄ × 2.66)
// Median method: UCL = M̃ + (MR̃ × 3.14), LCL = max(0, M̃ − (MR̃ × 3.14))

export interface SignalDetail {
  rule: number; // 1-8 (Nelson/Western Electric rule number)
  name: string; // Human-readable name
}

export interface SpcPoint {
  index: number;
  value: number;
  date: string;
  signal: "none" | "run" | "trend"; // backward compat: run = rule 1/2/etc, trend = rule 3
  /** Full list of Nelson/Western Electric rule violations at this point */
  signalDetails?: SignalDetail[];
}

export interface SpcSegment {
  startIndex: number;
  endIndex: number;
  mean: number;          // X̄ (mean method) or M̃ (median method)
  ucl: number;
  lcl: number;
  avgMovingRange: number; // R̄
  runSplitMode?: boolean; // if true, only centre line is shown (no UCL/LCL)
  /** Trend control limit data — when set, this segment uses diagonal limits */
  trendLine?: {
    slope: number;
    intercept: number;
    sigma: number;       // 1σ distance
    /** Per-index fitted values and limits (startIndex-relative) */
    centre: number[];    // fitted values
    ucl: number[];       // fitted + 3σ
    lcl: number[];       // fitted - 3σ
    sigma1Upper: number[];
    sigma1Lower: number[];
    sigma2Upper: number[];
    sigma2Lower: number[];
  };
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
  frozenStats?: { ucl: number; lcl: number },
  allowNegativeLcl?: boolean,
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
    lcl = frozenStats ? frozenStats.lcl : (allowNegativeLcl ? center - spread : Math.max(0, center - spread));
  } else {
    center = mean(values);
    const spread = rBar * XMR_CONSTANT;
    ucl = frozenStats ? frozenStats.ucl : center + spread;
    lcl = frozenStats ? frozenStats.lcl : (allowNegativeLcl ? center - spread : Math.max(0, center - spread));
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

// ── Nelson / Western Electric Rules ──────────────────────────────────────────

export interface NelsonRuleConfig {
  /** Rule 1: 1 point beyond 3σ */
  rule1?: boolean;
  /** Rule 2: N consecutive points same side of mean (default 9) */
  rule2?: boolean;
  rule2Count?: number; // default 9
  /** Rule 3: N consecutive points increasing/decreasing (default 6) */
  rule3?: boolean;
  rule3Count?: number; // default 6
  /** Rule 4: 14 consecutive points alternating up/down */
  rule4?: boolean;
  /** Rule 5: 2 out of 3 consecutive beyond 2σ (same side) */
  rule5?: boolean;
  /** Rule 5b: 3+ successive points in 2σ-3σ band on same side (Jim's cluster rule) */
  rule5b?: boolean;
  /** Rule 6: 4 out of 5 consecutive beyond 1σ (same side) */
  rule6?: boolean;
  /** Rule 7: 15 consecutive points within 1σ (either side) — "hugging" */
  rule7?: boolean;
  /** Rule 8: 8 consecutive points beyond 1σ (either side) — "stratification" */
  rule8?: boolean;
}

export const NELSON_RULE_NAMES: Record<number, string> = {
  1: "Beyond 3σ",
  2: "Run of 9",
  3: "Trend of 6",
  4: "14 alternating",
  5: "2 of 3 beyond 2σ",
  6: "4 of 5 beyond 1σ",
  7: "15 within 1σ (hugging)",
  8: "8 beyond 1σ (stratification)",
  9: "3+ successive in 2σ-3σ",
};

export const DEFAULT_NELSON_RULES: NelsonRuleConfig = {
  rule1: true,
  rule2: true,
  rule2Count: 9,
  rule3: true,
  rule3Count: 6,
  rule4: false,
  rule5: false,
  rule5b: true,
  rule6: false,
  rule7: false,
  rule8: false,
};

/**
 * Detect all Nelson/Western Electric rule violations across data points.
 *
 * @param values - data values
 * @param segmentMeans - per-point mean
 * @param segmentUcls - per-point UCL
 * @param segmentLcls - per-point LCL
 * @param config - which rules to enable
 * @returns Array of SignalDetail[] per point
 */
export function detectAllSignals(
  values: number[],
  segmentMeans: number[],
  segmentUcls: number[],
  segmentLcls: number[],
  config: NelsonRuleConfig = DEFAULT_NELSON_RULES,
): SignalDetail[][] {
  const n = values.length;
  const signals: SignalDetail[][] = new Array(n).fill(null).map(() => []);

  if (n === 0) return signals;

  // Compute zone boundaries per point
  const sigma1Upper: number[] = []; // mean + 1σ
  const sigma1Lower: number[] = []; // mean - 1σ
  const sigma2Upper: number[] = []; // mean + 2σ
  const sigma2Lower: number[] = []; // mean - 2σ

  for (let i = 0; i < n; i++) {
    const m = segmentMeans[i];
    const oneThird = (segmentUcls[i] - m) / 3;
    sigma1Upper.push(m + oneThird);
    sigma1Lower.push(m - oneThird);
    sigma2Upper.push(m + 2 * oneThird);
    sigma2Lower.push(m - 2 * oneThird);
  }

  // ── Rule 1: One point beyond 3σ ──
  if (config.rule1) {
    for (let i = 0; i < n; i++) {
      if (values[i] > segmentUcls[i] || values[i] < segmentLcls[i]) {
        signals[i].push({ rule: 1, name: NELSON_RULE_NAMES[1] });
      }
    }
  }

  // ── Rule 2: N consecutive points on same side of mean ──
  if (config.rule2) {
    const runLen = config.rule2Count ?? 9;
    let runStart = 0;
    let runDir: "above" | "below" | null = null;
    let runCount = 0;

    for (let i = 0; i < n; i++) {
      const above = values[i] > segmentMeans[i];
      const below = values[i] < segmentMeans[i];
      const dir = above ? "above" : below ? "below" : null;

      if (dir === runDir && dir !== null) {
        runCount++;
      } else {
        runStart = i;
        runDir = dir;
        runCount = 1;
      }

      if (runCount >= runLen) {
        for (let j = runStart; j <= i; j++) {
          if (!signals[j].some((s) => s.rule === 2)) {
            signals[j].push({ rule: 2, name: NELSON_RULE_NAMES[2] });
          }
        }
      }
    }
  }

  // ── Rule 3: N consecutive points increasing or decreasing ──
  if (config.rule3) {
    const trendLen = config.rule3Count ?? 6;
    let trendStart = 0;
    let trendDir: "up" | "down" | null = null;
    let trendCount = 1;

    for (let i = 1; i < n; i++) {
      const dir = values[i] > values[i - 1] ? "up" : values[i] < values[i - 1] ? "down" : null;

      if (dir !== null && dir === trendDir) {
        trendCount++;
      } else {
        trendStart = i - 1;
        trendDir = dir;
        trendCount = 2;
      }

      if (trendCount >= trendLen) {
        for (let j = trendStart; j <= i; j++) {
          if (!signals[j].some((s) => s.rule === 3)) {
            signals[j].push({ rule: 3, name: NELSON_RULE_NAMES[3] });
          }
        }
      }
    }
  }

  // ── Rule 4: 14 consecutive points alternating up/down ──
  if (config.rule4) {
    // Track alternation direction: each point is "up" or "down" from previous
    const dirs: ("up" | "down" | "same")[] = ["same"]; // first point has no direction
    for (let i = 1; i < n; i++) {
      dirs.push(values[i] > values[i - 1] ? "up" : values[i] < values[i - 1] ? "down" : "same");
    }

    let altCount = 1;
    let altStart = 0;

    for (let i = 2; i < n; i++) {
      if (
        dirs[i] !== "same" &&
        dirs[i - 1] !== "same" &&
        dirs[i] !== dirs[i - 1]
      ) {
        altCount++;
      } else {
        altStart = i - 1;
        altCount = 2;
      }

      if (altCount >= 14) {
        const start = i - altCount + 1;
        for (let j = Math.max(altStart, start); j <= i; j++) {
          if (!signals[j].some((s) => s.rule === 4)) {
            signals[j].push({ rule: 4, name: NELSON_RULE_NAMES[4] });
          }
        }
      }
    }
  }

  // ── Rule 5: 2 out of 3 consecutive points beyond 2σ (same side) ──
  if (config.rule5) {
    for (let i = 2; i < n; i++) {
      // Check upper side
      let upperCount = 0;
      for (let j = i - 2; j <= i; j++) {
        if (values[j] > sigma2Upper[j]) upperCount++;
      }
      if (upperCount >= 2) {
        for (let j = i - 2; j <= i; j++) {
          if (values[j] > sigma2Upper[j] && !signals[j].some((s) => s.rule === 5)) {
            signals[j].push({ rule: 5, name: NELSON_RULE_NAMES[5] });
          }
        }
      }

      // Check lower side
      let lowerCount = 0;
      for (let j = i - 2; j <= i; j++) {
        if (values[j] < sigma2Lower[j]) lowerCount++;
      }
      if (lowerCount >= 2) {
        for (let j = i - 2; j <= i; j++) {
          if (values[j] < sigma2Lower[j] && !signals[j].some((s) => s.rule === 5)) {
            signals[j].push({ rule: 5, name: NELSON_RULE_NAMES[5] });
          }
        }
      }
    }
  }

  // ── Rule 5b: 3+ successive points in 2σ-3σ band on same side (Jim's cluster rule) ──
  // A point is "in the 2σ-3σ band" if it's beyond 2σ but not beyond 3σ.
  if (config.rule5b) {
    // Upper band: between sigma2Upper and UCL
    let upperRunCount = 0;
    let upperRunStart = 0;
    for (let i = 0; i < n; i++) {
      const inUpperBand = values[i] > sigma2Upper[i] && values[i] <= segmentUcls[i];
      if (inUpperBand) {
        if (upperRunCount === 0) upperRunStart = i;
        upperRunCount++;
      } else {
        upperRunCount = 0;
      }
      if (upperRunCount >= 3) {
        for (let j = upperRunStart; j <= i; j++) {
          if (!signals[j].some((s) => s.rule === 9)) {
            signals[j].push({ rule: 9, name: NELSON_RULE_NAMES[9] });
          }
        }
      }
    }

    // Lower band: between LCL and sigma2Lower
    let lowerRunCount = 0;
    let lowerRunStart = 0;
    for (let i = 0; i < n; i++) {
      const inLowerBand = values[i] < sigma2Lower[i] && values[i] >= segmentLcls[i];
      if (inLowerBand) {
        if (lowerRunCount === 0) lowerRunStart = i;
        lowerRunCount++;
      } else {
        lowerRunCount = 0;
      }
      if (lowerRunCount >= 3) {
        for (let j = lowerRunStart; j <= i; j++) {
          if (!signals[j].some((s) => s.rule === 9)) {
            signals[j].push({ rule: 9, name: NELSON_RULE_NAMES[9] });
          }
        }
      }
    }
  }

  // ── Rule 6: 4 out of 5 consecutive points beyond 1σ (same side) ──
  if (config.rule6) {
    for (let i = 4; i < n; i++) {
      // Check upper side
      let upperCount = 0;
      for (let j = i - 4; j <= i; j++) {
        if (values[j] > sigma1Upper[j]) upperCount++;
      }
      if (upperCount >= 4) {
        for (let j = i - 4; j <= i; j++) {
          if (values[j] > sigma1Upper[j] && !signals[j].some((s) => s.rule === 6)) {
            signals[j].push({ rule: 6, name: NELSON_RULE_NAMES[6] });
          }
        }
      }

      // Check lower side
      let lowerCount = 0;
      for (let j = i - 4; j <= i; j++) {
        if (values[j] < sigma1Lower[j]) lowerCount++;
      }
      if (lowerCount >= 4) {
        for (let j = i - 4; j <= i; j++) {
          if (values[j] < sigma1Lower[j] && !signals[j].some((s) => s.rule === 6)) {
            signals[j].push({ rule: 6, name: NELSON_RULE_NAMES[6] });
          }
        }
      }
    }
  }

  // ── Rule 7: 15 consecutive points within 1σ (either side) — "hugging" ──
  if (config.rule7) {
    let hugCount = 0;
    let hugStart = 0;

    for (let i = 0; i < n; i++) {
      if (values[i] >= sigma1Lower[i] && values[i] <= sigma1Upper[i]) {
        if (hugCount === 0) hugStart = i;
        hugCount++;
      } else {
        hugCount = 0;
      }

      if (hugCount >= 15) {
        for (let j = hugStart; j <= i; j++) {
          if (!signals[j].some((s) => s.rule === 7)) {
            signals[j].push({ rule: 7, name: NELSON_RULE_NAMES[7] });
          }
        }
      }
    }
  }

  // ── Rule 8: 8 consecutive points beyond 1σ (either side) — "stratification" ──
  if (config.rule8) {
    let stratCount = 0;
    let stratStart = 0;

    for (let i = 0; i < n; i++) {
      if (values[i] > sigma1Upper[i] || values[i] < sigma1Lower[i]) {
        if (stratCount === 0) stratStart = i;
        stratCount++;
      } else {
        stratCount = 0;
      }

      if (stratCount >= 8) {
        for (let j = stratStart; j <= i; j++) {
          if (!signals[j].some((s) => s.rule === 8)) {
            signals[j].push({ rule: 8, name: NELSON_RULE_NAMES[8] });
          }
        }
      }
    }
  }

  return signals;
}

export interface SpcOptions {
  /** Calculation method: mean (default) or median */
  method?: "mean" | "median";
  /** Map of split index → mode: 'run' (no UCL/LCL) or 'trend' (diagonal limits) */
  splitModes?: Record<number, "run" | "trend">;
  /** When true, the last segment inherits UCL/LCL from the previous segment */
  frozenLimits?: boolean;
  /** Indices to omit from UCL/LCL/mean calculations (shown hollow on chart) */
  omittedIndices?: number[];
  /** Nelson/Western Electric rule configuration */
  nelsonRules?: NelsonRuleConfig;
  /** When true, LCL is not floored at 0 (for financial metrics, etc.) */
  allowNegativeLcl?: boolean;
  /** When true, ALL segments use trend-based (diagonal) control limits */
  globalTrendLimits?: boolean;
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

// ── Normality Testing (Jarque-Bera) ──────────────────────────────────────────

export interface NormalityResult {
  statistic: number;
  pValue: number;
  isNormal: boolean;
  skewness: number;
  kurtosis: number; // excess kurtosis
}

/**
 * Chi-squared CDF for k=2 degrees of freedom: P(X ≤ x) = 1 − e^(−x/2)
 */
function chiSquaredCdf2(x: number): number {
  if (x <= 0) return 0;
  return 1 - Math.exp(-x / 2);
}

/**
 * Jarque-Bera normality test.
 * JB = (n/6) × (S² + (K−3)² / 4)
 * Under H0 (normality), JB ~ χ²(2).
 *
 * @param values - numeric data array
 * @param alpha - significance level (default 0.05)
 * @returns NormalityResult with statistic, p-value, and descriptors
 */
export function testNormality(values: number[], alpha = 0.05): NormalityResult {
  const n = values.length;
  if (n < 3) {
    return { statistic: 0, pValue: 1, isNormal: true, skewness: 0, kurtosis: 0 };
  }

  const m = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + (b - m) ** 2, 0) / n;
  const std = Math.sqrt(variance);

  if (std === 0) {
    return { statistic: 0, pValue: 1, isNormal: true, skewness: 0, kurtosis: 0 };
  }

  const skewness = values.reduce((a, b) => a + ((b - m) / std) ** 3, 0) / n;
  const kurtosis = values.reduce((a, b) => a + ((b - m) / std) ** 4, 0) / n; // raw kurtosis
  const excessKurtosis = kurtosis - 3;

  const jb = (n / 6) * (skewness ** 2 + excessKurtosis ** 2 / 4);
  const pValue = 1 - chiSquaredCdf2(jb);

  return {
    statistic: jb,
    pValue,
    isNormal: pValue >= alpha,
    skewness,
    kurtosis: excessKurtosis,
  };
}

// ── Trend Control Limits ─────────────────────────────────────────────────────

export interface TrendLimitSegment {
  startDate: string;
  endDate: string;
}

export interface TrendLimitResult {
  /** Per-point trend centre line value (replaces flat mean) */
  trendCentre: (number | null)[];
  /** Per-point trend UCL (3σ above trend) */
  trendUcl: (number | null)[];
  /** Per-point trend LCL (3σ below trend) */
  trendLcl: (number | null)[];
  /** Per-point ±1σ from trend */
  trend1Upper: (number | null)[];
  trend1Lower: (number | null)[];
  /** Per-point ±2σ from trend */
  trend2Upper: (number | null)[];
  trend2Lower: (number | null)[];
  /** Slope and intercept of each trend segment */
  regressions: Array<{ slope: number; intercept: number; sigma: number; startIdx: number; endIdx: number }>;
}

/**
 * Calculate trend (diagonal) control limits via linear regression.
 * Uses residuals from the trend line to calculate sigma,
 * then draws limits parallel to the trend at ±1σ, ±2σ, ±3σ.
 */
export function calculateTrendLimits(
  values: number[],
  dates: string[],
  segments?: TrendLimitSegment[],
): TrendLimitResult {
  const n = values.length;
  const trendCentre: (number | null)[] = new Array(n).fill(null);
  const trendUcl: (number | null)[] = new Array(n).fill(null);
  const trendLcl: (number | null)[] = new Array(n).fill(null);
  const trend1Upper: (number | null)[] = new Array(n).fill(null);
  const trend1Lower: (number | null)[] = new Array(n).fill(null);
  const trend2Upper: (number | null)[] = new Array(n).fill(null);
  const trend2Lower: (number | null)[] = new Array(n).fill(null);
  const regressions: TrendLimitResult["regressions"] = [];

  // Determine which index ranges to apply trend limits to
  const ranges: Array<{ startIdx: number; endIdx: number }> = [];

  if (segments && segments.length > 0) {
    for (const seg of segments) {
      let startIdx = -1;
      let endIdx = -1;
      for (let i = 0; i < n; i++) {
        if (dates[i] >= seg.startDate && startIdx === -1) startIdx = i;
        if (dates[i] <= seg.endDate) endIdx = i;
      }
      if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
        ranges.push({ startIdx, endIdx });
      }
    }
  } else {
    // Apply to entire dataset
    ranges.push({ startIdx: 0, endIdx: n - 1 });
  }

  for (const range of ranges) {
    const { startIdx, endIdx } = range;
    const len = endIdx - startIdx + 1;
    if (len < 2) continue;

    // Linear regression on the range
    const indices: number[] = [];
    const vals: number[] = [];
    for (let i = startIdx; i <= endIdx; i++) {
      indices.push(i);
      vals.push(values[i]);
    }

    const xMean = indices.reduce((a, b) => a + b, 0) / len;
    const yMean = vals.reduce((a, b) => a + b, 0) / len;
    let sxy = 0, sxx = 0;
    for (let j = 0; j < len; j++) {
      sxy += (indices[j] - xMean) * (vals[j] - yMean);
      sxx += (indices[j] - xMean) ** 2;
    }
    const slope = sxx === 0 ? 0 : sxy / sxx;
    const intercept = yMean - slope * xMean;

    // Sigma from residuals (using average moving range of residuals for XmR consistency)
    const residuals = vals.map((v, j) => v - (slope * indices[j] + intercept));
    let mrTotal = 0;
    for (let j = 1; j < residuals.length; j++) {
      mrTotal += Math.abs(residuals[j] - residuals[j - 1]);
    }
    const mrBar = residuals.length > 1 ? mrTotal / (residuals.length - 1) : 0;
    const sigma = mrBar * XMR_CONSTANT / 3; // σ̂ = R̄ / d2, and XMR_CONSTANT = 3/d2, so σ̂ = R̄ × (XMR_CONSTANT/3) is wrong
    // Actually: UCL = X̄ + R̄ × 2.66, so 3σ = R̄ × 2.66, thus σ = R̄ × 2.66 / 3
    const sigma3 = mrBar * XMR_CONSTANT; // This is 3σ
    const sigma1 = sigma3 / 3;

    regressions.push({ slope, intercept, sigma: sigma1, startIdx, endIdx });

    for (let i = startIdx; i <= endIdx; i++) {
      const fitted = slope * i + intercept;
      trendCentre[i] = fitted;
      trendUcl[i] = fitted + sigma3;
      trendLcl[i] = fitted - sigma3;
      trend1Upper[i] = fitted + sigma1;
      trend1Lower[i] = fitted - sigma1;
      trend2Upper[i] = fitted + 2 * sigma1;
      trend2Lower[i] = fitted - 2 * sigma1;
    }
  }

  return { trendCentre, trendUcl, trendLcl, trend1Upper, trend1Lower, trend2Upper, trend2Lower, regressions };
}

export function calculateSpc(
  values: number[],
  dates: string[],
  splitIndices: number[] = [],
  options: SpcOptions = {}
): SpcResult {
  const { method = "mean", splitModes = {}, frozenLimits = false, omittedIndices = [], nelsonRules, allowNegativeLcl = false, globalTrendLimits = false } = options;

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
    const filteredSplitModes: Record<number, "run" | "trend"> = {};
    for (const [origIdxStr, mode] of Object.entries(splitModes)) {
      const origIdx = Number(origIdxStr);
      const filtIdx = originalToFiltered[origIdx];
      if (filtIdx !== -1) {
        filteredSplitModes[filtIdx] = mode as "run" | "trend";
      }
    }

    // Calculate SPC on filtered data (no omittedIndices to avoid recursion)
    const filtered = calculateSpc(filteredValues, filteredDates, filteredSplitIndices, {
      method,
      splitModes: filteredSplitModes,
      frozenLimits,
      allowNegativeLcl,
      globalTrendLimits,
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

    const seg = calculateSegment(slice, start, method, frozenStats, allowNegativeLcl);

    // Mark run-split or trend-split segments (segment s was opened by splitIndices[s-1])
    const openingSplit = s > 0 ? splitIndices[s - 1] : null;
    const isRunSplit = openingSplit !== null && splitModes[openingSplit] === "run";
    const isTrendSplit = openingSplit !== null && splitModes[openingSplit] === "trend";

    if (isRunSplit) {
      seg.runSplitMode = true;
    }

    // Calculate diagonal trend limits when: globalTrendLimits is on, OR this segment is a trend split
    // (but NOT if it's a run split — run splits hide control limits)
    if ((globalTrendLimits || isTrendSplit) && !isRunSplit && slice.length >= 2) {
      const indices = slice.map((_, j) => start + j);
      const xMean = indices.reduce((a, b) => a + b, 0) / slice.length;
      const yMean = slice.reduce((a, b) => a + b, 0) / slice.length;
      let sxy = 0, sxx = 0;
      for (let j = 0; j < slice.length; j++) {
        sxy += (indices[j] - xMean) * (slice[j] - yMean);
        sxx += (indices[j] - xMean) ** 2;
      }
      const slope = sxx === 0 ? 0 : sxy / sxx;
      const intercept = yMean - slope * xMean;

      // Calculate sigma from residuals' moving range (XmR consistency)
      const residuals = slice.map((v, j) => v - (slope * (start + j) + intercept));
      let mrTotal = 0;
      for (let j = 1; j < residuals.length; j++) {
        mrTotal += Math.abs(residuals[j] - residuals[j - 1]);
      }
      const mrBar = residuals.length > 1 ? mrTotal / (residuals.length - 1) : 0;
      const sigma3 = mrBar * XMR_CONSTANT; // 3σ
      const sigma1 = sigma3 / 3;

      const centre: number[] = [];
      const trendUcl: number[] = [];
      const trendLcl: number[] = [];
      const s1U: number[] = [];
      const s1L: number[] = [];
      const s2U: number[] = [];
      const s2L: number[] = [];

      for (let j = 0; j < slice.length; j++) {
        const fitted = slope * (start + j) + intercept;
        centre.push(fitted);
        trendUcl.push(fitted + sigma3);
        trendLcl.push(allowNegativeLcl ? fitted - sigma3 : Math.max(0, fitted - sigma3));
        s1U.push(fitted + sigma1);
        s1L.push(fitted - sigma1);
        s2U.push(fitted + 2 * sigma1);
        s2L.push(fitted - 2 * sigma1);
      }

      seg.trendLine = {
        slope,
        intercept,
        sigma: sigma1,
        centre,
        ucl: trendUcl,
        lcl: trendLcl,
        sigma1Upper: s1U,
        sigma1Lower: s1L,
        sigma2Upper: s2U,
        sigma2Lower: s2L,
      };
    }

    segments.push(seg);
  }

  // ── Per-point mean array for signal detection ─────────────────────────────
  const segmentMeans = new Array(values.length).fill(0);
  for (const seg of segments) {
    for (let i = seg.startIndex; i <= seg.endIndex; i++) {
      // For trend segments, the "mean" at each point is the trend fitted value
      if (seg.trendLine) {
        segmentMeans[i] = seg.trendLine.centre[i - seg.startIndex];
      } else {
        segmentMeans[i] = seg.mean;
      }
    }
  }

  const signals = detectSignals(values, segmentMeans);

  // ── Flat line arrays ──────────────────────────────────────────────────────
  const meanLine: (number | null)[] = new Array(values.length).fill(null);
  const uclLine: (number | null)[] = new Array(values.length).fill(null);
  const lclLine: (number | null)[] = new Array(values.length).fill(null);

  // Per-point UCL/LCL arrays for Nelson rules
  const segmentUcls = new Array(values.length).fill(0);
  const segmentLcls = new Array(values.length).fill(0);

  for (const seg of segments) {
    for (let i = seg.startIndex; i <= seg.endIndex; i++) {
      if (seg.trendLine) {
        // Trend segments: per-point diagonal limits
        const j = i - seg.startIndex;
        meanLine[i] = seg.trendLine.centre[j];
        segmentUcls[i] = seg.trendLine.ucl[j];
        segmentLcls[i] = seg.trendLine.lcl[j];
        uclLine[i] = seg.trendLine.ucl[j];
        lclLine[i] = seg.trendLine.lcl[j];
      } else {
        meanLine[i] = seg.mean;
        segmentUcls[i] = seg.ucl;
        segmentLcls[i] = seg.lcl;
        if (!seg.runSplitMode) {
          uclLine[i] = seg.ucl;
          lclLine[i] = seg.lcl;
        }
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

  // ── Nelson rules detection ────────────────────────────────────────────────
  const allSignalDetails = detectAllSignals(
    values,
    segmentMeans,
    segmentUcls,
    segmentLcls,
    nelsonRules ?? DEFAULT_NELSON_RULES,
  );

  const points: SpcPoint[] = values.map((v, i) => {
    const details = allSignalDetails[i];
    // Backward compat: map Nelson rules to legacy signal types
    let legacySignal: "none" | "run" | "trend" = signals[i];
    if (details.length > 0 && legacySignal === "none") {
      if (details.some((d) => d.rule === 1 || d.rule === 2 || d.rule === 5 || d.rule === 6 || d.rule === 8 || d.rule === 9)) {
        legacySignal = "run";
      } else if (details.some((d) => d.rule === 3 || d.rule === 4)) {
        legacySignal = "trend";
      } else if (details.some((d) => d.rule === 7)) {
        legacySignal = "trend"; // hugging mapped to trend color
      }
    }
    return {
      index: i,
      value: v,
      date: dates[i] ?? `Week ${i + 1}`,
      signal: legacySignal,
      signalDetails: details.length > 0 ? details : undefined,
    };
  });

  return { points, segments, meanLine, uclLine, lclLine, movingRanges, mrMean, mrUcl };
}

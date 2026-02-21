// CuSum (Cumulative Sum) Chart Calculation Engine
// Detects small, sustained shifts in the process mean.

export interface CusumPoint {
  index: number;
  date: string;
  value: number;
  cusuPos: number;   // C+ — positive cumulative sum
  cusuNeg: number;   // C- — negative cumulative sum (stored as negative)
  signalPos: boolean; // true when C+ > h
  signalNeg: boolean; // true when C- < -h
}

export interface CusumResult {
  points: CusumPoint[];
  mu0: number;    // target mean (μ₀)
  k: number;      // reference value (allowance)
  h: number;      // decision interval
  sigma: number;  // estimated process std dev (for reference)
}

/**
 * Estimate standard deviation from moving ranges (XmR method).
 * σ̂ = R̄ / d2, where d2 = 1.128 for n=2
 */
function estimateSigmaFromMR(values: number[]): number {
  if (values.length < 2) return 1;
  let totalMR = 0;
  for (let i = 1; i < values.length; i++) {
    totalMR += Math.abs(values[i] - values[i - 1]);
  }
  const rBar = totalMR / (values.length - 1);
  return rBar / 1.128;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Calculate CuSum chart.
 * @param values - numeric data points
 * @param dates - date labels
 * @param mu0Override - optional target mean (defaults to data mean)
 * @param kOverride - optional reference value (defaults to sigma/2)
 * @param hOverride - optional decision interval (defaults to 4 * sigma)
 */
export function calculateCusum(
  values: number[],
  dates: string[],
  mu0Override?: number,
  kOverride?: number,
  hOverride?: number
): CusumResult {
  if (values.length === 0) {
    return { points: [], mu0: 0, k: 0, h: 0, sigma: 0 };
  }

  const mu0 = mu0Override !== undefined ? mu0Override : mean(values);
  const sigma = estimateSigmaFromMR(values);
  const k = kOverride !== undefined ? kOverride : sigma / 2;
  const h = hOverride !== undefined ? hOverride : 4 * sigma;

  let cusuPos = 0;
  let cusuNeg = 0;

  const points: CusumPoint[] = values.map((val, i) => {
    cusuPos = Math.max(0, cusuPos + (val - mu0 - k));
    cusuNeg = Math.min(0, cusuNeg - (val - mu0 - k));

    return {
      index: i,
      date: dates[i] ?? `Point ${i + 1}`,
      value: val,
      cusuPos,
      cusuNeg,
      signalPos: cusuPos > h,
      signalNeg: cusuNeg < -h,
    };
  });

  return { points, mu0, k, h, sigma };
}

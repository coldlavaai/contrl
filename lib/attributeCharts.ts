// Attribute Chart Calculations: p-chart, np-chart, c-chart, u-chart
// For tracking defectives/defects in quality control.

// ─── p-Chart (Proportion of Defectives, variable sample size) ───────────────

export interface PChartPoint {
  index: number;
  date: string;
  defectives: number;
  sampleSize: number;
  proportion: number; // defectives / sampleSize
  ucl: number;
  lcl: number;
  signal: boolean;    // outside control limits
}

export interface PChartResult {
  points: PChartPoint[];
  pBar: number;       // overall average proportion
}

export function calculatePChart(
  defectives: number[],
  sampleSizes: number[],
  dates: string[]
): PChartResult {
  const n = Math.min(defectives.length, sampleSizes.length, dates.length);
  const totalDefectives = defectives.slice(0, n).reduce((a, b) => a + b, 0);
  const totalInspected = sampleSizes.slice(0, n).reduce((a, b) => a + b, 0);
  const pBar = totalInspected > 0 ? totalDefectives / totalInspected : 0;

  const points: PChartPoint[] = Array.from({ length: n }, (_, i) => {
    const ni = sampleSizes[i] > 0 ? sampleSizes[i] : 1;
    const proportion = defectives[i] / ni;
    const spread = 3 * Math.sqrt((pBar * (1 - pBar)) / ni);
    const ucl = pBar + spread;
    const lcl = Math.max(0, pBar - spread);
    return {
      index: i,
      date: dates[i] ?? `Period ${i + 1}`,
      defectives: defectives[i],
      sampleSize: ni,
      proportion,
      ucl,
      lcl,
      signal: proportion > ucl || proportion < lcl,
    };
  });

  return { points, pBar };
}

// ─── np-Chart (Count of Defectives, fixed sample size) ─────────────────────

export interface NpChartPoint {
  index: number;
  date: string;
  defectives: number;
  ucl: number;
  lcl: number;
  signal: boolean;
}

export interface NpChartResult {
  points: NpChartPoint[];
  npBar: number;  // average count of defectives
  pBar: number;   // average proportion
  ucl: number;
  lcl: number;
}

export function calculateNpChart(
  defectives: number[],
  sampleSize: number,
  dates: string[]
): NpChartResult {
  const n = Math.min(defectives.length, dates.length);
  const npBar = defectives.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const pBar = npBar / sampleSize;
  const spread = 3 * Math.sqrt(npBar * (1 - pBar));
  const ucl = npBar + spread;
  const lcl = Math.max(0, npBar - spread);

  const points: NpChartPoint[] = Array.from({ length: n }, (_, i) => ({
    index: i,
    date: dates[i] ?? `Period ${i + 1}`,
    defectives: defectives[i],
    ucl,
    lcl,
    signal: defectives[i] > ucl || defectives[i] < lcl,
  }));

  return { points, npBar, pBar, ucl, lcl };
}

// ─── c-Chart (Count of Defects, fixed inspection area/time) ─────────────────

export interface CChartPoint {
  index: number;
  date: string;
  defects: number;
  ucl: number;
  lcl: number;
  signal: boolean;
}

export interface CChartResult {
  points: CChartPoint[];
  cBar: number;  // mean defect count
  ucl: number;
  lcl: number;
}

export function calculateCChart(
  defects: number[],
  dates: string[]
): CChartResult {
  const n = Math.min(defects.length, dates.length);
  const cBar = defects.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const spread = 3 * Math.sqrt(cBar);
  const ucl = cBar + spread;
  const lcl = Math.max(0, cBar - spread);

  const points: CChartPoint[] = Array.from({ length: n }, (_, i) => ({
    index: i,
    date: dates[i] ?? `Period ${i + 1}`,
    defects: defects[i],
    ucl,
    lcl,
    signal: defects[i] > ucl || defects[i] < lcl,
  }));

  return { points, cBar, ucl, lcl };
}

// ─── u-Chart (Count of Defects per Unit, variable inspection area) ──────────

export interface UChartPoint {
  index: number;
  date: string;
  defects: number;
  units: number;
  rate: number;   // defects / units
  ucl: number;
  lcl: number;
  signal: boolean;
}

export interface UChartResult {
  points: UChartPoint[];
  uBar: number;   // overall average defect rate
}

export function calculateUChart(
  defects: number[],
  units: number[],
  dates: string[]
): UChartResult {
  const n = Math.min(defects.length, units.length, dates.length);
  const totalDefects = defects.slice(0, n).reduce((a, b) => a + b, 0);
  const totalUnits = units.slice(0, n).reduce((a, b) => a + b, 0);
  const uBar = totalUnits > 0 ? totalDefects / totalUnits : 0;

  const points: UChartPoint[] = Array.from({ length: n }, (_, i) => {
    const ni = units[i] > 0 ? units[i] : 1;
    const rate = defects[i] / ni;
    const spread = 3 * Math.sqrt(uBar / ni);
    const ucl = uBar + spread;
    const lcl = Math.max(0, uBar - spread);
    return {
      index: i,
      date: dates[i] ?? `Period ${i + 1}`,
      defects: defects[i],
      units: ni,
      rate,
      ucl,
      lcl,
      signal: rate > ucl || rate < lcl,
    };
  });

  return { points, uBar };
}

// ─── Pareto Data ────────────────────────────────────────────────────────────

export interface ParetoItem {
  category: string;
  count: number;
  cumulative: number;       // cumulative count
  cumulativePct: number;    // cumulative percentage (0–100)
  isVitalFew: boolean;      // true if in the first 80% cumulative
}

export function buildParetoData(
  categories: string[],
  counts: number[]
): ParetoItem[] {
  const n = Math.min(categories.length, counts.length);
  const pairs = Array.from({ length: n }, (_, i) => ({
    category: categories[i],
    count: counts[i],
  })).sort((a, b) => b.count - a.count);

  const total = pairs.reduce((s, p) => s + p.count, 0);
  let cumulative = 0;

  return pairs.map((p) => {
    cumulative += p.count;
    const cumulativePct = total > 0 ? (cumulative / total) * 100 : 0;
    return {
      category: p.category,
      count: p.count,
      cumulative,
      cumulativePct,
      isVitalFew: cumulativePct - (p.count / total) * 100 < 80,
    };
  });
}

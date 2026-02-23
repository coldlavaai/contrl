// Dummy dataset: Weekly Operations Demo
// 52 weeks of realistic SPC data with natural variation and a few signals

export interface Measure {
  name: string;
  unit: string;
  data: number[];
}

export interface Dataset {
  name: string;
  dates: string[];
  measures: Measure[];
}

// Generate weekly dates starting from Jan 2023
function weeklyDates(count: number, startDate = "2023-01-09"): string[] {
  const dates: string[] = [];
  const d = new Date(startDate);
  for (let i = 0; i < count; i++) {
    dates.push(d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }));
    d.setDate(d.getDate() + 7);
  }
  return dates;
}

// Keys Out — keys given to contractor per week
// Baseline ~22, with natural variation σ≈4, a run of 8+ below mean mid-year,
// and a sustained increase in Q4 (trend signal)
const keysOut: number[] = [
  24, 19, 22, 26, 21, 18, 23, 25, 20, 22,
  17, 19, 14, 16, 15, 13, 14, 16, 15, 14, // <-- run below mean (10 consecutive)
  23, 21, 24, 22, 26, 19, 23, 25, 20, 22,
  21, 24, 19, 22, 23, 21, 22, 24, 26, 23,
  24, 26, 28, 29, 31, 30, 32, 33, 34, 35, // <-- upward trend (6+ increasing)
  30, 28,
];

// Keys Back — keys returned per week
// Similar to keys out but slightly lagged, baseline ~20, σ≈3
const keysBack: number[] = [
  21, 18, 20, 23, 19, 17, 21, 22, 18, 20,
  15, 17, 13, 14, 12, 14, 13, 15, 14, 13, // run below mean
  21, 19, 22, 20, 24, 17, 21, 23, 18, 20,
  19, 22, 18, 20, 21, 19, 21, 23, 25, 21,
  22, 24, 26, 27, 28, 27, 29, 30, 31, 32, // upward trend
  28, 26,
];

// Turnaround Days — average days from keys out to keys back
// Baseline ~18 days, σ≈3.5, a long run above mean in middle, improvement trend at end
const turnaroundDays: number[] = [
  19, 17, 21, 18, 16, 20, 19, 18, 22, 17,
  22, 24, 25, 23, 26, 24, 25, 23, 24, 25, // run above mean (10 consecutive)
  24, 26, 23, 22, 25, 21, 24, 23, 22, 20,
  21, 19, 20, 22, 18, 21, 19, 20, 17, 19,
  18, 16, 15, 14, 13, 12, 14, 13, 15, 14, // downward trend
  17, 18,
];

const dates = weeklyDates(52);

export const dummyDataset: Dataset = {
  name: "Weekly Operations — Demo Dataset",
  dates,
  measures: [
    { name: "Keys Out", unit: "keys/week", data: keysOut },
    { name: "Keys Back", unit: "keys/week", data: keysBack },
    { name: "Turnaround Days", unit: "days", data: turnaroundDays },
  ],
};

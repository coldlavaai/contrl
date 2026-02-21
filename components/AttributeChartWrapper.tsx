"use client";

import {
  PChartComponent,
  NpChartComponent,
  CChartComponent,
  UChartComponent,
} from "@/components/AttributeChart";
import ParetoChart from "@/components/ParetoChart";

interface AttributeChartWrapperProps {
  chartType: string;
  dates: string[];
  col1Values: number[];
  col1Strings?: string[];
  col2Values: number[];
  fixedN: number;
  title?: string;
}

export default function AttributeChartWrapper({
  chartType,
  dates,
  col1Values,
  col1Strings,
  col2Values,
  fixedN,
  title,
}: AttributeChartWrapperProps) {
  if (chartType === "pchart") {
    return (
      <PChartComponent
        defectives={col1Values}
        sampleSizes={col2Values}
        dates={dates}
        title={title}
      />
    );
  }

  if (chartType === "npchart") {
    return (
      <NpChartComponent
        defectives={col1Values}
        sampleSize={fixedN}
        dates={dates}
        title={title}
      />
    );
  }

  if (chartType === "cchart") {
    return (
      <CChartComponent
        defects={col1Values}
        dates={dates}
        title={title}
      />
    );
  }

  if (chartType === "uchart") {
    return (
      <UChartComponent
        defects={col1Values}
        units={col2Values}
        dates={dates}
        title={title}
      />
    );
  }

  if (chartType === "pareto") {
    // For Pareto: use col1Strings as categories if available, otherwise use dates as labels
    // col2Values are the counts; if no col2, use col1Values as counts with dates as labels
    const hasCountCol = col2Values.length > 0;
    const categories = col1Strings && col1Strings.length > 0 && hasCountCol
      ? col1Strings
      : dates;
    const counts = hasCountCol ? col2Values : col1Values;
    return (
      <ParetoChart
        categories={categories}
        counts={counts}
        title={title}
      />
    );
  }

  return <div className="text-gray-500 text-sm p-4">Unknown chart type: {chartType}</div>;
}

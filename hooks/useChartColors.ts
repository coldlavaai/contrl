"use client";

import { useEffect, useState } from "react";
import { getChartColors, ChartColors, DEFAULT_COLORS } from "@/lib/colorSettings";

export function useChartColors(): ChartColors {
  const [colors, setColors] = useState<ChartColors>(DEFAULT_COLORS);

  useEffect(() => {
    // Load colors on mount
    setColors(getChartColors());

    // Listen for changes from other components
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<ChartColors>;
      setColors(customEvent.detail);
    };

    window.addEventListener("chartColorsChanged", handler);
    return () => window.removeEventListener("chartColorsChanged", handler);
  }, []);

  return colors;
}

"use client";

import { useState, useCallback } from "react";
import { useChartColors } from "@/hooks/useChartColors";

export interface ChartColors {
  background?: string;
  meanLine?: string;
  medianLine?: string;
  uclLine?: string;
  lclLine?: string;
  dataPoints?: string;
  sigma1Line?: string;
  sigma2Line?: string;
}

export type ColorKey = keyof ChartColors;

export function usePerChartColors(initialCustomColors?: ChartColors) {
  const globalColors = useChartColors();
  const [customColors, setCustomColors] = useState<ChartColors>(initialCustomColors ?? {});

  // Merge custom colors with global defaults
  const effectiveColors = {
    background: customColors.background ?? globalColors.background,
    meanLine: customColors.meanLine ?? globalColors.meanLine,
    medianLine: customColors.medianLine ?? globalColors.medianLine,
    uclLine: customColors.uclLine ?? globalColors.uclLine,
    lclLine: customColors.lclLine ?? globalColors.lclLine,
    dataPoints: customColors.dataPoints ?? globalColors.dataPoints,
    sigma1Line: customColors.sigma1Line ?? globalColors.sigma1Line,
    sigma2Line: customColors.sigma2Line ?? globalColors.sigma2Line,
  };

  const updateColor = useCallback((key: ColorKey, value: string) => {
    setCustomColors((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setCustomColors({});
  }, []);

  const hasCustomizations = Object.keys(customColors).length > 0;

  return {
    colors: effectiveColors,
    customColors,
    updateColor,
    resetToDefaults,
    hasCustomizations,
  };
}

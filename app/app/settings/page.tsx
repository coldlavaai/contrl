"use client";

import { useState, useEffect } from "react";
import { ColorPicker } from "@/components/ui/color-picker";
import {
  getChartColors,
  saveChartColors,
  resetChartColors,
  ChartColors,
  DEFAULT_COLORS,
} from "@/lib/colorSettings";

export default function SettingsPage() {
  const [colors, setColors] = useState<ChartColors>(DEFAULT_COLORS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setColors(getChartColors());
  }, []);

  const handleColorChange = (key: keyof ChartColors, value: string) => {
    const updated = { ...colors, [key]: value };
    setColors(updated);
    saveChartColors(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    resetChartColors();
    setColors(DEFAULT_COLORS);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-gray-500 mt-1">Customize your chart appearance and preferences</p>
      </div>

      {/* Color Customization Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-200 mb-1">Chart Colors</h2>
            <p className="text-sm text-gray-600">
              Customize the color scheme for all charts. Changes apply globally and save automatically.
            </p>
          </div>

          {saved && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-700/20 border border-green-500/30 text-green-400 text-sm font-medium">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Saved
            </div>
          )}
        </div>

        <div className="space-y-3">
          <ColorPicker
            label="Chart Background"
            description="Background color for all chart areas"
            value={colors.background}
            onChange={(value) => handleColorChange("background", value)}
          />

          <ColorPicker
            label="Mean Line"
            description="Color for the mean (X̄) center line"
            value={colors.meanLine}
            onChange={(value) => handleColorChange("meanLine", value)}
          />

          <ColorPicker
            label="Median Line"
            description="Color for the median (M̃) center line when using median mode"
            value={colors.medianLine}
            onChange={(value) => handleColorChange("medianLine", value)}
          />

          <ColorPicker
            label="UCL (Upper Control Limit)"
            description="Color for upper control limit lines"
            value={colors.uclLine}
            onChange={(value) => handleColorChange("uclLine", value)}
          />

          <ColorPicker
            label="LCL (Lower Control Limit)"
            description="Color for lower control limit lines"
            value={colors.lclLine}
            onChange={(value) => handleColorChange("lclLine", value)}
          />

          <ColorPicker
            label="Data Points & Lines"
            description="Color for data points and connecting lines"
            value={colors.dataPoints}
            onChange={(value) => handleColorChange("dataPoints", value)}
          />
        </div>

        {/* Reset to defaults */}
        <div className="pt-4 border-t border-white/10">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-white/5 border border-white/10 text-gray-400 hover:bg-white/8 hover:text-gray-200 hover:border-white/20 transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            Reset to Defaults
          </button>
        </div>

        {/* Preview hint */}
        <div className="p-4 rounded-lg border border-indigo-500/20 bg-indigo-950/10">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-lg shrink-0">
              💡
            </div>
            <div>
              <h3 className="text-sm font-semibold text-indigo-300 mb-1">Color changes apply immediately</h3>
              <p className="text-xs text-gray-500">
                Navigate to any chart page to see your new colors in action. All existing and new charts will use your customized color scheme.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Future settings placeholder */}
      <div className="mt-12 pt-8 border-t border-white/10">
        <h2 className="text-lg font-semibold text-gray-200 mb-4">More Settings Coming Soon</h2>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-700">
          <span className="px-3 py-1.5 rounded-full border border-white/8">User accounts</span>
          <span className="px-3 py-1.5 rounded-full border border-white/8">Team workspaces</span>
          <span className="px-3 py-1.5 rounded-full border border-white/8">Data export</span>
          <span className="px-3 py-1.5 rounded-full border border-white/8">Notifications</span>
          <span className="px-3 py-1.5 rounded-full border border-white/8">API access</span>
        </div>
      </div>
    </div>
  );
}

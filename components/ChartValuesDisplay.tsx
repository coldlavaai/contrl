"use client";

import type { SpcResult } from "@/lib/spc";

interface ChartValuesDisplayProps {
  spc: SpcResult;
  method: "mean" | "median";
  unit: string;
  splitModes: Record<number, "run" | "trend">;
  colors: {
    meanLine: string;
    medianLine: string;
    uclLine: string;
    lclLine: string;
  };
}

export function ChartValuesDisplay({
  spc,
  method,
  unit,
  splitModes,
  colors,
}: ChartValuesDisplayProps) {
  if (spc.segments.length === 0) return null;

  const centerLabel = method === "median" ? "Median" : "Mean";
  const centerColor = method === "median" ? colors.medianLine : colors.meanLine;

  // For single segment, show one set of values
  if (spc.segments.length === 1) {
    const seg = spc.segments[0];
    const isRunSplit = false; // No splits, so no run split mode

    return (
      <div className="px-4 py-3 rounded-lg border border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-4 flex-wrap text-sm">
          <ValueItem
            label={centerLabel}
            value={seg.mean}
            unit={unit}
            color={centerColor}
          />
          {!isRunSplit && (
            <>
              <ValueItem
                label="UCL"
                value={seg.ucl}
                unit={unit}
                color={colors.uclLine}
              />
              <ValueItem
                label="LCL"
                value={seg.lcl}
                unit={unit}
                color={colors.lclLine}
              />
            </>
          )}
        </div>
      </div>
    );
  }

  // Multiple segments: show grouped values
  return (
    <div className="space-y-2">
      <div className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold px-1">
        Segment Values
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {spc.segments.map((seg, i) => {
          const openingSplitIdx = i > 0 ? Object.keys(splitModes).map(Number).find(idx => idx < seg.startIndex && idx >= (spc.segments[i-1]?.startIndex ?? 0)) : undefined;
          const isRunSplit = openingSplitIdx !== undefined && splitModes[openingSplitIdx] === "run";

          return (
            <div
              key={i}
              className="px-3 py-2.5 rounded-lg border border-white/8 bg-white/[0.02]"
            >
              <div className="text-[10px] text-purple-400 font-semibold mb-1.5 uppercase tracking-wider">
                Segment {i + 1}
              </div>
              <div className="flex items-center gap-3 flex-wrap text-xs">
                <ValueItem
                  label={centerLabel}
                  value={seg.mean}
                  unit={unit}
                  color={centerColor}
                  compact
                />
                {!isRunSplit && (
                  <>
                    <ValueItem
                      label="UCL"
                      value={seg.ucl}
                      unit={unit}
                      color={colors.uclLine}
                      compact
                    />
                    <ValueItem
                      label="LCL"
                      value={seg.lcl}
                      unit={unit}
                      color={colors.lclLine}
                      compact
                    />
                  </>
                )}
                {isRunSplit && (
                  <span className="text-[10px] text-gray-600 italic">
                    (Run split — no limits)
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ValueItemProps {
  label: string;
  value: number;
  unit: string;
  color: string;
  compact?: boolean;
}

function ValueItem({ label, value, unit, color, compact }: ValueItemProps) {
  return (
    <div className={`flex items-center gap-1.5 ${compact ? "" : "gap-2"}`}>
      <div
        className={`${compact ? "w-1.5 h-1.5" : "w-2 h-2"} rounded-full shrink-0`}
        style={{ backgroundColor: color }}
      />
      <span className="text-gray-400 font-medium">
        {label}:
      </span>
      <span className="font-semibold text-white">
        {value.toFixed(2)}
        {unit && <span className="text-gray-600 ml-0.5">{unit}</span>}
      </span>
    </div>
  );
}

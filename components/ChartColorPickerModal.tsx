"use client";

import { useRef, useEffect, useState } from "react";
import type { ColorKey } from "@/hooks/usePerChartColors";

interface ChartColorPickerModalProps {
  colorKey: ColorKey;
  currentColor: string;
  label: string;
  onColorChange: (key: ColorKey, color: string) => void;
  onClose: () => void;
  position: { x: number; y: number };
}

const COLOR_LABELS: Record<ColorKey, string> = {
  background: "Background",
  meanLine: "Mean Line",
  medianLine: "Median Line",
  uclLine: "UCL",
  lclLine: "LCL",
  dataPoints: "Data Points",
  sigma1Line: "±1σ Zone Line",
  sigma2Line: "±2σ Zone Line",
};

export function ChartColorPickerModal({
  colorKey,
  currentColor,
  label,
  onColorChange,
  onClose,
  position,
}: ChartColorPickerModalProps) {
  const [hexInput, setHexInput] = useState(currentColor);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHexInput(currentColor);
  }, [currentColor]);

  useEffect(() => {
    // Click outside to close
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleHexChange = (newHex: string) => {
    setHexInput(newHex);
    if (/^#[0-9A-Fa-f]{6}$/.test(newHex)) {
      onColorChange(colorKey, newHex);
    }
  };

  const handleColorPickerChange = (newColor: string) => {
    setHexInput(newColor);
    onColorChange(colorKey, newColor);
  };

  // Position modal intelligently (avoid going off-screen)
  const modalX = Math.min(position.x, window.innerWidth - 280);
  const modalY = Math.min(position.y, window.innerHeight - 200);

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/20" onClick={onClose} />
      <div
        ref={modalRef}
        className="fixed z-[101] bg-[#1c1c2e] border border-indigo-500/40 rounded-xl shadow-2xl p-4 w-64"
        style={{
          left: modalX,
          top: modalY,
        }}
      >
        <div className="space-y-3">
          <div>
            <div className="text-xs text-indigo-400 font-semibold mb-1">
              Customize Color
            </div>
            <div className="text-sm text-gray-300 font-medium">
              {COLOR_LABELS[colorKey] || label}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              value={hexInput}
              onChange={(e) => handleHexChange(e.target.value)}
              placeholder="#000000"
              maxLength={7}
              className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white font-mono placeholder-gray-600 outline-none focus:border-indigo-400/50 transition-colors"
            />
            <input
              ref={colorInputRef}
              type="color"
              value={currentColor}
              onChange={(e) => handleColorPickerChange(e.target.value)}
              className="w-12 h-10 rounded-lg cursor-pointer border border-white/10 bg-transparent"
              title="Pick color"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-lg text-sm font-semibold bg-indigo-600/80 hover:bg-indigo-600 text-white border border-indigo-500/50 transition-colors"
            >
              Done
            </button>
          </div>

          <div className="pt-2 border-t border-white/10">
            <p className="text-[10px] text-gray-600 italic">
              This color applies to this chart only. New charts use settings defaults.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

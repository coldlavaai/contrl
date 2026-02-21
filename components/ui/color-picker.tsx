"use client";

import { useState, useRef, useEffect } from "react";

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  description?: string;
}

export function ColorPicker({ label, value, onChange, description }: ColorPickerProps) {
  const [hexInput, setHexInput] = useState(value);
  const colorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHexInput(value);
  }, [value]);

  const handleHexChange = (newHex: string) => {
    setHexInput(newHex);
    // Validate hex color
    if (/^#[0-9A-Fa-f]{6}$/.test(newHex)) {
      onChange(newHex);
    }
  };

  const handleColorPickerChange = (newColor: string) => {
    setHexInput(newColor);
    onChange(newColor);
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-gray-200">{label}</label>
          <div
            className="w-5 h-5 rounded border-2 border-white/20 cursor-pointer hover:scale-110 transition-transform"
            style={{ backgroundColor: value }}
            onClick={() => colorInputRef.current?.click()}
            title="Click to open color picker"
          />
        </div>
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Hex input */}
        <input
          type="text"
          value={hexInput}
          onChange={(e) => handleHexChange(e.target.value)}
          placeholder="#000000"
          maxLength={7}
          className="w-24 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white font-mono placeholder-gray-600 outline-none focus:border-indigo-400/50 transition-colors"
        />

        {/* Native color picker (hidden) */}
        <input
          ref={colorInputRef}
          type="color"
          value={value}
          onChange={(e) => handleColorPickerChange(e.target.value)}
          className="w-10 h-10 rounded-lg cursor-pointer border border-white/10 bg-transparent"
          title="Pick color"
        />
      </div>
    </div>
  );
}

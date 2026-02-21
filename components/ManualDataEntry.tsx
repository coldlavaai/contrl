"use client";

import { useState, useCallback } from "react";
import { Plus, Trash2, Calendar, Hash } from "lucide-react";

export interface ManualDataRow {
  id: string;
  date: string;
  value: string;
}

interface ManualDataEntryProps {
  /** Called when the user confirms the entered data */
  onConfirm: (rows: { dates: string[]; values: number[] }) => void;
  /** Optional: show extra columns for subgroup data */
  mode?: "simple" | "append";
  /** Label for the value column */
  valueLabel?: string;
  /** Placeholder hint for values */
  valuePlaceholder?: string;
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function todayStr(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

export default function ManualDataEntry({
  onConfirm,
  mode = "simple",
  valueLabel = "Value",
  valuePlaceholder = "e.g. 42.5",
}: ManualDataEntryProps) {
  const [rows, setRows] = useState<ManualDataRow[]>([
    { id: generateId(), date: todayStr(), value: "" },
  ]);

  const addRow = useCallback(() => {
    // Determine next date: increment from last row's date
    const lastDate = rows[rows.length - 1]?.date;
    let nextDate = todayStr();
    if (lastDate) {
      try {
        const d = new Date(lastDate);
        d.setDate(d.getDate() + 1);
        nextDate = d.toISOString().split("T")[0];
      } catch { /* keep today */ }
    }
    setRows((prev) => [...prev, { id: generateId(), date: nextDate, value: "" }]);
  }, [rows]);

  const removeRow = useCallback((id: string) => {
    setRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((r) => r.id !== id);
    });
  }, []);

  const updateRow = useCallback((id: string, field: "date" | "value", val: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: val } : r))
    );
  }, []);

  const addMultipleRows = useCallback((count: number) => {
    const lastDate = rows[rows.length - 1]?.date || todayStr();
    const newRows: ManualDataRow[] = [];
    for (let i = 0; i < count; i++) {
      try {
        const d = new Date(lastDate);
        d.setDate(d.getDate() + i + 1);
        newRows.push({
          id: generateId(),
          date: d.toISOString().split("T")[0],
          value: "",
        });
      } catch {
        newRows.push({ id: generateId(), date: todayStr(), value: "" });
      }
    }
    setRows((prev) => [...prev, ...newRows]);
  }, [rows]);

  const validRows = rows.filter((r) => r.date.trim() && !isNaN(parseFloat(r.value)));

  const handleConfirm = () => {
    if (validRows.length === 0) return;
    const dates = validRows.map((r) => r.date.trim());
    const values = validRows.map((r) => parseFloat(r.value));
    onConfirm({ dates, values });
  };

  const handlePaste = useCallback((e: React.ClipboardEvent, rowIndex: number) => {
    const text = e.clipboardData.getData("text");
    const lines = text.split(/\n|\r\n/).filter((l) => l.trim());
    if (lines.length <= 1) return; // Let default paste happen for single values

    e.preventDefault();
    const newRows: ManualDataRow[] = [];
    for (const line of lines) {
      const parts = line.split(/\t|,/).map((p) => p.trim());
      if (parts.length >= 2) {
        newRows.push({ id: generateId(), date: parts[0], value: parts[1] });
      } else if (parts.length === 1 && !isNaN(parseFloat(parts[0]))) {
        // Just a number — auto-increment date
        const lastDate = newRows.length > 0
          ? newRows[newRows.length - 1].date
          : rows[rowIndex]?.date || todayStr();
        try {
          const d = new Date(lastDate);
          d.setDate(d.getDate() + (newRows.length > 0 ? 1 : 0));
          newRows.push({ id: generateId(), date: d.toISOString().split("T")[0], value: parts[0] });
        } catch {
          newRows.push({ id: generateId(), date: todayStr(), value: parts[0] });
        }
      }
    }
    if (newRows.length > 0) {
      setRows((prev) => {
        const before = prev.slice(0, rowIndex);
        const after = prev.slice(rowIndex + 1);
        return [...before, ...newRows, ...after];
      });
    }
  }, [rows]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">
            {mode === "append" ? "Add Data Points" : "Enter Data Manually"}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {mode === "append"
              ? "Add new data points to this chart"
              : "Enter date and value pairs. Paste from Excel supported."}
          </p>
        </div>
        <span className="text-[10px] text-gray-600">
          {validRows.length} valid row{validRows.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_1fr_40px] gap-2 px-1">
        <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-3 h-3" />
          Date / Period
        </div>
        <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
          <Hash className="w-3 h-3" />
          {valueLabel}
        </div>
        <div />
      </div>

      {/* Data rows */}
      <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
        {rows.map((row, i) => (
          <div key={row.id} className="grid grid-cols-[1fr_1fr_40px] gap-2 items-center">
            <input
              type="text"
              value={row.date}
              onChange={(e) => updateRow(row.id, "date", e.target.value)}
              placeholder="2024-01-15"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-500 transition-colors"
            />
            <input
              type="text"
              inputMode="decimal"
              value={row.value}
              onChange={(e) => updateRow(row.id, "value", e.target.value)}
              onPaste={(e) => handlePaste(e, i)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (i === rows.length - 1) addRow();
                  // Focus next value input
                  setTimeout(() => {
                    const inputs = document.querySelectorAll<HTMLInputElement>("input[inputMode='decimal']");
                    inputs[i + 1]?.focus();
                  }, 50);
                }
              }}
              placeholder={valuePlaceholder}
              className={`w-full bg-white/5 border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-500 transition-colors ${
                row.value && isNaN(parseFloat(row.value))
                  ? "border-red-500/50"
                  : "border-white/10"
              }`}
            />
            <button
              onClick={() => removeRow(row.id)}
              disabled={rows.length <= 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-950/20 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              title="Remove row"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Add rows buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={addRow}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-indigo-400 border border-indigo-500/30 hover:border-indigo-500/60 hover:bg-indigo-950/20 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Row
        </button>
        <button
          onClick={() => addMultipleRows(5)}
          className="px-3 py-1.5 rounded-lg text-sm text-gray-500 border border-white/8 hover:border-white/20 hover:text-gray-300 transition-all"
        >
          +5 Rows
        </button>
        <button
          onClick={() => addMultipleRows(10)}
          className="px-3 py-1.5 rounded-lg text-sm text-gray-500 border border-white/8 hover:border-white/20 hover:text-gray-300 transition-all"
        >
          +10 Rows
        </button>
      </div>

      {/* Paste hint */}
      <div className="text-[11px] text-gray-600 flex items-center gap-1.5">
        <span className="text-gray-700">💡</span>
        Tip: Paste data from Excel — two columns (date, value) separated by tabs
      </div>

      {/* Confirm button */}
      <button
        onClick={handleConfirm}
        disabled={validRows.length === 0}
        className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
      >
        {mode === "append"
          ? `Append ${validRows.length} Data Point${validRows.length !== 1 ? "s" : ""}`
          : `Create Chart with ${validRows.length} Data Point${validRows.length !== 1 ? "s" : ""}`}
      </button>
    </div>
  );
}

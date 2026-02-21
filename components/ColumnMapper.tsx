"use client";

import { useMemo, useState } from "react";
import { ParsedSheet } from "./FileUpload";
import { Button } from "@/components/ui/button";

export interface MappedDataset {
  name: string;
  dates: string[];
  measures: Array<{ name: string; unit: string; data: number[] }>;
}

interface ColumnMapperProps {
  sheet: ParsedSheet;
  onConfirm: (dataset: MappedDataset) => void;
}

/** Convert 0-based column index to Excel-style letter (A, B, …, Z, AA, AB, …) */
function colLetter(idx: number): string {
  let letter = "";
  let i = idx;
  while (i >= 0) {
    letter = String.fromCharCode(65 + (i % 26)) + letter;
    i = Math.floor(i / 26) - 1;
  }
  return letter;
}

/** Build column option labels by scanning the first 3 rows for a non-empty string */
function buildColumnOptions(rawRows: (string | number | null)[][]) {
  const maxCols = Math.max(0, ...rawRows.slice(0, 20).map((r) => r.length));
  return Array.from({ length: maxCols }, (_, colIdx) => {
    const letter = colLetter(colIdx);
    let label = "";
    for (let rowIdx = 0; rowIdx < Math.min(3, rawRows.length); rowIdx++) {
      const v = rawRows[rowIdx]?.[colIdx];
      if (v !== null && v !== undefined && v !== "" && typeof v === "string") {
        label = v;
        break;
      }
    }
    const display = label ? `Col ${letter} – ${label}` : `Col ${letter}`;
    return { index: colIdx, display };
  });
}

export default function ColumnMapper({ sheet, onConfirm }: ColumnMapperProps) {
  const { rawRows } = sheet;

  // dateCol / data cols store column index as string (e.g. "3"), empty = unset
  const [dateCol, setDateCol] = useState<string>("");
  const [datasetName, setDatasetName] = useState("My Dataset");
  const [dataColumns, setDataColumns] = useState<
    Array<{ col: string; name: string; unit: string }>
  >([{ col: "", name: "", unit: "" }]);

  const columnOptions = useMemo(() => buildColumnOptions(rawRows), [rawRows]);

  const addDataColumn = () =>
    setDataColumns((prev) => [...prev, { col: "", name: "", unit: "" }]);

  const removeDataColumn = (i: number) =>
    setDataColumns((prev) => prev.filter((_, idx) => idx !== i));

  const updateDataColumn = (
    i: number,
    field: "col" | "name" | "unit",
    value: string
  ) =>
    setDataColumns((prev) =>
      prev.map((dc, idx) => (idx === i ? { ...dc, [field]: value } : dc))
    );

  const handleConfirm = () => {
    if (dateCol === "") return;
    const dateColIdx = parseInt(dateCol, 10);

    // Filter out rows where the date cell is empty
    const dataRows = rawRows.filter((row) => {
      const v = row[dateColIdx];
      return v !== null && v !== undefined && v !== "";
    });

    const dates = dataRows.map((row) => String(row[dateColIdx] ?? ""));

    const measures = dataColumns
      .filter((dc) => dc.col !== "" && dc.name)
      .map((dc) => {
        const colIdx = parseInt(dc.col, 10);
        const data = dataRows.map((row) => {
          const v = row[colIdx];
          return typeof v === "number"
            ? v
            : parseFloat(String(v ?? "0")) || 0;
        });
        return { name: dc.name, unit: dc.unit, data };
      });

    if (measures.length === 0) return;
    onConfirm({ name: datasetName, dates, measures });
  };

  const isValid = dateCol !== "" && dataColumns.some((dc) => dc.col !== "" && dc.name);

  return (
    <div className="space-y-6 p-6 bg-white/3 border border-white/8 rounded-xl">
      <div>
        <h3 className="text-white font-semibold mb-4">Map your columns</h3>

        {/* Dataset name */}
        <div className="mb-5">
          <label className="block text-xs text-gray-400 mb-1">Dataset name</label>
          <input
            value={datasetName}
            onChange={(e) => setDatasetName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Date column */}
        <div className="mb-5">
          <label className="block text-xs text-gray-400 mb-1">Date column</label>
          <select
            value={dateCol}
            onChange={(e) => setDateCol(e.target.value)}
            className="w-full bg-[#141414] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="">— Select column —</option>
            {columnOptions.map((opt) => (
              <option key={opt.index} value={String(opt.index)}>
                {opt.display}
              </option>
            ))}
          </select>
        </div>

        {/* Data columns */}
        <div className="space-y-3">
          <label className="block text-xs text-gray-400">Data columns (measures)</label>
          {dataColumns.map((dc, i) => (
            <div key={i} className="flex gap-2 items-center">
              <select
                value={dc.col}
                onChange={(e) => updateDataColumn(i, "col", e.target.value)}
                className="flex-1 bg-[#141414] border border-white/10 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="">— Column —</option>
                {columnOptions.map((opt) => (
                  <option key={opt.index} value={String(opt.index)}>
                    {opt.display}
                  </option>
                ))}
              </select>
              <input
                placeholder="Measure name"
                value={dc.name}
                onChange={(e) => updateDataColumn(i, "name", e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              />
              <input
                placeholder="Unit"
                value={dc.unit}
                onChange={(e) => updateDataColumn(i, "unit", e.target.value)}
                className="w-20 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              />
              {dataColumns.length > 1 && (
                <button
                  onClick={() => removeDataColumn(i)}
                  className="text-gray-600 hover:text-red-400 transition-colors text-lg leading-none px-1"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addDataColumn}
            className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
          >
            + Add measure
          </button>
        </div>
      </div>

      <Button
        onClick={handleConfirm}
        disabled={!isValid}
        className="bg-indigo-600 hover:bg-indigo-500 text-white w-full"
      >
        Build SPC Charts
      </Button>
    </div>
  );
}

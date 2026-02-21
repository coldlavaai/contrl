"use client";

import { useCallback, useState } from "react";
import { read, utils } from "xlsx";

export interface ParsedSheet {
  rawRows: (string | number | null)[][];
}

export interface WorkbookData {
  sheetNames: string[];
  sheets: Record<string, ParsedSheet>;
}

interface FileUploadProps {
  onWorkbookParsed: (data: WorkbookData) => void;
}

export default function FileUpload({ onWorkbookParsed }: FileUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(
    (file: File) => {
      setError(null);
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = read(data, { type: "array" });

          if (!workbook.SheetNames.length) {
            setError("No sheets found in file.");
            return;
          }

          const sheets: Record<string, ParsedSheet> = {};
          for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const rawRows = utils.sheet_to_json<(string | number | null)[]>(
              worksheet,
              { header: 1 }
            );
            sheets[sheetName] = { rawRows };
          }

          onWorkbookParsed({ sheetNames: workbook.SheetNames, sheets });
        } catch {
          setError(
            "Failed to parse file. Please upload a valid .xlsx or .csv file."
          );
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [onWorkbookParsed]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center w-full rounded-xl border-2 border-dashed p-10 text-center transition-all cursor-pointer
        ${dragging ? "border-indigo-500 bg-indigo-950/20" : "border-white/10 bg-white/2 hover:border-white/20 hover:bg-white/5"}`}
    >
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        onChange={handleChange}
      />

      <div className="pointer-events-none flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-indigo-900/40 flex items-center justify-center mb-1">
          <svg
            className="w-7 h-7 text-indigo-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        {fileName ? (
          <p className="text-green-400 font-medium">{fileName}</p>
        ) : (
          <>
            <p className="text-white font-medium">Drop your Excel file here</p>
            <p className="text-gray-500 text-sm">
              or click to browse — .xlsx, .xls, .csv supported
            </p>
          </>
        )}
        {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
      </div>
    </div>
  );
}

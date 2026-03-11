"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Download, FileText, Image, Printer } from "lucide-react";
import { downloadChartPdf, downloadChartImage, downloadFullChartPng, downloadFullChartPdf, printChart, ExportStats } from "@/lib/exportUtils";

interface ExportDropdownProps {
  /** Ref to the chart container element (must contain a .js-plotly-plot) */
  chartContainerRef: React.RefObject<HTMLElement | null>;
  /** Ref to the full section container (chart + segment stats) for full exports */
  fullContainerRef?: React.RefObject<HTMLElement | null>;
  /** Chart title for filenames */
  title: string;
  /** Statistics to include in the PDF */
  stats: ExportStats;
}

export default function ExportDropdown({ chartContainerRef, fullContainerRef, title, stats }: ExportDropdownProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const handleAction = useCallback(
    async (action: "pdf" | "png" | "jpeg" | "print" | "full-png" | "full-pdf") => {
      if (!chartContainerRef.current) return;

      if (action === "print") {
        printChart();
        setOpen(false);
        return;
      }

      // Full exports (chart + segment stats + branding)
      if (action === "full-png" || action === "full-pdf") {
        if (!fullContainerRef?.current) return;
        setLoading(action);
        try {
          if (action === "full-png") {
            await downloadFullChartPng(fullContainerRef.current, title, false);
          } else {
            await downloadFullChartPdf(fullContainerRef.current, title, false);
          }
        } catch (err) {
          console.error(`Export ${action} failed:`, err);
        } finally {
          setLoading(null);
          setOpen(false);
        }
        return;
      }

      // Chart-only exports
      setLoading(action);
      try {
        if (action === "pdf") {
          await downloadChartPdf(chartContainerRef.current, title, stats);
        } else {
          await downloadChartImage(chartContainerRef.current, title, action, 2);
        }
      } catch (err) {
        console.error(`Export ${action} failed:`, err);
      } finally {
        setLoading(null);
        setOpen(false);
      }
    },
    [chartContainerRef, fullContainerRef, title, stats],
  );

  const menuItems = [
    ...(fullContainerRef
      ? [
          {
            key: "full-pdf" as const,
            icon: FileText,
            label: "Full Export (PDF)",
            desc: "Chart + segment stats + branding",
          },
          {
            key: "full-png" as const,
            icon: Image,
            label: "Full Export (PNG)",
            desc: "Chart + segment stats + branding",
          },
        ]
      : []),
    {
      key: "pdf" as const,
      icon: FileText,
      label: "Chart Only (PDF)",
      desc: "Statistics table below",
    },
    {
      key: "png" as const,
      icon: Image,
      label: "Chart Only (PNG)",
      desc: "High-res image (2×)",
    },
    {
      key: "jpeg" as const,
      icon: Image,
      label: "Chart Only (JPEG)",
      desc: "Compressed image",
    },
    {
      key: "print" as const,
      icon: Printer,
      label: "Print",
      desc: "Print-friendly view",
    },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all duration-200 ${
          open
            ? "bg-indigo-600/30 border-indigo-500/50 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.2)]"
            : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/8 hover:text-gray-200 hover:border-white/20"
        }`}
        title="Export chart"
      >
        <Download size={14} />
        <span>Export</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-60 rounded-xl border border-white/10 bg-[#1a1a2e]/95 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {menuItems.map((item, i) => {
            const Icon = item.icon;
            const isLoading = loading === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleAction(item.key)}
                disabled={loading !== null}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5 disabled:opacity-50 ${
                  i < menuItems.length - 1 ? "border-b border-white/5" : ""
                }`}
              >
                <div className="shrink-0 w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                  ) : (
                    <Icon size={14} className="text-gray-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-gray-200 font-medium">{item.label}</div>
                  <div className="text-[11px] text-gray-500 truncate">{item.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

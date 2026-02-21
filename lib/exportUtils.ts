// Export utilities for Contrl SPC charts
// PDF, PNG, JPEG export and print support

import jsPDF from "jspdf";

export interface ExportStats {
  mean?: number;
  ucl?: number;
  lcl?: number;
  cpk?: number | null;
  cp?: number | null;
  pp?: number | null;
  ppk?: number | null;
  ppm?: number | null;
  signalCount?: number;
  dataPoints?: number;
  lsl?: number;
  usl?: number;
  mrMean?: number;
  mrUcl?: number;
  unit?: string;
  method?: "mean" | "median";
  /** Nelson rule violation summary */
  ruleViolations?: Record<number, number>;
}

/**
 * Get a Plotly chart element's gd (graph div) from a container.
 * Searches for the `.js-plotly-plot` element within the given container.
 */
function getPlotlyGd(container: HTMLElement): HTMLElement | null {
  return container.querySelector(".js-plotly-plot") as HTMLElement | null;
}

/**
 * Get Plotly module dynamically (client-side only).
 * Uses eval-based dynamic import to prevent Next.js/Turbopack from statically
 * analyzing and bundling plotly.js (which has Node polyfill issues).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getPlotlyModule(): Promise<any> {
  // Check if Plotly is already on window (some setups expose it)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window as any).Plotly?.toImage) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).Plotly;
  }
  // Dynamic import hidden from bundler static analysis
  const mod = await new Function('return import("plotly.js")')();
  return mod.default || mod;
}

/**
 * Capture a Plotly chart as a base64 PNG/JPEG image string.
 */
export async function captureChartImage(
  chartContainer: HTMLElement,
  scale: number = 2,
  format: "png" | "jpeg" = "png",
): Promise<string> {
  const gd = getPlotlyGd(chartContainer);
  if (!gd) throw new Error("No Plotly chart found in container");

  const Plotly = await getPlotlyModule();
  const dataUrl = await Plotly.toImage(gd, {
    format,
    width: 1200,
    height: 600,
    scale,
  });

  return dataUrl;
}

/**
 * Download a chart as PNG or JPEG.
 */
export async function downloadChartImage(
  chartContainer: HTMLElement,
  title: string,
  format: "png" | "jpeg" = "png",
  scale: number = 2,
): Promise<void> {
  const dataUrl = await captureChartImage(chartContainer, scale, format);
  const link = document.createElement("a");
  link.download = `${sanitizeFilename(title)}.${format}`;
  link.href = dataUrl;
  link.click();
}

/**
 * Generate and download a professional PDF report for an SPC chart.
 */
export async function downloadChartPdf(
  chartContainer: HTMLElement,
  title: string,
  stats: ExportStats,
): Promise<void> {
  const imageDataUrl = await captureChartImage(chartContainer, 2, "png");

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = margin;

  // ── Header ──
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, pageWidth, 22, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(title, margin, 14);

  // Date on right
  doc.setFontSize(9);
  doc.setTextColor(160, 160, 170);
  const dateStr = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  doc.text(dateStr, pageWidth - margin, 14, { align: "right" });

  // Subtle branding
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 120);
  doc.text("Contrl — SPC Report", pageWidth - margin, 9, { align: "right" });

  cursorY = 28;

  // ── Chart Image ──
  const chartHeight = 95; // mm
  doc.addImage(imageDataUrl, "PNG", margin, cursorY, contentWidth, chartHeight);
  cursorY += chartHeight + 8;

  // ── Statistics Table ──
  doc.setFillColor(245, 245, 250);
  doc.roundedRect(margin, cursorY, contentWidth, 52, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 80);
  doc.text("Process Statistics", margin + 5, cursorY + 7);
  cursorY += 12;

  // Build stats rows
  const rows: [string, string][] = [];
  const methodLabel = stats.method === "median" ? "Median" : "Mean";

  if (stats.mean != null) rows.push([`${methodLabel} (X̄)`, stats.mean.toFixed(3)]);
  if (stats.ucl != null) rows.push(["UCL", stats.ucl.toFixed(3)]);
  if (stats.lcl != null) rows.push(["LCL", stats.lcl.toFixed(3)]);
  if (stats.mrMean != null) rows.push(["R̄ (Avg MR)", stats.mrMean.toFixed(3)]);
  if (stats.dataPoints != null) rows.push(["Data Points", String(stats.dataPoints)]);
  if (stats.signalCount != null) rows.push(["Signals", String(stats.signalCount)]);

  // Spec limits
  if (stats.lsl != null) rows.push(["LSL", `${stats.lsl}${stats.unit ? ` ${stats.unit}` : ""}`]);
  if (stats.usl != null) rows.push(["USL", `${stats.usl}${stats.unit ? ` ${stats.unit}` : ""}`]);

  // Capability
  if (stats.cp != null) rows.push(["Cp", stats.cp.toFixed(3)]);
  if (stats.cpk != null) rows.push(["Cpk", stats.cpk.toFixed(3)]);
  if (stats.pp != null) rows.push(["Pp", stats.pp.toFixed(3)]);
  if (stats.ppk != null) rows.push(["Ppk", stats.ppk.toFixed(3)]);
  if (stats.ppm != null) rows.push(["PPM", stats.ppm < 1 ? stats.ppm.toExponential(2) : Math.round(stats.ppm).toLocaleString()]);

  // Render stats in columns (4 cols)
  const colCount = 4;
  const colWidth = (contentWidth - 10) / colCount;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  for (let i = 0; i < rows.length; i++) {
    const col = i % colCount;
    const row = Math.floor(i / colCount);
    const x = margin + 5 + col * colWidth;
    const y = cursorY + row * 9;

    // Label
    doc.setTextColor(130, 130, 150);
    doc.text(rows[i][0], x, y);

    // Value
    doc.setTextColor(40, 40, 60);
    doc.setFont("helvetica", "bold");
    doc.text(rows[i][1], x + 30, y);
    doc.setFont("helvetica", "normal");
  }

  // ── Nelson Rule Violations Summary ──
  if (stats.ruleViolations && Object.keys(stats.ruleViolations).length > 0) {
    cursorY += 56;
    if (cursorY + 30 < pageHeight - margin) {
      doc.setFillColor(255, 245, 245);
      doc.roundedRect(margin, cursorY, contentWidth, 24, 3, 3, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(200, 60, 60);
      doc.text("Signal Rule Violations", margin + 5, cursorY + 7);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(80, 40, 40);

      const ruleNames: Record<number, string> = {
        1: "Beyond 3σ",
        2: "Run of 9",
        3: "Trend of 6",
        4: "14 alternating",
        5: "2/3 beyond 2σ",
        6: "4/5 beyond 1σ",
        7: "15 within 1σ",
        8: "8 beyond 1σ",
      };

      let rx = margin + 5;
      for (const [rule, count] of Object.entries(stats.ruleViolations)) {
        const text = `Rule ${rule}: ${ruleNames[Number(rule)] || ""} (${count} pt${count !== 1 ? "s" : ""})`;
        doc.text(text, rx, cursorY + 16);
        rx += doc.getTextWidth(text) + 10;
        if (rx > pageWidth - margin - 20) {
          rx = margin + 5;
          cursorY += 7;
        }
      }
    }
  }

  // ── Footer ──
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 190);
  doc.text(
    `Generated by Contrl · ${dateStr}`,
    pageWidth / 2,
    pageHeight - 5,
    { align: "center" },
  );

  doc.save(`${sanitizeFilename(title)}.pdf`);
}

/**
 * Trigger browser print with print-friendly styles already in globals.css.
 */
export function printChart(): void {
  window.print();
}

/**
 * Sanitize a filename by removing special characters.
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s\-_]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 100);
}

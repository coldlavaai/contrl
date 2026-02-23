"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Palette,
  SlidersHorizontal,
  Download,
  Info,
  RotateCcw,
  Check,
  Gauge,
  Bell,
  BellRing,
  Mail,
  Clock,
  Users,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { ColorPicker } from "@/components/ui/color-picker";
import {
  getChartColors,
  saveChartColors,
  resetChartColors,
  ChartColors,
  DEFAULT_COLORS,
} from "@/lib/colorSettings";
import {
  getEmailAlertSettings,
  saveEmailAlertSettings,
  EmailAlertSettings,
} from "@/lib/alerts";
import { cn } from "@/lib/utils";

// ── Settings types ────────────────────────────────────────────────────────────

interface DefaultChartOptions {
  defaultMethod: "mean" | "median";
  defaultSubgroupSize: number;
  nelsonRules: {
    rule1: boolean;
    rule2: boolean;
    rule3: boolean;
    rule4: boolean;
    rule5: boolean;
    rule6: boolean;
    rule7: boolean;
    rule8: boolean;
  };
}

interface ExportOptions {
  defaultFormat: "png" | "pdf";
  includeStats: boolean;
}

const DEFAULT_CHART_OPTIONS: DefaultChartOptions = {
  defaultMethod: "mean",
  defaultSubgroupSize: 1,
  nelsonRules: {
    rule1: true,
    rule2: true,
    rule3: true,
    rule4: false,
    rule5: false,
    rule6: false,
    rule7: false,
    rule8: false,
  },
};

const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  defaultFormat: "png",
  includeStats: true,
};

function loadSettings<T>(key: string, defaults: T): T {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

function saveSettings<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

const NELSON_RULES = [
  { key: "rule1", num: 1, name: "Beyond 3σ", desc: "1 point beyond UCL or LCL" },
  { key: "rule2", num: 2, name: "Run of 9", desc: "9 consecutive points same side of mean" },
  { key: "rule3", num: 3, name: "Trend of 6", desc: "6 consecutive points increasing or decreasing" },
  { key: "rule4", num: 4, name: "14 alternating", desc: "14 points alternating up and down" },
  { key: "rule5", num: 5, name: "2 of 3 beyond 2σ", desc: "2 out of 3 points beyond 2 sigma" },
  { key: "rule6", num: 6, name: "4 of 5 beyond 1σ", desc: "4 out of 5 points beyond 1 sigma" },
  { key: "rule7", num: 7, name: "15 within 1σ", desc: "15 points hugging the center line" },
  { key: "rule8", num: 8, name: "8 beyond 1σ", desc: "8 points on both sides, none in zone C" },
];

export default function SettingsPage() {
  // Colors
  const [colors, setColors] = useState<ChartColors>(DEFAULT_COLORS);
  // Chart options
  const [chartOptions, setChartOptions] = useState<DefaultChartOptions>(DEFAULT_CHART_OPTIONS);
  // Export options
  const [exportOptions, setExportOptions] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS);
  // Email alerts
  const [emailSettings, setEmailSettings] = useState<EmailAlertSettings>({
    enabled: false,
    email: "",
    frequency: "daily",
  });
  // Save flash
  const [saved, setSaved] = useState(false);

  function showSaved() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  useEffect(() => {
    setColors(getChartColors());
    setChartOptions(loadSettings("contrl_default_chart_options", DEFAULT_CHART_OPTIONS));
    setExportOptions(loadSettings("contrl_export_options", DEFAULT_EXPORT_OPTIONS));
    setEmailSettings(getEmailAlertSettings());
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleColorChange = (key: keyof ChartColors, value: string) => {
    const updated = { ...colors, [key]: value };
    setColors(updated);
    saveChartColors(updated);
    showSaved();
  };

  const handleResetColors = () => {
    resetChartColors();
    setColors(DEFAULT_COLORS);
    showSaved();
  };

  const updateChartOption = <K extends keyof DefaultChartOptions>(key: K, value: DefaultChartOptions[K]) => {
    const updated = { ...chartOptions, [key]: value };
    setChartOptions(updated);
    saveSettings("contrl_default_chart_options", updated);
    showSaved();
  };

  const toggleNelsonRule = (ruleKey: string) => {
    const updated = {
      ...chartOptions,
      nelsonRules: {
        ...chartOptions.nelsonRules,
        [ruleKey]: !chartOptions.nelsonRules[ruleKey as keyof typeof chartOptions.nelsonRules],
      },
    };
    setChartOptions(updated);
    saveSettings("contrl_default_chart_options", updated);
    showSaved();
  };

  const updateExportOption = <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => {
    const updated = { ...exportOptions, [key]: value };
    setExportOptions(updated);
    saveSettings("contrl_export_options", updated);
    showSaved();
  };

  function handleEmailSettingChange(update: Partial<EmailAlertSettings>) {
    const updated = { ...emailSettings, ...update };
    setEmailSettings(updated);
    saveEmailAlertSettings(updated);
    showSaved();
  }

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
          <p className="text-gray-500 mt-1 text-sm">Customize your chart appearance and preferences</p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-700/20 border border-green-500/30 text-green-400 text-sm font-medium">
            <Check className="w-4 h-4" />
            Saved
          </div>
        )}
      </div>

      <div className="space-y-10">

        {/* ── Section: Appearance ─────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center">
              <Palette className="h-4 w-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Appearance</h2>
              <p className="text-xs text-gray-500">Default colors for new charts</p>
            </div>
          </div>

          <div className="space-y-3 bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <ColorPicker label="Chart Background" description="Background color for all chart areas" value={colors.background} onChange={(v) => handleColorChange("background", v)} />
            <ColorPicker label="Mean Line" description="Color for the mean (X̄) center line" value={colors.meanLine} onChange={(v) => handleColorChange("meanLine", v)} />
            <ColorPicker label="Median Line" description="Color for the median (M̃) center line" value={colors.medianLine} onChange={(v) => handleColorChange("medianLine", v)} />
            <ColorPicker label="UCL (Upper Control Limit)" description="Color for upper control limit lines" value={colors.uclLine} onChange={(v) => handleColorChange("uclLine", v)} />
            <ColorPicker label="LCL (Lower Control Limit)" description="Color for lower control limit lines" value={colors.lclLine} onChange={(v) => handleColorChange("lclLine", v)} />
            <ColorPicker label="Data Points & Lines" description="Color for data points and connecting lines" value={colors.dataPoints} onChange={(v) => handleColorChange("dataPoints", v)} />
            <ColorPicker label="±1σ Zone Line" description="Color for ±1σ zone lines (faint)" value={colors.sigma1Line} onChange={(v) => handleColorChange("sigma1Line", v)} />
            <ColorPicker label="±2σ Zone Line" description="Color for ±2σ zone lines" value={colors.sigma2Line} onChange={(v) => handleColorChange("sigma2Line", v)} />

            <div className="pt-3 border-t border-white/5">
              <button onClick={handleResetColors} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white/5 border border-white/10 text-gray-400 hover:bg-white/8 hover:text-gray-200 hover:border-white/20 transition-all">
                <RotateCcw className="w-3.5 h-3.5" />
                Reset to Defaults
              </button>
            </div>
          </div>

          <div className="mt-3 p-4 rounded-lg border border-indigo-500/20 bg-indigo-950/10">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-lg shrink-0">💡</div>
              <div>
                <h3 className="text-sm font-semibold text-indigo-300 mb-1">These are defaults for new charts</h3>
                <p className="text-xs text-gray-500">Click on any line (Mean/UCL/LCL/Data) in a chart to customize its color individually.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section: Default Chart Options ────────────────────────────── */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/20 flex items-center justify-center">
              <SlidersHorizontal className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Default Chart Options</h2>
              <p className="text-xs text-gray-500">Defaults for newly created charts</p>
            </div>
          </div>

          <div className="space-y-5 bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            {/* Method */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-200 font-medium">Calculation Method</div>
                <div className="text-xs text-gray-500 mt-0.5">Mean (X̄) or Median (M̃) for center line</div>
              </div>
              <div className="flex items-center rounded-lg border border-white/10 bg-white/5 overflow-hidden">
                <button onClick={() => updateChartOption("defaultMethod", "mean")} className={`px-4 py-2 text-sm font-semibold transition-all ${chartOptions.defaultMethod === "mean" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-200"}`}>Mean</button>
                <button onClick={() => updateChartOption("defaultMethod", "median")} className={`px-4 py-2 text-sm font-semibold transition-all ${chartOptions.defaultMethod === "median" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-200"}`}>Median</button>
              </div>
            </div>

            {/* Subgroup size */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-200 font-medium">Default Subgroup Size</div>
                <div className="text-xs text-gray-500 mt-0.5">For X̄-R and X̄-S charts</div>
              </div>
              <input
                type="number" min={1} max={25}
                value={chartOptions.defaultSubgroupSize}
                onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1) updateChartOption("defaultSubgroupSize", v); }}
                className="w-20 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white text-center outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Nelson rules */}
            <div className="pt-3 border-t border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <Gauge className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-gray-200 font-medium">Default Nelson Rules</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {NELSON_RULES.map((rule) => {
                  const isOn = chartOptions.nelsonRules[rule.key as keyof typeof chartOptions.nelsonRules];
                  return (
                    <button key={rule.key} onClick={() => toggleNelsonRule(rule.key)}
                      className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${isOn ? "border-indigo-500/30 bg-indigo-950/20" : "border-white/8 bg-white/[0.02] hover:border-white/15"}`}>
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${isOn ? "bg-indigo-600 border-indigo-500" : "border-white/20 bg-white/5"}`}>
                        {isOn && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div>
                        <div className={`text-xs font-semibold ${isOn ? "text-indigo-300" : "text-gray-400"}`}>Rule {rule.num}: {rule.name}</div>
                        <div className="text-[10px] text-gray-600 mt-0.5">{rule.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── Section: Data Export ───────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/20 flex items-center justify-center">
              <Download className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Data Export</h2>
              <p className="text-xs text-gray-500">Default export preferences</p>
            </div>
          </div>

          <div className="space-y-5 bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-200 font-medium">Default Export Format</div>
                <div className="text-xs text-gray-500 mt-0.5">For chart image exports</div>
              </div>
              <div className="flex items-center rounded-lg border border-white/10 bg-white/5 overflow-hidden">
                <button onClick={() => updateExportOption("defaultFormat", "png")} className={`px-4 py-2 text-sm font-semibold transition-all ${exportOptions.defaultFormat === "png" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-200"}`}>PNG</button>
                <button onClick={() => updateExportOption("defaultFormat", "pdf")} className={`px-4 py-2 text-sm font-semibold transition-all ${exportOptions.defaultFormat === "pdf" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-200"}`}>PDF</button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-200 font-medium">Include Statistics</div>
                <div className="text-xs text-gray-500 mt-0.5">Add process stats to exported files</div>
              </div>
              <button
                onClick={() => updateExportOption("includeStats", !exportOptions.includeStats)}
                className={cn("relative w-11 h-6 rounded-full transition-colors duration-200", exportOptions.includeStats ? "bg-indigo-600" : "bg-white/10")}
              >
                <span className={cn("absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200", exportOptions.includeStats ? "translate-x-5" : "translate-x-0")} />
              </button>
            </div>
          </div>
        </section>

        {/* ── Section: Email Alerts ──────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-amber-600/20 border border-amber-500/20 flex items-center justify-center">
              <BellRing className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Email Alerts</h2>
              <p className="text-xs text-gray-500">Get notified about out-of-control signals</p>
            </div>
          </div>

          <div className="space-y-4 bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            {/* Enable toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-200">Enable email alerts</p>
                  <p className="text-xs text-gray-600">Receive notifications about chart signals</p>
                </div>
              </div>
              <button
                onClick={() => handleEmailSettingChange({ enabled: !emailSettings.enabled })}
                className={cn("relative w-11 h-6 rounded-full transition-colors duration-200", emailSettings.enabled ? "bg-indigo-600" : "bg-white/10")}
              >
                <span className={cn("absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200", emailSettings.enabled ? "translate-x-5" : "translate-x-0")} />
              </button>
            </div>

            {emailSettings.enabled && (
              <>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-3.5 w-3.5 text-gray-500" />
                    <label className="text-xs font-medium text-gray-400">Notification email</label>
                  </div>
                  <input
                    type="email" value={emailSettings.email}
                    onChange={(e) => handleEmailSettingChange({ email: e.target.value })}
                    placeholder="you@company.com"
                    className="w-full h-10 px-4 rounded-lg text-sm bg-white/5 border border-white/[0.08] text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/40 transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-3.5 w-3.5 text-gray-500" />
                    <label className="text-xs font-medium text-gray-400">Frequency</label>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: "realtime", label: "Real-time", desc: "Instant" },
                      { value: "daily", label: "Daily", desc: "Once/day" },
                      { value: "weekly", label: "Weekly", desc: "Once/week" },
                    ] as const).map((opt) => (
                      <button key={opt.value} onClick={() => handleEmailSettingChange({ frequency: opt.value })}
                        className={cn("flex flex-col items-center gap-0.5 p-2.5 rounded-lg border text-xs font-medium transition-colors",
                          emailSettings.frequency === opt.value
                            ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                            : "bg-white/[0.02] text-gray-500 border-white/[0.06] hover:text-gray-300 hover:bg-white/5"
                        )}>
                        <span className="font-semibold">{opt.label}</span>
                        <span className="text-[9px] text-gray-600">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="flex items-start gap-2 pt-2 border-t border-white/5">
              <AlertCircle className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-[10px] text-gray-600">
                <span className="text-amber-400 font-medium">Email delivery coming soon</span> — alerts appear in-app for now via the bell icon.
              </p>
            </div>
          </div>
        </section>

        {/* ── Section: Team Management ───────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-cyan-600/20 border border-cyan-500/20 flex items-center justify-center">
              <Users className="h-4 w-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Team & Workspace</h2>
              <p className="text-xs text-gray-500">Manage workspace and team members</p>
            </div>
          </div>

          <Link href="/app/teams" className="flex items-center justify-between p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                <Users className="h-4 w-4 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">Manage Teams</p>
                <p className="text-xs text-gray-600">Workspaces, members, roles, and invitations</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-600 group-hover:text-gray-400 transition-colors" />
          </Link>
        </section>

        {/* ── Section: About ─────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-gray-600/20 border border-gray-500/20 flex items-center justify-center">
              <Info className="h-4 w-4 text-gray-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">About</h2>
              <p className="text-xs text-gray-500">App information</p>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Application</div>
                <div className="text-sm font-semibold text-white">Contrl</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Version</div>
                <div className="text-sm font-semibold text-gray-300">2.0.0</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Framework</div>
                <div className="text-sm font-semibold text-gray-300">Next.js 16 + React 19</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Charts</div>
                <div className="text-sm font-semibold text-gray-300">Plotly.js</div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/5">
              <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Description</div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Professional SPC application for understanding variation and driving improvement.
                Supports XmR, CuSum, EWMA, attribute charts, subgroup analysis, and more.
              </p>
            </div>

            <div className="pt-3 border-t border-white/5">
              <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Methodology</div>
              <div className="flex flex-wrap gap-2">
                {["Wheeler / Vanguard XmR", "Nelson / Western Electric Rules", "Jarque-Bera Normality Test", "Process Capability (Cp/Cpk/Pp/Ppk)"].map((tag) => (
                  <span key={tag} className="text-[10px] text-gray-500 bg-white/5 border border-white/8 px-2.5 py-1 rounded-lg">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

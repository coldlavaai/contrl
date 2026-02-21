"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
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

export default function SettingsPage() {
  const [colors, setColors] = useState<ChartColors>(DEFAULT_COLORS);
  const [saved, setSaved] = useState(false);
  const [emailSettings, setEmailSettings] = useState<EmailAlertSettings>({
    enabled: false,
    email: "",
    frequency: "daily",
  });

  useEffect(() => {
    setColors(getChartColors());
    setEmailSettings(getEmailAlertSettings());
  }, []);

  const handleColorChange = (key: keyof ChartColors, value: string) => {
    const updated = { ...colors, [key]: value };
    setColors(updated);
    saveChartColors(updated);
    showSaved();
  };

  const handleReset = () => {
    resetChartColors();
    setColors(DEFAULT_COLORS);
    showSaved();
  };

  function showSaved() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleEmailSettingChange(update: Partial<EmailAlertSettings>) {
    const updated = { ...emailSettings, ...update };
    setEmailSettings(updated);
    saveEmailAlertSettings(updated);
    showSaved();
  }

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-gray-500 mt-1">Customize your chart appearance and preferences</p>
      </div>

      {/* ─── Color Customization ──────────────────────────────────────────── */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-200 mb-1">Default Chart Colors</h2>
            <p className="text-sm text-gray-600">
              Set default colors for new charts. Existing charts keep their custom colors. Click any line in a chart to customize its color.
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
              <h3 className="text-sm font-semibold text-indigo-300 mb-1">These are defaults for new charts</h3>
              <p className="text-xs text-gray-500">
                New charts will inherit these colors. To customize an individual chart, click on any line (Mean/UCL/LCL/Data) in the chart and pick a new color. Per-chart customizations are saved with the chart.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Email Alerts ─────────────────────────────────────────────────── */}
      <div className="mt-12 pt-8 border-t border-white/10">
        <div className="flex items-center gap-2 mb-1">
          <BellRing className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-200">Email Alerts</h2>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          Get notified when out-of-control signals or process changes are detected.
        </p>

        <div className="space-y-4">
          {/* Enable toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-white/[0.06] bg-[#111111]">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-200">Enable email alerts</p>
                <p className="text-xs text-gray-600">Receive notifications about chart signals</p>
              </div>
            </div>
            <button
              onClick={() => handleEmailSettingChange({ enabled: !emailSettings.enabled })}
              className={cn(
                "relative w-11 h-6 rounded-full transition-colors duration-200",
                emailSettings.enabled ? "bg-indigo-600" : "bg-white/10"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200",
                  emailSettings.enabled ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          {emailSettings.enabled && (
            <>
              {/* Email address */}
              <div className="p-4 rounded-xl border border-white/[0.06] bg-[#111111]">
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <label className="text-sm font-medium text-gray-300">
                    Notification email
                  </label>
                </div>
                <input
                  type="email"
                  value={emailSettings.email}
                  onChange={(e) => handleEmailSettingChange({ email: e.target.value })}
                  placeholder="you@company.com"
                  className="w-full h-10 px-4 rounded-lg text-sm bg-white/5 border border-white/[0.08] text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                />
              </div>

              {/* Frequency */}
              <div className="p-4 rounded-xl border border-white/[0.06] bg-[#111111]">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <label className="text-sm font-medium text-gray-300">
                    Alert frequency
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "realtime", label: "Real-time", desc: "Instant alerts" },
                    { value: "daily", label: "Daily digest", desc: "Once per day" },
                    { value: "weekly", label: "Weekly summary", desc: "Once per week" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleEmailSettingChange({ frequency: opt.value })}
                      className={cn(
                        "flex flex-col items-center gap-1 p-3 rounded-lg border text-xs font-medium transition-colors",
                        emailSettings.frequency === opt.value
                          ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                          : "bg-white/[0.02] text-gray-500 border-white/[0.06] hover:text-gray-300 hover:bg-white/5"
                      )}
                    >
                      <span className="font-semibold">{opt.label}</span>
                      <span className="text-[10px] text-gray-600">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Coming soon notice */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
            <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-gray-500">
              <span className="text-amber-400 font-semibold">Email delivery coming soon</span> — alerts will appear in-app for now. Click the bell icon in the header to view notifications.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Team Management shortcut ─────────────────────────────────────── */}
      <div className="mt-12 pt-8 border-t border-white/10">
        <div className="flex items-center gap-2 mb-1">
          <Users className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-200">Team & Workspace</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Manage your workspace, invite team members, and configure roles.
        </p>
        <Link
          href="/app/teams"
          className="flex items-center justify-between p-4 rounded-xl border border-white/[0.06] bg-[#111111] hover:bg-white/[0.03] transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <Users className="h-4 w-4 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
                Manage Teams
              </p>
              <p className="text-xs text-gray-600">
                Workspaces, members, roles, and invitations
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-600 group-hover:text-gray-400 transition-colors" />
        </Link>
      </div>
    </div>
  );
}

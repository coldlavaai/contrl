"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSavedCharts, SavedChart } from "@/lib/chartStorage";
import {
  BarChart2,
  Clock,
  TrendingUp,
  Layers,
  Plus,
  BookOpen,
  ArrowRight,
  Activity,
  Database,
} from "lucide-react";

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days === 1) return "yesterday";
  return formatDate(ts);
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent?: string;
}

function StatCard({ label, value, sub, icon: Icon, accent = "indigo" }: StatCardProps) {
  const accentMap: Record<string, string> = {
    indigo: "text-indigo-400 bg-indigo-950/40 border-indigo-500/20",
    purple: "text-purple-400 bg-purple-950/40 border-purple-500/20",
    amber: "text-amber-400 bg-amber-950/40 border-amber-500/20",
    emerald: "text-emerald-400 bg-emerald-950/40 border-emerald-500/20",
  };
  const iconClass = accentMap[accent] ?? accentMap.indigo;

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${iconClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-sm text-gray-400 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-gray-600 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

const CHART_TYPE_LABELS: Record<string, string> = {
  xmr: "XmR",
  cusum: "CuSum",
  pchart: "p-Chart",
  npchart: "np-Chart",
  cchart: "c-Chart",
  uchart: "u-Chart",
  pareto: "Pareto",
};

export default function DashboardPage() {
  const [charts, setCharts] = useState<SavedChart[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCharts(getSavedCharts());
    setMounted(true);
  }, []);

  const today = new Date().toDateString();
  const todayCharts = charts.filter(
    (c) => new Date(c.savedAt).toDateString() === today
  ).length;

  const recentCharts = charts.slice(0, 6);

  // Count chart types
  const typeCounts = charts.reduce<Record<string, number>>((acc, c) => {
    const t = c.chartType || "unknown";
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});
  const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Statistical Process Control · Understand variation, drive improvement.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Saved Charts"
          value={mounted ? charts.length : "—"}
          sub="in your library"
          icon={BarChart2}
          accent="indigo"
        />
        <StatCard
          label="Created Today"
          value={mounted ? todayCharts : "—"}
          sub={new Date().toLocaleDateString("en-GB", { weekday: "long" })}
          icon={Clock}
          accent="purple"
        />
        <StatCard
          label="Chart Types"
          value="7"
          sub="XmR, CuSum, p/np/c/u, Pareto"
          icon={Layers}
          accent="amber"
        />
        <StatCard
          label="Top Chart"
          value={mounted && topType ? CHART_TYPE_LABELS[topType[0]] || topType[0] : "—"}
          sub={mounted && topType ? `${topType[1]} chart${topType[1] !== 1 ? "s" : ""}` : "no charts yet"}
          icon={TrendingUp}
          accent="emerald"
        />
      </div>

      {/* Quick actions */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Quick Actions
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <Link
            href="/app/new"
            className="group relative flex flex-col gap-3 p-5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-indigo-500/40 hover:bg-indigo-950/10 transition-all duration-150"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center">
              <Plus className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
                Upload &amp; Create Chart
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Import Excel or CSV and generate SPC charts instantly
              </div>
            </div>
            <ArrowRight className="absolute top-5 right-5 h-4 w-4 text-gray-700 group-hover:text-indigo-500 transition-colors" />
          </Link>

          <Link
            href="/app/new?demo=1"
            className="group relative flex flex-col gap-3 p-5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-purple-500/40 hover:bg-purple-950/10 transition-all duration-150"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/20 flex items-center justify-center">
              <Database className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">
                Load Demo Data
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Explore the Gosport Council void properties dataset
              </div>
            </div>
            <ArrowRight className="absolute top-5 right-5 h-4 w-4 text-gray-700 group-hover:text-purple-500 transition-colors" />
          </Link>

          <Link
            href="/app/library"
            className="group relative flex flex-col gap-3 p-5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-amber-500/40 hover:bg-amber-950/10 transition-all duration-150"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/20 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white group-hover:text-amber-300 transition-colors">
                Browse Library
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {mounted && charts.length > 0
                  ? `View your ${charts.length} saved chart${charts.length !== 1 ? "s" : ""}`
                  : "Save and revisit your SPC charts"}
              </div>
            </div>
            <ArrowRight className="absolute top-5 right-5 h-4 w-4 text-gray-700 group-hover:text-amber-500 transition-colors" />
          </Link>
        </div>
      </div>

      {/* Chart type shortcuts */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Start with a Chart Type
        </h2>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {[
            { type: "xmr", label: "XmR", desc: "Continuous" },
            { type: "cusum", label: "CuSum", desc: "Shifts" },
            { type: "pchart", label: "p-Chart", desc: "% Defective" },
            { type: "npchart", label: "np-Chart", desc: "Count" },
            { type: "cchart", label: "c-Chart", desc: "Defects" },
            { type: "uchart", label: "u-Chart", desc: "Per unit" },
            { type: "pareto", label: "Pareto", desc: "Vital few" },
          ].map((ct) => (
            <Link
              key={ct.type}
              href={`/app/new?type=${ct.type}`}
              className="group flex flex-col items-center gap-1 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-indigo-500/30 hover:bg-indigo-950/10 transition-all text-center"
            >
              <Activity className="h-4 w-4 text-indigo-500/60 group-hover:text-indigo-400 transition-colors mb-0.5" />
              <div className="text-xs font-bold text-gray-300 group-hover:text-indigo-300 transition-colors">
                {ct.label}
              </div>
              <div className="text-[10px] text-gray-600 leading-tight">{ct.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent charts */}
      {mounted && recentCharts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Recent Charts
            </h2>
            <Link
              href="/app/library"
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentCharts.map((chart) => (
              <Link
                key={chart.id}
                href="/app/library"
                className="group flex flex-col p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-indigo-500/30 hover:bg-white/[0.04] transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                    {chart.title}
                  </div>
                  {chart.chartType && (
                    <span className="shrink-0 text-[10px] font-semibold text-indigo-400 bg-indigo-950/40 border border-indigo-500/20 px-1.5 py-0.5 rounded uppercase tracking-wide">
                      {CHART_TYPE_LABELS[chart.chartType] || chart.chartType}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[11px] text-gray-600">
                    {chart.measure.values.length} data points
                  </span>
                  <span className="text-gray-700">·</span>
                  <span className="text-[11px] text-gray-600">
                    {formatRelative(chart.savedAt)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {mounted && charts.length === 0 && (
        <div className="border border-white/[0.05] rounded-2xl p-10 text-center bg-white/[0.01]">
          <div className="w-16 h-16 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 flex items-center justify-center mx-auto mb-5">
            <BarChart2 className="h-8 w-8 text-indigo-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-300 mb-2">No charts yet</h3>
          <p className="text-sm text-gray-600 max-w-sm mx-auto mb-6">
            Upload your data or load the demo dataset to create your first SPC chart.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/app/new"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
            >
              Create your first chart
            </Link>
            <Link
              href="/app/new?demo=1"
              className="px-5 py-2.5 rounded-xl border border-white/10 hover:border-white/20 text-gray-400 hover:text-white text-sm font-medium transition-colors"
            >
              Try demo data
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

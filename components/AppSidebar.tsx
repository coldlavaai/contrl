"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Plus,
  BookOpen,
  TrendingUp,
  Activity,
  PieChart,
  BarChart,
  Hash,
  Layers,
  BarChart2,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  GitBranch,
  Sigma,
  Waypoints,
  Minus,
  SlidersHorizontal,
} from "lucide-react";

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const mainNavItems = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/app/new", label: "New Chart", icon: Plus, exact: false },
  { href: "/app/library", label: "Library", icon: BookOpen, exact: false },
  { href: "/app/analytics", label: "Analytics", icon: BarChart3, exact: false },
  { href: "/app/communications", label: "Communications", icon: MessageSquare, exact: false },
];

const chartTypeItems = [
  { href: "/app/new?type=xmr", label: "XmR Chart", icon: TrendingUp, typeParam: "xmr" },
  { href: "/app/new?type=cusum", label: "CuSum", icon: Activity, typeParam: "cusum" },
  { href: "/app/new?type=pchart", label: "p-Chart", icon: PieChart, typeParam: "pchart" },
  { href: "/app/new?type=npchart", label: "np-Chart", icon: BarChart, typeParam: "npchart" },
  { href: "/app/new?type=cchart", label: "c-Chart", icon: Hash, typeParam: "cchart" },
  { href: "/app/new?type=uchart", label: "u-Chart", icon: Layers, typeParam: "uchart" },
  { href: "/app/new?type=pareto", label: "Pareto", icon: BarChart2, typeParam: "pareto" },
];

const subgroupChartItems = [
  { href: "/app/new?type=xbar-r", label: "X̄-R Chart", icon: GitBranch, typeParam: "xbar-r" },
  { href: "/app/new?type=xbar-s", label: "X̄-S Chart", icon: Sigma, typeParam: "xbar-s" },
  { href: "/app/new?type=ewma", label: "EWMA", icon: Waypoints, typeParam: "ewma" },
  { href: "/app/new?type=run", label: "Run Chart", icon: Minus, typeParam: "run" },
  { href: "/app/new?type=moving-avg", label: "Moving Average", icon: SlidersHorizontal, typeParam: "moving-avg" },
];

const bottomNavItems = [
  { href: "/app/settings", label: "Settings", icon: Settings, exact: false },
];

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  collapsed: boolean;
}

function NavItem({ href, label, icon: Icon, isActive, collapsed }: NavItemProps) {
  return (
    <Link
      href={href}
      prefetch={false}
      title={collapsed ? label : undefined}
      className={cn(
        "relative flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all group rounded-r-lg",
        "border-l-2",
        isActive
          ? "border-indigo-500 bg-indigo-950/30 text-indigo-400"
          : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5"
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-indigo-400" : "text-gray-400 group-hover:text-gray-200")} />
      {!collapsed && <span className="truncate">{label}</span>}
      {/* Tooltip when collapsed */}
      {collapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-[#1a1a1a] border border-white/10 rounded-md text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50">
          {label}
        </div>
      )}
    </Link>
  );
}

export default function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentType = searchParams.get("type");

  function isNavActive(href: string, exact = false): boolean {
    if (exact) return pathname === href;
    // For /app/new without type param — only active if no type or exact path match
    if (href === "/app/new" && !href.includes("?")) {
      return pathname === "/app/new" && !currentType;
    }
    return pathname.startsWith(href);
  }

  function isChartTypeActive(typeParam: string): boolean {
    return pathname.startsWith("/app/new") && currentType === typeParam;
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-14 z-30 h-[calc(100vh-3.5rem)]",
        "bg-[#0a0a0a] border-r border-white/[0.06]",
        "transition-all duration-300 flex flex-col",
        "hidden md:flex",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Main navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {/* Main items */}
        <div className="space-y-0.5 px-2">
          {mainNavItems.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              isActive={isNavActive(item.href, item.exact)}
              collapsed={collapsed}
            />
          ))}
        </div>

        {/* Chart Types section */}
        <div className="mt-4">
          {!collapsed && (
            <div className="text-[10px] text-gray-600 uppercase tracking-wider px-5 pt-2 pb-1.5 font-semibold">
              Chart Types
            </div>
          )}
          {collapsed && (
            <div className="my-2 mx-4 h-px bg-white/[0.06]" />
          )}
          <div className="space-y-0.5 px-2">
            {chartTypeItems.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                isActive={isChartTypeActive(item.typeParam)}
                collapsed={collapsed}
              />
            ))}
          </div>
        </div>

        {/* Subgroup & Advanced Charts section */}
        <div className="mt-4">
          {!collapsed && (
            <div className="text-[10px] text-gray-600 uppercase tracking-wider px-5 pt-2 pb-1.5 font-semibold">
              Subgroup & Advanced
            </div>
          )}
          {collapsed && (
            <div className="my-2 mx-4 h-px bg-white/[0.06]" />
          )}
          <div className="space-y-0.5 px-2">
            {subgroupChartItems.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                isActive={isChartTypeActive(item.typeParam)}
                collapsed={collapsed}
              />
            ))}
          </div>
        </div>
      </nav>

      {/* Bottom: Settings */}
      <div className="border-t border-white/[0.06] px-2 py-2">
        {bottomNavItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            isActive={isNavActive(item.href, item.exact)}
            collapsed={collapsed}
          />
        ))}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="h-12 flex items-center justify-center border-t border-white/[0.06] hover:bg-white/5 transition-colors"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRight className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronLeft className="h-5 w-5 text-gray-400" />
        )}
      </button>
    </aside>
  );
}

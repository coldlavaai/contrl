"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Plus,
  BookOpen,
  Settings,
  MoreHorizontal,
  X,
  TrendingUp,
  Activity,
  PieChart,
  BarChart,
  Hash,
  Layers,
  BarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const primaryItems = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/app/new", label: "New Chart", icon: Plus, exact: false },
  { href: "/app/library", label: "Library", icon: BookOpen, exact: false },
  { href: "/app/settings", label: "Settings", icon: Settings, exact: false },
];

const chartTypeItems = [
  { href: "/app/new?type=xmr", label: "XmR Chart", icon: TrendingUp },
  { href: "/app/new?type=cusum", label: "CuSum", icon: Activity },
  { href: "/app/new?type=pchart", label: "p-Chart", icon: PieChart },
  { href: "/app/new?type=npchart", label: "np-Chart", icon: BarChart },
  { href: "/app/new?type=cchart", label: "c-Chart", icon: Hash },
  { href: "/app/new?type=uchart", label: "u-Chart", icon: Layers },
  { href: "/app/new?type=pareto", label: "Pareto", icon: BarChart2 },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const [showMore, setShowMore] = React.useState(false);

  React.useEffect(() => {
    setShowMore(false);
  }, [pathname]);

  React.useEffect(() => {
    if (showMore) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showMore]);

  function isActive(href: string, exact = false): boolean {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Backdrop */}
      {showMore && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setShowMore(false)}
        />
      )}

      {/* More sheet */}
      {showMore && (
        <div className="md:hidden fixed bottom-14 left-0 right-0 z-50 bg-[#0a0a0a] border-t border-white/[0.06] rounded-t-2xl shadow-2xl">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-8 h-1 rounded-full bg-white/20" />
          </div>
          <div className="p-4 pt-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Chart Types</h3>
              <button
                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                onClick={() => setShowMore(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {chartTypeItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/[0.06] transition-all active:scale-95"
                  >
                    <Icon className="h-5 w-5 text-indigo-400" />
                    <span className="text-[10px] text-gray-300 font-medium text-center">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-14 bg-[#0a0a0a] border-t border-white/[0.06]">
        <div className="flex items-center h-full">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 h-full py-2 transition-all active:scale-95",
                  active ? "text-indigo-400" : "text-gray-500"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "text-indigo-400")} />
                <span className={cn("text-[10px] font-medium", active ? "text-indigo-400" : "text-gray-500")}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* More */}
          <button
            onClick={() => setShowMore(!showMore)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 h-full py-2 transition-all active:scale-95",
              showMore ? "text-indigo-400" : "text-gray-500"
            )}
          >
            <MoreHorizontal className={cn("h-5 w-5", showMore && "text-indigo-400")} />
            <span className={cn("text-[10px] font-medium", showMore ? "text-indigo-400" : "text-gray-500")}>
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}

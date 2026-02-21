"use client";

import * as React from "react";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import AppSidebar from "@/components/AppSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { cn } from "@/lib/utils";
import { seedDemoChartsIfEmpty } from "@/lib/demoCharts";

// Memoized layout components to prevent re-renders during navigation
const MemoizedHeader = React.memo(AppHeader);
const MemoizedSidebar = React.memo(AppSidebar);
const MemoizedMobileNav = React.memo(MobileBottomNav);

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  // Seed demo charts on first visit (no-op if user already has charts)
  React.useEffect(() => {
    seedDemoChartsIfEmpty();
  }, []);
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const prevPathRef = React.useRef(pathname);

  // Smooth page transitions — only fire on actual path changes
  React.useEffect(() => {
    if (prevPathRef.current !== pathname) {
      setIsTransitioning(true);
      const timeout = setTimeout(() => setIsTransitioning(false), 120);
      prevPathRef.current = pathname;
      return () => clearTimeout(timeout);
    }
  }, [pathname]);

  const handleSidebarToggle = React.useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      {/* Fixed header — stays stable during navigation */}
      <MemoizedHeader sidebarCollapsed={sidebarCollapsed} />

      {/* Fixed sidebar — stays stable during navigation */}
      <Suspense>
        <MemoizedSidebar
          collapsed={sidebarCollapsed}
          onToggle={handleSidebarToggle}
        />
      </Suspense>

      {/* Main content — shifts with sidebar, only this transitions */}
      <main
        className={cn(
          "pt-14 pb-14 md:pb-0 transition-all duration-200 min-h-[100dvh]",
          sidebarCollapsed ? "md:ml-16" : "md:ml-64"
        )}
      >
        <div
          className={cn(
            "p-4 md:p-6 transition-opacity duration-[120ms] ease-out",
            isTransitioning ? "opacity-0 scale-[0.99]" : "opacity-100 scale-100"
          )}
          style={{ transformOrigin: "top center" }}
        >
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <Suspense>
        <MemoizedMobileNav />
      </Suspense>
    </div>
  );
}

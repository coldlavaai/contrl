"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Alert,
  getAlerts,
  acknowledgeAlert,
  acknowledgeAllAlerts,
  clearAllAlerts,
  ALERT_TYPE_LABELS,
  ALERT_SEVERITY_COLORS,
} from "@/lib/alerts";

interface AlertsPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function AlertsPanel({ open, onClose }: AlertsPanelProps) {
  const router = useRouter();
  const [alerts, setAlerts] = React.useState<Alert[]>([]);
  const panelRef = React.useRef<HTMLDivElement>(null);

  // Load alerts on open
  React.useEffect(() => {
    if (open) {
      setAlerts(getAlerts());
    }
  }, [open]);

  // Close on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (open) {
      // Delay to prevent immediate close from the bell click
      const timer = setTimeout(() => {
        document.addEventListener("mousedown", handler);
      }, 50);
      return () => {
        clearTimeout(timer);
        document.removeEventListener("mousedown", handler);
      };
    }
  }, [open, onClose]);

  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleAcknowledge = (id: string) => {
    acknowledgeAlert(id);
    setAlerts(getAlerts());
  };

  const handleAcknowledgeAll = () => {
    acknowledgeAllAlerts();
    setAlerts(getAlerts());
  };

  const handleClearAll = () => {
    clearAllAlerts();
    setAlerts([]);
  };

  const handleNavigateToChart = (chartId: string) => {
    onClose();
    router.push(`/app/library?highlight=${chartId}`);
  };

  const unackCount = alerts.filter((a) => !a.acknowledged).length;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      default:
        return <Info className="h-4 w-4 text-blue-400" />;
    }
  };

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-full max-w-md",
          "bg-[#0c0c0c] border-l border-white/[0.08]",
          "shadow-2xl shadow-black/50",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Notifications</h2>
            {unackCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                {unackCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Actions bar */}
        {alerts.length > 0 && (
          <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06]">
            <button
              onClick={handleAcknowledgeAll}
              disabled={unackCount === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-red-400 hover:bg-red-400/5 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear all
            </button>
          </div>
        )}

        {/* Alert list */}
        <div className="flex-1 overflow-y-auto h-[calc(100%-8rem)]">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-16 h-16 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
                <BellOff className="h-7 w-7 text-gray-600" />
              </div>
              <p className="text-gray-500 font-medium mb-1">No notifications</p>
              <p className="text-gray-700 text-sm">
                Alerts will appear here when out-of-control signals are detected
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "px-5 py-4 hover:bg-white/[0.02] transition-colors group",
                    !alert.acknowledged && "bg-indigo-950/10"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Severity icon */}
                    <div className="mt-0.5 shrink-0">{getSeverityIcon(alert.severity)}</div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className={cn(
                            "text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border",
                            ALERT_SEVERITY_COLORS[alert.severity]
                          )}
                        >
                          {ALERT_TYPE_LABELS[alert.type]}
                        </span>
                        <span className="text-[10px] text-gray-600">
                          {formatTimestamp(alert.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-200 leading-snug">{alert.message}</p>
                      <button
                        onClick={() => handleNavigateToChart(alert.chartId)}
                        className="mt-1.5 flex items-center gap-1 text-xs text-indigo-400/70 hover:text-indigo-400 transition-colors"
                      >
                        {alert.chartName}
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Acknowledge button */}
                    {!alert.acknowledged && (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        title="Mark as read"
                        className="shrink-0 h-7 w-7 flex items-center justify-center rounded-md text-gray-600 hover:text-white hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

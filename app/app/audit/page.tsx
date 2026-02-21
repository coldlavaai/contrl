"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ScrollText,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  ArrowUpDown,
  X,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getAuditLog,
  filterAuditLog,
  clearAuditLog,
  AuditEntry,
  AuditAction,
  AuditFilter,
  ACTION_LABELS,
  ACTION_COLORS,
} from "@/lib/auditLog";

const PAGE_SIZE = 50;

const ALL_ACTIONS: AuditAction[] = [
  "chart.created",
  "chart.updated",
  "chart.deleted",
  "chart.data_appended",
  "chart.split_added",
  "chart.annotation_added",
  "user.login",
  "user.logout",
  "workspace.created",
  "workspace.updated",
  "workspace.deleted",
  "member.invited",
  "member.removed",
  "member.role_changed",
  "settings.updated",
  "api_key.generated",
  "api_key.revoked",
];

type SortField = "timestamp" | "action" | "userEmail";
type SortDir = "asc" | "desc";

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [filter, setFilter] = useState<AuditFilter>({});
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState<SortField>("timestamp");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showFilters, setShowFilters] = useState(false);

  // Load entries
  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    setEntries(getAuditLog());
  }

  // Apply filters and sorting
  const filteredEntries = useMemo(() => {
    let result = filter.action || filter.dateFrom || filter.dateTo || filter.search
      ? filterAuditLog(filter)
      : entries;

    // Sort
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "timestamp":
          cmp = a.timestamp.localeCompare(b.timestamp);
          break;
        case "action":
          cmp = a.action.localeCompare(b.action);
          break;
        case "userEmail":
          cmp = a.userEmail.localeCompare(b.userEmail);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [entries, filter, sortField, sortDir]);

  const totalPages = Math.ceil(filteredEntries.length / PAGE_SIZE);
  const pageEntries = filteredEntries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const handleClear = () => {
    if (confirm("Clear all audit log entries? This cannot be undone.")) {
      clearAuditLog();
      refresh();
    }
  };

  const hasFilters = !!(filter.action || filter.dateFrom || filter.dateTo || filter.search);

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) + " " + d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getActionDot = (action: string) => {
    const category = action.split(".")[0];
    switch (category) {
      case "chart": return "bg-blue-400";
      case "user": return "bg-emerald-400";
      case "workspace": return "bg-purple-400";
      case "member": return "bg-amber-400";
      case "settings": return "bg-gray-400";
      case "api_key": return "bg-red-400";
      default: return "bg-gray-400";
    }
  };

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
            <ScrollText className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Audit Log</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Track all actions across your workspace
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border",
              showFilters
                ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                : "bg-white/5 text-gray-400 border-white/[0.08] hover:text-white hover:bg-white/[0.08]"
            )}
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasFilters && (
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
            )}
          </button>
          <button
            onClick={handleClear}
            disabled={entries.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 bg-white/5 border border-white/[0.08] hover:text-red-400 hover:bg-red-400/5 hover:border-red-400/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-6 p-4 rounded-xl border border-white/[0.06] bg-[#111111] space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
              <input
                type="text"
                placeholder="Search entries..."
                value={filter.search ?? ""}
                onChange={(e) => {
                  setFilter((f) => ({ ...f, search: e.target.value || undefined }));
                  setPage(0);
                }}
                className="w-full h-9 pl-9 pr-3 rounded-lg text-sm bg-white/5 border border-white/[0.08] text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10 transition-all"
              />
            </div>

            {/* Action type */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
              <select
                value={filter.action ?? ""}
                onChange={(e) => {
                  setFilter((f) => ({
                    ...f,
                    action: (e.target.value || undefined) as AuditAction | undefined,
                  }));
                  setPage(0);
                }}
                className="w-full h-9 pl-9 pr-3 rounded-lg text-sm bg-white/5 border border-white/[0.08] text-gray-200 focus:outline-none focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10 transition-all appearance-none"
              >
                <option value="">All actions</option>
                {ALL_ACTIONS.map((a) => (
                  <option key={a} value={a}>
                    {ACTION_LABELS[a]}
                  </option>
                ))}
              </select>
            </div>

            {/* Date from */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
              <input
                type="date"
                value={filter.dateFrom ?? ""}
                onChange={(e) => {
                  setFilter((f) => ({ ...f, dateFrom: e.target.value || undefined }));
                  setPage(0);
                }}
                className="w-full h-9 pl-9 pr-3 rounded-lg text-sm bg-white/5 border border-white/[0.08] text-gray-200 focus:outline-none focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10 transition-all"
              />
            </div>

            {/* Date to */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
              <input
                type="date"
                value={filter.dateTo ?? ""}
                onChange={(e) => {
                  setFilter((f) => ({ ...f, dateTo: e.target.value || undefined }));
                  setPage(0);
                }}
                className="w-full h-9 pl-9 pr-3 rounded-lg text-sm bg-white/5 border border-white/[0.08] text-gray-200 focus:outline-none focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10 transition-all"
              />
            </div>
          </div>

          {hasFilters && (
            <button
              onClick={() => {
                setFilter({});
                setPage(0);
              }}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <X className="h-3 w-3" />
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Stats bar */}
      <div className="flex items-center justify-between mb-4 text-xs text-gray-600">
        <span>
          {filteredEntries.length} entries
          {hasFilters && ` (filtered from ${entries.length})`}
        </span>
        <span>
          Page {totalPages > 0 ? page + 1 : 0} of {totalPages}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/[0.06] bg-[#111111] overflow-hidden">
        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
              <ScrollText className="h-6 w-6 text-gray-600" />
            </div>
            <p className="text-gray-500 font-medium mb-1">No audit log entries</p>
            <p className="text-gray-700 text-sm max-w-xs">
              {hasFilters
                ? "No entries match your filters. Try adjusting or clearing them."
                : "Actions will be logged here as you use the platform."}
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="grid grid-cols-[1fr_180px_180px_1fr_1fr] gap-px bg-white/[0.04]">
              <button
                onClick={() => handleSort("timestamp")}
                className="flex items-center gap-1.5 px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-300 transition-colors bg-[#111111]"
              >
                Timestamp
                <ArrowUpDown className="h-3 w-3" />
              </button>
              <button
                onClick={() => handleSort("action")}
                className="flex items-center gap-1.5 px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-300 transition-colors bg-[#111111]"
              >
                Action
                <ArrowUpDown className="h-3 w-3" />
              </button>
              <button
                onClick={() => handleSort("userEmail")}
                className="flex items-center gap-1.5 px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-300 transition-colors bg-[#111111]"
              >
                User
                <ArrowUpDown className="h-3 w-3" />
              </button>
              <div className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-[#111111]">
                Target
              </div>
              <div className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-[#111111]">
                Details
              </div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-white/[0.04]">
              {pageEntries.map((entry, i) => (
                <div
                  key={entry.id}
                  className={cn(
                    "grid grid-cols-[1fr_180px_180px_1fr_1fr] gap-px hover:bg-white/[0.02] transition-colors",
                    i % 2 === 1 && "bg-white/[0.01]"
                  )}
                >
                  <div className="px-5 py-3 text-sm text-gray-400 font-mono">
                    {formatTimestamp(entry.timestamp)}
                  </div>
                  <div className="px-5 py-3 flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full shrink-0", getActionDot(entry.action))} />
                    <span className={cn("text-xs font-medium", ACTION_COLORS[entry.action] ?? "text-gray-400")}>
                      {ACTION_LABELS[entry.action] ?? entry.action}
                    </span>
                  </div>
                  <div className="px-5 py-3 flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-gray-600 shrink-0" />
                    <span className="text-sm text-gray-400 truncate">
                      {entry.userEmail || "System"}
                    </span>
                  </div>
                  <div className="px-5 py-3 text-sm text-gray-300 truncate">
                    {entry.targetLabel}
                  </div>
                  <div className="px-5 py-3 text-sm text-gray-600 truncate">
                    {entry.details}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 bg-white/5 border border-white/[0.08] hover:bg-white/[0.08] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i;
              } else if (page < 3) {
                pageNum = i;
              } else if (page > totalPages - 4) {
                pageNum = totalPages - 5 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={cn(
                    "w-9 h-9 rounded-lg text-sm font-medium transition-colors",
                    page === pageNum
                      ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                      : "text-gray-500 hover:text-white hover:bg-white/5"
                  )}
                >
                  {pageNum + 1}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 bg-white/5 border border-white/[0.08] hover:bg-white/[0.08] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  Code2,
  Copy,
  Check,
  Lock,
  Zap,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Endpoint {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  title: string;
  description: string;
  params?: { name: string; type: string; required: boolean; description: string }[];
  body?: string;
  response: string;
  status: "live" | "beta" | "planned";
}

// ─── Data ────────────────────────────────────────────────────────────────────

const endpoints: Endpoint[] = [
  {
    method: "GET",
    path: "/api/charts",
    title: "List charts",
    description: "Returns a paginated list of all charts in the authenticated user's workspace.",
    params: [
      { name: "limit", type: "number", required: false, description: "Max results (default 50)" },
      { name: "offset", type: "number", required: false, description: "Pagination offset" },
    ],
    response: `{
  "charts": [
    {
      "id": "c1a2b3c4-...",
      "title": "Line A — Cycle Time",
      "chartType": "xmr",
      "savedAt": 1718900000000,
      "measure": {
        "name": "Cycle Time",
        "unit": "seconds",
        "dates": ["2024-01-01", "2024-01-02"],
        "values": [12.3, 11.8]
      }
    }
  ],
  "total": 24,
  "limit": 50,
  "offset": 0
}`,
    status: "live",
  },
  {
    method: "GET",
    path: "/api/charts/:id",
    title: "Get chart",
    description: "Returns the full chart object including all data points, splits, annotations, and configuration.",
    response: `{
  "id": "c1a2b3c4-...",
  "title": "Line A — Cycle Time",
  "chartType": "xmr",
  "savedAt": 1718900000000,
  "measure": {
    "name": "Cycle Time",
    "unit": "seconds",
    "dates": ["2024-01-01", "2024-01-02", "..."],
    "values": [12.3, 11.8, "..."]
  },
  "splitIndices": [15],
  "annotations": [
    { "dateIndex": 10, "text": "New operator trained" }
  ],
  "method": "mean",
  "frozenLimits": false
}`,
    status: "live",
  },
  {
    method: "POST",
    path: "/api/charts",
    title: "Create chart",
    description: "Creates a new chart with the provided data. Returns the created chart with its generated ID.",
    body: `{
  "title": "Line B — Weight",
  "chartType": "xmr",
  "measure": {
    "name": "Weight",
    "unit": "grams",
    "dates": ["2024-01-01", "2024-01-02"],
    "values": [50.2, 49.8]
  }
}`,
    response: `{
  "id": "d5e6f7g8-...",
  "title": "Line B — Weight",
  "chartType": "xmr",
  "savedAt": 1718900100000,
  "measure": { "..." }
}`,
    status: "live",
  },
  {
    method: "PUT",
    path: "/api/charts/:id",
    title: "Update chart",
    description: "Updates an existing chart. Supports partial updates — only include the fields you want to change.",
    body: `{
  "title": "Line B — Weight (Updated)",
  "method": "median",
  "frozenLimits": true
}`,
    response: `{
  "id": "d5e6f7g8-...",
  "title": "Line B — Weight (Updated)",
  "method": "median",
  "frozenLimits": true,
  "..."
}`,
    status: "live",
  },
  {
    method: "DELETE",
    path: "/api/charts/:id",
    title: "Delete chart",
    description: "Permanently deletes a chart and all associated data. This action cannot be undone.",
    response: `{
  "success": true,
  "deletedId": "d5e6f7g8-..."
}`,
    status: "live",
  },
  {
    method: "POST",
    path: "/api/charts/:id/data",
    title: "Append data",
    description: "Appends new data points to an existing chart. Ideal for automated data collection pipelines.",
    body: `{
  "dates": ["2024-06-15", "2024-06-16"],
  "values": [51.1, 50.5]
}`,
    response: `{
  "id": "d5e6f7g8-...",
  "pointsAdded": 2,
  "totalPoints": 42
}`,
    status: "planned",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  POST: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  PUT: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  DELETE: "bg-red-500/15 text-red-400 border-red-500/20",
};

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  live: { label: "Live", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  beta: { label: "Beta", className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  planned: { label: "Coming Soon", className: "bg-gray-500/15 text-gray-400 border-gray-500/20" },
};

function CodeBlock({ code, language = "json" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-lg bg-[#0a0a0a] border border-white/[0.06] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-white/[0.02]">
        <span className="text-[10px] font-mono text-gray-600 uppercase">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[10px] text-gray-600 hover:text-gray-300 transition-colors"
        >
          {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed">
        <code className="text-gray-300 font-mono">{code}</code>
      </pre>
    </div>
  );
}

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-white/[0.06] rounded-xl bg-[#111111] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
      >
        <span
          className={cn(
            "shrink-0 px-2.5 py-1 rounded-md text-[11px] font-bold font-mono border",
            METHOD_COLORS[endpoint.method]
          )}
        >
          {endpoint.method}
        </span>
        <code className="text-sm font-mono text-gray-300 flex-1">{endpoint.path}</code>
        <span
          className={cn(
            "shrink-0 px-2 py-0.5 rounded-md text-[10px] font-semibold border",
            STATUS_BADGES[endpoint.status].className
          )}
        >
          {STATUS_BADGES[endpoint.status].label}
        </span>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-gray-600 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-600 shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-5 pb-5 pt-1 border-t border-white/[0.04] space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">{endpoint.title}</h4>
            <p className="text-sm text-gray-500 leading-relaxed">{endpoint.description}</p>
          </div>

          {/* Parameters */}
          {endpoint.params && endpoint.params.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Query Parameters
              </h5>
              <div className="space-y-2">
                {endpoint.params.map((p) => (
                  <div
                    key={p.name}
                    className="flex items-start gap-3 text-sm"
                  >
                    <code className="shrink-0 text-indigo-400 font-mono text-xs bg-indigo-500/10 px-1.5 py-0.5 rounded">
                      {p.name}
                    </code>
                    <span className="text-gray-600 text-xs">{p.type}</span>
                    {p.required && (
                      <span className="text-red-400 text-[10px] font-semibold">required</span>
                    )}
                    <span className="text-gray-500 text-xs">{p.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Request body */}
          {endpoint.body && (
            <div>
              <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Request Body
              </h5>
              <CodeBlock code={endpoint.body} />
            </div>
          )}

          {/* Response */}
          <div>
            <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Response
            </h5>
            <CodeBlock code={endpoint.response} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ApiDocsPage() {
  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
            <Code2 className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">API Reference</h1>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                BETA
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Programmatic access to your SPC charts and data
            </p>
          </div>
        </div>
      </div>

      {/* Authentication section */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="h-4 w-4 text-gray-400" />
          <h2 className="text-lg font-semibold text-white">Authentication</h2>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-[#111111] p-5 space-y-4">
          <p className="text-sm text-gray-400 leading-relaxed">
            All API requests require authentication via an API key passed in the{" "}
            <code className="text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded text-xs font-mono">
              Authorization
            </code>{" "}
            header.
          </p>
          <CodeBlock
            code={`curl -X GET https://contrl.app/api/charts \\
  -H "Authorization: Bearer sk_live_your_api_key" \\
  -H "Content-Type: application/json"`}
            language="bash"
          />
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
            <Zap className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-400 mb-0.5">API keys coming soon</p>
              <p className="text-xs text-gray-500">
                API key generation will be available in Settings → API Access. For now, the API endpoints authenticate via your session cookie.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Base URL */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4">Base URL</h2>
        <div className="rounded-xl border border-white/[0.06] bg-[#111111] p-5">
          <code className="text-sm font-mono text-indigo-400">https://contrl.app/api</code>
          <p className="text-xs text-gray-600 mt-2">
            All endpoints are relative to this base URL. Responses are JSON.
          </p>
        </div>
      </section>

      {/* Rate Limits */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4">Rate Limits</h2>
        <div className="rounded-xl border border-white/[0.06] bg-[#111111] p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-2xl font-bold text-white">100</p>
              <p className="text-xs text-gray-500 mt-0.5">Requests per minute</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">10,000</p>
              <p className="text-xs text-gray-500 mt-0.5">Requests per day</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">5 MB</p>
              <p className="text-xs text-gray-500 mt-0.5">Max request body</p>
            </div>
          </div>
        </div>
      </section>

      {/* Endpoints */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Endpoints</h2>
          <div className="flex items-center gap-3 text-[10px] text-gray-600">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Live
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-500" />
              Planned
            </span>
          </div>
        </div>
        <div className="space-y-3">
          {endpoints.map((ep) => (
            <EndpointCard key={`${ep.method}-${ep.path}`} endpoint={ep} />
          ))}
        </div>
      </section>

      {/* Error Codes */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4">Error Codes</h2>
        <div className="rounded-xl border border-white/[0.06] bg-[#111111] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {[
                { code: "200", desc: "Success" },
                { code: "201", desc: "Created successfully" },
                { code: "400", desc: "Invalid request body or parameters" },
                { code: "401", desc: "Missing or invalid authentication" },
                { code: "403", desc: "Insufficient permissions" },
                { code: "404", desc: "Resource not found" },
                { code: "429", desc: "Rate limit exceeded" },
                { code: "500", desc: "Internal server error" },
              ].map((row) => (
                <tr key={row.code} className="hover:bg-white/[0.02]">
                  <td className="px-5 py-3">
                    <code className="font-mono text-xs text-indigo-400">{row.code}</code>
                  </td>
                  <td className="px-5 py-3 text-gray-400">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* SDK / Libraries */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Client Libraries</h2>
        <div className="rounded-xl border border-white/[0.06] bg-[#111111] p-5">
          <div className="flex items-start gap-3 text-sm text-gray-500">
            <ExternalLink className="h-4 w-4 text-gray-600 mt-0.5 shrink-0" />
            <p>
              Official client libraries for Python, JavaScript, and R are planned. In the
              meantime, use the REST API directly with any HTTP client.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { NelsonRuleConfig, NELSON_RULE_NAMES } from "@/lib/spc";

interface NelsonRulesPanelProps {
  config: NelsonRuleConfig;
  onChange: (config: NelsonRuleConfig) => void;
  /** Optional: rule violation counts to display */
  violationCounts?: Record<number, number>;
}

interface RuleInfo {
  key: keyof NelsonRuleConfig;
  rule: number;
  short: string;
  detail: string;
}

const RULES: RuleInfo[] = [
  { key: "rule1", rule: 1, short: NELSON_RULE_NAMES[1], detail: "1 point beyond 3σ from mean" },
  { key: "rule2", rule: 2, short: NELSON_RULE_NAMES[2], detail: "9 consecutive points on same side of mean" },
  { key: "rule3", rule: 3, short: NELSON_RULE_NAMES[3], detail: "6 consecutive points increasing or decreasing" },
  { key: "rule4", rule: 4, short: NELSON_RULE_NAMES[4], detail: "14 consecutive points alternating up/down" },
  { key: "rule5", rule: 5, short: NELSON_RULE_NAMES[5], detail: "2 of 3 consecutive points beyond 2σ (same side)" },
  { key: "rule6", rule: 6, short: NELSON_RULE_NAMES[6], detail: "4 of 5 consecutive points beyond 1σ (same side)" },
  { key: "rule7", rule: 7, short: NELSON_RULE_NAMES[7], detail: "15 consecutive points within 1σ — mixture signal" },
  { key: "rule8", rule: 8, short: NELSON_RULE_NAMES[8], detail: "8 consecutive points beyond 1σ on either side" },
];

export default function NelsonRulesPanel({ config, onChange, violationCounts }: NelsonRulesPanelProps) {
  const [open, setOpen] = useState(false);

  const enabledCount = RULES.filter((r) => config[r.key] !== false).length;

  const toggle = (key: keyof NelsonRuleConfig) => {
    onChange({ ...config, [key]: !config[key] });
  };

  const enableAll = () => {
    const newConfig = { ...config };
    RULES.forEach((r) => { (newConfig as Record<string, boolean>)[r.key] = true; });
    onChange(newConfig);
  };

  const enableDefaults = () => {
    onChange({
      rule1: true,
      rule2: true,
      rule2Count: 9,
      rule3: true,
      rule3Count: 6,
      rule4: false,
      rule5: false,
      rule6: false,
      rule7: false,
      rule8: false,
    });
  };

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all duration-200 ${
          open
            ? "bg-amber-600/20 border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
            : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/8 hover:text-gray-200 hover:border-white/20"
        }`}
        title="Configure Nelson/Western Electric signal detection rules"
      >
        <Settings2 size={14} />
        <span>Rules</span>
        <span className={`text-[10px] font-bold tracking-wide px-1.5 py-0.5 rounded ${
          enabledCount > 3
            ? "bg-amber-500/20 text-amber-300"
            : "bg-white/5 text-gray-600"
        }`}>
          {enabledCount}/8
        </span>
      </button>

      {/* Panel */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-1.5 z-50 w-80 rounded-xl border border-white/10 bg-[#1a1a2e]/95 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div>
                <div className="text-sm font-semibold text-white">Nelson Rules</div>
                <div className="text-[11px] text-gray-500">Western Electric signal detection</div>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={enableDefaults}
                  className="text-[10px] px-2 py-1 rounded-md border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-colors"
                >
                  Defaults
                </button>
                <button
                  onClick={enableAll}
                  className="text-[10px] px-2 py-1 rounded-md border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-colors"
                >
                  All On
                </button>
              </div>
            </div>

            {/* Rules list */}
            <div className="max-h-80 overflow-y-auto">
              {RULES.map((r) => {
                const isOn = config[r.key] !== false;
                const count = violationCounts?.[r.rule] ?? 0;

                return (
                  <button
                    key={r.key}
                    onClick={() => toggle(r.key)}
                    className="w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5 border-b border-white/[0.03] last:border-b-0"
                  >
                    {/* Toggle indicator */}
                    <div className={`mt-0.5 shrink-0 w-8 h-[18px] rounded-full p-0.5 transition-colors duration-200 ${
                      isOn ? "bg-indigo-600" : "bg-white/10"
                    }`}>
                      <div className={`w-[14px] h-[14px] rounded-full bg-white transition-transform duration-200 ${
                        isOn ? "translate-x-[14px]" : "translate-x-0"
                      }`} />
                    </div>

                    {/* Rule info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isOn ? "bg-indigo-500/20 text-indigo-300" : "bg-white/5 text-gray-600"
                        }`}>
                          R{r.rule}
                        </span>
                        <span className={`text-sm font-medium ${isOn ? "text-gray-200" : "text-gray-500"}`}>
                          {r.short}
                        </span>
                        {count > 0 && isOn && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
                            {count}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-600 mt-0.5">{r.detail}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

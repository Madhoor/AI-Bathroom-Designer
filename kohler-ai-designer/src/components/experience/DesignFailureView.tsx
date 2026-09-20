"use client";

import React from "react";

export interface DesignFailureViewProps {
  reason: string;
  rejections?: string[];
  suggestions?: string[];
  onApplySuggestion?: (type: "budget" | "dimensions" | "reset" | "template") => void;
  onRetry?: () => void;
}

export function DesignFailureView({
  reason,
  rejections = [],
  suggestions = [],
  onApplySuggestion,
  onRetry,
}: DesignFailureViewProps) {
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-[#1e1a17] p-6 sm:p-8 text-stone-200 shadow-2xl backdrop-blur-md">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400 font-serif text-lg">
          !
        </div>
        <div className="space-y-2 flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-serif font-medium text-amber-200 tracking-wide">
              Architectural Constraints Unmet
            </h3>
            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400/80 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
              Deterministic Guardrail
            </span>
          </div>
          <p className="text-sm text-stone-300 leading-relaxed font-sans">
            {reason}
          </p>
        </div>
      </div>

      {rejections.length > 0 && (
        <div className="mt-5 rounded-xl border border-stone-800 bg-black/40 p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
            Constraint Engine Diagnostics:
          </p>
          <ul className="space-y-1.5 text-xs text-stone-400 list-disc list-inside">
            {rejections.slice(0, 4).map((rej, idx) => (
              <li key={idx} className="leading-normal font-mono text-[11px] text-stone-300">
                {rej}
              </li>
            ))}
          </ul>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="mt-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#c49a45]">
            Recommended Adjustments:
          </p>
          <ul className="space-y-1.5 text-xs text-stone-300">
            {suggestions.map((sug, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c49a45]" />
                <span>{sug}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 pt-5 border-t border-stone-800 flex flex-wrap gap-2.5 items-center">
        {onApplySuggestion && (
          <>
            <button
              type="button"
              onClick={() => onApplySuggestion("budget")}
              className="px-3.5 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-medium text-stone-200 transition-colors border border-stone-700"
            >
              Adjust to Minimum Viable Budget (₹4.8L)
            </button>
            <button
              type="button"
              onClick={() => onApplySuggestion("dimensions")}
              className="px-3.5 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-medium text-stone-200 transition-colors border border-stone-700"
            >
              Expand Room to 8&apos; × 6&apos;
            </button>
            <button
              type="button"
              onClick={() => onApplySuggestion("reset")}
              className="px-3.5 py-2 rounded-lg bg-[#c49a45]/20 hover:bg-[#c49a45]/30 text-[#f0d8a8] border border-[#c49a45]/40 text-xs font-medium transition-colors"
            >
              Reset to Compact Modern Preset
            </button>
          </>
        )}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="ml-auto px-4 py-2 rounded-lg bg-[#c49a45] hover:bg-[#b0873a] text-black text-xs font-semibold transition-colors"
          >
            Re-evaluate Brief
          </button>
        )}
      </div>
    </div>
  );
}

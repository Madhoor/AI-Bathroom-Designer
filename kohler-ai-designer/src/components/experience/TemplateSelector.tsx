"use client";

import React from "react";
import { BATHROOM_TEMPLATES, SCRATCH_TEMPLATE } from "@/lib/templates/templates";
import type { BathroomTemplate } from "@/lib/templates/types";

export interface TemplateSelectorProps {
  selectedTemplateId: string;
  onSelectTemplate: (template: BathroomTemplate) => void;
  disabled?: boolean;
}

export function TemplateSelector({
  selectedTemplateId,
  onSelectTemplate,
  disabled = false,
}: TemplateSelectorProps) {
  const allTemplates = [...BATHROOM_TEMPLATES, SCRATCH_TEMPLATE];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
        <label className="text-xs font-semibold uppercase tracking-widest text-[#c49a45]">
          Step 1: Choose Architectural Foundation
        </label>
        <span className="text-[11px] text-stone-400">
          Spatial &amp; aesthetic presets · 100% verified KOHLER fixtures
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {allTemplates.map((template) => {
          const isSelected = selectedTemplateId === template.id;
          const isScratch = template.id === "scratch";

          return (
            <button
              key={template.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectTemplate(template)}
              className={`group relative text-left rounded-xl p-4 transition-all duration-300 border ${
                isSelected
                  ? "border-[#c49a45] bg-[#24211e] shadow-[0_0_24px_rgba(196,154,69,0.18)] ring-1 ring-[#c49a45]/40"
                  : "border-stone-800 bg-[#1a1816]/70 hover:border-stone-600 hover:bg-[#201d1a]"
              } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {/* Active Indicator Pip */}
              {isSelected && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#c49a45]/20 border border-[#c49a45]/50 text-[10px] font-medium text-[#f0d8a8]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c49a45] animate-pulse" />
                  Active
                </div>
              )}

              {/* Template Title & Tag */}
              <div className="pr-16">
                <h4 className="text-sm font-serif font-medium text-stone-100 group-hover:text-amber-100 transition-colors">
                  {template.name}
                </h4>
                <p className="text-[11px] text-stone-400 mt-0.5 line-clamp-2 leading-relaxed">
                  {template.description}
                </p>
              </div>

              {/* Specs Pill row */}
              <div className="mt-3.5 pt-3 border-t border-stone-800/80 flex flex-wrap items-center gap-2 text-[11px]">
                {!isScratch ? (
                  <>
                    <span className="px-2 py-0.5 rounded-md bg-stone-900/90 text-stone-300 font-mono text-[10px] border border-stone-800">
                      {template.roomDefaults.widthFt}&apos; × {template.roomDefaults.depthFt}&apos;
                    </span>
                    <span className="text-stone-400 font-serif">
                      ₹{(template.budgetRange.min / 100000).toFixed(1)}L - ₹{(template.budgetRange.max / 100000).toFixed(1)}L
                    </span>
                  </>
                ) : (
                  <span className="text-stone-400 italic">
                    Blank canvas · Full manual control
                  </span>
                )}
              </div>

              {/* Zones */}
              {!isScratch && template.recommendedZones.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {template.recommendedZones.map((zone) => (
                    <span
                      key={zone}
                      className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider bg-stone-800/80 text-stone-400"
                    >
                      {zone}
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-stone-500 italic leading-normal">
        * Templates represent spatial and aesthetic starting points using authentic KOHLER fixtures. All placements are dynamically checked against physical dimensions and compatibility rules.
      </p>
    </div>
  );
}

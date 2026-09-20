import React, { useMemo, useState } from "react";
import BathroomCanvas from "@/components/BathroomCanvas/BathroomCanvas";
import type { DesignState } from "@/lib/design";
import type { DesignVariant } from "@/lib/design/generateVariants";
import { buildDynamicCameraPresets, type CameraPreset } from "@/lib/design/presentation";
import { FullscreenBathroomEditor } from "@/components/editor/FullscreenBathroomEditor";

interface RevealSectionProps {
  designState: DesignState;
  templateId?: string;
  variants?: DesignVariant[];
  selectedVariantIndex?: number;
  onSelectVariantIndex?: (index: number) => void;
  focusedProductCode?: string | null;
  onClearFocus?: () => void;
  onModifyClick: () => void;
  onEditBriefClick?: () => void;
  onApplyManualEdit?: (updatedState: DesignState) => void;
}

export default function RevealSection({
  designState,
  templateId,
  variants = [],
  selectedVariantIndex = 0,
  onSelectVariantIndex,
  focusedProductCode,
  onClearFocus,
  onModifyClick,
  onEditBriefClick,
  onApplyManualEdit,
}: RevealSectionProps) {
  const dynamicPresets = useMemo(() => buildDynamicCameraPresets(designState), [designState]);
  const [activePresetId, setActivePresetId] = useState<string>("hero");
  const [showDevDiagnostics, setShowDevDiagnostics] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const activePreset = useMemo(() => {
    return dynamicPresets.find((p) => p.id === activePresetId) ?? dynamicPresets[0];
  }, [dynamicPresets, activePresetId]);

  const room = designState.room;
  const widthFt = (room.widthM * 3.28084).toFixed(1);
  const depthFt = (room.depthM * 3.28084).toFixed(1);
  const heightFt = (room.heightM * 3.28084).toFixed(1);

  const handleSelectPreset = (preset: CameraPreset) => {
    onClearFocus?.();
    setActivePresetId(preset.id);
  };

  return (
    <section id="reveal" className="relative w-full bg-neutral-950 py-12 text-white">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section Masthead */}
        <div className="flex flex-wrap items-end justify-between gap-6 pb-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-400">
                Spatial Validation Passed · Factory CAD Alignment
              </span>
            </div>
            <h2 className="font-serif text-3xl font-light tracking-tight sm:text-4xl md:text-5xl">
              Architectural 3D Reveal
            </h2>
            <p className="text-xs text-neutral-400 sm:text-sm">
              {designState.style ?? "Luxury Modern"} • {widthFt} ft × {depthFt} ft × {heightFt} ft (
              {room.widthM.toFixed(2)} m × {room.depthM.toFixed(2)} m × {room.heightM.toFixed(2)} m)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onEditBriefClick && (
              <button
                type="button"
                onClick={onEditBriefClick}
                className="cursor-pointer rounded-full border border-stone-700 bg-stone-900/80 px-3.5 py-1.5 text-xs text-stone-300 hover:border-[#c49a45] hover:text-[#f0d8a8] transition-colors"
              >
                Edit Brief
              </button>
            )}

            {/* Prominent Edit Layout Studio Trigger */}
            <button
              type="button"
              onClick={() => setIsEditorOpen(true)}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-[#c49a45]/60 bg-[#c49a45]/15 px-4 py-1.5 text-xs font-semibold text-[#f0d8a8] transition-all hover:bg-[#c49a45]/25 hover:border-[#c49a45] shadow-lg shadow-amber-950/20"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Edit Layout</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDevDiagnostics(!showDevDiagnostics)}
              className="cursor-pointer rounded-full border border-white/10 px-3.5 py-1.5 text-[11px] text-neutral-400 hover:border-white/30 hover:text-white transition-colors"
            >
              {showDevDiagnostics ? "Hide Diagnostics" : "Diagnostics"}
            </button>

            <button
              type="button"
              onClick={onModifyClick}
              className="flex cursor-pointer items-center gap-2 rounded-full bg-[#c49a45] px-4 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-[#b0873a]"
            >
              <span>Refine with AI</span>
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Multi-Variant Tabs (Design A / Design B / Design C) */}
        {variants.length > 1 && (
          <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-stone-800/80 pb-4">
            <span className="text-xs uppercase tracking-widest text-stone-500 mr-2 font-medium">
              Curated Configurations:
            </span>
            {variants.map((v, idx) => {
              const isSelected = selectedVariantIndex === idx;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    onClearFocus?.();
                    onSelectVariantIndex?.(idx);
                  }}
                  className={`group relative rounded-xl px-4 py-2 text-left transition-all border ${
                    isSelected
                      ? "border-[#c49a45] bg-[#221f1c] shadow-[0_0_16px_rgba(196,154,69,0.15)] ring-1 ring-[#c49a45]/30"
                      : "border-stone-800 bg-stone-900/60 hover:border-stone-700 hover:bg-stone-900"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-serif font-medium ${isSelected ? "text-amber-100" : "text-stone-300"}`}>
                      {v.label}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-stone-800 text-stone-400 font-mono">
                      {v.conceptTag}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#c49a45] font-mono mt-0.5">
                    ₹{v.state.totalProductCost.toLocaleString("en-IN")}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Camera Preset Controls */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 rounded-full border border-white/10 bg-neutral-900/90 p-1 backdrop-blur-md">
            {dynamicPresets.map((preset) => {
              const isActive = !focusedProductCode && activePreset.id === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`cursor-pointer rounded-full px-3.5 py-1 text-xs font-medium transition-all ${
                    isActive
                      ? "bg-white text-neutral-950 shadow-md font-semibold"
                      : "text-neutral-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {focusedProductCode && (
            <div className="flex items-center gap-2 text-xs bg-[#c49a45]/15 border border-[#c49a45]/40 text-[#f0d8a8] px-3 py-1 rounded-full">
              <span>Fixture Focused: {focusedProductCode}</span>
              <button
                type="button"
                onClick={onClearFocus}
                className="text-stone-400 hover:text-white underline font-medium ml-1 cursor-pointer"
              >
                Reset Camera
              </button>
            </div>
          )}
        </div>

        {/* 3D Stage Container */}
        <div className="relative h-[650px] w-full overflow-hidden rounded-3xl border border-white/10 bg-neutral-900 shadow-2xl md:h-[750px]">
          <BathroomCanvas
            designState={designState}
            templateId={templateId}
            activeCameraPreset={activePreset}
            focusedProductCode={focusedProductCode}
            showDevIndicator={showDevDiagnostics}
            className="w-full h-full"
          />

          {/* Navigation Orbit Hint */}
          <div className="pointer-events-none absolute right-6 top-6 z-10 hidden items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[11px] text-neutral-400 backdrop-blur-sm sm:flex">
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
            <span>Drag to orbit • Scroll to zoom</span>
          </div>
        </div>
      </div>

      {/* Fullscreen Dedicated Studio Editor */}
      <FullscreenBathroomEditor
        isOpen={isEditorOpen}
        initialDesignState={designState}
        templateId={templateId}
        onClose={() => setIsEditorOpen(false)}
        onSave={(updatedState) => {
          onApplyManualEdit?.(updatedState);
        }}
      />
    </section>
  );
}

"use client";

import React from "react";
import type { DesignPlacement, DesignState } from "@/lib/design";

export interface ManualEditingToolbarProps {
  isEditing: boolean;
  onToggleEditMode: () => void;
  selectedPlacement: DesignPlacement | null;
  selectedProductName?: string;
  editMode: "translate" | "rotate";
  onChangeEditMode: (mode: "translate" | "rotate") => void;
  onRotateProduct: (deltaDeg: number) => void;
  onNudgePosition: (deltaX: number, deltaY: number) => void;
  onResetProduct: () => void;
  onCancel: () => void;
  onApply: () => void;
  validationStatus: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
  hasUncommittedChanges: boolean;
}

export default function ManualEditingToolbar({
  isEditing,
  onToggleEditMode,
  selectedPlacement,
  selectedProductName,
  editMode,
  onChangeEditMode,
  onRotateProduct,
  onNudgePosition,
  onResetProduct,
  onCancel,
  onApply,
  validationStatus,
  hasUncommittedChanges,
}: ManualEditingToolbarProps) {
  if (!isEditing) {
    return (
      <div className="absolute bottom-6 right-6 z-30">
        <button
          type="button"
          onClick={onToggleEditMode}
          className="flex cursor-pointer items-center gap-2 rounded-full border border-[#c49a45]/60 bg-neutral-950/85 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#f0d8a8] shadow-2xl backdrop-blur-md transition-all duration-300 hover:border-[#c49a45] hover:bg-neutral-900 hover:text-white hover:scale-105 active:scale-95"
        >
          <svg className="h-4 w-4 text-[#c49a45]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          <span>Edit Layout</span>
        </button>
      </div>
    );
  }

  return (
    <aside aria-label="Manual 3D Layout Editor" className="pointer-events-none absolute inset-x-0 bottom-6 z-30 flex justify-center px-4">
      <div className="pointer-events-auto flex max-w-4xl flex-col gap-3 rounded-3xl border border-[#c49a45]/40 bg-neutral-950/90 p-4 shadow-[0_16px_50px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:p-5 w-full">
        {/* Top Context & Selected Product Status */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#c49a45]/20 border border-[#c49a45]/40 text-[#c49a45]">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c49a45]">
                  Layout Editor
                </span>
                {selectedPlacement && (
                  <span className="rounded bg-stone-900 px-2 py-0.5 font-mono text-[10px] text-stone-300 border border-white/10">
                    {selectedPlacement.productCode}
                  </span>
                )}
              </div>
              <h4 className="font-serif text-sm font-medium text-white truncate max-w-xs sm:max-w-md">
                {selectedPlacement ? (selectedProductName || selectedPlacement.role) : "Click any fixture in 3D to select & position"}
              </h4>
            </div>
          </div>

          {/* Validation Feedback Badge */}
          {selectedPlacement && (
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${
                  validationStatus.valid
                    ? "border-emerald-500/30 bg-emerald-950/50 text-emerald-300"
                    : "border-rose-500/50 bg-rose-950/60 text-rose-300 animate-pulse"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    validationStatus.valid ? "bg-emerald-400" : "bg-rose-400"
                  }`}
                />
                <span>{validationStatus.valid ? "Valid Position" : "Invalid Placement"}</span>
              </span>
            </div>
          )}
        </div>

        {/* Validation Error Explanation if Invalid */}
        {!validationStatus.valid && validationStatus.errors.length > 0 && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-2.5 text-xs text-rose-200">
            <p className="font-medium text-rose-300">Spatial Clearance Violation:</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-[11px] text-rose-200/90">
              {validationStatus.errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          {/* Left: Mode Toggles & Manipulation */}
          {selectedPlacement ? (
            <div className="flex flex-wrap items-center gap-2">
              {/* Translate / Rotate Toggle */}
              <div className="inline-flex rounded-xl border border-stone-800 bg-neutral-900 p-1">
                <button
                  type="button"
                  onClick={() => onChangeEditMode("translate")}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    editMode === "translate"
                      ? "bg-[#c49a45] text-black font-semibold shadow"
                      : "text-stone-400 hover:text-white"
                  }`}
                >
                  Move (X/Y)
                </button>
                <button
                  type="button"
                  onClick={() => onChangeEditMode("rotate")}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    editMode === "rotate"
                      ? "bg-[#c49a45] text-black font-semibold shadow"
                      : "text-stone-400 hover:text-white"
                  }`}
                >
                  Rotate (Yaw)
                </button>
              </div>

              {/* Nudge / Action Controls based on active mode */}
              {editMode === "translate" ? (
                <div className="flex items-center gap-1 rounded-xl border border-stone-800 bg-neutral-900/90 px-2 py-1">
                  <span className="text-[10px] text-stone-500 mr-1 uppercase">Slide:</span>
                  <button
                    type="button"
                    title="Move Left (-X)"
                    onClick={() => onNudgePosition(-0.05, 0)}
                    className="cursor-pointer rounded p-1 text-stone-300 hover:bg-stone-800 hover:text-white text-xs"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    title="Move Forward (+Y)"
                    onClick={() => onNudgePosition(0, 0.05)}
                    className="cursor-pointer rounded p-1 text-stone-300 hover:bg-stone-800 hover:text-white text-xs"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    title="Move Backward (-Y)"
                    onClick={() => onNudgePosition(0, -0.05)}
                    className="cursor-pointer rounded p-1 text-stone-300 hover:bg-stone-800 hover:text-white text-xs"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    title="Move Right (+X)"
                    onClick={() => onNudgePosition(0.05, 0)}
                    className="cursor-pointer rounded p-1 text-stone-300 hover:bg-stone-800 hover:text-white text-xs"
                  >
                    →
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 rounded-xl border border-stone-800 bg-neutral-900/90 px-2.5 py-1">
                  <span className="text-[10px] text-stone-500 uppercase">Snap:</span>
                  <button
                    type="button"
                    onClick={() => onRotateProduct(-45)}
                    className="cursor-pointer rounded bg-stone-800 px-2 py-0.5 text-xs text-stone-200 hover:bg-stone-700"
                  >
                    ↺ -45°
                  </button>
                  <button
                    type="button"
                    onClick={() => onRotateProduct(45)}
                    className="cursor-pointer rounded bg-stone-800 px-2 py-0.5 text-xs text-stone-200 hover:bg-stone-700"
                  >
                    ↻ +45°
                  </button>
                  <button
                    type="button"
                    onClick={() => onRotateProduct(90)}
                    className="cursor-pointer rounded bg-stone-800 px-2 py-0.5 text-xs text-stone-200 hover:bg-stone-700"
                  >
                    ↻ +90°
                  </button>
                </div>
              )}

              {/* Reset Selected Product */}
              <button
                type="button"
                onClick={onResetProduct}
                className="cursor-pointer rounded-xl border border-stone-700/60 bg-stone-900/60 px-3 py-1.5 text-xs font-medium text-stone-300 transition-colors hover:border-stone-500 hover:text-white"
                title="Restore this product to its original generated placement"
              >
                Reset Position
              </button>
            </div>
          ) : (
            <p className="text-xs text-stone-400 italic">
              Tip: Click any 3D fixture or use controls above to modify layout.
            </p>
          )}

          {/* Right: Cancel and Apply */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onCancel}
              className="cursor-pointer rounded-full border border-stone-700 bg-stone-900/90 px-4 py-2 text-xs font-medium text-stone-300 transition-colors hover:bg-stone-800 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onApply}
              disabled={!validationStatus.valid}
              className="cursor-pointer rounded-full bg-[#c49a45] hover:bg-[#b0873a] px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-black shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

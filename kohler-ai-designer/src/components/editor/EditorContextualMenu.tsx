"use client";

import React from "react";
import type { EditorActionState } from "@/lib/editor/types";
import type { RecommendationProduct } from "@/lib/recommendation/types";
import type { DesignPlacement } from "@/lib/design/types";
import type { LayoutValidationResult } from "@/lib/constraints";
import { getPlacementDiagnosticMessages } from "@/lib/design/manualEditing";

interface EditorContextualMenuProps {
  actionState: EditorActionState;
  selectedProduct: RecommendationProduct | null;
  selectedPlacement: DesignPlacement | null;
  tentativePlacement: DesignPlacement | null;
  tentativeValidation: LayoutValidationResult | null;
  onStartMove: () => void;
  onStartRotate: () => void;
  onRotateStep: (deltaDeg: number) => void;
  onOpenReplace: () => void;
  onOpenRemove: () => void;
  onConfirmPlacement: () => void;
  onTryAgainPlacement: () => void;
  onCancelAction: () => void;
  onDeselect: () => void;
}

export function EditorContextualMenu({
  actionState,
  selectedProduct,
  selectedPlacement,
  tentativePlacement,
  tentativeValidation,
  onStartMove,
  onStartRotate,
  onRotateStep,
  onOpenReplace,
  onOpenRemove,
  onConfirmPlacement,
  onTryAgainPlacement,
  onCancelAction,
  onDeselect,
}: EditorContextualMenuProps) {
  // Compute placement diagnostics if tentative placement exists
  const activePlacement = tentativePlacement ?? selectedPlacement;
  const activeCode = selectedProduct?.productCode ?? "";
  const diagnostics =
    activePlacement && tentativeValidation
      ? getPlacementDiagnosticMessages(activeCode, tentativeValidation)
      : { valid: true, errors: [], warnings: [] };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4">
      <div className="bg-neutral-900/90 backdrop-blur-xl border border-neutral-800/80 rounded-2xl p-4 shadow-2xl transition-all">
        {/* IDLE STATE */}
        {actionState.type === "IDLE" && (
          <div className="flex items-center justify-between text-neutral-400 py-1 px-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-neutral-600 animate-pulse" />
              <span>Select any fixture in the 3D scene or 2D floor plan to inspect or adjust layout.</span>
            </div>
            <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">
              Single-source DesignState
            </span>
          </div>
        )}

        {/* SELECTED STATE */}
        {actionState.type === "SELECTED" && selectedProduct && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-800/80 border border-neutral-700/60 flex items-center justify-center text-amber-400 font-mono text-xs">
                {selectedProduct.category?.substring(0, 2).toUpperCase() || "FX"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-white line-clamp-1">
                    {selectedProduct.productName}
                  </h4>
                  <span className="text-[10px] font-mono text-neutral-400 px-1.5 py-0.5 rounded bg-neutral-800">
                    {selectedProduct.productCode}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-neutral-400 mt-0.5">
                  <span className="text-amber-400 font-mono">
                    ₹{(selectedProduct.currentPrice ?? 0).toLocaleString("en-IN")}
                  </span>
                  {selectedPlacement && (
                    <span className="font-mono text-neutral-500 text-[11px]">
                      Pos: ({selectedPlacement.position.x.toFixed(2)}m, {selectedPlacement.position.y.toFixed(2)}m) · {Math.round(selectedPlacement.rotation.z)}°
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end flex-wrap">
              <button
                onClick={onStartMove}
                className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Move fixture"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16M10 4l-4 4 4 4m4 8l4-4-4-4" />
                </svg>
                <span>Move</span>
              </button>

              <button
                onClick={onStartRotate}
                className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Rotate fixture"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Rotate</span>
              </button>

              <button
                onClick={onOpenReplace}
                className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Replace with another Kohler fixture"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span>Replace</span>
              </button>

              <button
                onClick={onOpenRemove}
                className="px-3 py-2 rounded-xl bg-neutral-900 hover:bg-red-950/40 text-neutral-400 hover:text-red-400 border border-neutral-800 hover:border-red-800/40 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                title="Remove fixture"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>

              <button
                onClick={onDeselect}
                className="p-2 text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
                title="Deselect"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* MOVING STATE */}
        {actionState.type === "MOVING" && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <div>
                <h4 className="text-xs font-medium text-white">
                  Move fixture: Pointer is tracking position
                </h4>
                <p className="text-[11px] text-neutral-400">
                  Move pointer over 3D room floor or 2D floor plan. <span className="text-amber-300 font-medium">Click to drop &amp; freeze</span> position.
                </p>
              </div>
            </div>

            <button
              onClick={onCancelAction}
              className="px-3.5 py-1.5 rounded-lg border border-neutral-700 hover:border-neutral-500 text-xs text-neutral-300 hover:text-white transition-colors cursor-pointer"
            >
              Cancel Move
            </button>
          </div>
        )}

        {/* PLACED STATE (CLICK-TO-PLACE FROZEN) */}
        {actionState.type === "PLACED" && tentativePlacement && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {diagnostics.valid ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Placement Valid</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium px-2.5 py-1 rounded-full bg-rose-950/60 border border-rose-800/60">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>Constraint Violation</span>
                  </div>
                )}
                <span className="text-xs text-neutral-400 font-mono">
                  ({tentativePlacement.position.x.toFixed(2)}m, {tentativePlacement.position.y.toFixed(2)}m)
                </span>
                <span className="text-[11px] text-neutral-500">
                  (Position is frozen. Pointer no longer moves it)
                </span>
              </div>

              {/* Placed Action Controls */}
              <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                <button
                  onClick={onTryAgainPlacement}
                  className="px-3.5 py-1.5 rounded-lg border border-neutral-700 hover:border-neutral-500 text-xs font-medium text-neutral-300 hover:text-white transition-colors cursor-pointer"
                >
                  Reposition
                </button>
                <button
                  onClick={onCancelAction}
                  className="px-3.5 py-1.5 rounded-lg border border-neutral-800 hover:border-neutral-700 text-xs font-medium text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirmPlacement}
                  disabled={!diagnostics.valid}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer shadow-lg ${
                    diagnostics.valid
                      ? "bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold shadow-amber-500/20"
                      : "bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700"
                  }`}
                >
                  Done
                </button>
              </div>
            </div>

            {/* Error / Warning Details */}
            {diagnostics.errors.length > 0 && (
              <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-800/40 text-xs text-rose-300 space-y-1">
                {diagnostics.errors.map((err, idx) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <span className="text-rose-400 font-mono">•</span>
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ROTATING STATE */}
        {actionState.type === "ROTATING" && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-white">
                Rotate Fixture
              </span>
              <span className="px-2 py-0.5 rounded bg-neutral-800 text-amber-400 font-mono text-xs">
                {activePlacement ? Math.round(activePlacement.rotation.z) : 0}°
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {[-90, -45, -15, 15, 45, 90].map((step) => (
                <button
                  key={step}
                  onClick={() => onRotateStep(step)}
                  className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-mono text-neutral-200 transition-colors cursor-pointer"
                >
                  {step > 0 ? `+${step}°` : `${step}°`}
                </button>
              ))}

              <div className="h-4 w-px bg-neutral-700 mx-1" />

              <button
                onClick={onCancelAction}
                className="px-3 py-1.5 rounded-lg border border-neutral-700 text-xs text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={onConfirmPlacement}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs transition-colors cursor-pointer shadow-lg shadow-amber-500/20"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

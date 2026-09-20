"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import type { DesignPlacement, DesignState } from "@/lib/design/types";
import type { LayoutValidationResult } from "@/lib/constraints/types";
import type { CatalogueProduct } from "@/lib/catalogue/types";
import type { EditorActionState, EditorViewMode } from "@/lib/editor/types";
import {
  createEditorSession,
  pushSessionState,
  undoSession,
  redoSession,
  canUndo,
  canRedo,
} from "@/lib/editor/editorSession";
import { replaceProductInDesignState } from "@/lib/editor/replacementEngine";
import {
  findDependentProducts,
  removeProductFromDesignState,
} from "@/lib/editor/removalEngine";
import {
  validateTentativePlacement,
  constrainPositionToSurface,
  snapRotation,
  syncHostedPlacements,
} from "@/lib/design/manualEditing";
import BathroomCanvas from "@/components/BathroomCanvas/BathroomCanvas";
import ArchitecturalFloorPlan from "@/components/editor/ArchitecturalFloorPlan";
import { EditorContextualMenu } from "@/components/editor/EditorContextualMenu";
import { ProductReplacementModal } from "@/components/editor/ProductReplacementModal";
import { ProductRemovalDialog } from "@/components/editor/ProductRemovalDialog";

export interface FullscreenBathroomEditorProps {
  initialDesignState: DesignState;
  templateId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (finalState: DesignState) => void;
}

export function FullscreenBathroomEditor({
  initialDesignState,
  templateId,
  isOpen,
  onClose,
  onSave,
}: FullscreenBathroomEditorProps) {
  // Session History State (Past, Present, Future)
  const [session, setSession] = useState(() => createEditorSession(initialDesignState));
  const [viewMode, setViewMode] = useState<EditorViewMode>("3d");
  const [actionState, setActionState] = useState<EditorActionState>({ type: "IDLE" });

  // Modals visibility
  const [replacementModalOpen, setReplacementModalOpen] = useState(false);
  const [removalDialogOpen, setRemovalDialogOpen] = useState(false);

  // Sync session if initialDesignState changes while closed
  useEffect(() => {
    if (!isOpen) {
      setSession(createEditorSession(initialDesignState));
      setActionState({ type: "IDLE" });
    }
  }, [initialDesignState, isOpen]);

  const currentState = session.present;

  // Derive active selected product code
  const selectedProductCode = useMemo(() => {
    if (
      actionState.type === "SELECTED" ||
      actionState.type === "MOVING" ||
      actionState.type === "PLACED" ||
      actionState.type === "ROTATING" ||
      actionState.type === "REPLACING" ||
      actionState.type === "CONFIRM_REMOVE"
    ) {
      return actionState.productCode;
    }
    return null;
  }, [actionState]);

  // Selected Recommendation Product and Placement
  const selectedProduct = useMemo(() => {
    if (!selectedProductCode) return null;
    return currentState.selectedProducts.find((p) => p.productCode === selectedProductCode) ?? null;
  }, [selectedProductCode, currentState.selectedProducts]);

  const selectedPlacement = useMemo(() => {
    if (!selectedProductCode) return null;
    return currentState.placements.find((p) => p.productCode === selectedProductCode) ?? null;
  }, [selectedProductCode, currentState.placements]);

  // Derive tentative placement
  const tentativePlacement = useMemo<DesignPlacement | null>(() => {
    if (!selectedPlacement) return null;

    if (actionState.type === "MOVING") {
      return {
        ...selectedPlacement,
        position: actionState.tentativePosition,
      };
    }

    if (actionState.type === "PLACED") {
      return {
        ...selectedPlacement,
        position: actionState.placedPosition,
      };
    }

    if (actionState.type === "ROTATING") {
      return {
        ...selectedPlacement,
        rotation: {
          ...selectedPlacement.rotation,
          z: actionState.currentRotationZ,
        },
      };
    }

    return null;
  }, [selectedPlacement, actionState]);

  // Evaluate validation for tentative placement
  const tentativeValidation = useMemo<LayoutValidationResult | null>(() => {
    if (!tentativePlacement) return null;
    return validateTentativePlacement(tentativePlacement, currentState);
  }, [tentativePlacement, currentState]);

  // Rendered DesignState: incorporates tentative placement in real-time
  const renderedState = useMemo<DesignState>(() => {
    if (!tentativePlacement) return currentState;
    const directUpdates = currentState.placements.map((p) =>
      p.productCode === tentativePlacement.productCode ? tentativePlacement : p,
    );
    return {
      ...currentState,
      placements: syncHostedPlacements(currentState.placements, directUpdates),
    };
  }, [currentState, tentativePlacement]);

  // Select a product (from 3D or 2D floor plan)
  const handleSelectProduct = useCallback((productCode: string | null) => {
    if (!productCode) {
      setActionState({ type: "IDLE" });
      return;
    }
    setActionState({ type: "SELECTED", productCode });
  }, []);

  // Start moving the selected fixture
  const handleStartMove = useCallback(() => {
    if (!selectedPlacement) return;
    setActionState({
      type: "MOVING",
      productCode: selectedPlacement.productCode,
      originalPlacement: { ...selectedPlacement },
      tentativePosition: { ...selectedPlacement.position },
    });
  }, [selectedPlacement]);

  // Handle pointer tracking during move (in 3D or 2D)
  const handleDragMove = useCallback(
    (rawPos: { x: number; y: number; z: number }) => {
      if (actionState.type !== "MOVING" || !selectedPlacement) return;

      const hostPlacement = selectedPlacement.hostProductCode
        ? currentState.placements.find((p) => p.productCode === selectedPlacement.hostProductCode)
        : undefined;

      const constrained = constrainPositionToSurface(
        rawPos,
        selectedPlacement.placementSurface,
        selectedPlacement.footprint,
        currentState.room,
        hostPlacement,
        { role: selectedPlacement.role, zone: selectedPlacement.zone },
      );

      setActionState({
        type: "MOVING",
        productCode: selectedPlacement.productCode,
        originalPlacement: actionState.originalPlacement,
        tentativePosition: {
          x: constrained.x,
          y: constrained.y,
          z: constrained.z,
        },
      });
    },
    [actionState, selectedPlacement, currentState],
  );

  // Click to Drop & Freeze Placement
  const handleCommitMoveClick = useCallback(
    (explicitPos?: { x: number; y: number; z: number }) => {
      if (actionState.type !== "MOVING" || !selectedPlacement) return;

      const positionToFreeze = explicitPos ?? actionState.tentativePosition;
      const tentative: DesignPlacement = {
        ...selectedPlacement,
        position: positionToFreeze,
      };

      const validation = validateTentativePlacement(tentative, currentState);

      setActionState({
        type: "PLACED",
        productCode: selectedPlacement.productCode,
        originalPlacement: actionState.originalPlacement,
        placedPosition: positionToFreeze,
        validation,
      });
    },
    [actionState, selectedPlacement, currentState],
  );

  // Resume moving after freeze
  const handleTryAgainPlacement = useCallback(() => {
    if (actionState.type !== "PLACED") return;
    setActionState({
      type: "MOVING",
      productCode: actionState.productCode,
      originalPlacement: actionState.originalPlacement,
      tentativePosition: actionState.placedPosition,
    });
  }, [actionState]);

  // Start rotating
  const handleStartRotate = useCallback(() => {
    if (!selectedPlacement) return;
    setActionState({
      type: "ROTATING",
      productCode: selectedPlacement.productCode,
      originalRotationZ: selectedPlacement.rotation.z,
      currentRotationZ: selectedPlacement.rotation.z,
    });
  }, [selectedPlacement]);

  // Step rotation
  const handleRotateStep = useCallback(
    (deltaDeg: number) => {
      if (actionState.type !== "ROTATING") return;
      const nextDeg = snapRotation(actionState.currentRotationZ + deltaDeg, 15);
      setActionState({
        ...actionState,
        currentRotationZ: nextDeg,
      });
    },
    [actionState],
  );

  // Confirm tentative modification (Move or Rotate)
  const handleConfirmPlacement = useCallback(() => {
    if (!tentativePlacement) return;

    // Apply tentative placement to current state
    const updatedPlacements = currentState.placements.map((p) =>
      p.productCode === tentativePlacement.productCode ? tentativePlacement : p,
    );

    const nextState: DesignState = {
      ...currentState,
      placements: updatedPlacements,
    };

    // Push into session undo/redo stack
    setSession((curr) => pushSessionState(curr, nextState));
    setActionState({ type: "SELECTED", productCode: tentativePlacement.productCode });
  }, [tentativePlacement, currentState]);

  // Cancel action and revert tentative modifications
  const handleCancelAction = useCallback(() => {
    if (
      actionState.type === "MOVING" ||
      actionState.type === "PLACED" ||
      actionState.type === "ROTATING"
    ) {
      setActionState({ type: "SELECTED", productCode: actionState.productCode });
    } else {
      setActionState({ type: "IDLE" });
    }
  }, [actionState]);

  // Deselect
  const handleDeselect = useCallback(() => {
    setActionState({ type: "IDLE" });
  }, []);

  // Open Replacement Modal
  const handleOpenReplace = useCallback(() => {
    if (!selectedProduct) return;
    setReplacementModalOpen(true);
  }, [selectedProduct]);

  // Handle Replacement Selection
  const handleSelectReplacement = useCallback(
    (newProduct: CatalogueProduct) => {
      if (!selectedProductCode) return;
      const updatedState = replaceProductInDesignState(
        currentState,
        selectedProductCode,
        newProduct,
      );
      setSession((curr) => pushSessionState(curr, updatedState));
      setActionState({ type: "SELECTED", productCode: newProduct.productCode });
    },
    [currentState, selectedProductCode],
  );

  // Open Removal Dialog
  const handleOpenRemove = useCallback(() => {
    if (!selectedProduct) return;
    setRemovalDialogOpen(true);
  }, [selectedProduct]);

  // Dependent products for removal
  const dependentProducts = useMemo(() => {
    if (!selectedProductCode) return [];
    return findDependentProducts(selectedProductCode, currentState);
  }, [selectedProductCode, currentState]);

  // Handle Removal Confirmation
  const handleConfirmRemove = useCallback(
    (removeDependents: boolean) => {
      if (!selectedProductCode) return;
      const { state: updatedState } = removeProductFromDesignState(
        currentState,
        selectedProductCode,
        removeDependents,
      );
      setSession((curr) => pushSessionState(curr, updatedState));
      setActionState({ type: "IDLE" });
    },
    [currentState, selectedProductCode],
  );

  // Undo / Redo Handlers
  const handleUndo = useCallback(() => {
    if (!canUndo(session)) return;
    setSession((curr) => undoSession(curr));
    setActionState({ type: "IDLE" });
  }, [session]);

  const handleRedo = useCallback(() => {
    if (!canRedo(session)) return;
    setSession((curr) => redoSession(curr));
    setActionState({ type: "IDLE" });
  }, [session]);

  // Keyboard Shortcuts (Undo, Redo, Escape)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      } else if (e.key === "Escape") {
        if (actionState.type !== "IDLE") {
          handleCancelAction();
        } else {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, actionState, handleUndo, handleRedo, handleCancelAction, onClose]);

  // Commit and Exit
  const handleSaveAndExit = () => {
    onSave(session.present);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950 flex flex-col overflow-hidden text-neutral-100 select-none">
      {/* Top Architectural Studio Navigation Bar */}
      <header className="h-16 px-6 border-b border-neutral-800 bg-neutral-950/95 flex items-center justify-between shrink-0 z-10 backdrop-blur-md">
        {/* Left: Branding & Status */}
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-800 hover:border-neutral-700 bg-neutral-900 text-xs font-medium text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="Exit without saving recent changes"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Exit</span>
          </button>

          <div className="h-4 w-px bg-neutral-800" />

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-serif text-white tracking-wide">
                KOHLER Studio
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-800/40 text-amber-400 font-mono">
                Manual Edit Mode
              </span>
            </div>
            <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
              Room: {currentState.room.widthM}m × {currentState.room.depthM}m ({currentState.room.heightM}m H)
            </p>
          </div>
        </div>

        {/* Center: View Switcher (3D / Floor Plan) */}
        <div className="flex items-center bg-neutral-900 border border-neutral-800 p-1 rounded-xl">
          <button
            onClick={() => setViewMode("3d")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              viewMode === "3d"
                ? "bg-neutral-800 text-white shadow-sm"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span>3D Perspective</span>
          </button>

          <button
            onClick={() => setViewMode("floorplan")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              viewMode === "floorplan"
                ? "bg-neutral-800 text-white shadow-sm"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span>Architectural Floor Plan</span>
          </button>
        </div>

        {/* Right: Undo / Redo & Commit Save */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 p-1 rounded-xl">
            <button
              onClick={handleUndo}
              disabled={!canUndo(session)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white disabled:text-neutral-600 disabled:hover:text-neutral-600 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo(session)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white disabled:text-neutral-600 disabled:hover:text-neutral-600 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Redo (Ctrl+Shift+Z)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
              </svg>
            </button>
          </div>

          <button
            onClick={handleSaveAndExit}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-medium text-xs transition-colors shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            Save Layout
          </button>
        </div>
      </header>

      {/* Main Viewport Workspace */}
      <main className="relative flex-1 w-full h-full overflow-hidden bg-neutral-950">
        {viewMode === "3d" ? (
          <div className="w-full h-full">
            <BathroomCanvas
              designState={renderedState}
              templateId={templateId}
              isEditing={true}
              selectedProductCode={selectedProductCode}
              isValidPlacement={!tentativeValidation || tentativeValidation.valid}
              onSelectProduct={handleSelectProduct}
              onDragMove={handleDragMove}
              onClickFloor={() => {
                if (actionState.type === "MOVING") {
                  handleCommitMoveClick();
                }
              }}
              showDevIndicator={false}
              className="w-full h-full"
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center p-6 bg-neutral-950/80">
            <ArchitecturalFloorPlan
              designState={renderedState}
              actionState={actionState}
              onSelectProduct={handleSelectProduct}
              onMovePreview={handleDragMove}
              onCommitMoveClick={handleCommitMoveClick}
              className="max-h-full"
            />
          </div>
        )}

        {/* View Mode Indicator Overlay */}
        <div className="absolute top-4 left-6 pointer-events-none">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900/80 border border-neutral-800 backdrop-blur-md text-[11px] text-neutral-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>
              {viewMode === "3d" ? "3D Architectural Render" : "1:1 Scaled Architectural SVG"}
            </span>
          </div>
        </div>

        {/* Bottom Contextual Action Menu */}
        <div className="absolute bottom-0 inset-x-0 pointer-events-none">
          <div className="pointer-events-auto">
            <EditorContextualMenu
              actionState={actionState}
              selectedProduct={selectedProduct}
              selectedPlacement={selectedPlacement}
              tentativePlacement={tentativePlacement}
              tentativeValidation={tentativeValidation}
              allPlacements={renderedState.placements}
              allProducts={renderedState.selectedProducts}
              onSelectProduct={handleSelectProduct}
              onStartMove={handleStartMove}
              onStartRotate={handleStartRotate}
              onRotateStep={handleRotateStep}
              onOpenReplace={handleOpenReplace}
              onOpenRemove={handleOpenRemove}
              onConfirmPlacement={handleConfirmPlacement}
              onTryAgainPlacement={handleTryAgainPlacement}
              onCancelAction={handleCancelAction}
              onDeselect={handleDeselect}
            />
          </div>
        </div>
      </main>

      {/* Product Replacement Modal */}
      <ProductReplacementModal
        isOpen={replacementModalOpen}
        onClose={() => setReplacementModalOpen(false)}
        currentProduct={selectedProduct}
        room={currentState.room}
        onSelectReplacement={handleSelectReplacement}
      />

      {/* Product Removal Dialog */}
      <ProductRemovalDialog
        isOpen={removalDialogOpen}
        onClose={() => setRemovalDialogOpen(false)}
        targetProduct={selectedProduct}
        dependentProducts={dependentProducts}
        onConfirmRemove={handleConfirmRemove}
      />
    </div>
  );
}
export default FullscreenBathroomEditor;

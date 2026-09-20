"use client";

import React, { useEffect, useState } from "react";
import ExperienceNav from "@/components/experience/ExperienceNav";
import HeroSection from "@/components/experience/HeroSection";
import DesignBriefSection from "@/components/experience/DesignBriefSection";
import DesigningTransition from "@/components/experience/DesigningTransition";
import RevealSection from "@/components/experience/RevealSection";
import ProductBreakdownSection from "@/components/experience/ProductBreakdownSection";
import DesignSummarySection from "@/components/experience/DesignSummarySection";
import ModifyWithAiSection from "@/components/experience/ModifyWithAiSection";
import { DesignFailureView } from "@/components/experience/DesignFailureView";
import type { UserDesignInput } from "@/lib/design/generateDesign";
import type { DesignVariant } from "@/lib/design/generateVariants";
import type { DesignState } from "@/lib/design/types";
import {
  computeDesignDelta,
  computeModifiedBrief,
  type DesignChangeDelta,
  type DesignCommand,
} from "@/lib/ai";
import {
  canRestorePrevious,
  createInitialHistoryStack,
  pushHistoryEntry,
  restorePreviousEntry,
  type DesignHistoryEntry,
  type DesignHistoryStack,
} from "@/lib/design/history";
import {
  loadDesignerState,
  saveDesignerState,
  type DesignerPersistedState,
} from "@/lib/design/persistence";

export default function HomePage() {
  const [persisted, setPersisted] = useState<DesignerPersistedState | null>(() => loadDesignerState());
  const [variants, setVariants] = useState<DesignVariant[]>([]);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number>(() => {
    return loadDesignerState().selectedVariantIndex ?? 0;
  });
  const [isDesigning, setIsDesigning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [focusedProductCode, setFocusedProductCode] = useState<string | null>(null);

  // Design History Stack
  const [historyStack, setHistoryStack] = useState<DesignHistoryStack>(() => createInitialHistoryStack());
  const [activeDelta, setActiveDelta] = useState<DesignChangeDelta | null>(null);

  // Failure state if generation fails constraints
  const [failureState, setFailureState] = useState<{
    reason: string;
    rejections?: string[];
    suggestions?: string[];
  } | null>(null);

  // Load baseline on mount
  useEffect(() => {
    fetch("/api/design-state")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load baseline design.");
        return res.json();
      })
      .then((data) => {
        if (data.variants && data.variants.length > 0) {
          setVariants(data.variants);
          const initialEntry: DesignHistoryEntry = {
            id: "baseline",
            timestamp: "Initial",
            description: "Baseline Verified Layout",
            brief: {
              room: data.variants[0].state.room,
              budget: data.variants[0].state.budget ?? 500000,
              currency: "INR",
              desiredStyle: data.variants[0].state.style ?? "Luxury Modern",
              requiredRoles: ["toilet", "basin", "rainhead"],
            },
            templateId: "compact-modern",
            variants: data.variants,
            selectedVariantIndex: 0,
            activeState: data.variants[0].state,
          };
          setHistoryStack(createInitialHistoryStack(initialEntry));
        }
      })
      .catch((err) => {
        console.warn("Initial baseline load error:", err);
      });
  }, []);

  const activeVariant = variants[selectedVariantIndex] ?? variants[0] ?? null;
  const activeDesignState = activeVariant?.state ?? null;

  const handleStartDesigning = () => {
    const briefElem = document.getElementById("design-brief");
    if (briefElem) {
      briefElem.scrollIntoView({ behavior: "smooth" });
    }
  };

  const executeDesignGeneration = async (
    brief: UserDesignInput,
    templateId = "compact-modern",
    recordHistory = true,
  ) => {
    setIsSubmitting(true);
    setIsDesigning(true);
    setFailureState(null);

    try {
      const response = await fetch("/api/design-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brief),
      });

      if (!response.ok) {
        throw new Error(`Generation failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.variants && result.variants.length > 0) {
        setVariants(result.variants);
        setSelectedVariantIndex(0);
        setFailureState(null);
        setFocusedProductCode(null);

        // Update persistence
        const roomFt = {
          widthFt: Number((brief.room.widthM / 0.3048).toFixed(1)),
          depthFt: Number((brief.room.depthM / 0.3048).toFixed(1)),
          heightFt: Number((brief.room.heightM / 0.3048).toFixed(1)),
        };
        saveDesignerState({
          selectedTemplateId: templateId,
          roomDimensions: roomFt,
          budget: brief.budget,
          desiredStyle: brief.desiredStyle,
          requiredZones: brief.requiredRoles,
          selectedVariantIndex: 0,
          hasPreviousDesign: true,
        });

        // Record history snapshot
        if (recordHistory) {
          const entry: DesignHistoryEntry = {
            id: `design-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            description: `Generated layout (${brief.desiredStyle})`,
            brief,
            templateId,
            variants: result.variants,
            selectedVariantIndex: 0,
            activeState: result.variants[0].state,
          };
          setHistoryStack((prev) => pushHistoryEntry(prev, entry));
        }
      } else {
        // Honest failure state
        setFailureState({
          reason: result.reason ?? "No valid configurations found for current parameters.",
          rejections: result.rejections ?? [],
          suggestions: result.suggestions ?? [],
        });
      }
    } catch (error) {
      console.error("Design generation error:", error);
      setFailureState({
        reason: error instanceof Error ? error.message : "Unexpected generation failure",
        suggestions: ["Try resetting to a preset architectural template."],
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBriefSubmit = (brief: UserDesignInput, templateId: string) => {
    executeDesignGeneration(brief, templateId, true);
  };

  const handleTransitionComplete = () => {
    setIsDesigning(false);
    setHasGenerated(true);

    setTimeout(() => {
      if (!failureState) {
        const revealElem = document.getElementById("reveal");
        if (revealElem) {
          revealElem.scrollIntoView({ behavior: "smooth" });
        }
      } else {
        const briefElem = document.getElementById("failure-view-container");
        if (briefElem) {
          briefElem.scrollIntoView({ behavior: "smooth" });
        }
      }
    }, 100);
  };

  const handleModifyClick = () => {
    const modifyElem = document.getElementById("modify-with-ai");
    if (modifyElem) {
      modifyElem.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleEditBriefClick = () => {
    const briefElem = document.getElementById("design-brief");
    if (briefElem) {
      briefElem.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Restore Previous Design Action
  const handleRestorePrevious = () => {
    const { stack: newStack, restored } = restorePreviousEntry(historyStack);
    if (restored) {
      setHistoryStack(newStack);
      setVariants(restored.variants);
      setSelectedVariantIndex(restored.selectedVariantIndex);
      setActiveDelta(null);
      setFailureState(null);
      setFocusedProductCode(null);

      // Sync persisted brief
      const roomFt = {
        widthFt: Number((restored.brief.room.widthM / 0.3048).toFixed(1)),
        depthFt: Number((restored.brief.room.depthM / 0.3048).toFixed(1)),
        heightFt: Number((restored.brief.room.heightM / 0.3048).toFixed(1)),
      };
      setPersisted({
        selectedTemplateId: restored.templateId,
        roomDimensions: roomFt,
        budget: restored.brief.budget,
        desiredStyle: restored.brief.desiredStyle,
        requiredZones: restored.brief.requiredRoles ?? ["toilet", "basin", "rainhead"],
        lastNaturalLanguagePrompt: `Restored ${restored.description}`,
        selectedVariantIndex: restored.selectedVariantIndex,
        hasPreviousDesign: canRestorePrevious(newStack),
      });

      const revealEl = document.getElementById("reveal");
      if (revealEl) {
        revealEl.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const handleApplyManualEdit = (updatedDesignState: DesignState) => {
    // 1. Update active variant's state
    const updatedVariants = variants.map((v, idx) => {
      if (idx === selectedVariantIndex) {
        return {
          ...v,
          state: updatedDesignState,
        };
      }
      return v;
    });
    setVariants(updatedVariants);

    // 2. Record to design history stack
    const entry: DesignHistoryEntry = {
      id: `manual-edit-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      description: "Manual 3D Layout Adjustment",
      brief: {
        room: updatedDesignState.room,
        budget: updatedDesignState.budget ?? 500000,
        currency: "INR",
        desiredStyle: updatedDesignState.style ?? "Luxury Modern",
        requiredRoles: ["toilet", "basin", "rainhead"],
      },
      templateId: persisted?.selectedTemplateId ?? "compact-modern",
      variants: updatedVariants,
      selectedVariantIndex,
      activeState: updatedDesignState,
    };
    setHistoryStack((prev) => pushHistoryEntry(prev, entry));
  };

  // Failure view suggestion actions
  const handleApplyFailureSuggestion = (type: "budget" | "dimensions" | "reset" | "template") => {
    if (type === "budget") {
      setPersisted((prev) => (prev ? { ...prev, budget: 500000 } : null));
      const room = activeDesignState?.room ?? { widthM: 2.44, depthM: 1.83, heightM: 2.74, doors: [], windows: [] };
      executeDesignGeneration(
        {
          room,
          budget: 500000,
          currency: "INR",
          desiredStyle: "Luxury Modern",
          requiredRoles: ["toilet", "basin", "rainhead"],
        },
        "compact-modern",
      );
    } else if (type === "dimensions") {
      const room = { widthM: 8 * 0.3048, depthM: 6 * 0.3048, heightM: 9 * 0.3048, doors: [], windows: [] };
      setPersisted((prev) =>
        prev ? { ...prev, roomDimensions: { widthFt: 8, depthFt: 6, heightFt: 9 } } : null,
      );
      executeDesignGeneration(
        {
          room,
          budget: persisted?.budget ?? 500000,
          currency: "INR",
          desiredStyle: persisted?.desiredStyle ?? "Luxury Modern",
          requiredRoles: ["toilet", "basin", "rainhead"],
        },
        "compact-modern",
      );
    } else {
      // Reset to Compact Modern
      const room = { widthM: 8 * 0.3048, depthM: 6 * 0.3048, heightM: 9 * 0.3048, doors: [], windows: [] };
      setPersisted({
        selectedTemplateId: "compact-modern",
        roomDimensions: { widthFt: 8, depthFt: 6, heightFt: 9 },
        budget: 500000,
        desiredStyle: "Luxury Modern",
        requiredZones: ["toilet", "basin", "rainhead"],
        lastNaturalLanguagePrompt: "8 x 6 ft luxury modern bathroom with smart toilet, vanity and shower",
        selectedVariantIndex: 0,
      });
      executeDesignGeneration(
        {
          room,
          budget: 500000,
          currency: "INR",
          desiredStyle: "Luxury Modern",
          requiredRoles: ["toilet", "basin", "rainhead"],
        },
        "compact-modern",
      );
    }
  };

  // Conversational AI command executor with Delta reporting
  const handleApplyAiCommand = async (command: DesignCommand) => {
    if (!activeDesignState) {
      return { success: false, reason: "No active bathroom design loaded." };
    }

    if (!command.isExecutableNow) {
      return {
        success: false,
        reason: command.explanation,
      };
    }

    const currentBrief: UserDesignInput = {
      room: activeDesignState.room,
      budget: persisted?.budget ?? activeDesignState.budget ?? 500000,
      currency: "INR",
      desiredStyle: persisted?.desiredStyle ?? activeDesignState.style ?? "Luxury Modern",
      requiredRoles: persisted?.requiredZones ?? ["toilet", "basin", "rainhead"],
    };

    const modifiedBrief = computeModifiedBrief(command, currentBrief);

    try {
      const response = await fetch("/api/design-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modifiedBrief),
      });

      if (!response.ok) {
        return { success: false, reason: `Server returned error (${response.status}).` };
      }

      const result = await response.json();

      if (result.success && result.variants && result.variants.length > 0) {
        const newVariant = result.variants[0];
        const delta = computeDesignDelta(activeDesignState, newVariant.state, command.rawText);

        setVariants(result.variants);
        setSelectedVariantIndex(0);
        setActiveDelta(delta);
        setFailureState(null);
        setFocusedProductCode(null);

        // Record in history stack
        const entry: DesignHistoryEntry = {
          id: `design-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          description: `AI: ${command.rawText}`,
          brief: modifiedBrief,
          templateId: persisted?.selectedTemplateId ?? "compact-modern",
          variants: result.variants,
          selectedVariantIndex: 0,
          activeState: newVariant.state,
        };
        setHistoryStack((prev) => pushHistoryEntry(prev, entry));

        // Update persisted brief
        const roomFt = {
          widthFt: Number((modifiedBrief.room.widthM / 0.3048).toFixed(1)),
          depthFt: Number((modifiedBrief.room.depthM / 0.3048).toFixed(1)),
          heightFt: Number((modifiedBrief.room.heightM / 0.3048).toFixed(1)),
        };
        saveDesignerState({
          selectedTemplateId: persisted?.selectedTemplateId ?? "compact-modern",
          roomDimensions: roomFt,
          budget: modifiedBrief.budget,
          desiredStyle: modifiedBrief.desiredStyle,
          requiredZones: modifiedBrief.requiredRoles ?? ["toilet", "basin", "rainhead"],
          lastNaturalLanguagePrompt: command.rawText,
          selectedVariantIndex: 0,
          hasPreviousDesign: true,
        });

        return {
          success: true,
          delta,
        };
      }

      return {
        success: false,
        reason: result.reason ?? "Unable to find valid configuration satisfying modification.",
      };
    } catch (error) {
      return {
        success: false,
        reason: error instanceof Error ? error.message : "AI modification failed.",
      };
    }
  };

  const canRestore = canRestorePrevious(historyStack);

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-white selection:bg-amber-400 selection:text-neutral-950">
      {/* Editorial Navigation */}
      <ExperienceNav
        onStartDesigning={handleStartDesigning}
        hasDesign={hasGenerated || Boolean(activeDesignState)}
        canRestore={canRestore}
        onRestorePrevious={handleRestorePrevious}
      />

      <main className="flex flex-col">
        {/* 1. Hero Section */}
        <HeroSection onStartDesigning={handleStartDesigning} />

        {/* 2. Failure Diagnostic Card if constraints unmet */}
        {failureState && (
          <div id="failure-view-container" className="mx-auto w-full max-w-5xl px-6 py-6">
            <DesignFailureView
              reason={failureState.reason}
              rejections={failureState.rejections}
              suggestions={failureState.suggestions}
              onApplySuggestion={handleApplyFailureSuggestion}
              onRetry={() => {
                const briefElem = document.getElementById("design-brief");
                if (briefElem) briefElem.scrollIntoView({ behavior: "smooth" });
              }}
            />
          </div>
        )}

        {/* 3. Design Brief Section */}
        <DesignBriefSection
          key={`${persisted?.selectedTemplateId ?? "compact-modern"}-${persisted?.budget ?? 500000}-${persisted?.roomDimensions.widthFt ?? 8}`}
          onSubmit={handleBriefSubmit}
          isSubmitting={isSubmitting}
          initialTemplateId={persisted?.selectedTemplateId ?? "compact-modern"}
          initialBudget={persisted?.budget ?? 500000}
          initialDimensionsFt={persisted?.roomDimensions ?? { widthFt: 8, depthFt: 6, heightFt: 9 }}
          initialStyle={persisted?.desiredStyle ?? "Luxury Modern"}
          initialZones={persisted?.requiredZones ?? ["toilet", "vanity", "shower"]}
          initialPrompt={persisted?.lastNaturalLanguagePrompt}
        />

        {/* 4. Designing Transition Overlay */}
        {isDesigning && <DesigningTransition onComplete={handleTransitionComplete} />}

        {/* 5. 3D Reveal Section */}
        {activeDesignState && (
          <RevealSection
            designState={activeDesignState}
            templateId={persisted?.selectedTemplateId ?? "compact-modern"}
            variants={variants}
            selectedVariantIndex={selectedVariantIndex}
            onSelectVariantIndex={(idx) => {
              setSelectedVariantIndex(idx);
              setFocusedProductCode(null);
            }}
            focusedProductCode={focusedProductCode}
            onClearFocus={() => setFocusedProductCode(null)}
            onModifyClick={handleModifyClick}
            onEditBriefClick={handleEditBriefClick}
            onApplyManualEdit={handleApplyManualEdit}
          />
        )}

        {/* 6. Selected Product Breakdown */}
        {activeDesignState && (
          <ProductBreakdownSection
            designState={activeDesignState}
            focusedProductCode={focusedProductCode}
            onFocusProduct={(code) => setFocusedProductCode(code)}
          />
        )}

        {/* 7. Design Summary & Ergonomics */}
        {activeDesignState && <DesignSummarySection designState={activeDesignState} />}

        {/* 8. Modify with AI Section */}
        {activeDesignState && (
          <ModifyWithAiSection
            onApplyCommand={handleApplyAiCommand}
            isProcessing={isSubmitting}
            canRestore={canRestore}
            onRestorePrevious={handleRestorePrevious}
            initialDelta={activeDelta}
          />
        )}
      </main>

      {/* Editorial Footer */}
      <footer className="border-t border-white/10 bg-neutral-950 px-6 py-12 text-center text-xs text-neutral-500">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <p className="font-serif tracking-widest text-neutral-400">KOHLER BESPOKE SPATIAL DESIGN</p>
          <p>© 2024 KOHLER Co. • Real Catalogue Data • Verified CAD Coordinates</p>
          <p className="text-neutral-500">Hackathon Architectural Edition</p>
        </div>
      </footer>
    </div>
  );
}

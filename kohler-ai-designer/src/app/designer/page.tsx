"use client";

import React, { useState, useEffect } from "react";
import BathroomCanvas from "@/components/BathroomCanvas/BathroomCanvas";
import { FullscreenBathroomEditor } from "@/components/editor/FullscreenBathroomEditor";
import type { DesignState } from "@/lib/design";
import { createDesignPresentation, type CameraPreset } from "@/lib/design/presentation";

export default function DesignerPage() {
  const [designState, setDesignState] = useState<DesignState | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<CameraPreset | undefined>(undefined);

  useEffect(() => {
    fetch("/api/design-state")
      .then((res) => res.json())
      .then((data) => {
        const state = data && typeof data === "object" && "state" in data ? data.state : data;
        setDesignState(state);
      })
      .catch((err) => console.error("Could not fetch design-state:", err));
  }, []);

  const presets = designState ? createDesignPresentation(designState).cameraPresets : [];

  return (
    <main className="relative h-screen w-full bg-neutral-950 overflow-hidden">
      {/* Top Floating Control Bar */}
      <div className="absolute top-4 right-4 z-20 flex flex-wrap items-center gap-2">
        {/* Camera Presets */}
        {presets.length > 0 && (
          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-neutral-900/80 p-1 backdrop-blur-md shadow-xl">
            {presets.map((p) => {
              const isActive = activePreset?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActivePreset(p)}
                  className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    isActive
                      ? "bg-white text-black font-semibold shadow-sm"
                      : "text-neutral-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Edit Layout Studio Trigger */}
        <button
          type="button"
          onClick={() => setIsEditorOpen(true)}
          className="flex cursor-pointer items-center gap-1.5 rounded-full border border-[#c49a45]/60 bg-[#c49a45]/20 px-4 py-1.5 text-xs font-semibold text-[#f0d8a8] backdrop-blur-md transition-all hover:bg-[#c49a45]/30 shadow-xl"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span>Edit Layout</span>
        </button>
      </div>

      <BathroomCanvas
        designState={designState}
        activeCameraPreset={activePreset}
      />

      {designState && (
        <FullscreenBathroomEditor
          isOpen={isEditorOpen}
          initialDesignState={designState}
          onClose={() => setIsEditorOpen(false)}
          onSave={(updatedState) => setDesignState(updatedState)}
        />
      )}
    </main>
  );
}

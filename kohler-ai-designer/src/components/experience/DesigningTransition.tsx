"use client";

import React, { useEffect, useState } from "react";

interface DesigningTransitionProps {
  onComplete: () => void;
}

const STAGES = [
  { label: "Understanding your space & room bounds", durationMs: 650 },
  { label: "Checking available products in factual KOHLER catalogue", durationMs: 650 },
  { label: "Solving spatial layout & constraint rules", durationMs: 650 },
  { label: "Preparing your architectural 3D bathroom", durationMs: 650 },
];

export default function DesigningTransition({ onComplete }: DesigningTransitionProps) {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentStageIndex < STAGES.length - 1) {
        setCurrentStageIndex((prev) => prev + 1);
      } else {
        onComplete();
      }
    }, STAGES[currentStageIndex].durationMs);

    return () => clearTimeout(timer);
  }, [currentStageIndex, onComplete]);

  const progressPercent = Math.min(100, Math.round(((currentStageIndex + 1) / STAGES.length) * 100));

  return (
    <section className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-neutral-950 px-6 text-white backdrop-blur-xl">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Subtle Brand Watermark */}
        <div className="space-y-1">
          <p className="font-serif text-sm uppercase tracking-[0.3em] text-white/50">KOHLER</p>
          <p className="text-[10px] uppercase tracking-[0.24em] text-neutral-500">Spatial Engine v2.4</p>
        </div>

        {/* Dynamic Architectural Indicator */}
        <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-amber-400/10 duration-1000" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-amber-400/40 bg-neutral-900 shadow-xl shadow-amber-400/10">
            <span className="font-serif text-lg font-light text-amber-300">
              {progressPercent}%
            </span>
          </div>
        </div>

        {/* Current Stage Label */}
        <div className="min-h-[48px] space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
            Stage {currentStageIndex + 1} of {STAGES.length}
          </p>
          <p className="font-serif text-lg font-normal text-white transition-opacity duration-300">
            {STAGES[currentStageIndex].label}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-amber-200 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </section>
  );
}

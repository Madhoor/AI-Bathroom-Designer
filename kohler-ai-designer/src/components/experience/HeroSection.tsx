"use client";

import React from "react";

interface HeroSectionProps {
  onStartDesigning: () => void;
}

export default function HeroSection({ onStartDesigning }: HeroSectionProps) {
  return (
    <section className="relative flex min-h-[92vh] w-full flex-col justify-between overflow-hidden bg-neutral-950 px-6 py-16 text-white md:px-16 lg:px-24">
      {/* Subtle Architectural Ambient Lighting */}
      <div className="pointer-events-none absolute -top-40 right-1/4 h-[600px] w-[600px] rounded-full bg-stone-800/20 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 left-1/4 h-[500px] w-[500px] rounded-full bg-amber-950/15 blur-[160px]" />

      {/* Editorial Header Eyebrow */}
      <div className="z-10 pt-8">
        <div className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-neutral-300">
            KOHLER Bespoke Spatial Engineering
          </span>
        </div>
      </div>

      {/* Main Headline & Philosophy */}
      <div className="z-10 my-auto max-w-5xl space-y-8 py-12">
        <h1 className="font-serif text-5xl font-light leading-[1.08] tracking-tight text-neutral-100 sm:text-6xl md:text-7xl lg:text-8xl">
          Design your <span className="italic text-neutral-400">bathroom</span>.
          <br />
          <span className="font-sans font-normal text-white">
            Tell us what you have.
            <br />
            We’ll figure out what fits.
          </span>
        </h1>

        <p className="max-w-2xl text-base font-light leading-relaxed text-neutral-400 sm:text-lg md:text-xl">
          Deterministic spatial planning driven by real KOHLER fixtures, exact dimensions,
          and factory installation constraints. No generic templates—pure architectural precision.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap items-center gap-5 pt-4">
          <button
            type="button"
            onClick={onStartDesigning}
            className="group flex cursor-pointer items-center gap-3 rounded-full bg-white px-8 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-950 shadow-2xl transition-all duration-300 hover:bg-neutral-200 hover:shadow-white/10 active:scale-98"
          >
            <span>Start designing</span>
            <svg
              className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>

          <a
            href="#design-brief"
            className="flex cursor-pointer items-center gap-2 rounded-full border border-white/20 px-6 py-4 text-xs font-medium uppercase tracking-[0.18em] text-neutral-300 transition-colors hover:border-white/50 hover:text-white"
          >
            Explore Design Brief
          </a>
        </div>
      </div>

      {/* Architectural Pillars / Editorial Footnote */}
      <div className="z-10 grid grid-cols-2 gap-8 border-t border-white/10 pt-8 sm:grid-cols-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">Catalogue Integrity</p>
          <p className="mt-1 font-serif text-sm text-neutral-200">229 Real KOHLER GLBs</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">Spatial Solver</p>
          <p className="mt-1 font-serif text-sm text-neutral-200">Millimeter-Exact Fit</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">Constraint Engine</p>
          <p className="mt-1 font-serif text-sm text-neutral-200">Zero Guesswork Placement</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">Aesthetic Reference</p>
          <p className="mt-1 font-serif text-sm text-neutral-200">Lookbook 2024 Standards</p>
        </div>
      </div>
    </section>
  );
}

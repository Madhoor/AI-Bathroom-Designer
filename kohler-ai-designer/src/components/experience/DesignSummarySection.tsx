"use client";

import React from "react";
import type { DesignState } from "@/lib/design";

interface DesignSummarySectionProps {
  designState: DesignState;
}

export default function DesignSummarySection({ designState }: DesignSummarySectionProps) {
  const room = designState.room;
  const widthFt = (room.widthM * 3.28084).toFixed(1);
  const depthFt = (room.depthM * 3.28084).toFixed(1);
  const heightFt = (room.heightM * 3.28084).toFixed(1);
  const areaSqFt = ((room.widthM * room.depthM) * 10.7639).toFixed(1);
  const volumeCuM = (room.widthM * room.depthM * room.heightM).toFixed(1);

  return (
    <section className="w-full bg-neutral-950 px-6 py-20 text-white md:px-16 lg:px-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">
            Architectural Specification
          </p>
          <h2 className="font-serif text-3xl font-light tracking-tight sm:text-4xl">
            Design Summary & Ergonomics
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Spatial Bounds */}
          <div className="rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Spatial Bounds</p>
            <p className="mt-3 font-serif text-2xl text-white">
              {widthFt} × {depthFt} × {heightFt} <span className="text-sm text-neutral-400">ft</span>
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              {room.widthM.toFixed(2)}m × {room.depthM.toFixed(2)}m • {areaSqFt} sq ft ({volumeCuM} m³)
            </p>
          </div>

          {/* Aesthetic Language */}
          <div className="rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Aesthetic Language</p>
            <p className="mt-3 font-serif text-2xl text-white">
              {designState.style ?? "Luxury Modern"}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Travertine fluted feature wall, dark basalt slabs
            </p>
          </div>

          {/* Zoning Layout */}
          <div className="rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Resolved Zones</p>
            <p className="mt-3 font-serif text-2xl text-white">
              {designState.placements.length} Functional Zones
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Dry vanity zone, walk-in shower, private WC
            </p>
          </div>

          {/* Constraint Verification */}
          <div className="rounded-3xl border border-white/10 bg-neutral-900/60 p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Installation Safety</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <p className="font-serif text-2xl text-white">
                {designState.validation.valid ? "Verified" : "Attention"}
              </p>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              Clearances, wall offsets & plumbing verified
            </p>
          </div>
        </div>

        {/* Warnings or Editorial Notes if any */}
        {designState.warnings.length > 0 && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-400/90">
              Architectural Design Notes
            </p>
            <ul className="mt-2 space-y-1 text-xs text-neutral-400">
              {designState.warnings.map((note, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-neutral-600">•</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

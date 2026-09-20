"use client";

import React from "react";

import Link from "next/link";

interface ExperienceNavProps {
  onStartDesigning: () => void;
  hasDesign: boolean;
  canRestore?: boolean;
  onRestorePrevious?: () => void;
}

export default function ExperienceNav({
  onStartDesigning,
  hasDesign,
  canRestore = false,
  onRestorePrevious,
}: ExperienceNavProps) {
  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-neutral-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="font-serif text-lg font-bold tracking-[0.25em] text-white hover:text-amber-300 transition-colors">
            KOHLER
          </Link>
          <span className="h-4 w-px bg-white/20" />
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-[#c49a45]">
            Spatial AI Designer
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="hidden items-center gap-8 text-xs uppercase tracking-[0.16em] text-neutral-400 md:flex">
          <Link
            href="/catalogue"
            className="cursor-pointer font-medium text-[#c49a45] transition-colors hover:text-white flex items-center gap-1.5"
          >
            <span>3D Catalogue</span>
            <span className="rounded-full bg-[#c49a45]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#c49a45] border border-[#c49a45]/40">
              229 3D
            </span>
          </Link>
          <button
            type="button"
            onClick={() => scrollTo("design-brief")}
            className="cursor-pointer transition-colors hover:text-white"
          >
            Design Brief
          </button>
          {hasDesign && (
            <>
              <button
                type="button"
                onClick={() => scrollTo("reveal")}
                className="cursor-pointer transition-colors hover:text-white"
              >
                3D Reveal
              </button>
              <button
                type="button"
                onClick={() => scrollTo("product-breakdown")}
                className="cursor-pointer transition-colors hover:text-white"
              >
                Selected Products
              </button>
              <button
                type="button"
                onClick={() => scrollTo("modify-with-ai")}
                className="cursor-pointer transition-colors hover:text-white"
              >
                Modify with AI
              </button>
            </>
          )}
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {canRestore && onRestorePrevious && (
            <button
              type="button"
              onClick={onRestorePrevious}
              className="cursor-pointer rounded-full border border-[#c49a45]/40 bg-stone-900/80 px-4 py-2 text-xs font-medium text-[#f0d8a8] transition-all hover:bg-stone-800 hover:border-[#c49a45]"
            >
              ↩ Restore Previous
            </button>
          )}
          <button
            type="button"
            onClick={onStartDesigning}
            className="cursor-pointer rounded-full bg-[#c49a45] hover:bg-[#b0873a] px-5 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-black transition-all active:scale-95"
          >
            Start Designing
          </button>
        </div>
      </div>
    </header>
  );
}

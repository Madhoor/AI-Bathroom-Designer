"use client";

import React, { useState, useEffect, useMemo } from "react";
import type { RecommendationProduct } from "@/lib/recommendation/types";
import type { CatalogueProduct } from "@/lib/catalogue/types";
import type { DesignState } from "@/lib/design/types";
import { getEligibleReplacementCandidates } from "@/lib/editor/replacementEngine";

interface ProductReplacementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProduct: RecommendationProduct | null;
  room: DesignState["room"];
  onSelectReplacement: (product: CatalogueProduct) => void;
}

export function ProductReplacementModal({
  isOpen,
  onClose,
  currentProduct,
  room,
  onSelectReplacement,
}: ProductReplacementModalProps) {
  const [allProducts, setAllProducts] = useState<CatalogueProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Load raw catalogue when modal is opened if not yet loaded
  useEffect(() => {
    if (!isOpen) return;
    if (allProducts.length > 0) return;

    let mounted = true;
    setLoading(true);

    fetch("/api/catalogue?raw=true")
      .then((res) => res.json())
      .then((data) => {
        if (mounted && data.products) {
          setAllProducts(data.products);
        }
      })
      .catch((err) => console.error("Failed to load products for replacement:", err))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, allProducts.length]);

  // Compute eligible candidates
  const eligibleCandidates = useMemo(() => {
    if (!currentProduct || allProducts.length === 0) return [];
    return getEligibleReplacementCandidates(currentProduct, allProducts, room);
  }, [currentProduct, allProducts, room]);

  // Filter candidates by search term
  const filteredCandidates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return eligibleCandidates;
    return eligibleCandidates.filter(
      (c) =>
        c.productName.toLowerCase().includes(q) ||
        c.productCode.toLowerCase().includes(q) ||
        (c.finish && c.finish.toLowerCase().includes(q)),
    );
  }, [eligibleCandidates, searchQuery]);

  if (!isOpen || !currentProduct) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div>
            <span className="text-[10px] tracking-[0.2em] font-mono text-amber-500 uppercase">
              Catalogue Replacement
            </span>
            <h2 className="text-lg font-serif text-white mt-0.5">
              Replace {currentProduct.productName}
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Selecting eligible Kohler fixtures matching category &amp; space boundaries.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
            title="Close modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Current Product Info & Search */}
        <div className="px-6 py-3 bg-neutral-900/80 border-b border-neutral-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-neutral-500 font-mono">Current:</span>
            <span className="text-neutral-300 font-medium">{currentProduct.productCode}</span>
            <span className="text-amber-400 font-mono">
              ₹{(currentProduct.currentPrice ?? 0).toLocaleString("en-IN")}
            </span>
            {currentProduct.widthMm && currentProduct.depthMm && (
              <span className="text-neutral-500">
                ({currentProduct.widthMm} × {currentProduct.depthMm} mm)
              </span>
            )}
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search replacements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/60"
            />
          </div>
        </div>

        {/* Candidate List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs font-mono uppercase tracking-widest">Loading Kohler Catalogue...</p>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="text-center py-16 text-neutral-400">
              <p className="text-sm">No alternative Kohler fixtures found matching this category.</p>
              <p className="text-xs text-neutral-500 mt-1">
                Try clearing your search query or keep the current fixture.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredCandidates.map((candidate) => {
                const priceDiff = (candidate.currentPrice ?? 0) - (currentProduct.currentPrice ?? 0);
                return (
                  <div
                    key={candidate.productCode}
                    className="group border border-neutral-800 hover:border-amber-500/50 rounded-xl p-4 bg-neutral-950/40 hover:bg-neutral-950/80 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-mono text-neutral-500 uppercase">
                          {candidate.productCode}
                        </span>
                        {candidate.has3d && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-800/40 font-mono">
                            3D Model
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-medium text-white mt-1 group-hover:text-amber-200 transition-colors line-clamp-1">
                        {candidate.productName}
                      </h4>
                      <div className="flex items-center gap-2 mt-2 text-xs text-neutral-400">
                        {candidate.finish && (
                          <span className="bg-neutral-800/60 px-2 py-0.5 rounded text-[11px]">
                            {candidate.finish}
                          </span>
                        )}
                        {candidate.widthMm && candidate.depthMm && (
                          <span className="text-[11px] font-mono text-neutral-500">
                            {candidate.widthMm} × {candidate.depthMm} mm
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-neutral-900 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-serif text-amber-400">
                          ₹{(candidate.currentPrice ?? 0).toLocaleString("en-IN")}
                        </div>
                        <div className="text-[10px] font-mono text-neutral-500">
                          {priceDiff === 0
                            ? "Same price"
                            : priceDiff > 0
                            ? `+₹${priceDiff.toLocaleString("en-IN")}`
                            : `-₹${Math.abs(priceDiff).toLocaleString("en-IN")}`}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          onSelectReplacement(candidate);
                          onClose();
                        }}
                        className="px-3 py-1.5 bg-neutral-800 hover:bg-amber-600 text-neutral-200 hover:text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                      >
                        Select
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-between text-xs text-neutral-500">
          <span>{filteredCandidates.length} eligible products found</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-neutral-700 hover:border-neutral-500 text-neutral-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

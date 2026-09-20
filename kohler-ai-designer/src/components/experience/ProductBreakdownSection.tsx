"use client";

import React from "react";
import type { DesignState } from "@/lib/design";

interface ProductBreakdownSectionProps {
  designState: DesignState;
  focusedProductCode?: string | null;
  onFocusProduct?: (productCode: string) => void;
}

export default function ProductBreakdownSection({
  designState,
  focusedProductCode,
  onFocusProduct,
}: ProductBreakdownSectionProps) {
  const budget = designState.budget ?? 500000;
  const totalCost = designState.totalProductCost;
  const remainingBudget = Math.max(0, budget - totalCost);
  const utilizationPercent = budget > 0 ? (totalCost / budget) * 100 : 0;

  const formatPrice = (amount?: number) => {
    if (amount === undefined || !Number.isFinite(amount)) return "Price on request";
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const handleCardClick = (productCode: string) => {
    if (onFocusProduct) {
      onFocusProduct(productCode);
      const revealEl = document.getElementById("reveal");
      if (revealEl) {
        revealEl.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <section id="product-breakdown" className="w-full bg-neutral-900 px-6 py-20 text-white md:px-16 lg:px-24">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-14 flex flex-wrap items-end justify-between gap-6 border-b border-white/10 pb-8">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-400">
              Factual Specification
            </p>
            <h2 className="font-serif text-3xl font-light tracking-tight sm:text-4xl md:text-5xl">
              Selected KOHLER Fixtures
            </h2>
            <p className="max-w-2xl text-xs text-neutral-400 sm:text-sm">
              Authentic Indian catalogue products with verified dimensions, official list pricing, and real 3D geometry.
              Click any product to inspect its placement in 3D.
            </p>
          </div>

          {/* Budget Quick Summary Badge */}
          <div className="rounded-2xl border border-white/10 bg-neutral-950 p-5 text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Total Investment</p>
            <p className="font-serif text-3xl font-light text-white">{formatPrice(totalCost)}</p>
            <p className="mt-1 text-xs text-emerald-400">
              {formatPrice(remainingBudget)} remaining of {formatPrice(budget)} budget
            </p>
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {designState.selectedProducts.map((product) => {
            const placement = designState.placements.find((p) => p.productCode === product.productCode);
            const roles = product.metadata?.role ?? [];
            const roleLabel = roles.length > 0 ? roles.join(" • ") : product.category ?? "Sanitaryware";
            const isFocused = focusedProductCode === product.productCode;

            return (
              <div
                key={product.productCode}
                onClick={() => handleCardClick(product.productCode)}
                className={`flex flex-col justify-between rounded-3xl border p-6 backdrop-blur-sm transition-all duration-300 cursor-pointer ${
                  isFocused
                    ? "border-[#c49a45] bg-[#221f1c] shadow-[0_0_24px_rgba(196,154,69,0.22)] ring-1 ring-[#c49a45]/40"
                    : "border-white/10 bg-neutral-950/60 hover:border-white/30 hover:bg-neutral-950"
                }`}
              >
                <div>
                  {/* Category & Status */}
                  <div className="flex items-center justify-between pb-4">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#c49a45]">
                      {roleLabel}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isFocused && (
                        <span className="rounded-full bg-[#c49a45]/20 text-[#f0d8a8] border border-[#c49a45]/50 px-2 py-0.5 text-[9px] uppercase tracking-wider font-semibold">
                          Focused in 3D
                        </span>
                      )}
                      <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-mono text-neutral-400">
                        {product.productCode}
                      </span>
                    </div>
                  </div>

                  {/* Product Title */}
                  <h3 className="font-serif text-xl font-normal leading-snug text-neutral-100">
                    {product.productName ?? product.productCode}
                  </h3>

                  {/* Dimensions & Surface if available */}
                  <div className="mt-4 space-y-1.5 border-t border-white/10 pt-4 text-xs text-neutral-400">
                    {placement && (
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">Mount Surface:</span>
                        <span className="capitalize text-neutral-300">{placement.placementSurface}</span>
                      </div>
                    )}
                    {(product.widthMm || product.depthMm || product.heightMm) && (
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">Physical Size:</span>
                        <span className="text-neutral-300 font-mono text-[11px]">
                          {product.widthMm ? `${Math.round(product.widthMm)}` : ""}
                          {product.depthMm ? ` × ${Math.round(product.depthMm)}` : ""}
                          {product.heightMm ? ` × ${Math.round(product.heightMm)} mm` : ""}
                        </span>
                      </div>
                    )}
                    {product.finish && (
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">Finish:</span>
                        <span className="text-neutral-300">{product.finish}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Price & View in 3D button */}
                <div className="mt-6 flex items-baseline justify-between border-t border-white/10 pt-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-neutral-500 block">List Price</span>
                    <span className="font-serif text-2xl font-light text-white">
                      {formatPrice(product.currentPrice ?? product.listPrice)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      isFocused
                        ? "bg-[#c49a45] text-black font-semibold"
                        : "bg-white/10 text-neutral-300 hover:bg-white hover:text-black"
                    }`}
                  >
                    {isFocused ? "Focused in 3D" : "Inspect in 3D →"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Budget Financial Breakdown Bar */}
        <div className="mt-12 rounded-3xl border border-white/10 bg-neutral-950/80 p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-200">
                Budget Allocation
              </h3>
              <p className="text-xs text-neutral-400">
                {utilizationPercent.toFixed(1)}% of your ₹{budget.toLocaleString("en-IN")} budget utilized
              </p>
            </div>
            <div className="text-right">
              <span className="font-serif text-xl text-emerald-400">
                ₹{remainingBudget.toLocaleString("en-IN")}
              </span>
              <span className="ml-1.5 text-xs text-neutral-500">Surplus Remaining</span>
            </div>
          </div>

          {/* Allocation Bar */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-700"
              style={{ width: `${Math.min(100, utilizationPercent)}%` }}
            />
          </div>

          <div className="mt-4 flex flex-wrap justify-between gap-4 text-xs text-neutral-500 font-mono">
            <span>Fixtures Subtotal: ₹{totalCost.toLocaleString("en-IN")}</span>
            <span>Target Budget: ₹{budget.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

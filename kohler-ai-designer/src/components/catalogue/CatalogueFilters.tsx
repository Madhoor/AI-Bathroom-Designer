"use client";

import React from "react";
import type { CatalogueFilterOptions, CatalogueMetadata, CatalogueSortOption } from "@/lib/catalogue";

export interface CatalogueFiltersProps {
  filters: CatalogueFilterOptions;
  metadata?: CatalogueMetadata | null;
  totalMatching: number;
  onFilterChange: (newFilters: Partial<CatalogueFilterOptions>) => void;
  onResetFilters: () => void;
}

const PRICE_TIERS: Array<{ label: string; range?: [number, number] }> = [
  { label: "All Prices", range: undefined },
  { label: "Under ₹25,000", range: [0, 25000] },
  { label: "₹25,000 – ₹1,00,000", range: [25000, 100000] },
  { label: "₹1,00,000 – ₹5,00,000", range: [100000, 500000] },
  { label: "Above ₹5,00,000", range: [500000, 10000000] },
];

export default function CatalogueFilters({
  filters,
  metadata,
  totalMatching,
  onFilterChange,
  onResetFilters,
}: CatalogueFiltersProps) {
  const currentPriceTier = PRICE_TIERS.find((tier) => {
    if (!tier.range && !filters.priceRange) return true;
    if (tier.range && filters.priceRange) {
      return tier.range[0] === filters.priceRange[0] && tier.range[1] === filters.priceRange[1];
    }
    return false;
  }) ?? PRICE_TIERS[0];

  const categories = metadata?.categories ?? ["Basin Area", "Showering Area", "Toilet Area", "Wellness"];

  const subcategories =
    filters.selectedCategory && filters.selectedCategory !== "all"
      ? metadata?.subcategoriesByCategory?.[filters.selectedCategory] ?? []
      : [];

  const finishes = metadata?.finishes ?? [];

  const hasActiveFilters =
    Boolean(filters.searchQuery) ||
    filters.selectedCategory !== "all" ||
    (filters.selectedSubcategory && filters.selectedSubcategory !== "all") ||
    (filters.selectedFinish && filters.selectedFinish !== "all") ||
    Boolean(filters.priceRange) ||
    filters.only3D;

  return (
    <div className="w-full space-y-5 rounded-3xl border border-stone-800/80 bg-[#161412] p-6 shadow-xl">
      {/* 1. Search & Primary Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-500">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
            placeholder="Search by product name, code (e.g. 29777IN), collection, or finish..."
            className="w-full rounded-2xl border border-stone-800 bg-neutral-900/90 py-3 pl-11 pr-10 text-sm text-white placeholder-stone-500 transition-colors focus:border-[#c49a45] focus:outline-none"
          />
          {filters.searchQuery && (
            <button
              type="button"
              onClick={() => onFilterChange({ searchQuery: "" })}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* 3D Only Toggle & Sort Dropdown */}
        <div className="flex flex-wrap items-center gap-3">
          {/* 3D Only Toggle */}
          <button
            type="button"
            onClick={() => onFilterChange({ only3D: !filters.only3D })}
            className={`flex cursor-pointer items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-medium transition-all ${
              filters.only3D
                ? "border-[#c49a45] bg-[#c49a45]/15 text-[#f0d8a8] ring-1 ring-[#c49a45]/40"
                : "border-stone-800 bg-neutral-900 text-stone-400 hover:border-stone-700 hover:text-white"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                filters.only3D ? "bg-[#c49a45] animate-pulse" : "bg-stone-600"
              }`}
            />
            <span>3D Ready Only ({metadata?.total3dProducts ?? 229})</span>
          </button>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={filters.sortBy}
              onChange={(e) => onFilterChange({ sortBy: e.target.value as CatalogueSortOption })}
              className="cursor-pointer appearance-none rounded-2xl border border-stone-800 bg-neutral-900 py-3 pl-4 pr-10 text-xs font-medium text-stone-200 transition-colors focus:border-[#c49a45] focus:outline-none"
            >
              <option value="relevance">Sort: Featured & Relevance</option>
              <option value="name_asc">Name: A to Z</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-500">
              ▾
            </span>
          </div>
        </div>
      </div>

      {/* 2. Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 border-t border-stone-800/60 pt-4">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-stone-500">
          Category:
        </span>
        <button
          type="button"
          onClick={() => onFilterChange({ selectedCategory: "all", selectedSubcategory: "all" })}
          className={`cursor-pointer rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
            filters.selectedCategory === "all"
              ? "bg-[#c49a45] text-black font-semibold"
              : "border border-stone-800 bg-stone-900/60 text-stone-400 hover:border-stone-700 hover:text-white"
          }`}
        >
          All Categories ({metadata?.totalProducts ?? 292})
        </button>
        {categories.map((cat) => {
          const isSelected = filters.selectedCategory.toLowerCase() === cat.toLowerCase();
          return (
            <button
              key={cat}
              type="button"
              onClick={() =>
                onFilterChange({
                  selectedCategory: isSelected ? "all" : cat,
                  selectedSubcategory: "all",
                })
              }
              className={`cursor-pointer rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all ${
                isSelected
                  ? "bg-[#c49a45] text-black font-semibold"
                  : "border border-stone-800 bg-stone-900/60 text-stone-400 hover:border-stone-700 hover:text-white"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* 3. Subcategory Pills (if category selected and has subcategories) */}
      {subcategories.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pl-2">
          <span className="text-[11px] text-stone-500 uppercase tracking-wider mr-1">Type:</span>
          <button
            type="button"
            onClick={() => onFilterChange({ selectedSubcategory: "all" })}
            className={`cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
              !filters.selectedSubcategory || filters.selectedSubcategory === "all"
                ? "bg-white text-black font-semibold"
                : "text-stone-400 hover:text-white"
            }`}
          >
            All Types
          </button>
          {subcategories.map((sub) => {
            const isSelected = filters.selectedSubcategory === sub;
            return (
              <button
                key={sub}
                type="button"
                onClick={() => onFilterChange({ selectedSubcategory: isSelected ? "all" : sub })}
                className={`cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                  isSelected
                    ? "bg-white text-black font-semibold"
                    : "text-stone-400 hover:text-white"
                }`}
              >
                {sub}
              </button>
            );
          })}
        </div>
      )}

      {/* 4. Secondary Filters: Finish & Price Tiers */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-stone-800/60 pt-4 text-xs">
        {/* Price Tiers */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-stone-500 font-medium">Price:</span>
          {PRICE_TIERS.map((tier) => {
            const isSelected = tier.label === currentPriceTier.label;
            return (
              <button
                key={tier.label}
                type="button"
                onClick={() => onFilterChange({ priceRange: tier.range })}
                className={`cursor-pointer rounded-xl px-3 py-1 text-xs transition-colors ${
                  isSelected
                    ? "border border-[#c49a45]/60 bg-[#c49a45]/10 text-[#f0d8a8] font-medium"
                    : "border border-stone-800/80 text-stone-400 hover:text-white"
                }`}
              >
                {tier.label}
              </button>
            );
          })}
        </div>

        {/* Finish Selector */}
        {finishes.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-stone-500 font-medium">Finish:</span>
            <select
              value={filters.selectedFinish ?? "all"}
              onChange={(e) => onFilterChange({ selectedFinish: e.target.value })}
              className="cursor-pointer appearance-none rounded-xl border border-stone-800 bg-neutral-900 py-1.5 pl-3 pr-8 text-xs text-stone-300 focus:border-[#c49a45] focus:outline-none"
            >
              <option value="all">All Finishes</option>
              {finishes.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 5. Results Counter & Reset Action */}
      <div className="flex items-center justify-between border-t border-stone-800/60 pt-4 text-xs text-stone-400">
        <div>
          Showing <span className="font-semibold text-white">{totalMatching}</span> authentic KOHLER products
          {filters.only3D && <span className="text-[#c49a45]"> (3D models only)</span>}
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="cursor-pointer text-[#c49a45] hover:underline"
          >
            Reset all filters
          </button>
        )}
      </div>
    </div>
  );
}

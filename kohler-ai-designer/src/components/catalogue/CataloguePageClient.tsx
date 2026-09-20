"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CatalogueFilterOptions, CatalogueMetadata, CatalogueProduct } from "@/lib/catalogue";
import { filterAndSortCatalogue } from "@/lib/catalogue";
import CatalogueCard from "./CatalogueCard";
import CatalogueFilters from "./CatalogueFilters";
import ProductDetailModal from "./ProductDetailModal";

export interface CataloguePageClientProps {
  initialProducts?: CatalogueProduct[];
  metadata?: CatalogueMetadata;
}

const DEFAULT_FILTERS: CatalogueFilterOptions = {
  searchQuery: "",
  selectedCategory: "all",
  selectedSubcategory: "all",
  selectedFinish: "all",
  priceRange: undefined,
  only3D: false,
  sortBy: "relevance",
};

export default function CataloguePageClient({
  initialProducts,
  metadata: initialMetadata,
}: CataloguePageClientProps) {
  const router = useRouter();
  const [products, setProducts] = useState<CatalogueProduct[]>(initialProducts ?? []);
  const [metadata, setMetadata] = useState<CatalogueMetadata | null>(initialMetadata ?? null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialProducts || initialProducts.length === 0);
  const [filters, setFilters] = useState<CatalogueFilterOptions>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<CatalogueProduct | null>(null);

  React.useEffect(() => {
    if (products.length === 0) {
      setIsLoading(true);
      fetch("/api/catalogue?raw=true")
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load catalogue API");
          return res.json();
        })
        .then((data) => {
          if (data.products) {
            setProducts(data.products);
          }
          if (data.metadata) {
            setMetadata(data.metadata);
          }
        })
        .catch((err) => {
          console.error("Failed to load catalogue items:", err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [products.length]);

  const queryResult = useMemo(() => {
    return filterAndSortCatalogue(products, filters, page, 16);
  }, [products, filters, page]);

  const handleFilterChange = (newFilters: Partial<CatalogueFilterOptions>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1); // Reset to first page on filter change
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    const gridElem = document.getElementById("catalogue-grid-top");
    if (gridElem) {
      gridElem.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleUseInDesign = (product: CatalogueProduct) => {
    // Record preferred product into local storage for the designer flow
    if (typeof window !== "undefined") {
      try {
        const payload = {
          productCode: product.productCode,
          productName: product.productName,
          category: product.category,
          price: product.currentPrice,
          finish: product.finish,
        };
        localStorage.setItem("kohler_preferred_product", JSON.stringify(payload));
      } catch (err) {
        console.warn("Could not set preferred product in local storage:", err);
      }
    }
    // Navigate to designer home with selected fixture param
    router.push(`/?preferredProduct=${encodeURIComponent(product.productCode)}`);
  };

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-white selection:bg-amber-400 selection:text-neutral-950">
      {/* Top Editorial Header */}
      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-neutral-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-serif text-lg font-bold tracking-[0.25em] text-white hover:text-amber-100">
              KOHLER
            </Link>
            <span className="h-4 w-px bg-white/20" />
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-[#c49a45]">
              Product Catalogue
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-stone-400 transition-colors hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to AI Designer</span>
            </Link>
            <Link
              href="/#design-brief"
              className="rounded-full bg-[#c49a45] px-4 py-2 font-semibold uppercase tracking-wider text-black transition-colors hover:bg-[#b0873a]"
            >
              Start Designing
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-6 py-12">
        {/* Editorial Headline */}
        <section className="mb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#c49a45]">
            Authentic Indian Catalogue & Spatial Assets
          </p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-white md:text-5xl lg:text-6xl">
            Explore the KOHLER products your designs are built from.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-stone-400 md:text-base">
            Every fixture in the AI designer corresponds to genuine factory data with certified
            dimensions, official Indian list prices, and validated 3D models.
          </p>

          {/* Factual Integrity Stats */}
          <div className="mt-8 flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2 rounded-full border border-stone-800 bg-stone-900/60 px-4 py-2 text-stone-300">
              <span className="font-mono font-semibold text-white">{metadata?.totalProducts ?? products.length ?? 292}</span>
              <span className="text-stone-400">Authentic Products</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-[#c49a45]/30 bg-[#c49a45]/10 px-4 py-2 text-[#f0d8a8]">
              <span className="h-2 w-2 rounded-full bg-[#c49a45]" />
              <span className="font-mono font-semibold text-white">{metadata?.total3dProducts ?? 229}</span>
              <span>Normalized 3D Models</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-stone-800 bg-stone-900/60 px-4 py-2 text-stone-300">
              <span className="font-mono font-semibold text-white">{metadata?.categories.length ?? 4}</span>
              <span className="text-stone-400">Architectural Categories</span>
            </div>
          </div>
        </section>

        {/* Filter Section */}
        <section id="catalogue-grid-top" className="mb-8">
          <CatalogueFilters
            filters={filters}
            metadata={metadata}
            totalMatching={queryResult.totalMatching}
            onFilterChange={handleFilterChange}
            onResetFilters={handleResetFilters}
          />
        </section>

        {/* Products Grid */}
        <section aria-label="Product Catalogue Grid">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col justify-between rounded-2xl border border-stone-800/80 bg-[#161412] p-5 animate-pulse"
                >
                  <div className="h-64 w-full rounded-xl bg-stone-900/80" />
                  <div className="mt-4 space-y-2">
                    <div className="h-3 w-1/3 rounded bg-stone-800" />
                    <div className="h-5 w-4/5 rounded bg-stone-800" />
                    <div className="h-4 w-1/4 rounded bg-stone-800" />
                  </div>
                  <div className="mt-6 flex gap-2">
                    <div className="h-9 flex-1 rounded-xl bg-stone-900" />
                    <div className="h-9 flex-1 rounded-xl bg-stone-900" />
                  </div>
                </div>
              ))}
            </div>
          ) : queryResult.products.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {queryResult.products.map((product) => (
                <CatalogueCard
                  key={product.productCode}
                  product={product}
                  onSelectProduct={setSelectedProduct}
                  onUseInDesign={handleUseInDesign}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-stone-800 bg-[#161412] p-16 text-center">
              <div className="rounded-full border border-stone-800 bg-stone-900 p-4 text-stone-500">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="mt-4 font-serif text-xl font-medium text-white">
                No matching KOHLER products found
              </h3>
              <p className="mt-2 max-w-md text-xs text-stone-400">
                No products match the selected filters. Try broadening your search or resetting category and price constraints.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-6 cursor-pointer rounded-full bg-[#c49a45] px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-black transition-colors hover:bg-[#b0873a]"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </section>

        {/* Pagination Navigation */}
        {queryResult.totalPages > 1 && (
          <nav aria-label="Catalogue pagination" className="mt-12 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
              className="cursor-pointer rounded-xl border border-stone-800 bg-stone-900/60 px-4 py-2 text-xs font-medium text-stone-300 transition-colors hover:border-stone-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            {/* Page number indicators */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: Math.min(queryResult.totalPages, 7) }, (_, idx) => {
                let pageNum = idx + 1;
                if (queryResult.totalPages > 7 && page > 4) {
                  pageNum = page - 3 + idx;
                  if (pageNum > queryResult.totalPages) pageNum = queryResult.totalPages - (6 - idx);
                }
                const isActive = pageNum === page;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => handlePageChange(pageNum)}
                    className={`cursor-pointer rounded-xl px-3.5 py-2 font-mono text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-[#c49a45] font-bold text-black"
                        : "border border-stone-800/80 bg-stone-900/40 text-stone-400 hover:border-stone-700 hover:text-white"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={page >= queryResult.totalPages}
              onClick={() => handlePageChange(page + 1)}
              className="cursor-pointer rounded-xl border border-stone-800 bg-stone-900/60 px-4 py-2 text-xs font-medium text-stone-300 transition-colors hover:border-stone-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </nav>
        )}
      </main>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onUseInDesign={handleUseInDesign}
      />
    </div>
  );
}

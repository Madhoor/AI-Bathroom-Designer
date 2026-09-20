"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { CatalogueProduct } from "@/lib/catalogue";

const Product3DViewer = dynamic(() => import("./Product3DViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-stone-950 text-xs text-stone-500">
      Loading 3D Canvas...
    </div>
  ),
});

export interface ProductDetailModalProps {
  product: CatalogueProduct | null;
  onClose: () => void;
  onUseInDesign: (product: CatalogueProduct) => void;
}

export default function ProductDetailModal({
  product,
  onClose,
  onUseInDesign,
}: ProductDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"3d" | "image">("3d");

  useEffect(() => {
    if (product) {
      setActiveTab(product.has3d ? "3d" : "image");
    }
  }, [product]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!product) return null;

  const priceFormatted = product.currentPrice
    ? `₹${product.currentPrice.toLocaleString("en-IN")}`
    : product.listPrice
    ? `₹${product.listPrice.toLocaleString("en-IN")}`
    : "Price on request";

  const featureItems = product.features
    ? product.features
        .split(";")
        .map((f) => f.trim())
        .filter((f) => f.length > 0)
    : [];

  const specItems = product.specifications
    ? product.specifications
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md sm:p-6 md:p-8">
      {/* Modal Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
        className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-stone-800 bg-[#141210] text-white shadow-2xl"
      >
        {/* Header with Close */}
        <div className="flex items-center justify-between border-b border-stone-800/80 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#c49a45]">
              {product.category}
            </span>
            {product.collection && (
              <>
                <span className="text-stone-600">•</span>
                <span className="text-xs text-stone-400 font-medium">
                  {product.collection}
                </span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full border border-stone-800 p-2 text-stone-400 transition-colors hover:border-white/30 hover:bg-stone-900 hover:text-white"
            aria-label="Close modal"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Left Column: Visual / 3D Canvas */}
            <div className="flex flex-col">
              {/* Media Switcher Tabs */}
              {product.has3d && product.imageUrls.length > 0 && (
                <div className="mb-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("3d")}
                    className={`cursor-pointer rounded-full px-3.5 py-1 text-xs font-medium transition-colors ${
                      activeTab === "3d"
                        ? "bg-[#c49a45] text-black font-semibold"
                        : "border border-stone-800 bg-stone-900/60 text-stone-400 hover:text-white"
                    }`}
                  >
                    Interactive 3D Model
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("image")}
                    className={`cursor-pointer rounded-full px-3.5 py-1 text-xs font-medium transition-colors ${
                      activeTab === "image"
                        ? "bg-[#c49a45] text-black font-semibold"
                        : "border border-stone-800 bg-stone-900/60 text-stone-400 hover:text-white"
                    }`}
                  >
                    Product Photograph
                  </button>
                </div>
              )}

              {/* Main Media Viewport */}
              <div className="relative h-80 w-full overflow-hidden rounded-2xl border border-stone-800 bg-neutral-900 sm:h-96">
                {activeTab === "3d" && product.has3d ? (
                  <Product3DViewer
                    productCode={product.productCode}
                    product={product}
                    normalizedBoundsM={product.normalizedBoundsM}
                    className="h-full w-full"
                  />
                ) : product.imageUrls.length > 0 ? (
                  <div className="flex h-full w-full items-center justify-center p-6">
                    <img
                      src={product.imageUrls[0]}
                      alt={product.productName}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : product.has3d ? (
                  <Product3DViewer
                    productCode={product.productCode}
                    product={product}
                    normalizedBoundsM={product.normalizedBoundsM}
                    className="h-full w-full"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-stone-500">
                    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xs">Visual preview unavailable</p>
                  </div>
                )}

                {/* 3D Indicator */}
                <div className="absolute left-3 top-3 z-10">
                  {product.has3d ? (
                    <span className="flex items-center gap-1.5 rounded-full border border-[#c49a45]/40 bg-black/75 px-3 py-1 text-xs font-medium text-[#f0d8a8] backdrop-blur-md">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#c49a45]" />
                      Normalized GLB Available
                    </span>
                  ) : (
                    <span className="rounded-full border border-white/10 bg-black/60 px-3 py-1 text-xs font-medium text-stone-400 backdrop-blur-md">
                      3D Asset Unavailable
                    </span>
                  )}
                </div>
              </div>

              {/* Physical Bounds Note if 3D */}
              {product.normalizedBoundsM && (
                <div className="mt-3 flex items-center justify-between rounded-xl border border-stone-800/80 bg-stone-900/40 px-3.5 py-2 text-[11px] text-stone-400">
                  <span>Normalized 3D Envelope:</span>
                  <span className="font-mono text-stone-300">
                    {(product.normalizedBoundsM[0] * 1000).toFixed(0)} × {(product.normalizedBoundsM[1] * 1000).toFixed(0)} × {(product.normalizedBoundsM[2] * 1000).toFixed(0)} mm
                  </span>
                </div>
              )}
            </div>

            {/* Right Column: Factual Specifications & Actions */}
            <div className="flex flex-col">
              <h2 id="product-modal-title" className="font-serif text-2xl font-medium leading-tight text-white md:text-3xl">
                {product.productName}
              </h2>

              <div className="mt-3 flex items-baseline justify-between border-b border-stone-800 pb-4">
                <div>
                  <span className="text-xs text-stone-500">Model SKU: </span>
                  <span className="font-mono text-xs font-semibold text-stone-300">
                    {product.productCode}
                  </span>
                </div>
                <div className="font-mono text-xl font-bold text-[#c49a45]">
                  {priceFormatted}
                </div>
              </div>

              {/* Factual Attribute Badges */}
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                {product.finish && (
                  <div className="rounded-xl border border-stone-800/80 bg-stone-900/40 p-3">
                    <span className="block text-stone-500 text-[11px]">Finish</span>
                    <span className="font-medium text-stone-200 mt-0.5 block">{product.finish}</span>
                  </div>
                )}
                {product.dimensionsText && (
                  <div className="rounded-xl border border-stone-800/80 bg-stone-900/40 p-3">
                    <span className="block text-stone-500 text-[11px]">Dimensions</span>
                    <span className="font-mono text-stone-200 mt-0.5 block truncate" title={product.dimensionsText}>
                      {product.dimensionsText}
                    </span>
                  </div>
                )}
                {product.material && (
                  <div className="rounded-xl border border-stone-800/80 bg-stone-900/40 p-3">
                    <span className="block text-stone-500 text-[11px]">Material</span>
                    <span className="font-medium text-stone-200 mt-0.5 block truncate" title={product.material}>
                      {product.material}
                    </span>
                  </div>
                )}
                {product.installationType && (
                  <div className="rounded-xl border border-stone-800/80 bg-stone-900/40 p-3">
                    <span className="block text-stone-500 text-[11px]">Installation</span>
                    <span className="font-medium text-stone-200 mt-0.5 block truncate" title={product.installationType}>
                      {product.installationType}
                    </span>
                  </div>
                )}
              </div>

              {/* Feature Points */}
              {featureItems.length > 0 && (
                <div className="mt-5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                    Key Features
                  </h4>
                  <ul className="mt-2 space-y-1.5 text-xs text-stone-300">
                    {featureItems.slice(0, 6).map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-[#c49a45]">•</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Specifications / Inclusions */}
              {specItems.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                    Package Specifications
                  </h4>
                  <p className="mt-1 text-xs text-stone-400 leading-relaxed">
                    {specItems.slice(0, 4).join("; ")}
                  </p>
                </div>
              )}

              {/* External Technical Documents */}
              <div className="mt-5 flex flex-wrap items-center gap-3 text-xs">
                {product.specSheetUrl && (
                  <a
                    href={product.specSheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[#c49a45] hover:underline"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Download Spec Sheet PDF</span>
                  </a>
                )}
                {product.productUrl && (
                  <a
                    href={product.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-stone-400 hover:text-white hover:underline"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    <span>Official Kohler Product Page</span>
                  </a>
                )}
              </div>

              {/* Primary Designer Action */}
              <div className="mt-6 border-t border-stone-800/80 pt-5">
                <button
                  type="button"
                  onClick={() => onUseInDesign(product)}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#c49a45] py-3.5 text-sm font-semibold uppercase tracking-wider text-black transition-all hover:bg-[#b0873a] active:scale-[0.99]"
                >
                  <span>Use in a Design</span>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
                <p className="mt-2 text-center text-[11px] text-stone-500">
                  Sets this authentic fixture as preferred selection in the AI spatial designer.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

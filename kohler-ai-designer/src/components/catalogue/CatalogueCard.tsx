"use client";

import React, { useState } from "react";
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

export interface CatalogueCardProps {
  product: CatalogueProduct;
  onSelectProduct: (product: CatalogueProduct) => void;
  onUseInDesign: (product: CatalogueProduct) => void;
}

export default function CatalogueCard({
  product,
  onSelectProduct,
  onUseInDesign,
}: CatalogueCardProps) {
  const [show3D, setShow3D] = useState(false);
  const [imgError, setImgError] = useState(false);

  const priceFormatted = product.currentPrice
    ? `₹${product.currentPrice.toLocaleString("en-IN")}`
    : product.listPrice
    ? `₹${product.listPrice.toLocaleString("en-IN")}`
    : "Price on request";

  const hasRealImage = product.imageUrls.length > 0 && !imgError;
  const descriptionSnippet = product.features || product.specifications || undefined;

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-800/80 bg-[#161412] p-5 transition-all duration-300 hover:border-[#c49a45]/50 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
      {/* Top Media / 3D Canvas Area */}
      <div className="relative mb-4 h-64 w-full overflow-hidden rounded-xl bg-neutral-900/90">
        {show3D && product.has3d ? (
          <div className="relative h-full w-full">
            <Product3DViewer
              productCode={product.productCode}
              product={product}
              normalizedBoundsM={product.normalizedBoundsM}
              className="h-full w-full"
            />
            <button
              type="button"
              onClick={() => setShow3D(false)}
              className="absolute right-2.5 top-2.5 z-20 rounded-full border border-white/20 bg-black/70 px-2.5 py-1 text-[11px] font-medium text-white/80 backdrop-blur-md transition-colors hover:bg-black hover:text-white"
            >
              ✕ Close 3D
            </button>
          </div>
        ) : hasRealImage ? (
          <div className="relative flex h-full w-full items-center justify-center p-4">
            <img
              src={product.imageUrls[0]}
              alt={product.productName}
              onError={() => setImgError(true)}
              className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          </div>
        ) : product.has3d ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="rounded-full border border-[#c49a45]/30 bg-[#c49a45]/10 p-3 text-[#f0d8a8]">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
              </svg>
            </div>
            <p className="text-xs font-medium text-stone-300">
              Interactive 3D Model Available
            </p>
            <button
              type="button"
              onClick={() => setShow3D(true)}
              className="cursor-pointer rounded-full border border-[#c49a45]/40 bg-stone-900/80 px-3.5 py-1 text-xs font-medium text-[#f0d8a8] transition-colors hover:border-[#c49a45] hover:bg-stone-800"
            >
              Launch 3D Preview
            </button>
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center">
            <div className="rounded-full border border-stone-800 bg-stone-900/60 p-3 text-stone-500">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-xs text-stone-500">
              Visual preview unavailable
            </p>
          </div>
        )}

        {/* 3D Availability Badge */}
        <div className="absolute left-3 top-3 z-10">
          {product.has3d ? (
            <span className="flex items-center gap-1.5 rounded-full border border-[#c49a45]/40 bg-black/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#f0d8a8] backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-[#c49a45]" />
              3D Ready
            </span>
          ) : (
            <span className="rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-[10px] font-medium tracking-wide text-neutral-400 backdrop-blur-md">
              3D Unavailable
            </span>
          )}
        </div>
      </div>

      {/* Content Details */}
      <div className="flex flex-1 flex-col">
        {/* Category & Collection */}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-[#c49a45]">
            {product.category}
          </span>
          {product.collection && (
            <>
              <span className="text-stone-600">•</span>
              <span className="text-[11px] text-stone-400">
                {product.collection}
              </span>
            </>
          )}
        </div>

        {/* Title */}
        <h3 className="font-serif text-base font-medium leading-snug text-white line-clamp-2">
          {product.productName}
        </h3>

        {/* Code & Price */}
        <div className="mt-3 flex items-baseline justify-between border-t border-stone-800/60 pt-3">
          <span className="font-mono text-xs text-stone-400">
            {product.productCode}
          </span>
          <span className="font-mono text-sm font-semibold text-white">
            {priceFormatted}
          </span>
        </div>

        {/* Finish (if factual) */}
        {product.finish && (
          <p className="mt-2 text-xs text-stone-300">
            <span className="text-stone-500">Finish:</span> {product.finish}
          </p>
        )}

        {/* Description Snippet */}
        {descriptionSnippet && (
          <p className="mt-2 text-xs leading-relaxed text-stone-400 line-clamp-2">
            {descriptionSnippet}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-5 flex items-center gap-2 border-t border-stone-800/60 pt-4">
        {product.has3d && (
          <button
            type="button"
            onClick={() => setShow3D(!show3D)}
            className="flex-1 cursor-pointer rounded-xl border border-stone-700 bg-stone-900/80 px-3 py-2 text-center text-xs font-medium text-stone-200 transition-colors hover:border-[#c49a45] hover:text-[#f0d8a8]"
          >
            {show3D ? "Hide 3D" : "View 3D"}
          </button>
        )}
        <button
          type="button"
          onClick={() => onSelectProduct(product)}
          className="flex-1 cursor-pointer rounded-xl border border-stone-700 bg-stone-900/40 px-3 py-2 text-center text-xs font-medium text-stone-300 transition-colors hover:border-white/40 hover:text-white"
        >
          View Details
        </button>
        <button
          type="button"
          onClick={() => onUseInDesign(product)}
          title="Use this fixture in the AI bathroom designer"
          className="cursor-pointer rounded-xl bg-[#c49a45] px-3 py-2 text-xs font-semibold text-black transition-colors hover:bg-[#b0873a]"
        >
          Use
        </button>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import type { RecommendationProduct } from "@/lib/recommendation/types";

interface ProductRemovalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetProduct: RecommendationProduct | null;
  dependentProducts: RecommendationProduct[];
  onConfirmRemove: (removeDependents: boolean) => void;
}

export function ProductRemovalDialog({
  isOpen,
  onClose,
  targetProduct,
  dependentProducts,
  onConfirmRemove,
}: ProductRemovalDialogProps) {
  if (!isOpen || !targetProduct) return null;

  const hasDependents = dependentProducts.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-950/60 border border-red-800/60 flex items-center justify-center text-red-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-serif text-white">Remove Fixture</h3>
            <p className="text-xs text-neutral-400 font-mono">{targetProduct.productCode}</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm text-neutral-300">
            Are you sure you want to remove <span className="text-white font-medium">{targetProduct.productName}</span> from the bathroom layout?
          </p>

          {hasDependents && (
            <div className="mt-4 p-3.5 bg-amber-950/30 border border-amber-800/40 rounded-xl text-xs">
              <div className="flex items-center gap-1.5 text-amber-400 font-medium mb-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Host Dependency Warning</span>
              </div>
              <p className="text-neutral-300">
                This fixture is currently hosting {dependentProducts.length} dependent accessory fixture(s):
              </p>
              <ul className="mt-2 space-y-1 pl-3 list-disc text-neutral-400">
                {dependentProducts.map((p) => (
                  <li key={p.productCode}>
                    <span className="text-neutral-200">{p.productName}</span> ({p.productCode})
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-amber-300/80">
                Removing this host fixture will also remove these dependent fixtures to preserve assembly integrity.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-neutral-800 hover:border-neutral-700 text-xs font-medium text-neutral-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirmRemove(hasDependents);
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-medium text-white transition-colors cursor-pointer shadow-lg shadow-red-900/20"
          >
            {hasDependents ? `Remove Host & Dependents (${dependentProducts.length + 1})` : "Remove Fixture"}
          </button>
        </div>
      </div>
    </div>
  );
}

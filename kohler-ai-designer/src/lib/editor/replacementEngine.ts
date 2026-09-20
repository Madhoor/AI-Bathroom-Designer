import type { DesignPlacement, DesignState } from "../design/types";
import type { RecommendationProduct } from "../recommendation/types";
import { commitManualEditsToState } from "../design/manualEditing";
import type { CatalogueProduct } from "../catalogue/types";

import { resolveProductSemantics, isProductEligibleForRole } from "../catalogue/productSemantics";

/**
 * Filters catalogue products to find eligible candidates for replacing an existing fixture.
 * Strictly guarantees semantic role boundaries:
 * - Basin candidates only for Basins
 * - Faucet candidates only for Faucets
 * - Toilet candidates only for Toilets
 * - Bath candidates only for Bathtubs
 */
export function getEligibleReplacementCandidates(
  currentProduct: RecommendationProduct,
  allCatalogueProducts: CatalogueProduct[],
  room: DesignState["room"],
): CatalogueProduct[] {
  const currentSemantics = resolveProductSemantics(currentProduct);
  const targetRole = currentSemantics.role;

  return allCatalogueProducts.filter((candidate) => {
    if (candidate.productCode === currentProduct.productCode) return false;

    // Strict semantic role boundary guarantee
    if (!isProductEligibleForRole(candidate, targetRole)) return false;

    // Check physical dimensions exist and fit within the room envelope
    if (!candidate.widthMm || !candidate.depthMm || !candidate.heightMm) return false;

    const widthM = candidate.widthMm / 1000;
    const depthM = candidate.depthMm / 1000;
    const heightM = candidate.heightMm / 1000;

    if (widthM > room.widthM || depthM > room.depthM || heightM > room.heightM) {
      return false;
    }

    return true;
  });
}

/**
 * Replaces a fixture in DesignState with a selected replacement product,
 * updating product footprint, total cost, and spatial layout validation.
 */
export function replaceProductInDesignState(
  originalState: DesignState,
  targetProductCode: string,
  newProduct: CatalogueProduct,
): DesignState {
  const oldProductIndex = originalState.selectedProducts.findIndex(
    (p) => p.productCode === targetProductCode,
  );
  if (oldProductIndex === -1) return originalState;

  const oldProduct = originalState.selectedProducts[oldProductIndex];
  const oldPlacement = originalState.placements.find(
    (p) => p.productCode === targetProductCode,
  );
  if (!oldPlacement) return originalState;

  const newWidthM = (newProduct.widthMm ?? 500) / 1000;
  const newDepthM = (newProduct.depthMm ?? 500) / 1000;
  const newHeightM = (newProduct.heightMm ?? 500) / 1000;

  // 1. Create replacement recommendation product
  const replacementRecProduct: RecommendationProduct = {
    productCode: newProduct.productCode,
    productName: newProduct.productName,
    currentPrice: newProduct.currentPrice ?? 0,
    category: newProduct.category,
    finish: newProduct.finish,
    widthMm: newProduct.widthMm,
    depthMm: newProduct.depthMm,
    heightMm: newProduct.heightMm,
    metadata: oldProduct.metadata ? {
      ...oldProduct.metadata,
    } : undefined,
  };

  // 2. Create updated placement with new productCode and footprint
  const updatedPlacement: DesignPlacement = {
    ...oldPlacement,
    productCode: newProduct.productCode,
    footprint: {
      widthM: newWidthM,
      depthM: newDepthM,
      heightM: newHeightM,
    },
  };

  // 3. Update selectedProducts array
  const updatedSelectedProducts = [...originalState.selectedProducts];
  updatedSelectedProducts[oldProductIndex] = replacementRecProduct;

  // 4. Update placements array
  const updatedPlacements = originalState.placements.map((p) =>
    p.productCode === targetProductCode ? updatedPlacement : p,
  );

  // 5. If replacing a basin, recompute any hosted faucet's attachment position
  let finalPlacements = updatedPlacements;
  if (oldPlacement.role.includes("basin")) {
    const basinRotRad = ((updatedPlacement.rotation.z ?? 0) * Math.PI) / 180;
    const localOffsetY = newDepthM * 0.35;
    const newFaucetX = updatedPlacement.position.x - Math.sin(basinRotRad) * localOffsetY;
    const newFaucetY = updatedPlacement.position.y + Math.cos(basinRotRad) * localOffsetY;

    finalPlacements = finalPlacements.map((p) => {
      if (p.hostProductCode === targetProductCode || p.role.includes("faucet")) {
        return {
          ...p,
          position: {
            x: newFaucetX,
            y: newFaucetY,
            z: 0.72,
          },
          rotation: {
            ...p.rotation,
            z: updatedPlacement.rotation.z,
          },
        };
      }
      return p;
    });
  }

  // 6. Update total product cost
  const oldCost = oldProduct.currentPrice ?? 0;
  const newCost = newProduct.currentPrice ?? 0;
  const updatedTotalCost = Math.max(0, originalState.totalProductCost - oldCost + newCost);

  // 7. Re-evaluate spatial validation with new product
  const intermediateState: DesignState = {
    ...originalState,
    selectedProducts: updatedSelectedProducts,
    totalProductCost: updatedTotalCost,
  };

  return commitManualEditsToState(intermediateState, finalPlacements);
}

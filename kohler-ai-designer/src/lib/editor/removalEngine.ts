import type { DesignState } from "../design/types";
import type { RecommendationProduct } from "../recommendation/types";
import { commitManualEditsToState } from "../design/manualEditing";

/**
 * Finds all products that depend on a target fixture as their host.
 */
export function findDependentProducts(
  targetProductCode: string,
  state: DesignState,
): RecommendationProduct[] {
  // 1. Direct host relationship in placements
  const directDependentCodes = state.placements
    .filter((p) => p.hostProductCode === targetProductCode)
    .map((p) => p.productCode);

  // 2. Metadata host role relationship
  const targetProduct = state.selectedProducts.find((p) => p.productCode === targetProductCode);
  const targetRole = targetProduct?.metadata?.role?.[0] ?? targetProduct?.category ?? "";

  const roleDependentCodes = state.selectedProducts
    .filter((p) => {
      if (p.productCode === targetProductCode) return false;
      if (directDependentCodes.includes(p.productCode)) return false;
      const requiresHost = p.metadata?.requiresHostProduct;
      const hostRoles = p.metadata?.hostRoles ?? [];
      return requiresHost && hostRoles.includes(targetRole);
    })
    .map((p) => p.productCode);

  const allDependentCodes = Array.from(new Set([...directDependentCodes, ...roleDependentCodes]));

  return state.selectedProducts.filter((p) => allDependentCodes.includes(p.productCode));
}

/**
 * Safely removes a product (and optionally its dependent hosted products) from DesignState.
 */
export function removeProductFromDesignState(
  originalState: DesignState,
  targetProductCode: string,
  removeDependents: boolean = false,
): { state: DesignState; removedProductCodes: string[] } {
  const codesToRemove = new Set<string>([targetProductCode]);

  if (removeDependents) {
    const dependents = findDependentProducts(targetProductCode, originalState);
    dependents.forEach((d) => codesToRemove.add(d.productCode));
  }

  const updatedSelectedProducts = originalState.selectedProducts.filter(
    (p) => !codesToRemove.has(p.productCode),
  );

  const updatedPlacements = originalState.placements.filter(
    (p) => !codesToRemove.has(p.productCode),
  );

  const removedCost = originalState.selectedProducts
    .filter((p) => codesToRemove.has(p.productCode))
    .reduce((sum, p) => sum + (p.currentPrice ?? 0), 0);

  const updatedTotalCost = Math.max(0, originalState.totalProductCost - removedCost);

  const intermediateState: DesignState = {
    ...originalState,
    selectedProducts: updatedSelectedProducts,
    totalProductCost: updatedTotalCost,
  };

  const finalState = commitManualEditsToState(intermediateState, updatedPlacements);

  return {
    state: finalState,
    removedProductCodes: Array.from(codesToRemove),
  };
}

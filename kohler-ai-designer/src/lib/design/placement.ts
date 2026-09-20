import { validateBathroomLayout, type BathroomRoom, type PlacedProduct } from "../constraints";
import type { RecommendationProduct } from "../recommendation";
import { generatePlacementCandidates } from "./placementCandidates";
import type { DesignPlacement, DesignBuildOptions } from "./types";

export interface PlacementSearchResult {
  placement?: DesignPlacement;
  placedProduct?: PlacedProduct;
  warnings: string[];
}

function hostFor(product: RecommendationProduct, placed: PlacedProduct[]): PlacedProduct | undefined {
  const hostRoles = product.metadata?.hostRoles ?? [];
  return placed.find((candidate) => hostRoles.includes(candidate.role));
}

export function placeProduct(
  product: RecommendationProduct,
  room: BathroomRoom,
  placedProducts: PlacedProduct[],
  options: DesignBuildOptions,
): PlacementSearchResult {
  const host = product.metadata?.requiresHostProduct ? hostFor(product, placedProducts) : undefined;
  if (product.metadata?.requiresHostProduct && !host) {
    return { warnings: [`${product.productCode} requires a placed host with role ${product.metadata.hostRoles?.join(" or ") || "from factual metadata"}.`] };
  }
  const candidates = generatePlacementCandidates(product, room, host?.productCode);
  for (const candidate of candidates) {
    const validation = validateBathroomLayout(room, [...placedProducts, candidate.placed], options.constraintOptions);
    if (validation.valid) {
      candidate.placement.validationStatus = "valid";
      return { placement: candidate.placement, placedProduct: candidate.placed, warnings: validation.warnings.map((warning) => warning.message) };
    }
  }
  return { warnings: [`No valid placement found for ${product.productCode}; all deterministic candidates violated a hard constraint.`] };
}

import { validateBathroomLayout, type ConstraintViolation, type PlacedProduct } from "../constraints";
import type { RecommendationProduct } from "../recommendation";
import { placeProduct } from "./placement";
import type { DesignBuildOptions, DesignBuildResult, DesignPlacement, DesignRecommendationInput, DesignState } from "./types";
import { isRoomUsable } from "./room";

function placementOrder(product: RecommendationProduct): number {
  if (product.metadata?.requiresHostProduct) return 3;
  const surfaces = product.metadata?.mountSurface ?? [];
  if (surfaces.includes("floor") || surfaces.includes("freestanding")) return 1;
  if (surfaces.includes("wall") || surfaces.includes("shower_wall") || surfaces.includes("ceiling")) return 2;
  return 4;
}

export function buildDesignState(
  recommendation: DesignRecommendationInput,
  options: DesignBuildOptions & { room: DesignState["room"] },
): DesignBuildResult {
  const warnings: string[] = [...(recommendation.warnings ?? [])];
  const placements: DesignPlacement[] = [];
  const placedProducts: PlacedProduct[] = [];
  if (!isRoomUsable(options.room)) warnings.push("Room dimensions are not usable.");

  const products = [...recommendation.selectedProducts].sort(
    (a, b) => placementOrder(a) - placementOrder(b) || a.productCode.localeCompare(b.productCode),
  );
  products.forEach((product) => {
    const result = placeProduct(product, options.room, placedProducts, options);
    if (result.placement && result.placedProduct) {
      placements.push(result.placement);
      placedProducts.push(result.placedProduct);
    } else {
      warnings.push(...result.warnings);
    }
  });

  const baseValidation = validateBathroomLayout(options.room, placedProducts, options.constraintOptions);
  const unplacedViolations: ConstraintViolation[] = products
    .filter((product) => !placements.some((placement) => placement.productCode === product.productCode))
    .map((product) => ({
      type: "ROOM_BOUNDARY",
      severity: "error",
      productCodes: [product.productCode],
      message: `${product.productCode} has no valid deterministic placement.`,
    }));
  const validation = {
    valid: baseValidation.valid && unplacedViolations.length === 0,
    errors: [...baseValidation.errors, ...unplacedViolations],
    warnings: baseValidation.warnings,
  };
  if (!validation.valid) warnings.push("The generated placements do not satisfy all hard spatial constraints.");
  const state: DesignState = {
    version: options.version ?? 1,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    room: options.room,
    selectedProducts: recommendation.selectedProducts,
    selectedAssemblies: recommendation.selectedAssemblies,
    placements,
    totalProductCost: recommendation.estimatedProductTotal,
    budget: recommendation.budget,
    style: recommendation.style,
    warnings,
    validation,
  };
  return { state, unplacedProducts: products.filter((product) => !placements.some((placement) => placement.productCode === product.productCode)).map((product) => product.productCode) };
}

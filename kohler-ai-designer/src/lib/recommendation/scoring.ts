import { DEFAULT_RECOMMENDATION_WEIGHTS, type DesignRequirements, type RecommendationProduct, type RecommendationWeights } from "./types";
import type { ResolvedSelection } from "./compatibility";

export function scoreSelection(requirements: DesignRequirements, products: RecommendationProduct[], resolved: ResolvedSelection, weights: RecommendationWeights = DEFAULT_RECOMMENDATION_WEIGHTS): { score: number; rationale: string[] } {
  const rationale: string[] = [];
  const budgetScore = requirements.budget && requirements.budget > 0
    ? Math.min(1, (products.reduce((sum, product) => sum + (product.currentPrice ?? product.listPrice ?? 0), 0) / requirements.budget))
    : 0;
  const styleMatches = requirements.desiredStyle
    ? products.filter((product) => product.styles?.includes(requirements.desiredStyle ?? "")).length / Math.max(products.length, 1)
    : 0;
  const zones = new Set(products.flatMap((product) => product.metadata?.bathroomZones ?? []));
  const completeness = requirements.requiredRoles.filter((role) => products.some((product) => product.metadata?.role.includes(role))).length / Math.max(requirements.requiredRoles.length, 1);
  const assembly = resolved.complete ? 1 : 0;
  if (resolved.complete) rationale.push("All explicit required relationships resolved for the selected products.");
  else rationale.push("Unresolved relationships reduced assembly completeness; no compatibility was inferred.");
  if (requirements.desiredStyle && styleMatches > 0) rationale.push("Some selected products carry the requested style tag.");
  rationale.push(`${zones.size} factual bathroom zones are represented.`);
  const score = weights.spatialFeasibility + budgetScore * weights.budgetUtilization + styleMatches * weights.styleMatch + completeness * weights.zoneCompleteness + assembly * weights.assemblyCompleteness;
  return { score, rationale };
}

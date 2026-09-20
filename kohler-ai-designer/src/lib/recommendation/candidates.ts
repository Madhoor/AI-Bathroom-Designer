import type { DesignRequirements, RecommendationCatalog, RecommendationProduct, CandidateRejection } from "./types";
import { hasAvailableHost, isHostDependent } from "./compatibility";

export interface CandidateFilterResult {
  productsByRole: Map<string, RecommendationProduct[]>;
  rejections: CandidateRejection[];
}

function hasDimensions(product: RecommendationProduct): boolean {
  return [product.widthMm, product.depthMm, product.heightMm].every((value) => value !== undefined && value > 0);
}

function matchesStyle(product: RecommendationProduct, style: string | undefined): boolean {
  return !style || !product.styles || product.styles.length === 0 || product.styles.includes(style);
}

export function filterCandidates(requirements: DesignRequirements, catalog: RecommendationCatalog): CandidateFilterResult {
  const productsByRole = new Map<string, RecommendationProduct[]>();
  const rejections: CandidateRejection[] = [];
  const requiredRoles = [...new Set(requirements.requiredRoles)].sort();

  requiredRoles.forEach((role) => {
    const candidates = catalog.products
      .filter((product) => product.metadata?.role.includes(role))
      .sort((a, b) => a.productCode.localeCompare(b.productCode));
    const accepted: RecommendationProduct[] = [];
    candidates.forEach((product) => {
      if (!hasDimensions(product)) {
        rejections.push({ productCode: product.productCode, reason: "Missing complete dimensions; cannot spatially validate." });
      } else if (isHostDependent(product, catalog) && !hasAvailableHost(product, catalog)) {
        rejections.push({ productCode: product.productCode, reason: "Requires an unavailable host; no factual host relationship is available." });
      } else if (!matchesStyle(product, requirements.desiredStyle)) {
        rejections.push({ productCode: product.productCode, reason: "Style tags explicitly do not match the requested style." });
      } else if (requirements.budget !== undefined && product.currentPrice === undefined) {
        rejections.push({ productCode: product.productCode, reason: "Missing catalogue price; cannot apply a budget filter." });
      } else {
        accepted.push(product);
      }
    });
    if (accepted.length === 0) rejections.push({ reason: `No factual candidate is available for required role ${role}.` });
    productsByRole.set(role, accepted);
  });
  return { productsByRole, rejections };
}

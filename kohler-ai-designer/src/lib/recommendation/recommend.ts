import { validateBathroomLayout } from "../constraints";
import { productTotal, withinBudget } from "./budget";
import { hasCompleteAssembly, resolveSelection } from "./compatibility";
import { filterCandidates } from "./candidates";
import { generatePlacements } from "./placement";
import { scoreSelection } from "./scoring";
import type { DesignRecommendation, DesignRequirements, RecommendationCatalog, RecommendedDesign } from "./types";

function combinations<T>(groups: T[][], index = 0, current: T[] = []): T[][] {
  if (index >= groups.length) return [current];
  return groups[index].flatMap((item) => combinations(groups, index + 1, [...current, item]));
}

function optionalRoleWarnings(requirements: DesignRequirements, catalog: RecommendationCatalog): string[] {
  return (requirements.optionalRoles ?? []).flatMap((role) => {
    const candidates = catalog.products.filter((product) => product.metadata?.role.includes(role));
    if (candidates.some((product) => hasCompleteAssembly(product, catalog))) return [];
    return [`Optional ${role} assembly is currently unavailable from verified catalogue relationships; no ${role} was selected.`];
  });
}

export function recommendDesigns(requirements: DesignRequirements, catalog: RecommendationCatalog, topN = 3): DesignRecommendation {
  const filtered = filterCandidates(requirements, catalog);
  const groups = [...filtered.productsByRole.values()];
  const designs: RecommendedDesign[] = [];
  const rejections = [...filtered.rejections];
  if (groups.some((group) => group.length === 0)) return { alternatives: [], consideredCandidates: 0, rejectedCandidates: rejections };

  combinations(groups).forEach((selection) => {
    const resolved = resolveSelection(selection, catalog);
    const total = productTotal(resolved.products);
    if (!withinBudget(resolved.products, requirements.budget) || total === undefined) {
      rejections.push({ reason: `${selection.map((product) => product.productCode).join(", ")} exceeds budget or has incomplete price data.` });
      return;
    }
    const placements = generatePlacements(resolved.products, requirements.room);
    if (!placements) {
      rejections.push({ reason: `${selection.map((product) => product.productCode).join(", ")} could not generate a valid spatial placement.` });
      return;
    }
    const validation = validateBathroomLayout(requirements.room, placements, catalog.constraintOptions);
    if (!validation.valid) {
      rejections.push({ reason: `${selection.map((product) => product.productCode).join(", ")} failed spatial validation.` });
      return;
    }
    const scored = scoreSelection(requirements, resolved.products, resolved);
    designs.push({
      selectedProducts: resolved.products,
      selectedAssemblies: resolved.assemblies,
      estimatedProductTotal: total,
      budgetRemaining: requirements.budget === undefined ? undefined : requirements.budget - total,
      placements,
      score: scored.score,
      constraintViolations: validation.warnings,
      warnings: [...resolved.warnings, ...optionalRoleWarnings(requirements, catalog)],
      rationale: scored.rationale,
    });
  });
  designs.sort((a, b) => b.score - a.score || a.selectedProducts.map((product) => product.productCode).join("|").localeCompare(b.selectedProducts.map((product) => product.productCode).join("|")));
  return { best: designs[0], alternatives: designs.slice(0, Math.max(0, Math.min(3, topN))), consideredCandidates: designs.length, rejectedCandidates: rejections };
}

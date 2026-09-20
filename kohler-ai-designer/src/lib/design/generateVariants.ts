import { buildDesignState } from "./designState";
import { createDesignPresentation, type DesignPresentation } from "./presentation";
import type { DesignState } from "./types";
import { loadMasterCatalog } from "../recommendation/catalogLoader";
import { recommendDesigns } from "../recommendation";
import type { UserDesignInput } from "./generateDesign";

export interface DesignVariant {
  id: string;
  label: string;
  conceptTag: string;
  state: DesignState;
  presentation: DesignPresentation;
}

export type DesignGenerationResult =
  | {
      success: true;
      variants: DesignVariant[];
      selectedIndex: number;
    }
  | {
      success: false;
      reason: string;
      rejections?: string[];
      suggestions?: string[];
    };

const CONCEPT_TAGS = ["Editor's Choice", "Curated Selection", "Alternative Harmony"];
const VARIANT_LETTERS = ["A", "B", "C"];

export function normalizeRoles(
  rawRoles?: string[],
  rawOptional?: string[],
): { requiredRoles: string[]; optionalRoles: string[] } {
  const roles = rawRoles && rawRoles.length > 0 ? rawRoles : ["toilet", "basin", "rainhead"];
  const requiredRoles: string[] = [];
  const optionalRoles: string[] = [...(rawOptional ?? [])];

  for (const role of roles) {
    const lower = role.toLowerCase().trim();
    if (lower.includes("toilet") || lower.includes("wc") || lower.includes("commode")) {
      if (!requiredRoles.includes("toilet")) requiredRoles.push("toilet");
    } else if (lower.includes("vanity") || lower.includes("basin") || lower.includes("sink")) {
      if (!requiredRoles.includes("basin")) requiredRoles.push("basin");
      if (!optionalRoles.includes("vanity")) optionalRoles.push("vanity");
    } else if (lower.includes("shower") || lower.includes("rainhead")) {
      if (!requiredRoles.includes("rainhead")) requiredRoles.push("rainhead");
    } else if (lower.includes("bath") || lower.includes("tub")) {
      if (!requiredRoles.includes("bath")) requiredRoles.push("bath");
    } else if (lower.length > 0) {
      if (!requiredRoles.includes(lower)) requiredRoles.push(lower);
    }
  }

  if (requiredRoles.length === 0) {
    requiredRoles.push("toilet", "basin", "rainhead");
  }

  return { requiredRoles, optionalRoles };
}

export async function generateDesignVariants(
  input: UserDesignInput,
): Promise<DesignGenerationResult> {
  try {
    const { catalog } = loadMasterCatalog();
    const { requiredRoles, optionalRoles } = normalizeRoles(input.requiredRoles, input.optionalRoles);

    const requirements = {
      room: input.room,
      budget: input.budget || 500000,
      currency: input.currency ?? "INR",
      desiredStyle: input.desiredStyle || "Luxury Modern",
      requiredRoles,
      optionalRoles,
    };

    // Request top 5 alternatives to ensure up to 3 distinct valid variants
    const recommendation = recommendDesigns(requirements, catalog, 5);
    const validAlternatives = recommendation.alternatives ?? [];

    if (validAlternatives.length === 0) {
      const rejectionsList = (recommendation.rejectedCandidates ?? []).map((r) => r.reason);
      const suggestions: string[] = [];

      const hasBudgetIssue = rejectionsList.some((r) => r.toLowerCase().includes("budget"));
      const hasSpatialIssue = rejectionsList.some((r) => r.toLowerCase().includes("spatial") || r.toLowerCase().includes("placement"));

      if (hasBudgetIssue) {
        suggestions.push("Increase your budget to at least ₹4,00,000 for luxury smart toilet and vanity suites.");
      }
      if (hasSpatialIssue) {
        suggestions.push("Increase room dimensions (e.g., minimum 8 ft × 6 ft for 3 fixture zones).");
      }
      if (requiredRoles.length > 3) {
        suggestions.push("Reduce the number of required fixture zones to fit your room envelope.");
      }
      if (suggestions.length === 0) {
        suggestions.push("Adjust fixture requirements or select a preset template to see working configurations.");
      }

      const formattedBudget = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: requirements.currency,
        maximumFractionDigits: 0,
      }).format(requirements.budget);

      return {
        success: false,
        reason: `No valid KOHLER fixture configurations could satisfy your criteria (${formattedBudget} for ${requiredRoles.join(", ")} in ${input.room.widthM.toFixed(1)}m × ${input.room.depthM.toFixed(1)}m space).`,
        rejections: rejectionsList.slice(0, 5),
        suggestions,
      };
    }

    const variants: DesignVariant[] = validAlternatives.slice(0, 3).map((alt, index) => {
      const letter = VARIANT_LETTERS[index] || `${index + 1}`;
      const conceptTag = CONCEPT_TAGS[index] || "Bespoke Variant";

      const recommendationInput = {
        selectedProducts: alt.selectedProducts ?? [],
        selectedAssemblies: alt.selectedAssemblies ?? [],
        estimatedProductTotal: alt.estimatedProductTotal ?? 0,
        budget: requirements.budget,
        style: requirements.desiredStyle,
        warnings: alt.warnings ?? [],
      };

      const built = buildDesignState(recommendationInput, {
        room: input.room,
        generatedAt: new Date().toISOString(),
        constraintOptions: catalog.constraintOptions,
      });

      const title = `Design ${letter}: ${requirements.desiredStyle}`;
      const subtitle = alt.rationale?.[0] ?? `${alt.selectedProducts.length} authentic KOHLER fixtures placed deterministically`;

      const presentation = createDesignPresentation(built.state, {
        id: `variant-${letter.toLowerCase()}`,
        title,
        subtitle,
        styleName: requirements.desiredStyle,
      });

      return {
        id: `design-${letter.toLowerCase()}`,
        label: `Design ${letter}`,
        conceptTag,
        state: built.state,
        presentation,
      };
    });

    return {
      success: true,
      variants,
      selectedIndex: 0,
    };
  } catch (error) {
    return {
      success: false,
      reason: error instanceof Error ? error.message : "Unexpected design generation failure",
      suggestions: ["Try resetting to a preset architectural template."],
    };
  }
}

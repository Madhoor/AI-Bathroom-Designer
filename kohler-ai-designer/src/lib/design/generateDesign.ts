import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildDesignState } from "./designState";
import { createDesignPresentation, type DesignPresentation } from "./presentation";
import type { DesignState } from "./types";
import type { BathroomRoom } from "../constraints";
import { loadMasterCatalog } from "../recommendation/catalogLoader";
import { recommendDesigns } from "../recommendation";

export interface UserDesignInput {
  room: BathroomRoom;
  budget: number;
  currency?: string;
  desiredStyle: string;
  requiredRoles?: string[];
  optionalRoles?: string[];
}

export async function getBaselineDesignState(): Promise<DesignState> {
  const filePath = path.join(process.cwd(), "data", "integration", "bathroom_design_state.json");
  return JSON.parse(await readFile(filePath, "utf8")) as DesignState;
}

export async function generateDesignFromInput(input: UserDesignInput): Promise<{
  state: DesignState;
  presentation: DesignPresentation;
}> {
  try {
    const { catalog } = loadMasterCatalog();

    // Map user requested roles to factual catalogue roles
    const rawRoles = input.requiredRoles && input.requiredRoles.length > 0
      ? input.requiredRoles
      : ["toilet", "basin", "rainhead"];

    const requiredRoles: string[] = [];
    const optionalRoles: string[] = [...(input.optionalRoles ?? [])];

    for (const role of rawRoles) {
      const lower = role.toLowerCase();
      if (lower.includes("toilet") || lower.includes("wc") || lower.includes("commode")) {
        if (!requiredRoles.includes("toilet")) requiredRoles.push("toilet");
      } else if (lower.includes("vanity") || lower.includes("basin") || lower.includes("sink")) {
        if (!requiredRoles.includes("basin")) requiredRoles.push("basin");
        if (!optionalRoles.includes("vanity")) optionalRoles.push("vanity");
      } else if (lower.includes("shower") || lower.includes("rainhead")) {
        if (!requiredRoles.includes("rainhead")) requiredRoles.push("rainhead");
      } else if (lower.includes("bath") || lower.includes("tub")) {
        if (!requiredRoles.includes("bath")) requiredRoles.push("bath");
      } else {
        if (!requiredRoles.includes(role)) requiredRoles.push(role);
      }
    }

    if (requiredRoles.length === 0) {
      requiredRoles.push("toilet", "basin", "rainhead");
    }

    const requirements = {
      room: input.room,
      budget: input.budget || 500000,
      currency: input.currency ?? "INR",
      desiredStyle: input.desiredStyle || "Luxury Modern",
      requiredRoles,
      optionalRoles,
    };

    const recommendation = recommendDesigns(requirements, catalog, 3);
    const selected = recommendation.best;

    if (selected) {
      const recommendationInput = {
        selectedProducts: selected.selectedProducts ?? [],
        selectedAssemblies: selected.selectedAssemblies ?? [],
        estimatedProductTotal: selected.estimatedProductTotal ?? 0,
        budget: requirements.budget,
        style: requirements.desiredStyle,
        warnings: selected.warnings ?? [],
      };

      const built = buildDesignState(recommendationInput, {
        room: input.room,
        generatedAt: new Date().toISOString(),
        constraintOptions: catalog.constraintOptions,
      });

      const presentation = createDesignPresentation(built.state, {
        styleName: input.desiredStyle,
      });

      return { state: built.state, presentation };
    }
  } catch (error) {
    console.warn("Dynamic recommendation fallback to baseline:", error);
  }

  // Graceful fallback to verified baseline state
  const baselineState = await getBaselineDesignState();
  const presentation = createDesignPresentation(baselineState, {
    styleName: input.desiredStyle || baselineState.style || "Luxury Modern",
  });
  return { state: baselineState, presentation };
}

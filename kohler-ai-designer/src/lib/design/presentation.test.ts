import { describe, expect, it } from "vitest";
import { buildDesignState } from "./buildDesign";
import { createDesignPresentation, DEFAULT_CAMERA_PRESETS } from "./presentation";
import type { RecommendationProduct } from "../recommendation";

const room = { widthM: 2.4384, depthM: 1.8288, heightM: 2.7432, doors: [], windows: [] };

const sampleProduct: RecommendationProduct = {
  productCode: "29777IN-0",
  widthMm: 428,
  depthMm: 700,
  heightMm: 500,
  currentPrice: 440000,
  metadata: {
    role: ["toilet"],
    bathroomZones: ["toilet"],
    mountSurface: ["floor"],
    requiresHostProduct: false,
    hostRoles: [],
  },
};

describe("DesignPresentation abstraction", () => {
  it("creates a presentation with correct camera presets and budget metrics", () => {
    const built = buildDesignState(
      {
        selectedProducts: [sampleProduct],
        selectedAssemblies: [],
        estimatedProductTotal: 440000,
        budget: 500000,
        style: "Luxury Modern",
      },
      { room },
    );

    const presentation = createDesignPresentation(built.state, {
      title: "Luxury Modern Suite",
      styleName: "Luxury Modern",
    });

    expect(presentation.id).toBe("design-alpha");
    expect(presentation.title).toBe("Luxury Modern Suite");
    expect(presentation.heroCamera.id).toBe(DEFAULT_CAMERA_PRESETS[0].id);
    expect(presentation.alternateCameras.length).toBeGreaterThanOrEqual(3);
    expect(presentation.metadata.budget).toBe(500000);
    expect(presentation.metadata.totalCost).toBe(440000);
    expect(presentation.metadata.remainingBudget).toBe(60000);
    expect(presentation.metadata.budgetUtilizationPercent).toBeCloseTo(88.0, 1);
    expect(presentation.metadata.roomDimensionsFt.widthFt).toBe(8.0);
    expect(presentation.metadata.roomDimensionsFt.depthFt).toBe(6.0);
    expect(presentation.metadata.roomDimensionsFt.heightFt).toBe(9.0);
  });
});

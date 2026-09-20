import { describe, expect, it } from "vitest";
import type { DesignState } from "../design";
import {
  createDesignRenderPlan,
  getArchitecturalPlacement,
  getAssetLocalTransform,
  getUniqueAssetUrls,
  resolveDesignAsset,
  type NormalizedAssetManifestEntry,
} from "./designStateRenderer";

const manifest: NormalizedAssetManifestEntry[] = [
  {
    productCode: "AVAILABLE",
    outputGlbPath: "data\\3d_catalogue_sample\\normalized_glb\\AVAILABLE.glb",
    conversionStatus: "success",
    validationStatus: "valid",
    scaleFactor: 0.0254,
    rotationApplied: "X=-90;Y=0;Z=0 degrees",
    normalizedBoundsM: [0.5, 0.2, 0.4],
  },
];

const state = {
  version: 1,
  generatedAt: "2026-09-15T00:00:00.000Z",
  room: { widthM: 2, depthM: 2, heightM: 2.4, doors: [], windows: [] },
  selectedProducts: [],
  selectedAssemblies: [],
  placements: [
    {
      productCode: "AVAILABLE",
      role: "basin",
      zone: "basin",
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      footprint: { widthM: 0.5, depthM: 0.4, heightM: 0.2 },
      placementSurface: "floor",
      source: "generic_zone_heuristic",
      validationStatus: "valid",
    },
    {
      productCode: "MISSING",
      role: "toilet",
      zone: "toilet",
      position: { x: 1, y: 0, z: 1 },
      rotation: { x: 0, y: 0, z: 0 },
      footprint: { widthM: 0.4, depthM: 0.4, heightM: 0.6 },
      placementSurface: "floor",
      source: "generic_zone_heuristic",
      validationStatus: "valid",
    },
  ],
  totalProductCost: 0,
  warnings: [],
  validation: { valid: true, errors: [], warnings: [] },
} satisfies DesignState;

describe("design state renderer adapter", () => {
  it("resolves a product code to a normalized GLB endpoint", () => {
    expect(resolveDesignAsset("AVAILABLE", manifest)).toEqual({
      productCode: "AVAILABLE",
      url: "/api/3d-assets/AVAILABLE",
      scaleFactor: 0.0254,
      rotationApplied: "X=-90;Y=0;Z=0 degrees",
      normalizedBoundsM: [0.5, 0.2, 0.4],
    });
  });

  it("matches production product codes without changing their spelling", () => {
    expect(resolveDesignAsset("9301IN-ZX-RGD", [
      ...manifest,
      {
        ...manifest[0],
        productCode: "9301IN-ZX-RGD",
      },
    ])?.url).toBe("/api/3d-assets/9301IN-ZX-RGD");
  });

  it("reports missing assets without creating a replacement", () => {
    const plan = createDesignRenderPlan(state, manifest);
    expect(plan.missingProductCodes).toEqual(["MISSING"]);
    expect(plan.renderablePlacements).toHaveLength(1);
  });

  it("maps placement transforms without changing the source placement", () => {
    const plan = createDesignRenderPlan(state, manifest);
    expect(plan.renderablePlacements[0]?.placement.position).toEqual({ x: 0, y: 0, z: 0 });
    expect(plan.renderablePlacements[0]?.placement.rotation).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("maps the production GLB axes to canonical world axes once", () => {
    expect(getAssetLocalTransform(resolveDesignAsset("AVAILABLE", manifest)!)).toEqual({
      position: [0, 0.1, -0.2],
      rotation: [Math.PI / 2, 0, 0],
    });
  });

  it("deduplicates asset URLs deterministically", () => {
    const plan = createDesignRenderPlan(state, manifest);
    expect(getUniqueAssetUrls(plan)).toEqual(["/api/3d-assets/AVAILABLE"]);
  });

  it("calculates architectural orientation and positive wall clearance for toilets", () => {
    const asset = resolveDesignAsset("AVAILABLE", manifest)!;
    const toiletPlacement = {
      productCode: "AVAILABLE",
      role: "toilet",
      zone: "toilet",
      position: { x: 0.8, y: -0.7, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      footprint: { widthM: 0.5, depthM: 0.4, heightM: 0.6 },
      placementSurface: "floor" as const,
      source: "generic_zone_heuristic" as const,
      validationStatus: "valid" as const,
    };
    const room = { widthM: 2.4, depthM: 1.8, heightM: 2.7, doors: [], windows: [] };
    const arch = getArchitecturalPlacement(toiletPlacement, asset, room);

    expect(arch.mountingWall).toBe("south");
    expect(arch.frontDirection).toBe("north");
    expect(arch.backDirection).toBe("south");
    expect(arch.worldRotation[2]).toBeCloseTo(Math.PI); // 180 degrees
    expect(arch.isGrounded).toBe(true);
    expect(arch.clearanceM.wall).toBeGreaterThanOrEqual(0.04);
  });
});

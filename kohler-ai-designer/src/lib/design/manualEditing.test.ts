import { describe, expect, it } from "vitest";
import type { BathroomRoom } from "../constraints";
import type { DesignPlacement, DesignState } from "./types";
import {
  commitManualEditsToState,
  constrainPositionToSurface,
  findBaselinePlacement,
  getPlacementDiagnosticMessages,
  snapRotation,
  validateTentativePlacement,
} from "./manualEditing";

describe("Manual 3D Bathroom Editing", () => {
  const sampleRoom: BathroomRoom = {
    widthM: 3.0,
    depthM: 2.4,
    heightM: 2.8,
    doors: [
      {
        wall: "north",
        offsetM: 1.0,
        widthM: 0.8,
        swing: "inward",
      },
    ],
    windows: [],
  };

  const baselinePlacements: DesignPlacement[] = [
    {
      productCode: "K-77700IN-0",
      role: "toilet",
      zone: "toilet",
      position: { x: 0.8, y: -0.8, z: 0 },
      rotation: { x: 0, y: 0, z: 180 },
      footprint: { widthM: 0.45, depthM: 0.7, heightM: 0.75 },
      placementSurface: "floor",
      source: "factual_surface",
      validationStatus: "valid",
    },
    {
      productCode: "K-99000IN-2MB",
      role: "basin",
      zone: "basin",
      position: { x: -0.8, y: -0.8, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      footprint: { widthM: 0.9, depthM: 0.5, heightM: 0.85 },
      placementSurface: "floor",
      source: "factual_surface",
      validationStatus: "valid",
    },
    {
      productCode: "K-26344IN-CP",
      role: "rainhead",
      zone: "shower",
      position: { x: 0.8, y: 0.5, z: 2.65 },
      rotation: { x: 0, y: 0, z: 0 },
      footprint: { widthM: 0.3, depthM: 0.3, heightM: 0.15 },
      placementSurface: "ceiling",
      source: "factual_surface",
      validationStatus: "valid",
    },
    {
      productCode: "K-5401IN-0",
      role: "wall_toilet",
      zone: "toilet",
      position: { x: 0.0, y: -0.86, z: 0.4 },
      rotation: { x: 0, y: 0, z: 180 },
      footprint: { widthM: 0.4, depthM: 0.6, heightM: 0.45 },
      placementSurface: "wall",
      source: "factual_surface",
      validationStatus: "valid",
    },
  ];

  const baselineState: DesignState = {
    version: 1,
    generatedAt: "2026-09-20T00:00:00.000Z",
    room: sampleRoom,
    selectedProducts: [
      {
        productCode: "K-77700IN-0",
        productName: "Modern Toilet",
        currentPrice: 35000,
        category: "Toilets",
        widthMm: 450,
        depthMm: 700,
        heightMm: 750,
      },
      {
        productCode: "K-99000IN-2MB",
        productName: "Architectural Vanity Basin",
        currentPrice: 65000,
        category: "Vanities",
        widthMm: 900,
        depthMm: 500,
        heightMm: 850,
      },
    ],
    selectedAssemblies: [],
    placements: baselinePlacements,
    totalProductCost: 100000,
    budget: 500000,
    style: "Luxury Modern",
    warnings: [],
    validation: { valid: true, errors: [], warnings: [] },
  };

  // 1. Selecting a product
  it("selects a product and retrieves its placement and baseline data", () => {
    const baseline = findBaselinePlacement("K-77700IN-0", baselineState);
    expect(baseline).toBeDefined();
    expect(baseline?.productCode).toBe("K-77700IN-0");
    expect(baseline?.role).toBe("toilet");
  });

  // 2. Movement updates the correct DesignState placement
  it("updates the targeted product placement coordinates in the state", () => {
    const toiletPlacement = baselineState.placements[0];
    const newPosition = { x: 0.6, y: -0.7, z: 0 };
    const modifiedPlacement: DesignPlacement = {
      ...toiletPlacement,
      position: newPosition,
    };

    const newState = commitManualEditsToState(baselineState, [
      modifiedPlacement,
      ...baselineState.placements.slice(1),
    ]);

    expect(newState.placements[0].position.x).toBe(0.6);
    expect(newState.placements[0].position.y).toBe(-0.7);
    expect(newState.placements[1].position.x).toBe(-0.8); // other fixtures untouched
  });

  // 3. Floor-mounted movement stays on floor plane (Z = 0)
  it("constrains floor-mounted movement strictly to Z = 0 within room footprint", () => {
    const toilet = baselineState.placements[0];
    const rawPos = { x: 0.5, y: -0.5, z: 1.2 }; // attempt to elevate off floor
    const constrained = constrainPositionToSurface(
      rawPos,
      toilet.placementSurface,
      toilet.footprint,
      sampleRoom,
    );

    expect(constrained.z).toBe(0);
    expect(constrained.x).toBe(0.5);
    expect(constrained.y).toBe(-0.5);
  });

  // 4. Wall-mounted movement stays on wall plane
  it("constrains wall-mounted movement to the appropriate wall surface", () => {
    const wallFixture = baselineState.placements[3];
    // south wall is at y = -room.depthM / 2 = -1.2
    const rawPos = { x: 0.0, y: -0.6, z: 0.5 }; // moved toward center
    const constrained = constrainPositionToSurface(
      rawPos,
      wallFixture.placementSurface,
      wallFixture.footprint,
      sampleRoom,
    );

    // Should snap to South wall plane
    expect(constrained.y).toBeCloseTo(-sampleRoom.depthM / 2 + 0.04 + wallFixture.footprint.depthM / 2, 2);
    expect(constrained.rotationZDeg).toBe(180);
    expect(constrained.z).toBe(0.5);
  });

  // 5. Rotation updates placement
  it("updates rotation angle and snaps to 15 / 45 degree architectural increments", () => {
    expect(snapRotation(43, 45)).toBe(45);
    expect(snapRotation(89, 45)).toBe(90);
    expect(snapRotation(178, 45)).toBe(180);
    expect(snapRotation(22, 15)).toBe(15);
  });

  // 6. Invalid movement is rejected (boundary crossing or collision)
  it("detects and flags invalid movement outside room boundary or overlapping other products", () => {
    const toilet = baselineState.placements[0];
    // Position overlapping vanity at x: -0.8, y: -0.8
    const overlappingPlacement: DesignPlacement = {
      ...toilet,
      position: { x: -0.8, y: -0.8, z: 0 },
    };

    const validation = validateTentativePlacement(overlappingPlacement, baselineState);
    expect(validation.valid).toBe(false);

    const diagnostics = getPlacementDiagnosticMessages(toilet.productCode, validation);
    expect(diagnostics.valid).toBe(false);
    expect(diagnostics.errors.some((e) => e.includes("overlap"))).toBe(true);
  });

  // 7. Valid movement is accepted
  it("accepts a valid repositioning within clear open space", () => {
    const toilet = baselineState.placements[0];
    // Move slightly along the wall in empty space
    const validPlacement: DesignPlacement = {
      ...toilet,
      position: { x: 0.9, y: -0.8, z: 0 },
    };

    const validation = validateTentativePlacement(validPlacement, baselineState);
    expect(validation.valid).toBe(true);
  });

  // 8. Reset restores baseline placement
  it("restores original generated placement from baseline state", () => {
    const baseline = findBaselinePlacement("K-77700IN-0", baselineState);
    expect(baseline?.position).toEqual({ x: 0.8, y: -0.8, z: 0 });
    expect(baseline?.rotation.z).toBe(180);
  });

  // 9. Cancel restores baseline state
  it("cancels edits and preserves authoritative baseline state", () => {
    const editedState = commitManualEditsToState(baselineState, [
      { ...baselineState.placements[0], position: { x: 0.5, y: -0.5, z: 0 } },
      ...baselineState.placements.slice(1),
    ]);

    expect(editedState.placements[0].position.x).toBe(0.5);
    // Cancellation is simply reverting to baselineState
    const restoredState = baselineState;
    expect(restoredState.placements[0].position.x).toBe(0.8);
  });

  // 10. Manual edit preserves productCode identity
  it("strictly preserves productCode, role, and zone identity throughout edits", () => {
    const toilet = baselineState.placements[0];
    const edited: DesignPlacement = {
      ...toilet,
      position: { x: 0.7, y: -0.7, z: 0 },
    };
    const newState = commitManualEditsToState(baselineState, [
      edited,
      ...baselineState.placements.slice(1),
    ]);

    expect(newState.placements[0].productCode).toBe(toilet.productCode);
    expect(newState.placements[0].role).toBe(toilet.role);
    expect(newState.placements[0].zone).toBe(toilet.zone);
    expect(newState.selectedProducts[0].productCode).toBe(toilet.productCode);
  });

  // 11. No second hidden placement state: DesignState is sole source of truth
  it("maintains single source of truth in DesignState in canonical metre-based coordinates", () => {
    const updatedPlacements = baselineState.placements.map((p) => ({
      ...p,
      position: { ...p.position, x: Number((p.position.x + 0.05).toFixed(2)) },
    }));

    const committedState = commitManualEditsToState(baselineState, updatedPlacements);
    expect(committedState.placements[0].position.x).toBe(0.85);
    expect(committedState.version).toBe(1);
    expect(typeof committedState.placements[0].position.x).toBe("number");
    expect(typeof committedState.placements[0].position.y).toBe("number");
    expect(typeof committedState.placements[0].position.z).toBe("number");
  });
});

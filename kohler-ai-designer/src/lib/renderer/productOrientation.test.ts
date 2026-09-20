import { describe, expect, it } from "vitest";
import {
  isProductEligibleForRole,
  resolveProductSemantics,
  PRODUCT_SEMANTIC_ROLES,
} from "../catalogue/productSemantics";
import {
  getProductOrientationProfile,
  ARCHETYPE_ORIENTATION_PROFILES,
} from "./orientationProfiles";
import {
  resolveProductOrientation,
  detectMountingWall,
} from "./productOrientationAdapter";
import {
  getAssetLocalTransform,
  type ResolvedDesignAsset,
} from "./designStateRenderer";
import { auditProductScale } from "../catalogue/scaleAudit";
import type { BathroomRoom } from "../constraints";
import type { DesignPlacement } from "../design/types";

describe("Generic 3D Orientation System - Master Verification Suite", () => {
  const dummyRoom: BathroomRoom = {
    widthM: 3.0,
    depthM: 2.4,
    heightM: 2.6,
    doors: [],
    windows: [],
  };

  const sampleForefrontSink = {
    productCode: "2749T-1-0",
    productName: "Forefront™ 90 cm rectangular vessel bathroom sink with glazed underside",
    category: "Basin Area",
    subcategory: "Vanity Top Basin",
  };

  const sampleReachBath = {
    productCode: "15847T-0",
    productName: "Reach™ 150 cm x 70 cm drop-in bath",
    category: "Wellness",
    subcategory: "Drop-in Bathtubs",
  };

  const sampleInnateToilet = {
    productCode: "29777IN-0",
    productName: "Innate™ One-piece elongated smart toilet",
    category: "Toilet Area",
    subcategory: "One Piece",
  };

  const sampleComposedFaucet = {
    productCode: "20070IN-4-CP",
    productName: "Composed™ Tall single-control bathroom sink faucet",
    category: "Basin Area",
    subcategory: "Tall Faucets",
  };

  const sampleRainhead = {
    productCode: "29961IN-CP",
    productName: "ModernLife Edge™ two-function rainhead",
    category: "Showering Area",
    subcategory: "Rainheads",
  };

  const sampleAsset: ResolvedDesignAsset = {
    productCode: "SAMPLE-01",
    url: "/api/3d-assets/SAMPLE-01",
    scaleFactor: 1.0,
    rotationApplied: "-90deg_X",
    normalizedBoundsM: [0.6, 0.4, 0.5],
  };

  // 1. Product 2749T-1-0 is classified as basin, not bath
  it("1. Product 2749T-1-0 is classified as basin, not bath", () => {
    const semantics = resolveProductSemantics(sampleForefrontSink);
    expect(semantics.role).toBe("basin");
    expect(semantics.role).not.toBe("bath");
  });

  // 2. Bathtub candidates are excluded when basin is requested
  it("2. Bathtub candidates are excluded when basin is requested", () => {
    expect(isProductEligibleForRole(sampleReachBath, "basin")).toBe(false);
  });

  // 3. Basin candidates are excluded when bath is requested
  it("3. Basin candidates are excluded when bath is requested", () => {
    expect(isProductEligibleForRole(sampleForefrontSink, "bath")).toBe(false);
  });

  // 4. Orientation profile lookup succeeds for all 14 categories
  it("4. Orientation profile lookup succeeds for all 14 categories", () => {
    expect(PRODUCT_SEMANTIC_ROLES.length).toBe(14);
    for (const role of PRODUCT_SEMANTIC_ROLES) {
      const profile = getProductOrientationProfile(role);
      expect(profile).toBeDefined();
      expect(profile.primaryMountSurface).toBeDefined();
      expect(profile.upVector).toEqual([0, 0, 1]);
    }
  });

  // 5. Missing profile falls back gracefully to unknown archetype
  it("5. Missing profile falls back gracefully to unknown archetype", () => {
    // @ts-expect-error test unknown role string
    const profile = getProductOrientationProfile("non_existent_role_xyz");
    expect(profile).toBeDefined();
    expect(profile).toEqual(ARCHETYPE_ORIENTATION_PROFILES.unknown);
  });

  // 6. Local transform produces upright orientation for bath archetype
  it("6. Local transform produces upright orientation for bath archetype", () => {
    const bathAsset: ResolvedDesignAsset = {
      productCode: "15847T-0",
      url: "/api/3d-assets/15847T-0",
      scaleFactor: 1.0,
      rotationApplied: "-90deg_X",
      normalizedBoundsM: [1.5, 0.55, 0.7],
    };
    const resolved = resolveProductOrientation(sampleReachBath, bathAsset, { isPreview: true });
    expect(resolved.role).toBe("bath");
    // Native normalized GLB with -90° X is rotated +90° X to orient rim UP
    expect(resolved.localRotation[0]).toBeCloseTo(Math.PI / 2);
    // Base is grounded at Z=0
    expect(resolved.worldPosition[2]).toBe(0);
  });

  // 7. Local transform produces upright orientation for basin archetype
  it("7. Local transform produces upright orientation for basin archetype", () => {
    const basinAsset: ResolvedDesignAsset = {
      productCode: "2749T-1-0",
      url: "/api/3d-assets/2749T-1-0",
      scaleFactor: 1.0,
      rotationApplied: "-90deg_X",
      normalizedBoundsM: [0.9, 0.18, 0.45],
    };
    const resolved = resolveProductOrientation(sampleForefrontSink, basinAsset, { isPreview: true });
    expect(resolved.role).toBe("basin");
    expect(resolved.localRotation[0]).toBeCloseTo(Math.PI / 2);
    // Vessel basin rim opens upward
    expect(resolved.orientedBoundsM[2]).toBe(0.18);
  });

  // 8. Local transform produces upright orientation for toilet archetype
  it("8. Local transform produces upright orientation for toilet archetype", () => {
    const toiletAsset: ResolvedDesignAsset = {
      productCode: "29777IN-0",
      url: "/api/3d-assets/29777IN-0",
      scaleFactor: 1.0,
      rotationApplied: "-90deg_X",
      normalizedBoundsM: [0.38, 0.72, 0.65],
    };
    const resolved = resolveProductOrientation(sampleInnateToilet, toiletAsset, { isPreview: true });
    expect(resolved.role).toBe("toilet");
    expect(resolved.localRotation[0]).toBeCloseTo(Math.PI / 2);
    expect(resolved.profile.groundMode).toBe("base_to_floor");
  });

  // 9. Local transform produces upright orientation for faucet archetype
  it("9. Local transform produces upright orientation for faucet archetype", () => {
    const faucetAsset: ResolvedDesignAsset = {
      productCode: "20070IN-4-CP",
      url: "/api/3d-assets/20070IN-4-CP",
      scaleFactor: 1.0,
      rotationApplied: "-90deg_X",
      normalizedBoundsM: [0.05, 0.28, 0.16],
    };
    const resolved = resolveProductOrientation(sampleComposedFaucet, faucetAsset, { isPreview: true });
    expect(resolved.role).toBe("faucet");
    expect(resolved.localRotation[0]).toBeCloseTo(Math.PI / 2);
    expect(resolved.profile.functionalForward).toEqual([0, -1, 0]); // Spout projects forward
  });

  // 10. Rainhead mounts with spray facing downward (towards Z=0)
  it("10. Rainhead mounts with spray facing downward (towards Z=0)", () => {
    const rainheadAsset: ResolvedDesignAsset = {
      productCode: "29961IN-CP",
      url: "/api/3d-assets/29961IN-CP",
      scaleFactor: 1.0,
      rotationApplied: "-90deg_X",
      normalizedBoundsM: [0.42, 0.08, 0.33],
    };
    const resolved = resolveProductOrientation(sampleRainhead, rainheadAsset, {
      room: dummyRoom,
    });
    expect(resolved.role).toBe("rainhead");
    // Primary mount surface is ceiling
    expect(resolved.profile.primaryMountSurface).toBe("ceiling");
    // Functional spray vector is facing down towards floor [0, 0, -1]
    expect(resolved.profile.functionalForward).toEqual([0, 0, -1]);
    // Ceiling contact: mounting face contacts ceiling at dummyRoom.heightM
    const rainheadHeight = rainheadAsset.normalizedBoundsM[1];
    expect(resolved.worldPosition[2]).toBeCloseTo(dummyRoom.heightM - rainheadHeight, 4);
    expect(resolved.worldPosition[2] + rainheadHeight).toBeCloseTo(dummyRoom.heightM, 4);
  });

  // 11. Wall-mounted fixture orients back to wall on South wall
  it("11. Wall-mounted fixture orients back to wall on South wall", () => {
    const southPos = { x: 0, y: -dummyRoom.depthM / 2 + 0.3, z: 0 };
    const wall = detectMountingWall(southPos, dummyRoom);
    expect(wall).toBe("south");

    const placement: DesignPlacement = {
      productCode: "29777IN-0",
      role: "toilet",
      zone: "toilet",
      position: southPos,
      rotation: { x: 0, y: 0, z: 0 },
      footprint: { widthM: 0.4, depthM: 0.7, heightM: 0.7 },
      placementSurface: "floor",
      source: "factual_surface",
      validationStatus: "valid",
    };

    const resolved = resolveProductOrientation(sampleInnateToilet, sampleAsset, {
      room: dummyRoom,
      placement,
    });
    // On south wall, yaw is 180° so back touches south wall and bowl faces north (+Y)
    expect(resolved.worldRotation[2]).toBeCloseTo(Math.PI);
  });

  // 12. Wall-mounted fixture orients back to wall on North wall
  it("12. Wall-mounted fixture orients back to wall on North wall", () => {
    const northPos = { x: 0, y: dummyRoom.depthM / 2 - 0.3, z: 0 };
    const wall = detectMountingWall(northPos, dummyRoom);
    expect(wall).toBe("north");

    const placement: DesignPlacement = {
      productCode: "29777IN-0",
      role: "toilet",
      zone: "toilet",
      position: northPos,
      rotation: { x: 0, y: 0, z: 0 },
      footprint: { widthM: 0.4, depthM: 0.7, heightM: 0.7 },
      placementSurface: "floor",
      source: "factual_surface",
      validationStatus: "valid",
    };

    const resolved = resolveProductOrientation(sampleInnateToilet, sampleAsset, {
      room: dummyRoom,
      placement,
    });
    // On north wall, yaw is 0° so back touches north wall and bowl faces south (-Y)
    expect(resolved.worldRotation[2]).toBeCloseTo(0);
  });

  // 13. Wall-mounted fixture orients back to wall on West wall
  it("13. Wall-mounted fixture orients back to wall on West wall", () => {
    const westPos = { x: -dummyRoom.widthM / 2 + 0.3, y: 0, z: 0 };
    const wall = detectMountingWall(westPos, dummyRoom);
    expect(wall).toBe("west");

    const placement: DesignPlacement = {
      productCode: "29777IN-0",
      role: "toilet",
      zone: "toilet",
      position: westPos,
      rotation: { x: 0, y: 0, z: 0 },
      footprint: { widthM: 0.4, depthM: 0.7, heightM: 0.7 },
      placementSurface: "floor",
      source: "factual_surface",
      validationStatus: "valid",
    };

    const resolved = resolveProductOrientation(sampleInnateToilet, sampleAsset, {
      room: dummyRoom,
      placement,
    });
    // On west wall, yaw is 90° (+X projection)
    expect(resolved.worldRotation[2]).toBeCloseTo(Math.PI / 2);
  });

  // 14. Wall-mounted fixture orients back to wall on East wall
  it("14. Wall-mounted fixture orients back to wall on East wall", () => {
    const eastPos = { x: dummyRoom.widthM / 2 - 0.3, y: 0, z: 0 };
    const wall = detectMountingWall(eastPos, dummyRoom);
    expect(wall).toBe("east");

    const placement: DesignPlacement = {
      productCode: "29777IN-0",
      role: "toilet",
      zone: "toilet",
      position: eastPos,
      rotation: { x: 0, y: 0, z: 0 },
      footprint: { widthM: 0.4, depthM: 0.7, heightM: 0.7 },
      placementSurface: "floor",
      source: "factual_surface",
      validationStatus: "valid",
    };

    const resolved = resolveProductOrientation(sampleInnateToilet, sampleAsset, {
      room: dummyRoom,
      placement,
    });
    // On east wall, yaw is 270° (-X projection)
    expect(resolved.worldRotation[2]).toBeCloseTo((270 * Math.PI) / 180);
  });

  // 15. Catalogue 3D preview and DesignState renderer produce identical local transforms for the same product
  it("15. Catalogue 3D preview and DesignState renderer produce identical local transforms for the same product", () => {
    // 3D preview resolve
    const previewResolved = resolveProductOrientation(
      sampleForefrontSink,
      sampleAsset,
      { isPreview: true },
    );

    // Renderer getAssetLocalTransform
    const rendererTransform = getAssetLocalTransform(
      sampleAsset,
      sampleForefrontSink,
    );

    expect(previewResolved.localPosition).toEqual(rendererTransform.position);
    expect(previewResolved.localRotation).toEqual(rendererTransform.rotation);
  });

  // 16. Scale audit correctly identifies a scale discrepancy exceeding 25%
  it("16. Scale audit correctly identifies a scale discrepancy exceeding 25%", () => {
    const consistentProduct = {
      productCode: "2749T-1-0",
      productName: "Forefront 90 cm sink",
      category: "Basin Area",
      subcategory: "Vanity Top Basin",
      currency: "INR",
      imageUrls: [],
      has3d: true,
      widthMm: 900,
      heightMm: 180,
      depthMm: 450,
      normalizedBoundsM: [0.9, 0.18, 0.45] as [number, number, number],
    };

    const passResult = auditProductScale(consistentProduct);
    expect(passResult.status).toBe("pass");
    expect(passResult.discrepancyPercent).toBeLessThan(5);

    const discrepantProduct = {
      productCode: "BAD-SCALE-01",
      productName: "Miscalibrated Basin",
      category: "Basin Area",
      subcategory: "Vanity Top Basin",
      currency: "INR",
      imageUrls: [],
      has3d: true,
      widthMm: 500,  // 0.5m
      heightMm: 200, // 0.2m
      depthMm: 400,  // 0.4m
      normalizedBoundsM: [1.2, 0.4, 0.8] as [number, number, number], // 1.2m vs 0.5m -> 140% error!
    };

    const failResult = auditProductScale(discrepantProduct);
    expect(failResult.status).toBe("discrepancy");
    expect(failResult.discrepancyPercent).toBeGreaterThan(25);
    expect(failResult.notes.some((n) => n.includes("Discrepancy of"))).toBe(true);
  });
});

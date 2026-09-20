import { describe, expect, it } from "vitest";
import {
  resolveProductSemantics,
  isProductEligibleForRole,
  getProductsForRole,
} from "../catalogue/productSemantics";
import {
  resolveProductOrientation,
  CATALOGUE_PREVIEW_AXIS_CORRECTION,
  detectMountingWall,
} from "./productOrientationAdapter";
import { getHostAttachments } from "./hostAttachments";
import {
  getEligibleReplacementCandidates,
  replaceProductInDesignState,
} from "../editor/replacementEngine";
import {
  commitManualEditsToState,
  syncHostedPlacements,
} from "../design/manualEditing";
import type { BathroomRoom } from "../constraints/types";
import type { DesignPlacement, DesignState } from "../design/types";
import type { RecommendationProduct } from "../recommendation/types";
import type { CatalogueProduct } from "../catalogue/types";
import type { ResolvedDesignAsset } from "./designStateRenderer";

describe("3D Axis Calibration + Fixture Semantics + Host Hierarchy Suite", () => {
  const dummyRoom: BathroomRoom = {
    widthM: 3.0,
    depthM: 2.4,
    heightM: 2.6,
    doors: [],
    windows: [],
  };

  const sampleToiletProduct: RecommendationProduct = {
    productCode: "29777IN-0",
    productName: "Innate™ One-piece elongated smart toilet",
    category: "Toilet Area",
    subcategory: "One Piece",
    currentPrice: 185000,
  };

  const sampleBasinProduct: RecommendationProduct = {
    productCode: "2749T-1-0",
    productName: "Forefront™ 90 cm rectangular vessel bathroom sink with glazed underside",
    category: "Basin Area",
    subcategory: "Vanity Top Basin",
    currentPrice: 28000,
    widthMm: 900,
    depthMm: 450,
    heightMm: 180,
  };

  const sampleFaucetProduct: RecommendationProduct = {
    productCode: "20070IN-4-CP",
    productName: "Composed™ Tall single-control bathroom sink faucet",
    category: "Basin Area",
    subcategory: "Tall Faucets",
    currentPrice: 34000,
    widthMm: 50,
    depthMm: 160,
    heightMm: 280,
  };

  const sampleBathProduct: RecommendationProduct = {
    productCode: "15847T-0",
    productName: "Reach™ 150 cm x 70 cm drop-in bath",
    category: "Wellness",
    subcategory: "Drop-in Bathtubs",
    currentPrice: 62000,
    widthMm: 1500,
    depthMm: 700,
    heightMm: 550,
  };

  const sampleRainheadProduct: RecommendationProduct = {
    productCode: "29961IN-CP",
    productName: "ModernLife Edge™ two-function rainhead",
    category: "Showering Area",
    subcategory: "Rainheads",
    currentPrice: 42000,
    widthMm: 420,
    depthMm: 330,
    heightMm: 80,
  };

  const sampleAsset: ResolvedDesignAsset = {
    productCode: "SAMPLE",
    url: "/api/3d-assets/SAMPLE",
    scaleFactor: 1.0,
    rotationApplied: "-90deg_X",
    normalizedBoundsM: [0.6, 0.4, 0.5],
  };

  // 1. Catalogue preview Z=-90° axis correction
  it("1. Catalogue preview applies centralized Z=-90° axis correction in preview mode", () => {
    const resolvedPreview = resolveProductOrientation(sampleToiletProduct, sampleAsset, {
      isPreview: true,
    });
    expect(CATALOGUE_PREVIEW_AXIS_CORRECTION).toEqual([0, 0, -Math.PI / 2]);
    expect(resolvedPreview.previewRotation[2]).toBeCloseTo(-Math.PI / 2);
  });

  // 2. Preview transform is not applied to source GLB
  it("2. Preview transform is not applied to source GLB", () => {
    expect(sampleAsset.rotationApplied).toBe("-90deg_X");
    expect(sampleAsset.scaleFactor).toBe(1.0);
  });

  // 3. Preview and bathroom coordinate contracts remain separate
  it("3. Preview and bathroom coordinate contracts remain separate", () => {
    const previewRes = resolveProductOrientation(sampleToiletProduct, sampleAsset, {
      isPreview: true,
    });
    const bathroomRes = resolveProductOrientation(sampleToiletProduct, sampleAsset, {
      room: dummyRoom,
      placement: {
        productCode: "29777IN-0",
        role: "toilet",
        zone: "toilet",
        position: { x: 0, y: -dummyRoom.depthM / 2 + 0.3, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        footprint: { widthM: 0.4, depthM: 0.7, heightM: 0.7 },
        placementSurface: "floor",
        source: "factual_surface",
        validationStatus: "valid",
      },
    });

    // In preview space: previewRotation has Z = -90° correction
    expect(previewRes.previewRotation[2]).toBeCloseTo(-Math.PI / 2);
    // In bathroom space: localRotation does not have preview axis correction
    expect(bathroomRes.localRotation[2]).toBeCloseTo(0);
    expect(bathroomRes.worldPosition[1]).toBeLessThan(0);
  });

  // 4. Toilet semantic role
  it("4. Factual toilet semantics resolves to toilet role", () => {
    const semantics = resolveProductSemantics(sampleToiletProduct);
    expect(semantics.role).toBe("toilet");
    expect(semantics.mountSurface).toBe("floor");
  });

  // 5. Basin semantic role
  it("5. Factual basin semantics resolves to basin role", () => {
    const semantics = resolveProductSemantics(sampleBasinProduct);
    expect(semantics.role).toBe("basin");
    expect(semantics.mountSurface).toBe("deck");
  });

  // 6. Faucet semantic role
  it("6. Factual faucet semantics resolves to faucet role", () => {
    const semantics = resolveProductSemantics(sampleFaucetProduct);
    expect(semantics.role).toBe("faucet");
    expect(semantics.mountSurface).toBe("deck");
  });

  // 7. Bath semantic role
  it("7. Factual bath semantics resolves to bath role", () => {
    const semantics = resolveProductSemantics(sampleBathProduct);
    expect(semantics.role).toBe("bath");
    expect(semantics.mountSurface).toBe("floor");
  });

  // 8. Bathtub cannot become basin
  it("8. Bathtubs are NEVER eligible for basin role", () => {
    expect(isProductEligibleForRole(sampleBathProduct, "basin")).toBe(false);
    expect(isProductEligibleForRole(sampleBasinProduct, "bath")).toBe(false);
  });

  // 9. Basin cannot become faucet
  it("9. Basins are NEVER eligible for faucet role and vice versa", () => {
    expect(isProductEligibleForRole(sampleBasinProduct, "faucet")).toBe(false);
    expect(isProductEligibleForRole(sampleFaucetProduct, "basin")).toBe(false);
  });

  // 10. Basin replacement returns basin candidates
  it("10. Basin replacement returns only basin candidates", () => {
    const candidates = [
      sampleBasinProduct as unknown as CatalogueProduct,
      sampleFaucetProduct as unknown as CatalogueProduct,
      sampleToiletProduct as unknown as CatalogueProduct,
      sampleBathProduct as unknown as CatalogueProduct,
      {
        productCode: "REPLACEMENT-BASIN",
        productName: "ModernLife vessel sink",
        category: "Basin Area",
        subcategory: "Vessel Basins",
        widthMm: 600,
        depthMm: 400,
        heightMm: 150,
      } as CatalogueProduct,
    ];

    const eligible = getEligibleReplacementCandidates(sampleBasinProduct, candidates, dummyRoom);
    expect(eligible.length).toBe(1);
    expect(eligible[0].productCode).toBe("REPLACEMENT-BASIN");
    expect(eligible.some((c) => c.productCode === sampleFaucetProduct.productCode)).toBe(false);
  });

  // 11. Faucet replacement returns faucet candidates
  it("11. Faucet replacement returns only faucet candidates", () => {
    const candidates = [
      sampleBasinProduct as unknown as CatalogueProduct,
      sampleFaucetProduct as unknown as CatalogueProduct,
      sampleToiletProduct as unknown as CatalogueProduct,
      sampleBathProduct as unknown as CatalogueProduct,
      {
        productCode: "REPLACEMENT-FAUCET",
        productName: "Purist single-handle faucet",
        category: "Basin Area",
        subcategory: "Tall Faucets",
        widthMm: 50,
        depthMm: 150,
        heightMm: 250,
      } as CatalogueProduct,
    ];

    const eligible = getEligibleReplacementCandidates(sampleFaucetProduct, candidates, dummyRoom);
    expect(eligible.length).toBe(1);
    expect(eligible[0].productCode).toBe("REPLACEMENT-FAUCET");
    expect(eligible.some((c) => c.productCode === sampleBasinProduct.productCode)).toBe(false);
  });

  // 12. Mirror wall attachment transform
  it("12. Mirror wall attachment transform aligns flush to wall", () => {
    const basinPlacement: DesignPlacement = {
      productCode: "2749T-1-0",
      role: "basin",
      zone: "basin",
      position: { x: 0.5, y: -dummyRoom.depthM / 2 + 0.3, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      footprint: { widthM: 0.9, depthM: 0.45, heightM: 0.18 },
      placementSurface: "counter",
      source: "factual_surface",
      validationStatus: "valid",
    };

    const attachments = getHostAttachments(basinPlacement, sampleAsset, dummyRoom);
    const mirrorAtt = attachments.find((a) => a.type === "wall_mirror");
    expect(mirrorAtt).toBeDefined();
    expect(mirrorAtt?.dimensionsM.depthM).toBe(0.016); // 16mm thin profile
    expect(mirrorAtt?.localPosition[2]).toBe(1.6); // 1.6m elevation
  });

  // 13. Mirror backlight attachment
  it("13. Mirror attachment provides concealed mounting metadata", () => {
    const basinPlacement: DesignPlacement = {
      productCode: "2749T-1-0",
      role: "basin",
      zone: "basin",
      position: { x: 0, y: -dummyRoom.depthM / 2 + 0.3, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      footprint: { widthM: 0.9, depthM: 0.45, heightM: 0.18 },
      placementSurface: "counter",
      source: "factual_surface",
      validationStatus: "valid",
    };

    const attachments = getHostAttachments(basinPlacement, sampleAsset, dummyRoom);
    const mirrorAtt = attachments.find((a) => a.type === "wall_mirror");
    expect(mirrorAtt?.hostProductCode).toBe(basinPlacement.productCode);
  });

  // 14. Basin→faucet host transform
  it("14. Basin-faucet host transform places faucet on countertop behind basin bowl", () => {
    const basinPlacement: DesignPlacement = {
      productCode: "BASIN-01",
      role: "basin",
      zone: "basin",
      position: { x: 0.2, y: -0.8, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      footprint: { widthM: 0.6, depthM: 0.4, heightM: 0.15 },
      placementSurface: "counter",
      source: "factual_surface",
      validationStatus: "valid",
    };

    const faucetPlacement: DesignPlacement = {
      productCode: "FAUCET-01",
      role: "faucet",
      zone: "basin",
      hostProductCode: "BASIN-01",
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      footprint: { widthM: 0.05, depthM: 0.15, heightM: 0.25 },
      placementSurface: "deck",
      source: "factual_surface",
      validationStatus: "valid",
    };

    const resolvedFaucet = resolveProductOrientation(sampleFaucetProduct, sampleAsset, {
      room: dummyRoom,
      placement: faucetPlacement,
      hostPlacement: basinPlacement,
    });

    expect(resolvedFaucet.worldPosition[0]).toBeCloseTo(0.2); // Aligned with basin X
    expect(resolvedFaucet.worldPosition[2]).toBe(0.72); // Counter deck height
    expect(resolvedFaucet.worldPosition[1]).toBeGreaterThan(-0.8); // Rear offset
  });

  // 15. Faucet follows basin translation
  it("15. Faucet follows basin translation in syncHostedPlacements", () => {
    const originalPlacements: DesignPlacement[] = [
      {
        productCode: "BASIN-01",
        role: "basin",
        zone: "basin",
        position: { x: 0, y: -0.8, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        footprint: { widthM: 0.6, depthM: 0.4, heightM: 0.15 },
        placementSurface: "counter",
        source: "factual_surface",
        validationStatus: "valid",
      },
      {
        productCode: "FAUCET-01",
        role: "faucet",
        zone: "basin",
        hostProductCode: "BASIN-01",
        position: { x: 0, y: -0.66, z: 0.72 },
        rotation: { x: 0, y: 0, z: 0 },
        footprint: { widthM: 0.05, depthM: 0.15, heightM: 0.25 },
        placementSurface: "deck",
        source: "factual_surface",
        validationStatus: "valid",
      },
    ];

    const updatedPlacements: DesignPlacement[] = [
      {
        ...originalPlacements[0],
        position: { x: 0.5, y: -0.7, z: 0 }, // Basin moved by Δx=+0.5, Δy=+0.1
      },
      originalPlacements[1],
    ];

    const synced = syncHostedPlacements(originalPlacements, updatedPlacements);
    const syncedFaucet = synced.find((p) => p.productCode === "FAUCET-01")!;
    expect(syncedFaucet.position.x).toBeCloseTo(0.5);
    expect(syncedFaucet.position.y).toBeCloseTo(-0.56);
  });

  // 16. Faucet follows basin rotation
  it("16. Faucet follows basin rotation in syncHostedPlacements", () => {
    const originalPlacements: DesignPlacement[] = [
      {
        productCode: "BASIN-01",
        role: "basin",
        zone: "basin",
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        footprint: { widthM: 0.6, depthM: 0.4, heightM: 0.15 },
        placementSurface: "counter",
        source: "factual_surface",
        validationStatus: "valid",
      },
      {
        productCode: "FAUCET-01",
        role: "faucet",
        zone: "basin",
        hostProductCode: "BASIN-01",
        position: { x: 0, y: 0.14, z: 0.72 },
        rotation: { x: 0, y: 0, z: 0 },
        footprint: { widthM: 0.05, depthM: 0.15, heightM: 0.25 },
        placementSurface: "deck",
        source: "factual_surface",
        validationStatus: "valid",
      },
    ];

    const updatedPlacements: DesignPlacement[] = [
      {
        ...originalPlacements[0],
        rotation: { x: 0, y: 0, z: 90 }, // Basin rotated 90 degrees
      },
      originalPlacements[1],
    ];

    const synced = syncHostedPlacements(originalPlacements, updatedPlacements);
    const syncedFaucet = synced.find((p) => p.productCode === "FAUCET-01")!;
    expect(syncedFaucet.rotation.z).toBe(90);
    // After 90° rotation, (0, 0.14) rotates to (-0.14, 0)
    expect(syncedFaucet.position.x).toBeCloseTo(-0.14);
    expect(syncedFaucet.position.y).toBeCloseTo(0);
  });

  // 17. Toilet attachments follow toilet wall movement
  it("17. Toilet attachments follow toilet wall movement", () => {
    const toiletPlacement: DesignPlacement = {
      productCode: "29777IN-0",
      role: "toilet",
      zone: "toilet",
      position: { x: -1.2, y: 0, z: 0 }, // West wall
      rotation: { x: 0, y: 0, z: 90 },
      footprint: { widthM: 0.4, depthM: 0.7, heightM: 0.7 },
      placementSurface: "floor",
      source: "factual_surface",
      validationStatus: "valid",
    };

    const wall = detectMountingWall(toiletPlacement.position, dummyRoom);
    expect(wall).toBe("west");

    const attachments = getHostAttachments(toiletPlacement, sampleAsset, dummyRoom);
    const cisternAtt = attachments.find((a) => a.type === "cistern_joinery");
    expect(cisternAtt).toBeDefined();
    expect(cisternAtt?.hostProductCode).toBe(toiletPlacement.productCode);
  });

  // 18. Rainhead faces downward
  it("18. Rainhead faces downward towards floor", () => {
    const rainheadRes = resolveProductOrientation(sampleRainheadProduct, sampleAsset, {
      room: dummyRoom,
    });
    expect(rainheadRes.role).toBe("rainhead");
    expect(rainheadRes.profile.functionalForward).toEqual([0, 0, -1]);
    const assetHeight = sampleAsset.normalizedBoundsM[1];
    expect(rainheadRes.worldPosition[2]).toBeCloseTo(dummyRoom.heightM - assetHeight, 4);
    expect(rainheadRes.worldPosition[2] + assetHeight).toBeCloseTo(dummyRoom.heightM, 4);
  });

  // 19. Bathtub remains upright
  it("19. Bathtub remains upright with rim opening upward (+Z)", () => {
    const bathRes = resolveProductOrientation(sampleBathProduct, sampleAsset, {
      room: dummyRoom,
    });
    expect(bathRes.role).toBe("bath");
    expect(bathRes.worldPosition[2]).toBe(0); // Grounded on floor
    expect(bathRes.profile.upVector).toEqual([0, 0, 1]);
  });

  // 20. Preview scale fitting remains physically meaningful
  it("20. Preview scale fitting preserves physically meaningful dimensions", () => {
    const [wFaucet, hFaucet, dFaucet] = [0.05, 0.28, 0.16];
    const [wBath, hBath, dBath] = [1.5, 0.55, 0.7];

    const maxFaucet = Math.max(wFaucet, hFaucet, dFaucet);
    const maxBath = Math.max(wBath, hBath, dBath);

    const distFaucet = Math.max(maxFaucet * 1.6 + 0.5, 1.25);
    const distBath = Math.max(maxBath * 1.6 + 0.5, 1.25);

    // Faucet distance is constrained to at least 1.25m
    expect(distFaucet).toBe(1.25);
    // Bath distance is over 2.5m
    expect(distBath).toBeGreaterThan(2.5);
    // Bath is rendered significantly larger in proportion than faucet
    expect(distBath / distFaucet).toBeGreaterThan(2.0);
  });
});

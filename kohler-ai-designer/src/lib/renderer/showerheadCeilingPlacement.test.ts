import { describe, it, expect } from "vitest";
import { resolveProductSemantics } from "../catalogue/productSemantics";
import {
  resolveProductOrientation,
  type ResolvedProductTransform,
} from "./productOrientationAdapter";
import {
  getShowerZoneDefinition,
  getShowerZoneAnchor,
  isInsideShowerZone,
  resolveCeilingMountedPlacement,
} from "../design/showerZone";
import { constrainPositionToSurface } from "../design/manualEditing";
import { validateBathroomLayout } from "../constraints/validateLayout";
import { generatePlacementCandidates } from "../design/placementCandidates";
import type { BathroomRoom, PlacedProduct } from "../constraints";
import type { RecommendationProduct } from "../recommendation";
import type { DesignPlacement } from "../design/types";
import type { ResolvedDesignAsset } from "./designStateRenderer";

describe("Showerhead & Rainhead Ceiling Placement Suite", () => {
  const dummyRoom: BathroomRoom = {
    widthM: 2.4,
    depthM: 2.1,
    heightM: 2.74,
    doors: [
      {
        wall: "north",
        offsetM: 0.2,
        widthM: 0.85,
        swing: "inward",
      },
    ],
  };

  const sampleRainheadProduct: RecommendationProduct = {
    productCode: "76465IN-BL",
    productName: "Awaken 25.4 cm Rainhead",
    category: "Showering Area",
    subcategory: "Rainheads",
    currentPrice: 28449,
    listPrice: 28449,
    currency: "INR",
    widthMm: 250,
    depthMm: 250,
    heightMm: 51,
    finish: "Matte Black",
    metadata: {
      role: ["rainhead"],
      mountSurface: ["ceiling"],
      bathroomZones: ["shower"],
    },
  };

  // Normalized bounds of 76465IN-BL from manifest.json: [0.249989, 0.051443, 0.249972]
  const sampleRainheadAsset: ResolvedDesignAsset = {
    productCode: "76465IN-BL",
    url: "/api/3d-assets/76465IN-BL",
    scaleFactor: 0.0254,
    rotationApplied: "X=-90;Y=0;Z=0 degrees",
    normalizedBoundsM: [0.249989, 0.051443, 0.249972],
  };

  // 1. Ceiling-mounted role identification
  it("1. Resolves rainhead to role=rainhead and mountSurface=ceiling", () => {
    const semantics = resolveProductSemantics(sampleRainheadProduct);
    expect(semantics.role).toBe("rainhead");
    expect(semantics.mountSurface).toBe("ceiling");
    expect(semantics.primaryZone).toBe("shower");
  });

  // 2. Transformed bounds calculation
  it("2. Calculates physical oriented bounds in Three.js canonical space [width, depth, height]", () => {
    const resolved = resolveProductOrientation(sampleRainheadProduct, sampleRainheadAsset, {
      room: dummyRoom,
    });
    // asset normalizedBoundsM: [0.25, 0.0514, 0.25]
    // orientedBoundsM: [Width, Depth, Height] = [0.25, 0.25, 0.0514]
    expect(resolved.orientedBoundsM[0]).toBeCloseTo(0.25, 2); // width
    expect(resolved.orientedBoundsM[1]).toBeCloseTo(0.25, 2); // depth
    expect(resolved.orientedBoundsM[2]).toBeCloseTo(0.0514, 2); // height
  });

  // 3. Ceiling contact formula: mounting face contacts Z = room.heightM
  it("3. Guarantees mounting face flush-contacts ceiling at Z = room.heightM", () => {
    const resolved = resolveProductOrientation(sampleRainheadProduct, sampleRainheadAsset, {
      room: dummyRoom,
    });
    const assetHeight = sampleRainheadAsset.normalizedBoundsM[1];

    // Base position worldZ must be room.heightM - assetHeight
    expect(resolved.worldPosition[2]).toBeCloseTo(dummyRoom.heightM - assetHeight, 4);

    // Top of fixture contacts ceiling
    const topElevation = resolved.worldPosition[2] + assetHeight;
    expect(topElevation).toBeCloseTo(dummyRoom.heightM, 4);

    // Spray face hangs below ceiling inside room
    const bottomElevation = resolved.worldPosition[2];
    expect(bottomElevation).toBeLessThan(dummyRoom.heightM);
    expect(bottomElevation).toBeGreaterThan(0);
  });

  // 4. Spray direction = downward (-Z)
  it("4. Ensures spray pattern projects downward towards floor (-Z)", () => {
    const resolved = resolveProductOrientation(sampleRainheadProduct, sampleRainheadAsset, {
      room: dummyRoom,
    });
    expect(resolved.profile.functionalForward).toEqual([0, 0, -1]);
    expect(resolved.profile.groundingMode).toBe("top_to_ceiling");
    expect(resolved.profile.attachmentDirection).toBe("down");
  });

  // 5. X/Y inside shower zone
  it("5. Places rainhead strictly inside architectural shower cabin zone", () => {
    const resolved = resolveProductOrientation(sampleRainheadProduct, sampleRainheadAsset, {
      room: dummyRoom,
    });
    const showerDef = getShowerZoneDefinition(dummyRoom);

    const x = resolved.worldPosition[0];
    const y = resolved.worldPosition[1];

    expect(x).toBeGreaterThan(showerDef.bounds.minX);
    expect(x).toBeLessThan(showerDef.bounds.maxX);
    expect(y).toBeGreaterThan(showerDef.bounds.minY);
    expect(y).toBeLessThan(showerDef.bounds.maxY);

    expect(isInsideShowerZone({ x, y }, dummyRoom)).toBe(true);
  });

  // 6. No placement above ceiling & passes room boundary validation
  it("6. Passes constraint room boundary validation with no above-ceiling violations", () => {
    const resolved = resolveProductOrientation(sampleRainheadProduct, sampleRainheadAsset, {
      room: dummyRoom,
    });

    const placed: PlacedProduct = {
      productCode: sampleRainheadProduct.productCode,
      xM: resolved.worldPosition[0],
      yM: resolved.worldPosition[1],
      zM: resolved.worldPosition[2],
      rotationZDeg: 0,
      widthM: resolved.orientedBoundsM[0],
      depthM: resolved.orientedBoundsM[1],
      heightM: resolved.orientedBoundsM[2],
      role: "rainhead",
      bathroomZone: "shower",
    };

    const validation = validateBathroomLayout(dummyRoom, [placed]);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
    expect(placed.zM + placed.heightM).toBeLessThanOrEqual(dummyRoom.heightM);
  });

  // 7. Manual ceiling movement maintains ceiling elevation
  it("7. Constrains manual ceiling movement to ceiling contact elevation Z = room.heightM - heightM", () => {
    const footprint = { widthM: 0.25, depthM: 0.25, heightM: 0.0514 };
    const tentative = { x: 0.5, y: -0.5, z: 1.0 }; // User drag coordinates

    const constrained = constrainPositionToSurface(
      tentative,
      "ceiling",
      footprint,
      dummyRoom,
      undefined,
      { role: "rainhead", zone: "shower" },
    );

    expect(constrained.z).toBeCloseTo(dummyRoom.heightM - footprint.heightM, 4);
    expect(constrained.z + footprint.heightM).toBeCloseTo(dummyRoom.heightM, 4);
  });

  // 8. Manual editing shower zone boundary clamping
  it("8. Clamps manual drag movement within the shower enclosure boundaries", () => {
    const footprint = { widthM: 0.25, depthM: 0.25, heightM: 0.0514 };
    const shower = getShowerZoneDefinition(dummyRoom);

    // Attempt to drag completely outside shower cabin into basin area (-X, +Y)
    const outsideTentative = { x: -0.8, y: 0.6, z: 0 };

    const constrained = constrainPositionToSurface(
      outsideTentative,
      "ceiling",
      footprint,
      dummyRoom,
      undefined,
      { role: "rainhead", zone: "shower" },
    );

    // Clamped inside shower cabin
    expect(constrained.x).toBeGreaterThanOrEqual(shower.bounds.minX);
    expect(constrained.x).toBeLessThanOrEqual(shower.bounds.maxX);
    expect(constrained.y).toBeGreaterThanOrEqual(shower.bounds.minY);
    expect(constrained.y).toBeLessThanOrEqual(shower.bounds.maxY);
  });

  // 9. Floor plan coordinates match 3D world coordinates (X, Y)
  it("9. Synchronizes 2D floor plan anchor with 3D world anchor", () => {
    const shower = getShowerZoneDefinition(dummyRoom);
    const anchor = getShowerZoneAnchor(dummyRoom);

    const candidates = generatePlacementCandidates(sampleRainheadProduct, dummyRoom);
    const rainheadCandidate = candidates[0];

    expect(rainheadCandidate).toBeDefined();
    expect(rainheadCandidate.placement.position.x).toBeCloseTo(anchor.x, 4);
    expect(rainheadCandidate.placement.position.y).toBeCloseTo(anchor.y, 4);
    expect(rainheadCandidate.placement.position.z).toBeCloseTo(
      dummyRoom.heightM - rainheadCandidate.placement.footprint.heightM,
      4,
    );
  });

  // 10. Deterministic repeated placement
  it("10. Yields deterministic coordinates across multiple placement resolutions", () => {
    const first = resolveCeilingMountedPlacement(
      sampleRainheadProduct,
      sampleRainheadAsset.normalizedBoundsM,
      dummyRoom,
      "shower",
    );
    const second = resolveCeilingMountedPlacement(
      sampleRainheadProduct,
      sampleRainheadAsset.normalizedBoundsM,
      dummyRoom,
      "shower",
    );

    expect(first.worldPosition).toEqual(second.worldPosition);
    expect(first.orientedBoundsM).toEqual(second.orientedBoundsM);
    expect(first.sprayDirection).toEqual(second.sprayDirection);
  });

  // 11. Generic helper for future ceiling-mounted fixtures
  it("11. Supports generic ceiling fixtures with ceiling contact and downward orientation", () => {
    const genericDownlight: RecommendationProduct = {
      productCode: "DOWNLIGHT-100",
      productName: "Architectural Ceiling Downlight",
      category: "Lighting",
      widthMm: 100,
      depthMm: 100,
      heightMm: 40,
      metadata: {
        role: ["other"],
        mountSurface: ["ceiling"],
        bathroomZones: ["general"],
      },
    };

    const placement = resolveCeilingMountedPlacement(
      genericDownlight,
      [0.1, 0.04, 0.1],
      dummyRoom,
      "general",
    );

    expect(placement.mountsAtCeiling).toBe(true);
    expect(placement.worldPosition[2]).toBeCloseTo(dummyRoom.heightM - 0.04, 4);
    expect(placement.sprayDirection).toEqual([0, 0, -1]);
  });
});

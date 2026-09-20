import type { ProductSemanticRole } from "../catalogue/productSemantics";

export type AxisDirection = "+X" | "-X" | "+Y" | "-Y" | "+Z" | "-Z";
export type GroundingMode = "base_to_floor" | "rim_to_counter" | "back_to_wall" | "top_to_ceiling" | "center";
export type OrientationConfidence = "verified" | "profile_inferred" | "needs_review";

export interface ProductOrientationProfile {
  role: ProductSemanticRole;
  mountSurface: "floor" | "wall" | "deck" | "ceiling" | "freestanding";
  primaryMountSurface: "floor" | "wall" | "deck" | "ceiling" | "freestanding";
  localUpAxis: AxisDirection;
  upVector: [number, number, number];
  localForwardAxis: AxisDirection;
  functionalForward: [number, number, number];
  localRightAxis: AxisDirection;
  /** Base Euler rotation [X, Y, Z] in radians to orient normalized GLB into canonical fixture space */
  defaultRotation: [number, number, number];
  /** Grounding and centering strategy */
  groundingMode: GroundingMode;
  groundMode: GroundingMode;
  /** Primary attachment/projection direction */
  attachmentDirection: "north" | "south" | "east" | "west" | "up" | "down";
  confidence: OrientationConfidence;
  notes?: string;
  productCode?: string;
}

/**
 * Standard Archetype Orientation Profiles by Product Semantic Role.
 *
 * In canonical fixture space:
 * - Local +Z is always UP (ceiling direction).
 * - Local -Z is always DOWN (floor direction).
 * - Local +Y points towards the mounting wall behind the fixture.
 * - Local -Y points forward into the room / towards the user.
 * - Local +X is lateral right.
 * - Local -X is lateral left.
 */
export const ARCHETYPE_ORIENTATION_PROFILES: Record<ProductSemanticRole, ProductOrientationProfile> = {
  // 1. TOILET: Floor-mounted, base grounded, rear at +Y, bowl at -Y
  toilet: {
    role: "toilet",
    mountSurface: "floor",
    primaryMountSurface: "floor",
    localUpAxis: "+Z",
    upVector: [0, 0, 1],
    localForwardAxis: "-Y",
    functionalForward: [0, -1, 0],
    localRightAxis: "+X",
    defaultRotation: [Math.PI / 2, 0, 0],
    groundingMode: "base_to_floor",
    groundMode: "base_to_floor",
    attachmentDirection: "south",
    confidence: "verified",
    notes: "Toilet base contacts floor at Z=0. Rear aligns with mounting wall at +Y, bowl projects toward -Y.",
  },

  // 2. BASIN: Counter/deck mounted, bowl opening upward at +Z, faucet deck at +Y
  basin: {
    role: "basin",
    mountSurface: "deck",
    primaryMountSurface: "deck",
    localUpAxis: "+Z",
    upVector: [0, 0, 1],
    localForwardAxis: "-Y",
    functionalForward: [0, -1, 0],
    localRightAxis: "+X",
    defaultRotation: [Math.PI / 2, 0, 0],
    groundingMode: "rim_to_counter",
    groundMode: "rim_to_counter",
    attachmentDirection: "south",
    confidence: "verified",
    notes: "Basin bowl cavity faces upward (+Z). Base rests on vanity countertop (Z=0.72m).",
  },

  // 3. VANITY: Wall/floor mounted cabinet, countertop at top, drawers facing -Y
  vanity: {
    role: "vanity",
    mountSurface: "wall",
    primaryMountSurface: "wall",
    localUpAxis: "+Z",
    upVector: [0, 0, 1],
    localForwardAxis: "-Y",
    functionalForward: [0, -1, 0],
    localRightAxis: "+X",
    defaultRotation: [Math.PI / 2, 0, 0],
    groundingMode: "base_to_floor",
    groundMode: "base_to_floor",
    attachmentDirection: "south",
    confidence: "verified",
    notes: "Vanity cabinet body mounted against back wall (+Y) with drawers pulling out toward -Y.",
  },

  // 4. FAUCET: Deck/wall mounted, base at Z=0, spout curving outward toward -Y into bowl
  faucet: {
    role: "faucet",
    mountSurface: "deck",
    primaryMountSurface: "deck",
    localUpAxis: "+Z",
    upVector: [0, 0, 1],
    localForwardAxis: "-Y",
    functionalForward: [0, -1, 0],
    localRightAxis: "+X",
    defaultRotation: [Math.PI / 2, 0, 0],
    groundingMode: "base_to_floor",
    groundMode: "base_to_floor",
    attachmentDirection: "south",
    confidence: "verified",
    notes: "Faucet mounting flange contacts deck at Z=0. Spout arches forward into basin bowl (-Y). Never upside down.",
  },

  // 5. BATHTUB: Floor-mounted, cavity opens upward (+Z), long dimension horizontal along X
  bath: {
    role: "bath",
    mountSurface: "floor",
    primaryMountSurface: "floor",
    localUpAxis: "+Z",
    upVector: [0, 0, 1],
    localForwardAxis: "-Y",
    functionalForward: [0, -1, 0],
    localRightAxis: "+X",
    defaultRotation: [Math.PI / 2, 0, 0],
    groundingMode: "base_to_floor",
    groundMode: "base_to_floor",
    attachmentDirection: "south",
    confidence: "verified",
    notes: "Bathtub base rests flat on floor at Z=0. Vessel opening faces upward (+Z). Long dimension horizontal. Never vertical or on side.",
  },

  // 6. BATH FILLER / SPOUT: Wall or deck mounted spout for filling tub
  bath_filler: {
    role: "bath_filler",
    mountSurface: "wall",
    primaryMountSurface: "wall",
    localUpAxis: "+Z",
    upVector: [0, 0, 1],
    localForwardAxis: "-Y",
    functionalForward: [0, -1, 0],
    localRightAxis: "+X",
    defaultRotation: [Math.PI / 2, 0, 0],
    groundingMode: "back_to_wall",
    groundMode: "back_to_wall",
    attachmentDirection: "south",
    confidence: "verified",
    notes: "Bath spout mounted to wall with discharge aerator pointing down into bathtub.",
  },

  // 7. BATH DRAIN: Floor drain component
  bath_drain: {
    role: "bath_drain",
    mountSurface: "floor",
    primaryMountSurface: "floor",
    localUpAxis: "+Z",
    upVector: [0, 0, 1],
    localForwardAxis: "-Y",
    functionalForward: [0, -1, 0],
    localRightAxis: "+X",
    defaultRotation: [Math.PI / 2, 0, 0],
    groundingMode: "base_to_floor",
    groundMode: "base_to_floor",
    attachmentDirection: "down",
    confidence: "profile_inferred",
    notes: "Toe-tap or pop-up drain installed flush on tub basin bottom.",
  },

  // 8. RAINHEAD: Ceiling-mounted, mounting plate at top (+Z), spray nozzles pointing DOWNWARD (-Z)
  rainhead: {
    role: "rainhead",
    mountSurface: "ceiling",
    primaryMountSurface: "ceiling",
    localUpAxis: "-Z",
    upVector: [0, 0, 1],
    localForwardAxis: "-Z",
    functionalForward: [0, 0, -1],
    localRightAxis: "+X",
    defaultRotation: [Math.PI / 2, 0, 0],
    groundingMode: "top_to_ceiling",
    groundMode: "top_to_ceiling",
    attachmentDirection: "down",
    confidence: "verified",
    notes: "Rainhead mounted flush to ceiling (Z=room.heightM). Spray pattern projects downward towards floor (-Z).",
  },

  // 9. SHOWERHEAD: Wall-mounted angle showerhead
  showerhead: {
    role: "showerhead",
    mountSurface: "wall",
    primaryMountSurface: "wall",
    localUpAxis: "+Z",
    upVector: [0, 0, 1],
    localForwardAxis: "-Y",
    functionalForward: [0, -1, 0],
    localRightAxis: "+X",
    defaultRotation: [Math.PI / 2, 0, 0],
    groundingMode: "back_to_wall",
    groundMode: "back_to_wall",
    attachmentDirection: "south",
    confidence: "verified",
    notes: "Showerhead arm attaches to wall at back (+Y), angled shower face projects forward and down (-Y, -Z).",
  },

  // 10. HAND SHOWER: Wall-bracket mounted hand shower wand
  hand_shower: {
    role: "hand_shower",
    mountSurface: "wall",
    primaryMountSurface: "wall",
    localUpAxis: "+Z",
    upVector: [0, 0, 1],
    localForwardAxis: "-Y",
    functionalForward: [0, -1, 0],
    localRightAxis: "+X",
    defaultRotation: [Math.PI / 2, 0, 0],
    groundingMode: "back_to_wall",
    groundMode: "back_to_wall",
    attachmentDirection: "south",
    confidence: "verified",
    notes: "Hand shower cradle mounted to wall at back (+Y), wand faces into shower enclosure (-Y).",
  },

  // 11. SHOWER DOOR: Floor and wall glass enclosure panel
  shower_door: {
    role: "shower_door",
    mountSurface: "floor",
    primaryMountSurface: "floor",
    localUpAxis: "+Z",
    upVector: [0, 0, 1],
    localForwardAxis: "-Y",
    functionalForward: [0, -1, 0],
    localRightAxis: "+X",
    defaultRotation: [Math.PI / 2, 0, 0],
    groundingMode: "base_to_floor",
    groundMode: "base_to_floor",
    attachmentDirection: "south",
    confidence: "profile_inferred",
    notes: "Shower enclosure door standing vertically from floor up.",
  },

  // 12. ACCESSORY: Wall-mounted towel bars, robe hooks, paper holders, mirrors
  accessory: {
    role: "accessory",
    mountSurface: "wall",
    primaryMountSurface: "wall",
    localUpAxis: "+Z",
    upVector: [0, 0, 1],
    localForwardAxis: "-Y",
    functionalForward: [0, -1, 0],
    localRightAxis: "+X",
    defaultRotation: [Math.PI / 2, 0, 0],
    groundingMode: "back_to_wall",
    groundMode: "back_to_wall",
    attachmentDirection: "south",
    confidence: "profile_inferred",
    notes: "Bathroom accessory mounting bracket attaches flush against wall at back (+Y).",
  },

  // 13. OTHER: Secondary or non-standard bathroom products
  other: {
    role: "other",
    mountSurface: "floor",
    primaryMountSurface: "floor",
    localUpAxis: "+Z",
    upVector: [0, 0, 1],
    localForwardAxis: "-Y",
    functionalForward: [0, -1, 0],
    localRightAxis: "+X",
    defaultRotation: [Math.PI / 2, 0, 0],
    groundingMode: "base_to_floor",
    groundMode: "base_to_floor",
    attachmentDirection: "south",
    confidence: "profile_inferred",
    notes: "Generic product profile with default floor grounding.",
  },

  // 14. UNKNOWN: Fallback for unclassified products
  unknown: {
    role: "unknown",
    mountSurface: "floor",
    primaryMountSurface: "floor",
    localUpAxis: "+Z",
    upVector: [0, 0, 1],
    localForwardAxis: "-Y",
    functionalForward: [0, -1, 0],
    localRightAxis: "+X",
    defaultRotation: [Math.PI / 2, 0, 0],
    groundingMode: "base_to_floor",
    groundMode: "base_to_floor",
    attachmentDirection: "south",
    confidence: "needs_review",
    notes: "Unknown fixture profile requiring manual verification.",
  },
};

/**
 * Explicit Product Overrides for idiosyncratic CAD models identified during audit.
 */
export const PRODUCT_SPECIFIC_OVERRIDES: Record<string, Partial<ProductOrientationProfile>> = {
  // Statement Round Showerhead with Arm: Arm extends horizontally from wall
  "28695IN-CP": {
    confidence: "needs_review",
    notes: "CAD arm modeled along native Y. Arm requires horizontal pitch when wall-mounted.",
  },
};

/**
 * Retrieves the orientation profile for a product given its semantic role and product code.
 */
export function getProductOrientationProfile(
  role: ProductSemanticRole,
  productCode?: string,
): ProductOrientationProfile {
  const archetype = ARCHETYPE_ORIENTATION_PROFILES[role] ?? ARCHETYPE_ORIENTATION_PROFILES.unknown;
  if (productCode && PRODUCT_SPECIFIC_OVERRIDES[productCode]) {
    return {
      ...archetype,
      ...PRODUCT_SPECIFIC_OVERRIDES[productCode],
      productCode,
    };
  }
  return { ...archetype, productCode };
}

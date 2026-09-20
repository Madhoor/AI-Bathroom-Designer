/**
 * Authoritative Factual Product Semantic Layer
 *
 * Classifies KOHLER catalogue products into controlled architectural roles
 * based exclusively on authentic catalogue categories, subcategories, and specifications.
 * Strictly prevents geometry-based or price-based role hallucinations
 * (e.g. vessel sink 2749T-1-0 can NEVER become a bathtub).
 */

export const PRODUCT_SEMANTIC_ROLES = [
  "toilet",
  "basin",
  "vanity",
  "faucet",
  "bath",
  "bath_filler",
  "bath_drain",
  "rainhead",
  "showerhead",
  "hand_shower",
  "shower_door",
  "accessory",
  "other",
  "unknown",
] as const;

export type ProductSemanticRole = (typeof PRODUCT_SEMANTIC_ROLES)[number];

export type MountSurface = "floor" | "wall" | "deck" | "ceiling" | "freestanding";

export interface ProductInputLike {
  productCode?: string;
  productName?: string;
  category?: string;
  subcategory?: string;
  installationType?: string;
  role?: string;
  metadata?: {
    role?: string[];
    bathroomZones?: string[];
    mountSurface?: string[];
  };
}

export interface ResolvedProductSemantics {
  role: ProductSemanticRole;
  mountSurface: MountSurface;
  primaryZone: "toilet" | "basin" | "shower" | "bath" | "general";
  confidence: "authoritative_catalogue" | "inferred_specification" | "fallback_unknown";
  classificationReason: string;
}

/**
 * Classifies a product into its controlled architectural role using authoritative catalogue data.
 */
export function resolveProductSemantics(product: ProductInputLike): ResolvedProductSemantics {
  // CRITICAL HARD INVARIANT:
  // Product 2749T-1-0 is "Forefront 90 cm rectangular vessel bathroom sink".
  // Historic buggy metadata matched "bath" in "bathroom sink" and mapped it to bathtub.
  // We lock this explicitly so it can NEVER be classified as a bath.
  if (product.productCode === "2749T-1-0") {
    return {
      role: "basin",
      mountSurface: "deck",
      primaryZone: "basin",
      confidence: "authoritative_catalogue",
      classificationReason:
        "Explicit catalogue protection: 2749T-1-0 is Forefront 90cm rectangular vessel bathroom sink",
    };
  }

  const category = (product.category ?? "").trim().toLowerCase();
  const subcategory = (product.subcategory ?? "").trim().toLowerCase();
  const productName = (product.productName ?? "").trim().toLowerCase();
  const installType = (product.installationType ?? "").trim().toLowerCase();
  const explicitRole = (product.role ?? product.metadata?.role?.[0] ?? "").trim().toLowerCase();

  // -------------------------------------------------------------------------
  // 1. TOILET AREA
  // -------------------------------------------------------------------------
  if (
    category.includes("toilet") ||
    subcategory.includes("toilet") ||
    subcategory.includes("one piece") ||
    subcategory.includes("two piece") ||
    subcategory.includes("wall hung") ||
    subcategory.includes("smart toilet") ||
    explicitRole === "toilet"
  ) {
    const isWallHung = subcategory.includes("wall hung") || installType.includes("wall-hung");
    return {
      role: "toilet",
      mountSurface: isWallHung ? "wall" : "floor",
      primaryZone: "toilet",
      confidence: "authoritative_catalogue",
      classificationReason: `Toilet Area classification: ${product.subcategory ?? product.category ?? explicitRole}`,
    };
  }

  // -------------------------------------------------------------------------
  // 2. WELLNESS / BATH AREA (BATHTUBS)
  // -------------------------------------------------------------------------
  if (
    category.includes("wellness") ||
    subcategory.includes("bathtubs") ||
    subcategory.includes("drop-in bathtubs") ||
    subcategory.includes("freestanding bathtubs") ||
    explicitRole === "bath" ||
    explicitRole === "bathtub"
  ) {
    const isFreestanding = subcategory.includes("freestanding") || installType.includes("freestanding");
    return {
      role: "bath",
      mountSurface: isFreestanding ? "freestanding" : "floor",
      primaryZone: "bath",
      confidence: "authoritative_catalogue",
      classificationReason: `Wellness / Bathtub classification: ${product.subcategory ?? product.category ?? explicitRole}`,
    };
  }

  // -------------------------------------------------------------------------
  // 3. BASIN AREA (VANITIES, BASINS, FAUCETS, SPOUTS)
  // -------------------------------------------------------------------------
  if (
    category.includes("basin") ||
    category.includes("washbasin") ||
    explicitRole === "basin" ||
    explicitRole === "faucet" ||
    explicitRole === "vanity" ||
    explicitRole === "bath_filler"
  ) {
    // 3A. Vanities & Cabinets
    if (subcategory.includes("vanity") && !subcategory.includes("basin")) {
      const isWallHung = installType.includes("wall-hung") || productName.includes("wall-hung");
      return {
        role: "vanity",
        mountSurface: isWallHung ? "wall" : "floor",
        primaryZone: "basin",
        confidence: "authoritative_catalogue",
        classificationReason: `Basin Area bathroom vanity classification: ${product.subcategory}`,
      };
    }

    // 3B. Bathtub Faucets / Spouts (under Basin Area category in KOHLER India)
    if (
      subcategory.includes("bathtub faucets") ||
      subcategory.includes("bath spout") ||
      explicitRole === "bath_filler"
    ) {
      const isWallMount = installType.includes("wall-mount") || productName.includes("wall-mount");
      return {
        role: "bath_filler",
        mountSurface: isWallMount ? "wall" : "deck",
        primaryZone: "bath",
        confidence: "authoritative_catalogue",
        classificationReason: `Bathtub filler/spout classification: ${product.subcategory ?? explicitRole}`,
      };
    }

    // 3C. Basin Faucets (Single Control, Tall, Wall-Mount, Widespread)
    if (
      subcategory.includes("faucet") ||
      subcategory.includes("faucets") ||
      subcategory.includes("single control") ||
      subcategory.includes("tall faucets") ||
      subcategory.includes("widespread") ||
      explicitRole === "faucet"
    ) {
      const isWallMount = subcategory.includes("wall-mount") || installType.includes("wall-mount");
      return {
        role: "faucet",
        mountSurface: isWallMount ? "wall" : "deck",
        primaryZone: "basin",
        confidence: "authoritative_catalogue",
        classificationReason: `Basin Area faucet classification: ${product.subcategory ?? explicitRole}`,
      };
    }

    // 3D. Basins & Sinks
    if (
      subcategory.includes("basin") ||
      subcategory.includes("sink") ||
      subcategory.includes("lavatory") ||
      explicitRole === "basin" ||
      !subcategory
    ) {
      const isWallMount = subcategory.includes("wall mount") || installType.includes("wall-mount");
      return {
        role: "basin",
        mountSurface: isWallMount ? "wall" : "deck",
        primaryZone: "basin",
        confidence: "authoritative_catalogue",
        classificationReason: `Basin Area lavatory/sink classification: ${product.subcategory ?? "Basin"}`,
      };
    }
  }

  // -------------------------------------------------------------------------
  // 4. SHOWERING AREA (RAINHEADS, SHOWERHEADS, HAND SHOWERS, DOORS)
  // -------------------------------------------------------------------------
  if (
    category.includes("showering") ||
    category.includes("shower") ||
    explicitRole === "rainhead" ||
    explicitRole === "showerhead" ||
    explicitRole === "hand_shower" ||
    explicitRole === "shower_door"
  ) {
    if (
      subcategory.includes("rainhead") ||
      subcategory.includes("rainpanel") ||
      explicitRole === "rainhead"
    ) {
      return {
        role: "rainhead",
        mountSurface: "ceiling",
        primaryZone: "shower",
        confidence: "authoritative_catalogue",
        classificationReason: `Showering Area rainhead classification: ${product.subcategory ?? explicitRole}`,
      };
    }

    if (
      subcategory.includes("hand shower") ||
      subcategory.includes("handshower") ||
      explicitRole === "hand_shower"
    ) {
      return {
        role: "hand_shower",
        mountSurface: "wall",
        primaryZone: "shower",
        confidence: "authoritative_catalogue",
        classificationReason: `Showering Area hand shower classification: ${product.subcategory ?? explicitRole}`,
      };
    }

    if (
      subcategory.includes("showerhead") ||
      subcategory.includes("shower head") ||
      explicitRole === "showerhead"
    ) {
      return {
        role: "showerhead",
        mountSurface: "wall",
        primaryZone: "shower",
        confidence: "authoritative_catalogue",
        classificationReason: `Showering Area showerhead classification: ${product.subcategory ?? explicitRole}`,
      };
    }

    if (subcategory.includes("door") || subcategory.includes("screen") || explicitRole === "shower_door") {
      return {
        role: "shower_door",
        mountSurface: "floor",
        primaryZone: "shower",
        confidence: "authoritative_catalogue",
        classificationReason: `Showering Area shower door classification: ${product.subcategory ?? explicitRole}`,
      };
    }
  }

  // Direct explicit role fallback
  if (explicitRole) {
    for (const validRole of PRODUCT_SEMANTIC_ROLES) {
      if (explicitRole === validRole) {
        return {
          role: validRole,
          mountSurface: "floor",
          primaryZone: "general",
          confidence: "inferred_specification",
          classificationReason: `Direct role match: ${explicitRole}`,
        };
      }
    }
  }

  // -------------------------------------------------------------------------
  // 5. INFERRED FROM PRODUCT NAME / SPECIFICATIONS
  // -------------------------------------------------------------------------
  if (productName.includes("toilet") || productName.includes("commode") || productName.includes("closet")) {
    return {
      role: "toilet",
      mountSurface: productName.includes("wall-hung") ? "wall" : "floor",
      primaryZone: "toilet",
      confidence: "inferred_specification",
      classificationReason: `Product name inference: toilet fixture`,
    };
  }

  if (productName.includes("bath") && !productName.includes("bathroom sink") && !productName.includes("bath spout")) {
    return {
      role: "bath",
      mountSurface: productName.includes("freestanding") ? "freestanding" : "floor",
      primaryZone: "bath",
      confidence: "inferred_specification",
      classificationReason: `Product name inference: bathtub`,
    };
  }

  if (productName.includes("sink") || productName.includes("lavatory") || productName.includes("basin")) {
    return {
      role: "basin",
      mountSurface: "deck",
      primaryZone: "basin",
      confidence: "inferred_specification",
      classificationReason: `Product name inference: basin/sink`,
    };
  }

  if (productName.includes("faucet") || productName.includes("tap")) {
    return {
      role: "faucet",
      mountSurface: "deck",
      primaryZone: "basin",
      confidence: "inferred_specification",
      classificationReason: `Product name inference: faucet`,
    };
  }

  if (productName.includes("rainhead")) {
    return {
      role: "rainhead",
      mountSurface: "ceiling",
      primaryZone: "shower",
      confidence: "inferred_specification",
      classificationReason: `Product name inference: rainhead`,
    };
  }

  return {
    role: "unknown",
    mountSurface: "floor",
    primaryZone: "general",
    confidence: "fallback_unknown",
    classificationReason: `Unrecognized product category: ${product.category ?? "none"}, subcategory: ${product.subcategory ?? "none"}`,
  };
}

/**
 * Checks if a product is eligible for a specific architectural role.
 * Hard guarantees:
 * - Vessel sink 2749T-1-0 is NEVER eligible for 'bath'.
 * - Bathtubs are NEVER eligible for 'basin' or 'toilet'.
 * - Toilets are NEVER eligible for 'basin' or 'bath'.
 */
export function isProductEligibleForRole(
  product: ProductInputLike,
  targetRole: ProductSemanticRole,
): boolean {
  if (product.productCode === "2749T-1-0" && targetRole === "bath") {
    return false;
  }

  const semantics = resolveProductSemantics(product);
  return semantics.role === targetRole;
}

/**
 * Filters a list of products to only those strictly eligible for the requested role.
 */
export function getProductsForRole<T extends ProductInputLike>(
  arg1: readonly T[] | ProductSemanticRole,
  arg2: readonly T[] | ProductSemanticRole,
): T[] {
  let products: readonly T[];
  let targetRole: ProductSemanticRole;

  if (typeof arg1 === "string") {
    targetRole = arg1 as ProductSemanticRole;
    products = arg2 as readonly T[];
  } else {
    products = arg1 as readonly T[];
    targetRole = arg2 as ProductSemanticRole;
  }

  return (products ?? []).filter((p) => isProductEligibleForRole(p, targetRole));
}

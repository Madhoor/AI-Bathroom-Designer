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

  const isBathFillerSubcategory =
    subcategory.includes("bathtub faucets") ||
    subcategory.includes("bath spout") ||
    subcategory.includes("bath filler") ||
    subcategory.includes("tub spout") ||
    subcategory.includes("tub filler");

  const isFaucetSubcategory =
    !isBathFillerSubcategory &&
    (subcategory.includes("faucet") ||
      subcategory.includes("faucets") ||
      subcategory.includes("single control") ||
      subcategory.includes("tall faucets") ||
      subcategory.includes("widespread"));

  const isBathFiller =
    isBathFillerSubcategory ||
    productName.includes("bath spout") ||
    productName.includes("bath filler") ||
    productName.includes("tub spout") ||
    productName.includes("tub filler") ||
    explicitRole === "bath_filler";

  const isFaucet =
    !isBathFiller &&
    (isFaucetSubcategory ||
      productName.includes("faucet") ||
      productName.includes("tap") ||
      explicitRole === "faucet");

  const isVanity =
    !isBathFiller &&
    !isFaucet &&
    subcategory.includes("vanity") &&
    !subcategory.includes("basin");

  const isSinkOrBasinSubcategory =
    !isBathFiller &&
    !isFaucet &&
    !isVanity &&
    (subcategory.includes("basin") ||
      subcategory.includes("sink") ||
      subcategory.includes("lavatory") ||
      subcategory.includes("washbasin") ||
      subcategory.includes("vessel") ||
      subcategory.includes("undermount") ||
      subcategory.includes("vanity top") ||
      subcategory.includes("semi recessed"));

  const isSinkOrBasinName =
    !isBathFiller &&
    !isFaucet &&
    !isVanity &&
    (productName.includes("sink") ||
      productName.includes("lavatory") ||
      productName.includes("washbasin") ||
      productName.includes("basin"));

  const isSinkOrBasinCategory =
    !isBathFiller &&
    !isFaucet &&
    !isVanity &&
    (category.includes("basin") ||
      category.includes("washbasin") ||
      category.includes("sink") ||
      category.includes("lavatory"));

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
    (explicitRole === "toilet" && !isSinkOrBasinSubcategory && !isSinkOrBasinName && !isFaucet && !isBathFiller)
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
  // 2. BASIN AREA (VANITIES, BASINS, FAUCETS, SPOUTS)
  // Evaluated BEFORE Wellness/Bathtub to prevent sinks in any category from becoming baths
  // -------------------------------------------------------------------------
  if (
    isBathFiller ||
    isFaucet ||
    isVanity ||
    isSinkOrBasinCategory ||
    isSinkOrBasinSubcategory ||
    isSinkOrBasinName ||
    explicitRole === "basin"
  ) {
    // 2A. Bathtub Faucets / Spouts (often categorized under Basin Area in KOHLER India)
    if (isBathFiller) {
      const isWallMount = installType.includes("wall-mount") || productName.includes("wall-mount");
      return {
        role: "bath_filler",
        mountSurface: isWallMount ? "wall" : "deck",
        primaryZone: "bath",
        confidence: "authoritative_catalogue",
        classificationReason: `Bathtub filler/spout classification: ${product.subcategory ?? explicitRole}`,
      };
    }

    // 2B. Basin Faucets (Single Control, Tall, Wall-Mount, Widespread)
    if (isFaucet) {
      const isWallMount = subcategory.includes("wall-mount") || installType.includes("wall-mount") || productName.includes("wall-mount");
      return {
        role: "faucet",
        mountSurface: isWallMount ? "wall" : "deck",
        primaryZone: "basin",
        confidence: "authoritative_catalogue",
        classificationReason: `Basin Area faucet classification: ${product.subcategory ?? explicitRole}`,
      };
    }

    // 2C. Vanities & Cabinets
    if (isVanity) {
      const isWallHung = installType.includes("wall-hung") || productName.includes("wall-hung");
      return {
        role: "vanity",
        mountSurface: isWallHung ? "wall" : "floor",
        primaryZone: "basin",
        confidence: "authoritative_catalogue",
        classificationReason: `Basin Area bathroom vanity classification: ${product.subcategory}`,
      };
    }

    // 2D. Basins & Sinks (default for Basin Area or sink/basin subcategories/names)
    const isWallMount = subcategory.includes("wall mount") || installType.includes("wall-mount") || productName.includes("wall-hung");
    return {
      role: "basin",
      mountSurface: isWallMount ? "wall" : "deck",
      primaryZone: "basin",
      confidence: "authoritative_catalogue",
      classificationReason: `Basin Area lavatory/sink classification: ${product.subcategory || product.category || "Basin"}`,
    };
  }

  // -------------------------------------------------------------------------
  // 3. SHOWERING AREA (RAINHEADS, SHOWERHEADS, HAND SHOWERS, DOORS)
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

  // -------------------------------------------------------------------------
  // 4. BATHTUBS (WELLNESS / BATH AREA)
  // Rules:
  // - Never classify as bathtub merely because category contains "wellness".
  // - A bathtub MUST have authoritative bathtub evidence (explicit subcategory or verified role).
  // - Explicit role bath/bathtub is ONLY trusted if there is no conflicting sink/faucet evidence.
  // -------------------------------------------------------------------------
  const isAuthoritativeBathtubSubcat =
    subcategory.includes("bathtubs") ||
    subcategory.includes("drop-in bathtubs") ||
    subcategory.includes("freestanding bathtubs") ||
    subcategory.includes("alcove bathtubs") ||
    subcategory.includes("whirlpools") ||
    subcategory.includes("whirlpool");

  const hasNoSinkEvidence = !isSinkOrBasinSubcategory && !isSinkOrBasinName && !isSinkOrBasinCategory;

  if (
    isAuthoritativeBathtubSubcat ||
    ((explicitRole === "bath" || explicitRole === "bathtub") && hasNoSinkEvidence) ||
    (category.includes("wellness") && isAuthoritativeBathtubSubcat)
  ) {
    const isFreestanding = subcategory.includes("freestanding") || installType.includes("freestanding") || productName.includes("freestanding");
    return {
      role: "bath",
      mountSurface: isFreestanding ? "freestanding" : "floor",
      primaryZone: "bath",
      confidence: "authoritative_catalogue",
      classificationReason: `Bathtub classification: ${product.subcategory || product.category || explicitRole}`,
    };
  }

  // Direct explicit role fallback (guarded against corrupt bath tags)
  if (explicitRole && explicitRole !== "bath" && explicitRole !== "bathtub") {
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
  // 5. INFERRED FROM PRODUCT NAME / SPECIFICATIONS (LAST-RESORT FALLBACK ONLY)
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

  // Basin / Sink inference (MUST precede bath inference to prevent "bathroom sink" matching bath)
  if (isSinkOrBasinName) {
    const isWallMount = productName.includes("wall-hung") || productName.includes("wall-mount") || installType.includes("wall-mount");
    return {
      role: "basin",
      mountSurface: isWallMount ? "wall" : "deck",
      primaryZone: "basin",
      confidence: "inferred_specification",
      classificationReason: `Product name inference: basin/sink fixture`,
    };
  }

  if (productName.includes("bath spout") || productName.includes("bath filler") || productName.includes("tub spout")) {
    return {
      role: "bath_filler",
      mountSurface: productName.includes("wall-mount") ? "wall" : "deck",
      primaryZone: "bath",
      confidence: "inferred_specification",
      classificationReason: `Product name inference: bath filler`,
    };
  }

  if (productName.includes("faucet") || productName.includes("tap")) {
    return {
      role: "faucet",
      mountSurface: productName.includes("wall-mount") ? "wall" : "deck",
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

  // Bathtub name inference: requires strict bathtub evidence and must NEVER match "bathroom sink", "bathroom basin", bath accessories, mats, towels, etc.
  const isNonBathtubBathPhrase =
    productName.includes("bathroom") ||
    productName.includes("bath spout") ||
    productName.includes("bath filler") ||
    productName.includes("bath towel") ||
    productName.includes("towel") ||
    productName.includes("bath sheet") ||
    productName.includes("bath mat") ||
    productName.includes("mat") ||
    productName.includes("accessory");

  const isGenuineBathtubName =
    (productName.includes("bathtub") ||
      productName.includes("bath tub") ||
      productName.includes("freestanding bath") ||
      productName.includes("drop-in bath") ||
      productName.includes("whirlpool bath")) &&
    !isNonBathtubBathPhrase;

  if (isGenuineBathtubName) {
    const isFreestanding = productName.includes("freestanding") || installType.includes("freestanding");
    return {
      role: "bath",
      mountSurface: isFreestanding ? "freestanding" : "floor",
      primaryZone: "bath",
      confidence: "inferred_specification",
      classificationReason: `Product name inference: genuine bathtub`,
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

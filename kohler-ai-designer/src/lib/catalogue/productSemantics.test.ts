import { describe, expect, it } from "vitest";
import {
  getProductsForRole,
  isProductEligibleForRole,
  resolveProductSemantics,
} from "./productSemantics";

describe("Factual Product Semantics Layer", () => {
  // Test Case: The specific product 2749T-1-0 mentioned in user prompt
  const forefrontSink = {
    productCode: "2749T-1-0",
    productName: "Forefront™ 90 cm rectangular vessel bathroom sink with glazed underside",
    category: "Basin Area",
    subcategory: "Vanity Top Basin",
    installationType: "Vessel",
  };

  const reachBathtub = {
    productCode: "15847T-0",
    productName: "Reach™ 150 cm x 70 cm drop-in bath",
    category: "Wellness",
    subcategory: "Drop-in Bathtubs",
    installationType: "Drop-in",
  };

  const innateToilet = {
    productCode: "29777IN-0",
    productName: "Innate™ One-piece elongated smart toilet, dual-flush",
    category: "Toilet Area",
    subcategory: "One Piece",
    installationType: "Floor-mount",
  };

  const modernLifeRainhead = {
    productCode: "29961IN-CP",
    productName: "ModernLife Edge™ 42.5 cm x 33 cm two-function rainhead",
    category: "Showering Area",
    subcategory: "Rainheads",
    installationType: "Ceiling",
  };

  const composedFaucet = {
    productCode: "20070IN-4-CP",
    productName: "Composed™ Tall single-control bathroom sink faucet",
    category: "Basin Area",
    subcategory: "Tall Faucets",
    installationType: "Deck-mount",
  };

  const acclivBathSpout = {
    productCode: "33074IN-CP",
    productName: "Accliv™ Wall-mount bath spout",
    category: "Basin Area",
    subcategory: "Bathtub Faucets",
    installationType: "Wall-mount",
  };

  describe("Product 2749T-1-0 Forefront Sink Protection", () => {
    it("MUST classify 2749T-1-0 as basin and NEVER as bath", () => {
      const semantics = resolveProductSemantics(forefrontSink);
      expect(semantics.role).toBe("basin");
      expect(semantics.primaryZone).toBe("basin");
      expect(semantics.mountSurface).toBe("deck");
    });

    it("ensures isProductEligibleForRole rejects bath for 2749T-1-0", () => {
      expect(isProductEligibleForRole(forefrontSink, "bath")).toBe(false);
      expect(isProductEligibleForRole(forefrontSink, "basin")).toBe(true);
      expect(isProductEligibleForRole(forefrontSink, "toilet")).toBe(false);
    });
  });

  describe("Bathtub Protection", () => {
    it("classifies real bathtubs as bath", () => {
      const semantics = resolveProductSemantics(reachBathtub);
      expect(semantics.role).toBe("bath");
      expect(semantics.primaryZone).toBe("bath");
      expect(semantics.mountSurface).toBe("floor");
    });

    it("ensures bathtubs can NEVER be classified as basin or toilet", () => {
      expect(isProductEligibleForRole(reachBathtub, "basin")).toBe(false);
      expect(isProductEligibleForRole(reachBathtub, "toilet")).toBe(false);
      expect(isProductEligibleForRole(reachBathtub, "bath")).toBe(true);
    });
  });

  describe("Toilet Protection", () => {
    it("classifies toilets as toilet with floor mounting", () => {
      const semantics = resolveProductSemantics(innateToilet);
      expect(semantics.role).toBe("toilet");
      expect(semantics.primaryZone).toBe("toilet");
      expect(semantics.mountSurface).toBe("floor");
    });

    it("ensures toilets can NEVER be classified as bath or basin", () => {
      expect(isProductEligibleForRole(innateToilet, "bath")).toBe(false);
      expect(isProductEligibleForRole(innateToilet, "basin")).toBe(false);
      expect(isProductEligibleForRole(innateToilet, "toilet")).toBe(true);
    });
  });

  describe("Showering & Faucet Classification", () => {
    it("classifies rainhead as rainhead with ceiling mounting", () => {
      const semantics = resolveProductSemantics(modernLifeRainhead);
      expect(semantics.role).toBe("rainhead");
      expect(semantics.primaryZone).toBe("shower");
      expect(semantics.mountSurface).toBe("ceiling");
    });

    it("classifies basin faucets as faucet with deck mounting", () => {
      const semantics = resolveProductSemantics(composedFaucet);
      expect(semantics.role).toBe("faucet");
      expect(semantics.primaryZone).toBe("basin");
      expect(semantics.mountSurface).toBe("deck");
    });

    it("classifies bathtub spouts as bath_filler with wall mounting", () => {
      const semantics = resolveProductSemantics(acclivBathSpout);
      expect(semantics.role).toBe("bath_filler");
      expect(semantics.primaryZone).toBe("bath");
      expect(semantics.mountSurface).toBe("wall");
    });
  });

  describe("Role Filtering API (getProductsForRole)", () => {
    const mixedProducts = [
      forefrontSink,
      reachBathtub,
      innateToilet,
      modernLifeRainhead,
      composedFaucet,
      acclivBathSpout,
    ];

    it("returns only genuine bathtubs for bath role, excluding 2749T-1-0", () => {
      const baths = getProductsForRole("bath", mixedProducts);
      expect(baths.length).toBe(1);
      expect(baths[0].productCode).toBe("15847T-0");
      expect(baths.some((p) => p.productCode === "2749T-1-0")).toBe(false);
    });

    it("returns 2749T-1-0 when filtering for basin role", () => {
      const basins = getProductsForRole("basin", mixedProducts);
      expect(basins.length).toBe(1);
      expect(basins[0].productCode).toBe("2749T-1-0");
    });

    it("returns toilets when filtering for toilet role", () => {
      const toilets = getProductsForRole("toilet", mixedProducts);
      expect(toilets.length).toBe(1);
      expect(toilets[0].productCode).toBe("29777IN-0");
    });
  });

  describe("Unknown Products Handling", () => {
    it("preserves unknown products as unknown without guessing", () => {
      const mysteryItem = {
        productCode: "XYZ-999",
        productName: "Unmarked Generic Accessory Component",
        category: "Custom Hardware",
        subcategory: "Miscellaneous",
      };
      const semantics = resolveProductSemantics(mysteryItem);
      expect(semantics.role).toBe("unknown");
      expect(semantics.confidence).toBe("fallback_unknown");
    });
  });
});

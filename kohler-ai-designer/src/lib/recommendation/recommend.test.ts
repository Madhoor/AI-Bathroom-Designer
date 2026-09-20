import { describe, expect, it } from "vitest";
import { recommendDesigns } from "./recommend";
import type { RecommendationCatalog, RecommendationProduct } from "./types";

const room = { widthM: 3, depthM: 3, heightM: 2.4, doors: [], windows: [] };
const product = (code: string, role: string, price = 100, widthMm = 500): RecommendationProduct => ({
  productCode: code, currentPrice: price, widthMm, depthMm: 500, heightMm: 500,
  metadata: { role: [role], bathroomZones: [role], mountSurface: ["floor"], requiresHostProduct: false },
});
const catalog = (products: RecommendationProduct[]): RecommendationCatalog => ({ products });
const hostDependentBasin = (code: string): RecommendationProduct => ({
  ...product(code, "basin"),
  metadata: { role: ["basin"], bathroomZones: ["basin"], mountSurface: ["counter"], requiresHostProduct: true, hostRoles: ["vanity"] },
});

describe("recommendDesigns", () => {
  it("rejects over-budget candidates and keeps valid products", () => {
    const result = recommendDesigns({ room, budget: 150, requiredRoles: ["toilet"] }, catalog([product("EXPENSIVE", "toilet", 200), product("VALID", "toilet", 100)]));
    expect(result.best?.selectedProducts[0].productCode).toBe("VALID");
  });

  it("keeps a priced product within the requested budget", () => {
    const result = recommendDesigns({ room, budget: 100, requiredRoles: ["toilet"] }, catalog([product("VALID", "toilet", 100)]));
    expect(result.best?.estimatedProductTotal).toBe(100);
  });

  it("rejects a budgeted candidate with no catalogue price", () => {
    const unpriced = { ...product("UNPRICED", "toilet"), currentPrice: undefined, listPrice: undefined };
    const result = recommendDesigns({ room, budget: 100, requiredRoles: ["toilet"] }, catalog([unpriced]));
    expect(result.best).toBeUndefined();
    expect(result.rejectedCandidates.some((item) => item.reason.includes("price"))).toBe(true);
  });

  it("rejects candidates without dimensions", () => {
    const missing = { ...product("MISSING", "toilet"), widthMm: undefined };
    const result = recommendDesigns({ room, requiredRoles: ["toilet"] }, catalog([missing]));
    expect(result.best).toBeUndefined();
    expect(result.rejectedCandidates.some((item) => item.reason.includes("Missing complete dimensions"))).toBe(true);
  });

  it("does not invent an unresolved required relationship", () => {
    const result = recommendDesigns({ room, requiredRoles: ["basin"] }, {
      products: [product("BASE", "basin")],
      relations: [{ sourceProductCode: "BASE", targetReference: "inRiver_missing", relationType: "requires", resolutionStatus: "unresolved", confidence: 0 }],
    });
    expect(result.best?.selectedProducts).toHaveLength(1);
    expect(result.best?.warnings[0]).toContain("not assumed");
  });

  it("includes explicit required components and does not guess unresolved ones", () => {
    const base = product("BASE", "basin");
    const component = product("FAUCET", "faucet");
    const result = recommendDesigns({ room, requiredRoles: ["basin"] }, {
      products: [base, component],
      assemblies: [{ assemblyId: "basin:BASE", productCode: "BASE", components: [{ productCode: "FAUCET", required: true, referenceResolved: true }] }],
      relations: [{ sourceProductCode: "BASE", relationType: "requires", targetReference: "inRiver_1", resolutionStatus: "unresolved", confidence: 0 }],
    });
    expect(result.best?.selectedProducts.map((item) => item.productCode)).toEqual(["BASE", "FAUCET"]);
    expect(result.best?.warnings.some((warning) => warning.includes("unresolved"))).toBe(true);
  });

  it("allows a valid spatial candidate to reach ranking", () => {
    const result = recommendDesigns({ room, requiredRoles: ["toilet"] }, catalog([product("VALID", "toilet")]));
    expect(result.best?.score).toBeGreaterThan(0);
  });

  it("ranks valid designs deterministically, returns at most three, and uses stable ties", () => {
    const input = { room, requiredRoles: ["toilet"] };
    const products = [product("B", "toilet"), product("A", "toilet"), product("C", "toilet"), product("D", "toilet")];
    const first = recommendDesigns(input, catalog(products), 3);
    const second = recommendDesigns(input, catalog(products), 3);
    expect(first.alternatives).toHaveLength(3);
    expect(first.alternatives.map((item) => item.selectedProducts[0].productCode)).toEqual(["A", "B", "C"]);
    expect(second).toEqual(first);
  });

  it("limits alternatives to the requested top three", () => {
    const products = ["A", "B", "C", "D"].map((code) => product(code, "toilet"));
    expect(recommendDesigns({ room, requiredRoles: ["toilet"] }, catalog(products), 2).alternatives).toHaveLength(2);
  });

  it("rejects an invalid spatial candidate", () => {
    const result = recommendDesigns({ room: { ...room, widthM: 0.4 }, requiredRoles: ["toilet"] }, catalog([product("TOO-WIDE", "toilet", 100, 500)]));
    expect(result.best).toBeUndefined();
    expect(result.rejectedCandidates.some((item) => item.reason.includes("spatial"))).toBe(true);
  });

  it("rejects a host-dependent basin when no factual host is available", () => {
    const result = recommendDesigns({ room, requiredRoles: ["basin"] }, catalog([hostDependentBasin("UNDERCOUNTER")]));
    expect(result.best).toBeUndefined();
    expect(result.rejectedCandidates.some((item) => item.reason.includes("unavailable host"))).toBe(true);
  });

  it("keeps a standalone basin eligible", () => {
    const result = recommendDesigns({ room, requiredRoles: ["basin"] }, catalog([product("STANDALONE", "basin")]));
    expect(result.best?.selectedProducts.map((item) => item.productCode)).toEqual(["STANDALONE"]);
  });

  it("does not fabricate an incomplete optional vanity assembly", () => {
    const result = recommendDesigns(
      { room, requiredRoles: ["basin"], optionalRoles: ["vanity"] },
      catalog([product("BASIN", "basin"), product("VANITY", "vanity")]),
    );
    expect(result.best?.selectedProducts.map((item) => item.productCode)).toEqual(["BASIN"]);
    expect(result.best?.warnings).toContain("Optional vanity assembly is currently unavailable from verified catalogue relationships; no vanity was selected.");
  });

  it("does not let an unavailable optional vanity block a basic bathroom", () => {
    const result = recommendDesigns(
      { room, requiredRoles: ["toilet", "basin"], optionalRoles: ["vanity"] },
      catalog([product("TOILET", "toilet"), product("BASIN", "basin"), product("VANITY", "vanity")]),
    );
    expect(result.best?.selectedProducts.map((item) => item.productCode)).toEqual(["BASIN", "TOILET"]);
    expect(result.best?.warnings.join(" ")).toContain("vanity assembly is currently unavailable");
  });

  it("keeps host and optional assembly decisions deterministic", () => {
    const input = { room, requiredRoles: ["basin"], optionalRoles: ["vanity"] };
    const products = [hostDependentBasin("UNDERCOUNTER"), product("STANDALONE", "basin"), product("VANITY", "vanity")];
    const first = recommendDesigns(input, catalog(products));
    const second = recommendDesigns(input, catalog(products));
    expect(second).toEqual(first);
  });
});

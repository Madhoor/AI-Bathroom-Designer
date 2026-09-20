import { describe, expect, it } from "vitest";
import { buildDesignState } from "./buildDesign";
import type { RecommendationProduct } from "../recommendation";

const room = { widthM: 3, depthM: 3, heightM: 2.4, doors: [], windows: [] };
const product = (code: string, role: string, surface: string[] = ["floor"], host = false): RecommendationProduct => ({
  productCode: code, widthMm: 500, depthMm: 500, heightMm: 500, currentPrice: 100,
  metadata: { role: [role], bathroomZones: [role], mountSurface: surface, requiresHostProduct: host, hostRoles: host ? ["basin"] : [] },
});
const recommendation = (products: RecommendationProduct[]) => ({
  selectedProducts: products, selectedAssemblies: [], estimatedProductTotal: products.length * 100,
});

describe("buildDesignState", () => {
  it("places a simple toilet and validates the resulting state", () => {
    const result = buildDesignState(recommendation([product("TOILET", "toilet")]), { room });
    expect(result.state.placements).toHaveLength(1);
    expect(result.state.validation.valid).toBe(true);
  });

  it("does not place a product that cannot fit the room", () => {
    const result = buildDesignState(recommendation([{ ...product("WIDE", "toilet"), widthMm: 4000 }]), { room });
    expect(result.unplacedProducts).toEqual(["WIDE"]);
    expect(result.state.warnings.join(" ")).toContain("No valid placement");
  });

  it("places wall products against a wall", () => {
    const result = buildDesignState(recommendation([product("MIRROR", "mirror", ["wall"])]), { room });
    expect(result.state.placements[0].placementSurface).toBe("wall");
    expect(
      Math.abs(result.state.placements[0].position.y) > 1.0
      || Math.abs(result.state.placements[0].position.x) > 1.0,
    ).toBe(true);
  });

  it("places a host before a host-dependent product", () => {
    const result = buildDesignState(recommendation([product("FAUCET", "faucet", ["counter"], true), product("BASIN", "basin")]), { room });
    expect(result.state.placements.map((item) => item.productCode)).toEqual(["BASIN", "FAUCET"]);
    expect(result.state.placements[1].hostProductCode).toBe("BASIN");
  });

  it("warns when a host-dependent product has no host", () => {
    const result = buildDesignState(recommendation([product("FAUCET", "faucet", ["counter"], true)]), { room });
    expect(result.unplacedProducts).toEqual(["FAUCET"]);
    expect(result.state.warnings[0]).toContain("requires a placed host");
  });

  it("falls back after an overlapping candidate", () => {
    const first = { ...product("A", "toilet"), widthMm: 2800, depthMm: 500 };
    const second = { ...product("B", "basin"), widthMm: 500, depthMm: 500 };
    const result = buildDesignState(recommendation([first, second]), { room });
    expect(result.state.placements).toHaveLength(2);
    expect(result.state.validation.valid).toBe(true);
  });

  it("produces the same state for the same generatedAt input", () => {
    const input = recommendation([product("A", "toilet"), product("B", "basin")]);
    const first = buildDesignState(input, { room, generatedAt: "2026-01-01T00:00:00.000Z" });
    const second = buildDesignState(input, { room, generatedAt: "2026-01-01T00:00:00.000Z" });
    expect(second).toEqual(first);
  });

  it("warns when no valid candidate exists due to a door", () => {
    const result = buildDesignState(recommendation([product("TOILET", "toilet")]), { room: { ...room, depthM: 0.6, doors: [{ wall: "south", offsetM: 0, widthM: 3, swing: "inward" }] } });
    expect(result.unplacedProducts).toEqual(["TOILET"]);
    expect(result.state.warnings.join(" ")).toContain("No valid placement");
  });

  it("keeps selected assemblies and cost serializable", () => {
    const result = buildDesignState({ ...recommendation([product("TOILET", "toilet")]), selectedAssemblies: [{ assemblyId: "toilet:TOILET", productCode: "TOILET", components: [] }] }, { room });
    expect(result.state.selectedAssemblies[0].assemblyId).toBe("toilet:TOILET");
    expect(result.state.totalProductCost).toBe(100);
  });

  it("does not claim a valid state when an existing placement becomes invalid", () => {
    const result = buildDesignState(recommendation([product("TOILET", "toilet")]), { room: { ...room, heightM: 0.2 } });
    expect(result.state.validation.valid).toBe(false);
  });
});

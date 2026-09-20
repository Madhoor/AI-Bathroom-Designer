import { describe, expect, it } from "vitest";
import { getRotatedFootprint, footprintsIntersect } from "./geometry";
import { validateBathroomLayout } from "./validateLayout";
import type { BathroomRoom, PlacedProduct } from "./types";

const room: BathroomRoom = {
  widthM: 4,
  depthM: 3,
  heightM: 2.6,
  doors: [],
  windows: [],
};

function product(overrides: Partial<PlacedProduct> = {}): PlacedProduct {
  return {
    productCode: "TEST-1",
    xM: 1,
    yM: 1,
    zM: 0,
    rotationZDeg: 0,
    widthM: 0.8,
    depthM: 0.8,
    heightM: 0.8,
    role: "accessory",
    bathroomZone: "general",
    ...overrides,
  };
}

describe("validateBathroomLayout", () => {
  it("accepts a product completely inside the room", () => {
    const result = validateBathroomLayout(room, [product()]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("reports a product crossing the room boundary", () => {
    const result = validateBathroomLayout(room, [product({ xM: -1.9 })]);
    expect(result.errors.some((item) => item.type === "ROOM_BOUNDARY")).toBe(true);
  });

  it("reports overlapping products", () => {
    const result = validateBathroomLayout(room, [
      product({ productCode: "A" }),
      product({ productCode: "B", xM: 1.3 }),
    ]);
    expect(result.errors.some((item) => item.type === "PRODUCT_COLLISION")).toBe(true);
  });

  it("reports a product blocking a door opening", () => {
    const result = validateBathroomLayout(
      { ...room, doors: [{ wall: "south", offsetM: 1, widthM: 0.8, swing: "inward" }] },
      [product({ xM: 0, yM: -1.3 })],
    );
    expect(result.errors.some((item) => item.type === "DOOR_CLEARANCE")).toBe(true);
  });

  it("reports generic minimum-clearance warnings without presenting them as errors", () => {
    const result = validateBathroomLayout(room, [
      product({ productCode: "basin", role: "basin", xM: 0, yM: 0 }),
      product({ productCode: "nearby", xM: 0.9, yM: 0 }),
    ]);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((item) => item.type === "MINIMUM_CLEARANCE")).toBe(true);
  });

  it("requires a factual host role when metadata says the product needs one", () => {
    const result = validateBathroomLayout(room, [
      product({ productCode: "FAUCET-1", role: "basin_faucet", requiresHostProduct: true, hostRoles: ["basin"] }),
    ]);
    expect(result.errors.some((item) => item.type === "HOST_REQUIREMENT")).toBe(true);
  });

  it("accepts a supported bathtub and bath filler assembly", () => {
    const result = validateBathroomLayout(room, [
      product({ productCode: "BATH", role: "bath", bathroomZone: "bathtub", assemblyId: "bath:1", xM: 0.9, yM: 0, widthM: 1.8, depthM: 0.8 }),
      product({ productCode: "FILLER", role: "bath_filler", bathroomZone: "bathtub", assemblyId: "bath:1", xM: -0.05, yM: 0, widthM: 0.1, depthM: 0.1, requiresHostProduct: true, hostRoles: ["bath"] }),
    ], { clearanceRules: [] });
    expect(result.valid).toBe(true);
  });

  it("detects collision for rotated rectangular footprints", () => {
    const first = getRotatedFootprint(product({ xM: 0, yM: 0, widthM: 1.4, depthM: 0.4, rotationZDeg: 45 }));
    const second = getRotatedFootprint(product({ xM: 0.6, yM: 0, widthM: 1.4, depthM: 0.4, rotationZDeg: -45 }));
    expect(footprintsIntersect(first, second)).toBe(true);
  });
});

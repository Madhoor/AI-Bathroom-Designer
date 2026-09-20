import { describe, expect, it } from "vitest";
import { generateDesignVariants } from "./generateVariants";
import { parseDesignCommand } from "./commands";

describe("generateVariants pipeline", () => {
  it("generates multi-variants for standard luxury modern input", async () => {
    const result = await generateDesignVariants({
      room: { widthM: 2.4384, depthM: 1.8288, heightM: 2.7432, doors: [], windows: [] },
      budget: 500000,
      currency: "INR",
      desiredStyle: "Luxury Modern",
      requiredRoles: ["toilet", "basin", "rainhead"],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.variants.length).toBeGreaterThanOrEqual(1);
      expect(result.variants[0].label).toBe("Design A");
      expect(result.variants[0].state.validation.valid).toBe(true);
      expect(result.variants[0].presentation.heroCamera).toBeDefined();
    }
  });

  it("returns honest failure state when budget is impossibly low", async () => {
    const result = await generateDesignVariants({
      room: { widthM: 2.4384, depthM: 1.8288, heightM: 2.7432, doors: [], windows: [] },
      budget: 1000, // ₹1,000 cannot buy 3 authentic KOHLER fixtures
      currency: "INR",
      desiredStyle: "Luxury Modern",
      requiredRoles: ["toilet", "basin", "rainhead"],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toContain("criteria");
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions?.length).toBeGreaterThan(0);
    }
  });

  it("returns honest failure state when room is too small for fixtures", async () => {
    const result = await generateDesignVariants({
      room: { widthM: 0.8, depthM: 0.8, heightM: 2.4, doors: [], windows: [] }, // 0.8m x 0.8m is too small
      budget: 600000,
      currency: "INR",
      desiredStyle: "Luxury Modern",
      requiredRoles: ["toilet", "basin", "rainhead"],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.suggestions).toBeDefined();
    }
  });
});

describe("parseDesignCommand", () => {
  it("parses increase luxury intent", () => {
    const cmd = parseDesignCommand("Make it more luxurious with higher budget");
    expect(cmd.intent).toBe("increase_luxury");
    expect(cmd.modifications.budgetDelta).toBe(150000);
  });

  it("parses budget reduction intent", () => {
    const cmd = parseDesignCommand("Bring it under ₹4 lakh");
    expect(cmd.intent).toBe("reduce_budget");
    expect(cmd.modifications.budgetAbsolute).toBe(400000);
  });

  it("parses bathtub addition intent", () => {
    const cmd = parseDesignCommand("Add a bathtub to the bathroom");
    expect(cmd.intent).toBe("add_zone");
    expect(cmd.modifications.addZones).toContain("bath");
  });

  it("parses room resize intent", () => {
    const cmd = parseDesignCommand("Expand room to 10 by 8 ft");
    expect(cmd.intent).toBe("resize_room");
    expect(cmd.modifications.roomDimensionsFt?.widthFt).toBe(10);
    expect(cmd.modifications.roomDimensionsFt?.depthFt).toBe(8);
  });

  it("provides informative explanation for unsupported commands", () => {
    const cmd = parseDesignCommand("Paint the ceiling neon green");
    expect(cmd.intent).toBe("unsupported");
    expect(cmd.explanation).toContain("KOHLER");
  });
});

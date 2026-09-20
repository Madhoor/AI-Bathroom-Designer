import { describe, expect, it } from "vitest";
import { parseNaturalLanguageCommand } from "./parser";
import { getAIProvider, DeterministicAIProvider } from "./provider";
import { computeDesignDelta, computeModifiedBrief } from "./applyCommand";
import { getBaselineDesignState } from "../design/generateDesign";

describe("AI Command Parser", () => {
  it("parses luxury enhancement command", () => {
    const cmd = parseNaturalLanguageCommand("Make it more luxurious");
    expect(cmd.intent).toBe("increase_luxury");
    expect(cmd.isExecutableNow).toBe(true);
    expect(cmd.modifications.budgetDelta).toBe(150000);
    expect(cmd.modifications.style).toBe("Luxury Modern");
  });

  it("parses budget ceiling reduction", () => {
    const cmd = parseNaturalLanguageCommand("Bring it under ₹4.5 lakh");
    expect(cmd.intent).toBe("reduce_budget");
    expect(cmd.isExecutableNow).toBe(true);
    expect(cmd.modifications.budgetAbsolute).toBe(450000);
  });

  it("parses zone addition", () => {
    const cmd = parseNaturalLanguageCommand("Add a bathtub to the bathroom");
    expect(cmd.intent).toBe("add_zone");
    expect(cmd.modifications.addZones).toContain("bath");
  });

  it("parses room expansion", () => {
    const cmd = parseNaturalLanguageCommand("Expand room to 10 x 8 ft");
    expect(cmd.intent).toBe("resize_room");
    expect(cmd.modifications.roomDimensionsFt?.widthFt).toBe(10);
    expect(cmd.modifications.roomDimensionsFt?.depthFt).toBe(8);
  });

  it("parses brassware finish change", () => {
    const cmd = parseNaturalLanguageCommand("Change the faucets to French Gold");
    expect(cmd.intent).toBe("change_finish");
    expect(cmd.modifications.finish).toBe("French Gold");
  });

  it("handles unsupported requests with honest diagnostic explanation", () => {
    const cmd = parseNaturalLanguageCommand("Install a disco ball on the ceiling");
    expect(cmd.intent).toBe("unsupported");
    expect(cmd.isExecutableNow).toBe(false);
    expect(cmd.explanation).toContain("outside the verified KOHLER");
  });
});

describe("AI Provider System", () => {
  it("provides deterministic provider when no external key is present", () => {
    const provider = getAIProvider();
    expect(provider).toBeDefined();
    expect(provider.isAvailable()).toBe(true);
  });

  it("executes parseCommand asynchronously via provider interface", async () => {
    const provider = new DeterministicAIProvider();
    const cmd = await provider.parseCommand("Bring it under ₹4 lakh");
    expect(cmd.intent).toBe("reduce_budget");
    expect(cmd.modifications.budgetAbsolute).toBe(400000);
  });
});

describe("computeModifiedBrief & computeDesignDelta", async () => {
  const baselineState = await getBaselineDesignState();
  const baselineInput = {
    room: baselineState.room,
    budget: 500000,
    currency: "INR",
    desiredStyle: "Luxury Modern",
    requiredRoles: ["toilet", "basin", "rainhead"],
  };

  it("computes modified brief for budget reduction", () => {
    const command = parseNaturalLanguageCommand("Bring it under ₹4.5 lakh", baselineInput);
    const modified = computeModifiedBrief(command, baselineInput);

    expect(modified.budget).toBe(450000);
    expect(modified.desiredStyle).toBe("Luxury Modern");
    expect(modified.requiredRoles).toEqual(["toilet", "basin", "rainhead"]);
  });

  it("computes modified brief for room resize", () => {
    const command = parseNaturalLanguageCommand("Expand room to 10 by 8 ft", baselineInput);
    const modified = computeModifiedBrief(command, baselineInput);

    expect(modified.room.widthM).toBeCloseTo(10 * 0.3048, 2);
    expect(modified.room.depthM).toBeCloseTo(8 * 0.3048, 2);
  });

  it("computes delta between states", () => {
    const modifiedState = {
      ...baselineState,
      totalProductCost: baselineState.totalProductCost - 40000,
    };
    const delta = computeDesignDelta(baselineState, modifiedState, "Bring it under ₹4.5 lakh");

    expect(delta.previousCost).toBe(baselineState.totalProductCost);
    expect(delta.costDifference).toBe(-40000);
    expect(delta.summary).toContain("Reduced total investment");
  });
});

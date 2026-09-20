import { describe, expect, it } from "vitest";
import {
  BATHROOM_TEMPLATES,
  getTemplateById,
  parseNaturalLanguageBrief,
  buildDesignInputFromTemplate,
} from "./index";

describe("Bathroom Templates System", () => {
  it("contains at least 5 distinct architectural templates", () => {
    expect(BATHROOM_TEMPLATES.length).toBeGreaterThanOrEqual(5);
    const ids = BATHROOM_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(BATHROOM_TEMPLATES.length);
  });

  it("ensures each template has positive room dimensions and budget ranges", () => {
    for (const t of BATHROOM_TEMPLATES) {
      expect(t.roomDefaults.widthM).toBeGreaterThan(1.5);
      expect(t.roomDefaults.depthM).toBeGreaterThan(1.2);
      expect(t.roomDefaults.heightM).toBeGreaterThan(2.2);
      expect(t.budgetRange.min).toBeGreaterThan(0);
      expect(t.budgetRange.max).toBeGreaterThan(t.budgetRange.min);
      expect(t.budgetRange.default).toBeGreaterThanOrEqual(t.budgetRange.min);
      expect(t.budgetRange.default).toBeLessThanOrEqual(t.budgetRange.max);
      expect(t.recommendedZones.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("retrieves template by ID or returns scratch template", () => {
    const compact = getTemplateById("compact-modern");
    expect(compact.name).toBe("Compact Modern");

    const scratch = getTemplateById("scratch");
    expect(scratch.id).toBe("scratch");

    const unknown = getTemplateById("non-existent");
    expect(unknown.id).toBe(BATHROOM_TEMPLATES[0].id);
  });

  it("builds a UserDesignInput from template defaults", () => {
    const zen = getTemplateById("minimal-zen");
    const input = buildDesignInputFromTemplate(zen);
    expect(input.budget).toBe(500000);
    expect(input.desiredStyle).toBe("Zen");
    expect(input.requiredRoles).toContain("toilet");
    expect(input.requiredRoles).toContain("basin");
    expect(input.requiredRoles).toContain("rainhead");
  });

  it("applies customizations over template defaults", () => {
    const spa = getTemplateById("luxury-spa");
    const input = buildDesignInputFromTemplate(spa, {
      widthFt: 10,
      depthFt: 8,
      budget: 900000,
      style: "Modern",
    });
    expect(input.budget).toBe(900000);
    expect(input.desiredStyle).toBe("Modern");
    expect(input.room.widthM).toBeCloseTo(3.048, 2);
    expect(input.room.depthM).toBeCloseTo(2.4384, 2);
  });
});

describe("Deterministic Natural Language Parser", () => {
  it("extracts 2D dimensions in feet", () => {
    const parsed = parseNaturalLanguageBrief("8 x 6 ft bathroom with shower");
    expect(parsed.widthFt).toBe(8);
    expect(parsed.depthFt).toBe(6);
    expect(parsed.zones).toContain("rainhead");
  });

  it("extracts 3D dimensions in feet", () => {
    const parsed = parseNaturalLanguageBrief("8 x 6 x 9 ft luxury modern suite");
    expect(parsed.widthFt).toBe(8);
    expect(parsed.depthFt).toBe(6);
    expect(parsed.heightFt).toBe(9);
    expect(parsed.style).toBe("Luxury Modern");
  });

  it("extracts budget in Lakhs", () => {
    const parsed = parseNaturalLanguageBrief("Need a bathroom under ₹5 lakh with vanity");
    expect(parsed.budget).toBe(500000);
    expect(parsed.zones).toContain("basin");
  });

  it("extracts fractional lakh budget", () => {
    const parsed = parseNaturalLanguageBrief("Budget is 4.5 lakh, minimal style");
    expect(parsed.budget).toBe(450000);
    expect(parsed.style).toBe("Minimal");
  });

  it("extracts raw currency amounts", () => {
    const parsed = parseNaturalLanguageBrief("Total budget ₹750,000 for ensuite");
    expect(parsed.budget).toBe(750000);
  });

  it("extracts all fixture zones", () => {
    const parsed = parseNaturalLanguageBrief("Need a toilet, washbasin, shower, and bathtub");
    expect(parsed.zones).toContain("toilet");
    expect(parsed.zones).toContain("basin");
    expect(parsed.zones).toContain("rainhead");
    expect(parsed.zones).toContain("bath");
  });
});

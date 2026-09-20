import type { TemplateStyle, TemplateZone } from "./types";

export interface ParsedBrief {
  widthFt?: number;
  depthFt?: number;
  heightFt?: number;
  widthM?: number;
  depthM?: number;
  heightM?: number;
  budget?: number;
  style?: TemplateStyle;
  zones?: TemplateZone[];
  rawText: string;
  matchedTokens: string[];
}

export function parseNaturalLanguageBrief(text: string): ParsedBrief {
  const result: ParsedBrief = {
    rawText: text,
    matchedTokens: [],
  };

  if (!text || !text.trim()) {
    return result;
  }

  const normalized = text.toLowerCase();

  // 1. Dimensions parsing
  // Patterns like "8 x 6 ft", "8x6 ft", "8 by 6 feet", "8.5 x 6.5", "8 x 6 x 9 ft"
  const dim3DMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:x|by|×|\*)\s*(\d+(?:\.\d+)?)\s*(?:x|by|×|\*)\s*(\d+(?:\.\d+)?)\s*(ft|feet|m|meter)?/);
  const dim2DMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:x|by|×|\*)\s*(\d+(?:\.\d+)?)\s*(ft|feet|m|meter)?/);

  if (dim3DMatch) {
    const w = parseFloat(dim3DMatch[1]);
    const d = parseFloat(dim3DMatch[2]);
    const h = parseFloat(dim3DMatch[3]);
    const unit = dim3DMatch[4]?.startsWith("m") ? "m" : "ft";

    if (unit === "m") {
      result.widthM = w;
      result.depthM = d;
      result.heightM = h;
      result.widthFt = Number((w * 3.28084).toFixed(1));
      result.depthFt = Number((d * 3.28084).toFixed(1));
      result.heightFt = Number((h * 3.28084).toFixed(1));
    } else {
      result.widthFt = w;
      result.depthFt = d;
      result.heightFt = h;
      result.widthM = Number((w * 0.3048).toFixed(2));
      result.depthM = Number((d * 0.3048).toFixed(2));
      result.heightM = Number((h * 0.3048).toFixed(2));
    }
    result.matchedTokens.push(dim3DMatch[0]);
  } else if (dim2DMatch) {
    const w = parseFloat(dim2DMatch[1]);
    const d = parseFloat(dim2DMatch[2]);
    const unit = dim2DMatch[3]?.startsWith("m") ? "m" : "ft";

    if (unit === "m") {
      result.widthM = w;
      result.depthM = d;
      result.widthFt = Number((w * 3.28084).toFixed(1));
      result.depthFt = Number((d * 3.28084).toFixed(1));
    } else {
      result.widthFt = w;
      result.depthFt = d;
      result.widthM = Number((w * 0.3048).toFixed(2));
      result.depthM = Number((d * 0.3048).toFixed(2));
    }
    result.matchedTokens.push(dim2DMatch[0]);
  }

  // 2. Budget parsing
  // Matches "₹5 lakh", "5 lakh", "5 lakhs", "5 lac", "500000", "500,000", "5lakhs", "4.5 lakh"
  const lakhMatch = normalized.match(/(?:₹|inr|rs\.?)?\s*(\d+(?:\.\d+)?)\s*(?:lakh|lacs|lac|l\b)/);
  const rawNumberMatch = normalized.match(/(?:₹|inr|rs\.?)\s*(\d{1,3}(?:,\d{3})+|\d{5,8})/);

  if (lakhMatch) {
    const num = parseFloat(lakhMatch[1]);
    result.budget = Math.round(num * 100000);
    result.matchedTokens.push(lakhMatch[0]);
  } else if (rawNumberMatch) {
    const num = parseInt(rawNumberMatch[1].replace(/,/g, ""), 10);
    result.budget = num;
    result.matchedTokens.push(rawNumberMatch[0]);
  }

  // 3. Style parsing
  if (normalized.includes("luxury modern")) {
    result.style = "Luxury Modern";
    result.matchedTokens.push("luxury modern");
  } else if (normalized.includes("minimal")) {
    result.style = "Minimal";
    result.matchedTokens.push("minimal");
  } else if (normalized.includes("zen")) {
    result.style = "Zen";
    result.matchedTokens.push("zen");
  } else if (normalized.includes("classic")) {
    result.style = "Classic";
    result.matchedTokens.push("classic");
  } else if (normalized.includes("modern")) {
    result.style = "Modern";
    result.matchedTokens.push("modern");
  }

  // 4. Fixture Zones parsing
  const detectedZones = new Set<TemplateZone>();

  if (normalized.includes("toilet") || normalized.includes("wc") || normalized.includes("commode")) {
    detectedZones.add("toilet");
    result.matchedTokens.push("toilet");
  }

  if (
    normalized.includes("vanity") ||
    normalized.includes("basin") ||
    normalized.includes("sink") ||
    normalized.includes("washbasin")
  ) {
    detectedZones.add("basin");
    result.matchedTokens.push("vanity/basin");
  }

  if (
    normalized.includes("shower") ||
    normalized.includes("rainhead") ||
    normalized.includes("rain shower")
  ) {
    detectedZones.add("rainhead");
    result.matchedTokens.push("shower");
  }

  if (
    normalized.includes("bath") ||
    normalized.includes("bathtub") ||
    normalized.includes("tub")
  ) {
    detectedZones.add("bath");
    result.matchedTokens.push("bathtub");
  }

  if (detectedZones.size > 0) {
    result.zones = Array.from(detectedZones);
  }

  return result;
}

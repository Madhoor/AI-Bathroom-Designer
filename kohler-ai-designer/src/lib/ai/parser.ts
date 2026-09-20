import type { UserDesignInput } from "../design/generateDesign";
import type { DesignCommand } from "./types";

const DEFAULT_COMMAND_INPUT: UserDesignInput = {
  room: { widthM: 2.4384, depthM: 1.8288, heightM: 2.7432, doors: [], windows: [] },
  budget: 500000,
  currency: "INR",
  desiredStyle: "Luxury Modern",
  requiredRoles: ["toilet", "basin", "rainhead"],
};

export function parseNaturalLanguageCommand(
  text: string,
  input?: UserDesignInput,
): DesignCommand {
  const currentInput = input ?? DEFAULT_COMMAND_INPUT;
  const normalized = text.toLowerCase().trim();

  // 1. "Make it more luxurious" / "Increase luxury"
  if (
    normalized.includes("more luxurious") ||
    normalized.includes("luxury") ||
    normalized.includes("upgrade") ||
    normalized.includes("opulent") ||
    normalized.includes("premium")
  ) {
    const delta = 150000;
    const higherBudget = Math.max(currentInput.budget + delta, 750000);
    return {
      intent: "increase_luxury",
      confidence: 0.95,
      rawText: text,
      parameters: { targetStyle: "Luxury Modern", targetBudget: higherBudget },
      affectedZones: ["vanity", "shower", "toilet"],
      targetProducts: [],
      requestedChanges: "Elevate architectural styling to Luxury Modern and allocate higher budget headroom for premium smart sanitaryware.",
      suggestedAction: "Increase fixture budget to ₹7.5L and select Luxury Modern architectural suite.",
      isExecutableNow: true,
      explanation: "Upgrading aesthetic intent to Luxury Modern and increasing fixture allocation.",
      modifications: {
        budgetDelta: delta,
        style: "Luxury Modern",
      },
    };
  }

  // 2. "Bring it under ₹4 lakh" / "Reduce budget" / "Under 4.5 lakh" / "Set budget to 6 lakh"
  const budgetMatch = normalized.match(/(?:under|below|less than|within|bring it under|budget to|set budget to)\s*(?:₹|inr|rs\.?)?\s*(\d+(?:\.\d+)?)\s*(?:lakh|lac|l\b)/);
  if (budgetMatch) {
    const targetBudget = Math.round(parseFloat(budgetMatch[1]) * 100000);
    return {
      intent: "reduce_budget",
      confidence: 0.94,
      rawText: text,
      parameters: { targetBudget },
      affectedZones: ["toilet", "basin", "rainhead"],
      targetProducts: [],
      requestedChanges: `Re-solve catalogue optimization with an exact ceiling of ₹${targetBudget.toLocaleString("en-IN")}.`,
      suggestedAction: `Recalibrate budget ceiling to ₹${(targetBudget / 100000).toFixed(1)}L and optimize fixture selection.`,
      isExecutableNow: true,
      explanation: `Recalibrating spatial solver to constrain total product cost below ₹${targetBudget.toLocaleString("en-IN")}.`,
      modifications: {
        budgetAbsolute: targetBudget,
      },
    };
  }

  // 3. "Add a bathtub" / "Add bath" / "Include tub"
  if (
    normalized.includes("add a bathtub") ||
    normalized.includes("add bathtub") ||
    normalized.includes("add bath") ||
    normalized.includes("include tub") ||
    normalized.includes("bathtub") ||
    normalized.includes("freestanding tub")
  ) {
    const widerWidth = Math.max(currentInput.room.widthM, 2.7432); // at least 9 ft for bath clearance
    return {
      intent: "add_zone",
      confidence: 0.94,
      rawText: text,
      parameters: { addedZone: "bath" },
      affectedZones: ["bath"],
      targetProducts: [],
      requestedChanges: "Add factual 'bath' role to required fixture constraints and ensure spatial clearance.",
      suggestedAction: "Incorporate freestanding bath into spatial zone layout.",
      isExecutableNow: true,
      explanation: "Adding bathtub zone requirements to spatial solver.",
      modifications: {
        addZones: ["bath"],
        roomDimensionsFt: { widthFt: Number((widerWidth / 0.3048).toFixed(1)) },
      },
    };
  }

  // 4. "Remove bathtub" / "Remove tub"
  if (
    normalized.includes("remove bathtub") ||
    normalized.includes("remove bath") ||
    normalized.includes("remove tub") ||
    normalized.includes("drop bath")
  ) {
    return {
      intent: "remove_zone",
      confidence: 0.92,
      rawText: text,
      parameters: { removedZone: "bath" },
      affectedZones: ["bath"],
      targetProducts: [],
      requestedChanges: "Remove bath zone from required fixtures.",
      suggestedAction: "Reclaim circulation space by removing bathtub zone.",
      isExecutableNow: true,
      explanation: "Removing bathtub requirements to expand primary circulation.",
      modifications: {
        removeZones: ["bath"],
      },
    };
  }

  // 5. "Expand room to 10 by 8 ft" / "10 x 8 ft" / "Make the vanity wider"
  const dimMatch = normalized.match(/(?:expand|resize|make|set room to)?\s*(\d+(?:\.\d+)?)\s*(?:x|by|×)\s*(\d+(?:\.\d+)?)\s*(?:ft|feet)?/);
  if (dimMatch && (normalized.includes("room") || normalized.includes("expand") || normalized.includes("resize"))) {
    const widthFt = parseFloat(dimMatch[1]);
    const depthFt = parseFloat(dimMatch[2]);
    return {
      intent: "resize_room",
      confidence: 0.95,
      rawText: text,
      parameters: { widthFt, depthFt },
      affectedZones: ["room"],
      targetProducts: [],
      requestedChanges: `Resize room boundary to ${widthFt} ft × ${depthFt} ft.`,
      suggestedAction: `Calibrate room envelope to ${widthFt} ft × ${depthFt} ft.`,
      isExecutableNow: true,
      explanation: `Adjusting spatial volume to ${widthFt} ft × ${depthFt} ft.`,
      modifications: {
        roomDimensionsFt: { widthFt, depthFt },
      },
    };
  }

  if (
    normalized.includes("vanity wider") ||
    normalized.includes("wider vanity") ||
    normalized.includes("larger vanity")
  ) {
    const widerWidthFt = Number(((currentInput.room.widthM + 0.3048) / 0.3048).toFixed(1));
    return {
      intent: "resize_room",
      confidence: 0.88,
      rawText: text,
      parameters: { roomDimension: "width", deltaM: 0.3048 },
      affectedZones: ["basin", "vanity"],
      targetProducts: [],
      requestedChanges: "Expand room boundary width by 1.0 ft to accommodate a wider vanity countertop.",
      suggestedAction: "Broaden room envelope to support wider vanity format.",
      isExecutableNow: true,
      explanation: "Broadening room width to facilitate generous vanity counter clearance.",
      modifications: {
        roomDimensionsFt: { widthFt: widerWidthFt },
      },
    };
  }

  // 6. Finish modifications: French Gold, Matte Black, Brushed Bronze, Rose Gold
  if (
    normalized.includes("french gold") ||
    normalized.includes("matte black") ||
    normalized.includes("brushed bronze") ||
    normalized.includes("rose gold") ||
    normalized.includes("chrome")
  ) {
    let finishName = "French Gold";
    if (normalized.includes("matte black")) finishName = "Matte Black";
    else if (normalized.includes("brushed bronze")) finishName = "Brushed Bronze";
    else if (normalized.includes("rose gold")) finishName = "Rose Gold";
    else if (normalized.includes("chrome")) finishName = "Polished Chrome";

    return {
      intent: "change_finish",
      confidence: 0.88,
      rawText: text,
      parameters: { requestedFinish: finishName },
      affectedZones: ["basin", "shower"],
      targetProducts: ["faucets", "fittings"],
      requestedChanges: `Prioritize authentic KOHLER hardware in ${finishName} finish.`,
      suggestedAction: `Update brassware finish preferences to ${finishName}.`,
      isExecutableNow: true,
      explanation: `Configuring preferred finish '${finishName}' for faucets and shower components where verified in the catalogue.`,
      modifications: {
        finish: finishName,
      },
    };
  }

  // 7. Style changes
  if (
    normalized.includes("minimal") ||
    normalized.includes("zen") ||
    normalized.includes("classic") ||
    normalized.includes("modern")
  ) {
    let targetStyle = "Modern";
    if (normalized.includes("minimal")) targetStyle = "Minimal";
    else if (normalized.includes("zen")) targetStyle = "Zen";
    else if (normalized.includes("classic")) targetStyle = "Classic";
    else if (normalized.includes("luxury")) targetStyle = "Luxury Modern";

    return {
      intent: "change_style",
      confidence: 0.92,
      rawText: text,
      parameters: { targetStyle },
      affectedZones: ["style"],
      targetProducts: [],
      requestedChanges: `Reorient design language to '${targetStyle}'.`,
      suggestedAction: `Switch architectural aesthetic to '${targetStyle}'.`,
      isExecutableNow: true,
      explanation: `Aligning palette and fixture forms to '${targetStyle}' design language.`,
      modifications: {
        style: targetStyle,
      },
    };
  }

  // Default: unsupported command
  return {
    intent: "unsupported",
    confidence: 0.35,
    rawText: text,
    parameters: {},
    affectedZones: [],
    targetProducts: [],
    requestedChanges: "Command requires parameters beyond verified factory CAD catalogue bounds.",
    suggestedAction: "Please adjust budget, room dimensions, style, or required zones.",
    isExecutableNow: false,
    explanation: `This modification ('${text}') is outside the verified KOHLER spatial and catalogue constraints. Try modifying budget, room dimensions, style, or required zones.`,
    modifications: {},
  };
}

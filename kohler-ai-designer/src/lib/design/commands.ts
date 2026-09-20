import type { UserDesignInput } from "./generateDesign";

export type CommandIntent =
  | "increase_luxury"
  | "reduce_budget"
  | "set_budget"
  | "change_style"
  | "add_zone"
  | "remove_zone"
  | "resize_room"
  | "change_finish"
  | "unsupported";

export interface DesignCommandModifications {
  budgetDelta?: number;
  budgetAbsolute?: number;
  style?: string;
  addZones?: string[];
  removeZones?: string[];
  roomDimensionsFt?: { widthFt?: number; depthFt?: number; heightFt?: number };
  finish?: string;
}

export interface DesignCommand {
  intent: CommandIntent;
  confidence: number;
  rawText: string;
  parameters: Record<string, unknown>;
  affectedZones: string[];
  targetProducts: string[];
  requestedChanges: string;
  suggestedAction: string;
  isExecutableNow: boolean;
  explanation: string;
  adjustedInput?: Partial<UserDesignInput>;
  modifications: DesignCommandModifications;
}

const DEFAULT_COMMAND_INPUT: UserDesignInput = {
  room: { widthM: 2.4384, depthM: 1.8288, heightM: 2.7432, doors: [], windows: [] },
  budget: 500000,
  currency: "INR",
  desiredStyle: "Luxury Modern",
  requiredRoles: ["toilet", "basin", "rainhead"],
};

export function parseDesignCommand(
  text: string,
  input?: UserDesignInput,
): DesignCommand {
  const currentInput = input ?? DEFAULT_COMMAND_INPUT;
  const normalized = text.toLowerCase().trim();

  // 1. "Make it more luxurious" / "Increase luxury"
  if (
    normalized.includes("more luxurious") ||
    normalized.includes("luxury") ||
    normalized.includes("upgrade")
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
      adjustedInput: {
        desiredStyle: "Luxury Modern",
        budget: higherBudget,
      },
      modifications: {
        budgetDelta: delta,
        style: "Luxury Modern",
      },
    };
  }

  // 2. "Bring it under ₹4 lakh" / "Reduce budget" / "Under 4 lakh"
  const budgetMatch = normalized.match(/(?:under|below|less than|within|bring it under)\s*(?:₹|inr|rs\.?)?\s*(\d+(?:\.\d+)?)\s*(?:lakh|lac|l\b)/);
  if (budgetMatch) {
    const targetBudget = Math.round(parseFloat(budgetMatch[1]) * 100000);
    return {
      intent: "reduce_budget",
      confidence: 0.92,
      rawText: text,
      parameters: { targetBudget },
      affectedZones: ["toilet", "basin", "rainhead"],
      targetProducts: [],
      requestedChanges: `Re-solve catalogue optimization with an exact ceiling of ₹${targetBudget.toLocaleString("en-IN")}.`,
      suggestedAction: `Recalibrate budget ceiling to ₹${(targetBudget / 100000).toFixed(1)}L and optimize fixture selection.`,
      isExecutableNow: true,
      explanation: `Recalibrating spatial solver to constrain total product cost below ₹${targetBudget.toLocaleString("en-IN")}.`,
      adjustedInput: {
        budget: targetBudget,
      },
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
    normalized.includes("bathtub")
  ) {
    const currentRoles = currentInput.requiredRoles ?? ["toilet", "basin", "rainhead"];
    const newRoles = currentRoles.includes("bath") ? currentRoles : [...currentRoles, "bath"];
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
      adjustedInput: {
        requiredRoles: newRoles,
        room: {
          ...currentInput.room,
          widthM: widerWidth,
        },
      },
      modifications: {
        addZones: ["bath"],
      },
    };
  }

  // 4. "Expand room to 10 by 8 ft" / "10 x 8 ft" / "Make the vanity wider"
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
      adjustedInput: {
        room: {
          ...currentInput.room,
          widthM: widthFt * 0.3048,
          depthM: depthFt * 0.3048,
        },
      },
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
    const widerWidth = currentInput.room.widthM + 0.3048; // add 1 ft
    return {
      intent: "resize_room",
      confidence: 0.88,
      rawText: text,
      parameters: { roomDimension: "width", deltaM: 0.3048 },
      affectedZones: ["basin", "vanity"],
      targetProducts: [],
      requestedChanges: "Expand room boundary width by 1.0 ft (0.30m) to accommodate a wider vanity countertop.",
      suggestedAction: "Broaden room envelope to support wider vanity format.",
      isExecutableNow: true,
      explanation: "Broadening room width to facilitate generous vanity counter clearance.",
      adjustedInput: {
        room: {
          ...currentInput.room,
          widthM: Number(widerWidth.toFixed(4)),
        },
      },
      modifications: {
        roomDimensionsFt: { widthFt: Number(((currentInput.room.widthM + 0.3048) / 0.3048).toFixed(1)) },
      },
    };
  }

  // 5. "Change the faucets to French Gold" / "French Gold" / Finish modifications
  if (
    normalized.includes("french gold") ||
    normalized.includes("matte black") ||
    normalized.includes("brushed bronze") ||
    normalized.includes("rose gold")
  ) {
    return {
      intent: "change_finish",
      confidence: 0.85,
      rawText: text,
      parameters: { requestedFinish: text },
      affectedZones: ["basin", "shower"],
      targetProducts: ["faucets", "fittings"],
      requestedChanges: `Filter brassware catalog to match finish '${text}'.`,
      suggestedAction: "Update brassware finish preferences to requested material finish.",
      isExecutableNow: true,
      explanation: `Configuring preferred finish '${text}' for faucets and shower components.`,
      modifications: {
        finish: text,
      },
    };
  }

  // 6. Style changes
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

    return {
      intent: "change_style",
      confidence: 0.9,
      rawText: text,
      parameters: { targetStyle },
      affectedZones: ["style"],
      targetProducts: [],
      requestedChanges: `Reorient design language to '${targetStyle}'.`,
      suggestedAction: `Switch architectural aesthetic to '${targetStyle}'.`,
      isExecutableNow: true,
      explanation: `Aligning palette and fixture forms to '${targetStyle}' design language.`,
      adjustedInput: {
        desiredStyle: targetStyle,
      },
      modifications: {
        style: targetStyle,
      },
    };
  }

  // Default: unsupported command
  return {
    intent: "unsupported",
    confidence: 0.4,
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

export type ParsedDesignCommand = DesignCommand;

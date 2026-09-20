import type { UserDesignInput } from "../design/generateDesign";

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
  modifications: DesignCommandModifications;
}

export interface DesignChangeProductSummary {
  productCode: string;
  productName?: string;
  price?: number;
}

export interface DesignChangeDelta {
  previousCost: number;
  newCost: number;
  costDifference: number; // positive = increased, negative = reduced
  addedProducts: DesignChangeProductSummary[];
  removedProducts: DesignChangeProductSummary[];
  retainedProducts: DesignChangeProductSummary[];
  styleChanged?: { from: string; to: string };
  dimensionChanged?: {
    fromFt: { widthFt: number; depthFt: number; heightFt: number };
    toFt: { widthFt: number; depthFt: number; heightFt: number };
  };
  newWarnings: string[];
  summary: string;
}

export interface AIMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  command?: DesignCommand;
  delta?: DesignChangeDelta;
  status?: "pending" | "applied" | "rejected" | "unsupported";
}

export interface AIProviderConfig {
  apiKey?: string;
  model?: string;
  endpoint?: string;
}

export interface AIProvider {
  name: string;
  isAvailable(): boolean;
  parseCommand(text: string, currentInput?: UserDesignInput): Promise<DesignCommand>;
}

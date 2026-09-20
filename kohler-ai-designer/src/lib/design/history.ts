import type { UserDesignInput } from "./generateDesign";
import type { DesignVariant } from "./generateVariants";
import type { DesignState } from "./types";

export interface DesignHistoryEntry {
  id: string;
  timestamp: string;
  description: string;
  brief: UserDesignInput;
  templateId: string;
  variants: DesignVariant[];
  selectedVariantIndex: number;
  activeState: DesignState;
}

export interface DesignHistoryStack {
  past: DesignHistoryEntry[];
  present: DesignHistoryEntry | null;
}

export function createInitialHistoryStack(entry?: DesignHistoryEntry): DesignHistoryStack {
  return {
    past: [],
    present: entry ?? null,
  };
}

export function pushHistoryEntry(
  stack: DesignHistoryStack,
  newEntry: DesignHistoryEntry,
  maxPast = 8,
): DesignHistoryStack {
  if (!stack.present) {
    return {
      past: [],
      present: newEntry,
    };
  }

  // Avoid pushing duplicate identical states
  if (stack.present.id === newEntry.id) {
    return stack;
  }

  const updatedPast = [...stack.past, stack.present].slice(-maxPast);

  return {
    past: updatedPast,
    present: newEntry,
  };
}

export function canRestorePrevious(stack: DesignHistoryStack): boolean {
  return stack.past.length > 0;
}

export function getPreviousEntry(stack: DesignHistoryStack): DesignHistoryEntry | null {
  if (stack.past.length === 0) return null;
  return stack.past[stack.past.length - 1];
}

export function restorePreviousEntry(
  stack: DesignHistoryStack,
): { stack: DesignHistoryStack; restored: DesignHistoryEntry | null } {
  if (stack.past.length === 0) {
    return { stack, restored: null };
  }

  const restored = stack.past[stack.past.length - 1];
  const newPast = stack.past.slice(0, -1);

  return {
    stack: {
      past: newPast,
      present: restored,
    },
    restored,
  };
}

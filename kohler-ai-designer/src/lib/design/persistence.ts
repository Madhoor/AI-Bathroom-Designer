export interface DesignerPersistedState {
  selectedTemplateId: string;
  roomDimensions: {
    widthFt: number;
    depthFt: number;
    heightFt: number;
  };
  budget: number;
  desiredStyle: string;
  requiredZones: string[];
  lastNaturalLanguagePrompt: string;
  selectedVariantIndex: number;
  hasPreviousDesign?: boolean;
}

const STORAGE_KEY = "kohler_designer_state_v1";

export const DEFAULT_PERSISTED_STATE: DesignerPersistedState = {
  selectedTemplateId: "compact-modern",
  roomDimensions: {
    widthFt: 8,
    depthFt: 6,
    heightFt: 9,
  },
  budget: 500000,
  desiredStyle: "Luxury Modern",
  requiredZones: ["toilet", "basin", "rainhead"],
  lastNaturalLanguagePrompt: "8x6 ft luxury modern bathroom with smart toilet and vanity, budget 5 lakh",
  selectedVariantIndex: 0,
  hasPreviousDesign: false,
};

export function loadDesignerState(): DesignerPersistedState {
  if (typeof window === "undefined") {
    return DEFAULT_PERSISTED_STATE;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PERSISTED_STATE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PERSISTED_STATE,
      ...parsed,
      roomDimensions: {
        ...DEFAULT_PERSISTED_STATE.roomDimensions,
        ...(parsed.roomDimensions ?? {}),
      },
    };
  } catch {
    return DEFAULT_PERSISTED_STATE;
  }
}

export function saveDesignerState(state: Partial<DesignerPersistedState>): void {
  if (typeof window === "undefined") return;
  try {
    const current = loadDesignerState();
    const merged = { ...current, ...state };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // Ignore storage quota or disabled errors
  }
}

export function clearDesignerState(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}

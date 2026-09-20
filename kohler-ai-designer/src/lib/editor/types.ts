import type { DesignPlacement, DesignState } from "../design/types";
import type { LayoutValidationResult } from "../constraints/types";
import type { RecommendationProduct } from "../recommendation/types";

export type EditorViewMode = "3d" | "floorplan";

export type EditorActionState =
  | { type: "IDLE" }
  | { type: "SELECTED"; productCode: string }
  | {
      type: "MOVING";
      productCode: string;
      originalPlacement: DesignPlacement;
      tentativePosition: { x: number; y: number; z: number };
    }
  | {
      type: "PLACED";
      productCode: string;
      originalPlacement: DesignPlacement;
      placedPosition: { x: number; y: number; z: number };
      validation: LayoutValidationResult;
    }
  | {
      type: "ROTATING";
      productCode: string;
      originalRotationZ: number;
      currentRotationZ: number;
    }
  | {
      type: "REPLACING";
      productCode: string;
    }
  | {
      type: "CONFIRM_REMOVE";
      productCode: string;
      dependentProducts: RecommendationProduct[];
    };

export interface EditorSessionState {
  past: DesignState[];
  present: DesignState;
  future: DesignState[];
}

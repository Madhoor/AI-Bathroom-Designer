import type { BathroomRoom, ConstraintEngineOptions, LayoutValidationResult } from "../constraints";
import type { RecommendationAssembly, RecommendationProduct, RecommendedDesign } from "../recommendation";

export interface PlacementPosition {
  x: number;
  y: number;
  z: number;
}

export interface PlacementRotation {
  x: number;
  y: number;
  z: number;
}

export type PlacementSurface = "floor" | "wall" | "ceiling" | "counter" | "basin" | "vanity" | "shower_wall" | "freestanding" | "unknown";
export type PlacementSource = "factual_surface" | "generic_zone_heuristic" | "generic_host_heuristic";
export type PlacementValidationStatus = "valid" | "rejected" | "unplaced";

export interface DesignPlacement {
  productCode: string;
  role: string;
  zone: string;
  position: PlacementPosition;
  rotation: PlacementRotation;
  footprint: { widthM: number; depthM: number; heightM: number };
  hostProductCode?: string;
  placementSurface: PlacementSurface;
  source: PlacementSource;
  validationStatus: PlacementValidationStatus;
}

export interface DesignState {
  version: 1;
  generatedAt: string;
  room: BathroomRoom;
  selectedProducts: RecommendationProduct[];
  selectedAssemblies: RecommendationAssembly[];
  placements: DesignPlacement[];
  totalProductCost: number;
  budget?: number;
  style?: string;
  warnings: string[];
  validation: LayoutValidationResult;
}

export interface DesignBuildOptions {
  version?: 1;
  generatedAt?: string;
  constraintOptions?: ConstraintEngineOptions;
}

export interface DesignBuildResult {
  state: DesignState;
  unplacedProducts: string[];
}

export type DesignRecommendationInput = Pick<RecommendedDesign, "selectedProducts" | "selectedAssemblies" | "estimatedProductTotal" | "budgetRemaining"> & {
  budget?: number;
  style?: string;
  warnings?: string[];
};

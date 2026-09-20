import type { BathroomRoom, ConstraintEngineOptions, ConstraintViolation, PlacedProduct } from "../constraints";

export interface DesignRequirements {
  room: BathroomRoom;
  budget?: number;
  currency?: string;
  desiredStyle?: string;
  requiredRoles: string[];
  optionalRoles?: string[];
  preferences?: Record<string, string[]>;
}

export interface RecommendationProduct {
  productCode: string;
  productName?: string;
  category?: string;
  subcategory?: string;
  currentPrice?: number;
  listPrice?: number;
  currency?: string;
  widthMm?: number;
  depthMm?: number;
  heightMm?: number;
  styles?: string[];
  finish?: string;
  metadata?: {
    role: string[];
    bathroomZones: string[];
    mountSurface: string[];
    requiresHostProduct: boolean;
    hostRoles?: string[];
  };
}

export interface RecommendationRelation {
  sourceProductCode: string;
  targetProductCode?: string;
  targetReference?: string;
  relationType: string;
  resolutionStatus?: "resolved" | "unresolved" | "ambiguous";
  confidence: number;
}

export interface RecommendationAssemblyComponent {
  productCode?: string;
  targetReference?: string;
  required: boolean;
  referenceResolved: boolean;
}

export interface RecommendationAssembly {
  assemblyId: string;
  productCode: string;
  installationSurface?: string;
  components: RecommendationAssemblyComponent[];
}

export interface RecommendationCatalog {
  products: RecommendationProduct[];
  relations?: RecommendationRelation[];
  assemblies?: RecommendationAssembly[];
  constraintOptions?: ConstraintEngineOptions;
}

export interface CandidateRejection {
  productCode?: string;
  reason: string;
}

export interface RecommendedDesign {
  selectedProducts: RecommendationProduct[];
  selectedAssemblies: RecommendationAssembly[];
  estimatedProductTotal: number;
  budgetRemaining?: number;
  placements: PlacedProduct[];
  score: number;
  constraintViolations: ConstraintViolation[];
  warnings: string[];
  rationale: string[];
}

export interface DesignRecommendation {
  best?: RecommendedDesign;
  alternatives: RecommendedDesign[];
  consideredCandidates: number;
  rejectedCandidates: CandidateRejection[];
}

export interface RecommendationWeights {
  spatialFeasibility: number;
  budgetUtilization: number;
  styleMatch: number;
  zoneCompleteness: number;
  assemblyCompleteness: number;
  preferenceMatch: number;
}

export const DEFAULT_RECOMMENDATION_WEIGHTS: RecommendationWeights = {
  spatialFeasibility: 40,
  budgetUtilization: 20,
  styleMatch: 10,
  zoneCompleteness: 15,
  assemblyCompleteness: 10,
  preferenceMatch: 5,
};

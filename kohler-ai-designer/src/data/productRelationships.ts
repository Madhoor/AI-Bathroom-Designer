export const productRelationTypes = [
  "requires",
  "compatible_with",
  "mounts_to",
  "installed_on",
  "installed_into",
  "paired_with",
  "part_of",
  "alternative_to",
  "recommended_with",
  "related_to",
] as const;

export type ProductRelationType = (typeof productRelationTypes)[number];

export const relationSources = [
  "kohler_api",
  "price_book",
  "explicit_catalogue",
  "inferred",
] as const;

export type ProductRelationSource = (typeof relationSources)[number];

export interface ProductRelation {
  sourceProductCode: string;
  targetProductCode: string;
  relationType: ProductRelationType;
  source: ProductRelationSource;
  confidence: number;
  notes?: string;
  targetResolved?: boolean;
}

export const assemblyTypes = [
  "BASIN",
  "FAUCET",
  "SHOWER",
  "TOILET",
  "BATHTUB",
  "VANITY",
  "MIRROR",
  "SHOWER_DOOR",
  "ACCESSORY_SET",
] as const;

export type BathroomAssemblyType = (typeof assemblyTypes)[number];

export const semanticProductRoles = [
  "bathtub",
  "bath_filler",
  "bath_drain",
  "basin",
  "basin_faucet",
  "basin_drain",
  "rainhead",
  "showerhead",
  "hand_shower",
  "shower_arm",
  "diverter",
  "shower_valve",
  "shower_door",
  "toilet_bowl",
  "toilet_tank",
  "toilet_seat",
  "bidet_seat",
  "vanity",
  "mirror",
  "required_component",
] as const;

export type SemanticProductRole = (typeof semanticProductRoles)[number];

export const installationSurfaces = [
  "floor",
  "wall",
  "counter",
  "basin",
  "ceiling",
  "freestanding",
  "inside_shower",
  "deck_mount",
  "wall_mount",
] as const;

export type InstallationSurface = (typeof installationSurfaces)[number];

export interface AssemblyComponent {
  role: SemanticProductRole;
  productCode: string;
  required: boolean;
  source: ProductRelationSource;
  confidence: number;
  installationSurface?: InstallationSurface;
  referenceResolved?: boolean;
  notes?: string;
}

export interface BathroomAssembly {
  id: string;
  type: BathroomAssemblyType;
  components: AssemblyComponent[];
}

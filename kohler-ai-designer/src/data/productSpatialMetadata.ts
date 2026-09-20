export const mountSurfaces = [
  "floor",
  "wall",
  "ceiling",
  "counter",
  "basin",
  "vanity",
  "shower_wall",
  "freestanding",
  "deck_mount",
] as const;

export type MountSurface = (typeof mountSurfaces)[number];

export const bathroomZones = [
  "toilet",
  "basin",
  "vanity",
  "shower",
  "bathtub",
  "general",
] as const;

export type BathroomZone = (typeof bathroomZones)[number];

export const productRoles = [
  "toilet",
  "toilet_bowl",
  "toilet_tank",
  "toilet_seat",
  "bidet_seat",
  "basin",
  "faucet",
  "basin_faucet",
  "bath",
  "bath_filler",
  "bath_drain",
  "rainhead",
  "showerhead",
  "hand_shower",
  "diverter",
  "shower_valve",
  "shower_door",
  "vanity",
  "mirror",
  "accessory",
] as const;

export type ProductRole = (typeof productRoles)[number];

export type SpatialMetadataSource =
  | "kohler_api"
  | "catalogue_metadata"
  | "price_book"
  | "explicit";

export interface ProductSpatialMetadata {
  productCode: string;
  role: ProductRole[];
  bathroomZones: BathroomZone[];
  mountSurface: MountSurface[];
  installationType?: string;
  requiresHostProduct: boolean;
  hostRoles?: ProductRole[];
  floorContact: boolean;
  wallContact: boolean;
  overhead: boolean;
  source: SpatialMetadataSource;
  confidence: number;
  notes?: string;
}

export type AttachmentRelation =
  | "mounts_to"
  | "installed_on"
  | "installed_into"
  | "freestanding";

export interface ProductAttachmentRule {
  productCode: string;
  attachesToRole: ProductRole;
  attachesToSurface: MountSurface;
  relation: AttachmentRelation;
  source: SpatialMetadataSource;
  confidence: number;
  notes?: string;
}

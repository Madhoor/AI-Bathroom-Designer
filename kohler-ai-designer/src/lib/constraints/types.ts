export type RoomWall = "north" | "south" | "east" | "west";
export type DoorSwing = "inward" | "outward" | "none";

export interface Door {
  wall: RoomWall;
  offsetM: number;
  widthM: number;
  swing?: DoorSwing;
}

export interface Window {
  wall: RoomWall;
  offsetM: number;
  widthM: number;
  sillHeightM?: number;
  heightM?: number;
}

export interface BathroomRoom {
  widthM: number;
  depthM: number;
  heightM: number;
  doors: Door[];
  windows: Window[];
}

export interface PlacedProduct {
  productCode: string;
  assemblyId?: string;
  /** Canonical world coordinates: X width, Y depth, Z vertical; origin is room-floor center. */
  xM: number;
  yM: number;
  zM: number;
  rotationZDeg: number;
  widthM: number;
  depthM: number;
  heightM: number;
  role: string;
  bathroomZone: string;
  requiresHostProduct?: boolean;
  hostRoles?: string[];
  allowCollisionWithProductCodes?: string[];
}

export interface ClearanceRule {
  role?: string;
  zone?: string;
  frontM?: number;
  rearM?: number;
  leftM?: number;
  rightM?: number;
  notes?: string;
}

export interface ConstraintViolation {
  type:
    | "ROOM_BOUNDARY"
    | "PRODUCT_COLLISION"
    | "DOOR_CLEARANCE"
    | "MINIMUM_CLEARANCE"
    | "HOST_REQUIREMENT";
  severity: "error" | "warning";
  productCodes: string[];
  message: string;
}

export interface LayoutValidationResult {
  valid: boolean;
  errors: ConstraintViolation[];
  warnings: ConstraintViolation[];
}

export interface SpatialMetadataRecord {
  productCode: string;
  role: string[];
  bathroomZones: string[];
  mountSurface: string[];
  requiresHostProduct: boolean;
  hostRoles?: string[];
}

export interface AttachmentRuleRecord {
  productCode: string;
  attachesToRole: string;
  attachesToSurface: string;
  relation: string;
}

export interface ConstraintEngineOptions {
  clearanceRules?: ClearanceRule[];
  spatialMetadata?: SpatialMetadataRecord[];
  attachmentRules?: AttachmentRuleRecord[];
}

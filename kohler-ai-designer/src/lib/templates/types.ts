export type TemplateStyle =
  | "Luxury Modern"
  | "Minimal"
  | "Modern"
  | "Classic"
  | "Zen";

export type TemplateZone = "toilet" | "basin" | "rainhead" | "bath";

export interface BudgetRange {
  min: number;
  max: number;
  default: number;
}

export interface RoomDefaults {
  widthM: number;
  depthM: number;
  heightM: number;
  widthFt: number;
  depthFt: number;
  heightFt: number;
}

export interface AestheticTokens {
  wallTexture: string;
  palette: string;
  mood: string;
  lightingTone: string;
}

export interface BathroomTemplate {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  roomDefaults: RoomDefaults;
  recommendedZones: TemplateZone[];
  optionalZones?: TemplateZone[];
  style: TemplateStyle;
  budgetRange: BudgetRange;
  spatialIntent: string;
  aestheticTokens: AestheticTokens;
  preferredCameraId?: string;
}

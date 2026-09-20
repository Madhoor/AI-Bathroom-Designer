import type { BathroomTemplate, TemplateZone } from "./types";
import type { UserDesignInput } from "../design/generateDesign";

export interface TemplateCustomization {
  widthFt?: number;
  depthFt?: number;
  heightFt?: number;
  widthM?: number;
  depthM?: number;
  heightM?: number;
  budget?: number;
  style?: string;
  zones?: TemplateZone[];
  optionalRoles?: string[];
}

export function buildDesignInputFromTemplate(
  template: BathroomTemplate,
  customization?: TemplateCustomization,
): UserDesignInput {
  const widthM = customization?.widthM ?? (customization?.widthFt ? customization.widthFt * 0.3048 : template.roomDefaults.widthM);
  const depthM = customization?.depthM ?? (customization?.depthFt ? customization.depthFt * 0.3048 : template.roomDefaults.depthM);
  const heightM = customization?.heightM ?? (customization?.heightFt ? customization.heightFt * 0.3048 : template.roomDefaults.heightM);

  const budget = customization?.budget ?? template.budgetRange.default;
  const desiredStyle = customization?.style ?? template.style;
  const zones = customization?.zones ?? template.recommendedZones;

  const requiredRoles: string[] = [];
  const optionalRoles: string[] = customization?.optionalRoles ? [...customization.optionalRoles] : [];

  for (const zone of zones) {
    if (zone === "toilet") {
      requiredRoles.push("toilet");
    } else if (zone === "basin") {
      requiredRoles.push("basin");
      if (!optionalRoles.includes("vanity")) optionalRoles.push("vanity");
    } else if (zone === "rainhead") {
      requiredRoles.push("rainhead");
    } else if (zone === "bath") {
      requiredRoles.push("bath");
    }
  }

  return {
    room: {
      widthM: Number(widthM.toFixed(4)),
      depthM: Number(depthM.toFixed(4)),
      heightM: Number(heightM.toFixed(4)),
      doors: [],
      windows: [],
    },
    budget,
    currency: "INR",
    desiredStyle,
    requiredRoles,
    optionalRoles,
  };
}

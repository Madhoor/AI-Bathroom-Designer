import type { BathroomTemplate } from "./types";

export const BATHROOM_TEMPLATES: BathroomTemplate[] = [
  {
    id: "compact-modern",
    name: "Compact Modern",
    subtitle: "Space-efficient urban ensuite",
    description: "Tailored for streamlined urban apartments where spatial ergonomics and clean lines maximize every square foot.",
    roomDefaults: {
      widthM: 2.1336, // 7.0 ft
      depthM: 1.524,  // 5.0 ft
      heightM: 2.5908, // 8.5 ft
      widthFt: 7.0,
      depthFt: 5.0,
      heightFt: 8.5,
    },
    recommendedZones: ["toilet", "basin", "rainhead"],
    style: "Modern",
    budgetRange: {
      min: 250000,
      max: 450000,
      default: 350000,
    },
    spatialIntent: "Linear fixture arrangement with high-clearance circulation and frameless wet-zone division.",
    aestheticTokens: {
      wallTexture: "Matte off-white microcement with subtle linear detail",
      palette: "Crisp white, charcoal slate, polished chrome accents",
      mood: "Tailored, bright, functional",
      lightingTone: "4000K crisp architectural recessed spotlights",
    },
    preferredCameraId: "hero",
  },
  {
    id: "luxury-spa",
    name: "Luxury Spa",
    subtitle: "Resort-inspired sanctuary",
    description: "Generous footprint engineered for deep relaxation, featuring layered architectural stone, a prominent wet zone, and freestanding luxury.",
    roomDefaults: {
      widthM: 2.7432, // 9.0 ft
      depthM: 2.1336, // 7.0 ft
      heightM: 2.8956, // 9.5 ft
      widthFt: 9.0,
      depthFt: 7.0,
      heightFt: 9.5,
    },
    recommendedZones: ["toilet", "basin", "rainhead"],
    optionalZones: ["bath"],
    style: "Luxury Modern",
    budgetRange: {
      min: 500000,
      max: 1200000,
      default: 750000,
    },
    spatialIntent: "Clear zoning separating the wellness wet sanctuary from the dry grooming vanity salon.",
    aestheticTokens: {
      wallTexture: "Fluted travertine feature wall with warm honed limestone",
      palette: "Warm stone, dark bronze shadowlines, radiant brassware",
      mood: "Serene, tactile, deeply comfortable",
      lightingTone: "2700K warm diffuse halo and hidden coves",
    },
    preferredCameraId: "hero",
  },
  {
    id: "minimal-zen",
    name: "Minimal Zen",
    subtitle: "Pared-down contemplative retreat",
    description: "Rooted in Japanese bathing philosophies, emphasizing continuous monolithic surfaces, concealed transitions, and unencumbered floor planes.",
    roomDefaults: {
      widthM: 2.4384, // 8.0 ft
      depthM: 1.8288, // 6.0 ft
      heightM: 2.7432, // 9.0 ft
      widthFt: 8.0,
      depthFt: 6.0,
      heightFt: 9.0,
    },
    recommendedZones: ["toilet", "basin", "rainhead"],
    style: "Zen",
    budgetRange: {
      min: 400000,
      max: 750000,
      default: 500000,
    },
    spatialIntent: "Floating elements leaving unobstructed floor basalt for continuous calm visual weight.",
    aestheticTokens: {
      wallTexture: "Fine horizontal ribbed plaster with monolithic dark basalt slabs",
      palette: "Warm grey, charred wood tones, matte black fixtures",
      mood: "Restorative, elemental, silent",
      lightingTone: "3000K warm grazing uplight",
    },
    preferredCameraId: "hero",
  },
  {
    id: "contemporary-ensuite",
    name: "Contemporary Ensuite",
    subtitle: "Architectural master bedroom connection",
    description: "Designed as a seamless visual extension of the primary bedroom suite with refined brassware and floating vanity focus.",
    roomDefaults: {
      widthM: 2.4384, // 8.0 ft
      depthM: 1.524,  // 5.0 ft
      heightM: 2.5908, // 8.5 ft
      widthFt: 8.0,
      depthFt: 5.0,
      heightFt: 8.5,
    },
    recommendedZones: ["toilet", "basin", "rainhead"],
    style: "Modern",
    budgetRange: {
      min: 350000,
      max: 650000,
      default: 450000,
    },
    spatialIntent: "Direct sightline to floating vanity with discrete offset WC enclosure.",
    aestheticTokens: {
      wallTexture: "Venetian stucco with monolithic large-format porcelain panels",
      palette: "Soft greige, smoked oak, vibrant chrome fittings",
      mood: "Refined, contemporary, balanced",
      lightingTone: "3500K neutral ambient lighting",
    },
    preferredCameraId: "vanity",
  },
  {
    id: "grand-master",
    name: "Grand Master",
    subtitle: "Expansive luxury estate volume",
    description: "An uncompromising private bathroom suite accommodating expansive vanity surfaces, walk-in double shower potential, and freestanding centerpiece fixtures.",
    roomDefaults: {
      widthM: 3.048,  // 10.0 ft
      depthM: 2.4384, // 8.0 ft
      heightM: 3.048,  // 10.0 ft
      widthFt: 10.0,
      depthFt: 8.0,
      heightFt: 10.0,
    },
    recommendedZones: ["toilet", "basin", "rainhead"],
    optionalZones: ["bath"],
    style: "Luxury Modern",
    budgetRange: {
      min: 750000,
      max: 1800000,
      default: 1000000,
    },
    spatialIntent: "Centrally anchored circulation connecting dual wellness zones with generous spatial breathing room.",
    aestheticTokens: {
      wallTexture: "Bookmatched Calacatta stone with warm fluted timber accents",
      palette: "Ivory marble, brushed bronze, deep architectural slate",
      mood: "Stately, opulent, luminous",
      lightingTone: "Layered 2700K/3000K accent downlights and illuminated mirrors",
    },
    preferredCameraId: "hero",
  },
];

export const SCRATCH_TEMPLATE: BathroomTemplate = {
  id: "scratch",
  name: "Custom / Start from Scratch",
  subtitle: "Configure bespoke dimensions & parameters",
  description: "Begin with a blank architectural canvas and customize every dimension, budget constraint, and fixture requirement manually.",
  roomDefaults: {
    widthM: 2.4384,
    depthM: 1.8288,
    heightM: 2.7432,
    widthFt: 8.0,
    depthFt: 6.0,
    heightFt: 9.0,
  },
  recommendedZones: ["toilet", "basin", "rainhead"],
  style: "Luxury Modern",
  budgetRange: {
    min: 200000,
    max: 2000000,
    default: 500000,
  },
  spatialIntent: "Custom layout defined completely by client brief parameters.",
  aestheticTokens: {
    wallTexture: "Architectural travertine with fluted microcement",
    palette: "Charcoal, off-white, polished chrome",
    mood: "Bespoke, precise",
    lightingTone: "3000K balanced lighting",
  },
  preferredCameraId: "hero",
};

export function getTemplateById(id: string): BathroomTemplate {
  if (id === "scratch") return SCRATCH_TEMPLATE;
  return BATHROOM_TEMPLATES.find((t) => t.id === id) ?? BATHROOM_TEMPLATES[0];
}

import * as THREE from "three";

export type TextureArchetype =
  | "warm_terrazzo"
  | "grey_terrazzo"
  | "fluted_travertine"
  | "honed_limestone"
  | "raked_cement"
  | "dark_basalt"
  | "greige_stucco"
  | "graphite_porcelain"
  | "calacatta_marble"
  | "porcelain_tile";

export interface TemplateAesthetic {
  id: string;
  name: string;
  // Floor
  floorArchetype: TextureArchetype;
  floorBaseColor: string;
  floorRoughness: number;
  floorMetalness: number;
  skirtingColor: string;
  // Feature Wall (Behind Vanity)
  vanityWallArchetype: TextureArchetype;
  vanityWallBaseColor: string;
  vanityWallRoughness: number;
  // Wet Wall (Shower Zone)
  wetWallArchetype: TextureArchetype;
  wetWallBaseColor: string;
  wetWallRoughness: number;
  // General Perimeter Walls
  perimeterWallBaseColor: string;
  perimeterWallRoughness: number;
  // Toilet Joinery & Concealed Duct
  ductJoineryColor: string;
  ductShadowLineColor: string;
  nicheBackColor: string;
  nicheGlowColor: string;
  nicheGlowIntensity: number;
  flushPlateFinish: "chrome" | "brushed_brass" | "matte_black" | "brushed_nickel";
  // Vanity Console & Countertop
  vanityFlutingArchetype: "reeded_terracotta" | "dark_walnut" | "charred_cedar" | "smoked_ash" | "fluted_oak";
  vanityBodyColor: string;
  vanitySlatShadowColor: string;
  countertopArchetype: "carrara_marble" | "calacatta_gold" | "black_granite" | "pure_quartz";
  countertopBaseColor: string;
  countertopRoughness: number;
  countertopMetalness: number;
  underVanityGlowColor: string;
  underVanityGlowIntensity: number;
  // Mirror & Lighting
  mirrorLightingStyle: "top_bar" | "halo_glow" | "dual_sidelights";
  mirrorLightColor: string;
  mirrorLightIntensity: number;
  ambientLightColor: string;
  ambientIntensity: number;
  hemiSkyColor: string;
  hemiGroundColor: string;
  sunLightColor: string;
  sunIntensity: number;
}

export const TEMPLATE_AESTHETICS: Record<string, TemplateAesthetic> = {
  // 1. Compact Modern (Faithful Lookbook page 16 implementation)
  "compact-modern": {
    id: "compact-modern",
    name: "Compact Modern • Terrazzo & Satin Lacquer",
    floorArchetype: "warm_terrazzo",
    floorBaseColor: "#c8b8a8",
    floorRoughness: 0.38,
    floorMetalness: 0.04,
    skirtingColor: "#3a342e",
    vanityWallArchetype: "warm_terrazzo",
    vanityWallBaseColor: "#cfbfaf",
    vanityWallRoughness: 0.42,
    wetWallArchetype: "grey_terrazzo",
    wetWallBaseColor: "#a2a6a8",
    wetWallRoughness: 0.40,
    perimeterWallBaseColor: "#ded8ce",
    perimeterWallRoughness: 0.78,
    ductJoineryColor: "#f4f0eb", // Smooth satin off-white/ivory lacquer
    ductShadowLineColor: "#2b2622",
    nicheBackColor: "#9c6359", // Warm dusty terracotta / blush copper interior
    nicheGlowColor: "#ffcaa0",
    nicheGlowIntensity: 1.8,
    flushPlateFinish: "chrome",
    vanityFlutingArchetype: "reeded_terracotta",
    vanityBodyColor: "#8e574d", // Architectural dusty rose / terracotta fluting
    vanitySlatShadowColor: "#3d1f1b",
    countertopArchetype: "carrara_marble",
    countertopBaseColor: "#e6e3df",
    countertopRoughness: 0.22,
    countertopMetalness: 0.08,
    underVanityGlowColor: "#ffeed6",
    underVanityGlowIntensity: 1.2,
    mirrorLightingStyle: "top_bar", // Integrated top frosted horizontal LED light bar
    mirrorLightColor: "#fffaf0",
    mirrorLightIntensity: 1.6,
    ambientLightColor: "#fcf8f2",
    ambientIntensity: 0.58,
    hemiSkyColor: "#fff8f0",
    hemiGroundColor: "#423b34",
    sunLightColor: "#fff5e6",
    sunIntensity: 1.35,
  },

  // 2. Luxury Spa (Lookbook pages 14, 24, 28)
  "luxury-spa": {
    id: "luxury-spa",
    name: "Luxury Spa • Roman Travertine & Smoked Walnut",
    floorArchetype: "honed_limestone",
    floorBaseColor: "#beaf9e",
    floorRoughness: 0.32,
    floorMetalness: 0.05,
    skirtingColor: "#403225",
    vanityWallArchetype: "fluted_travertine",
    vanityWallBaseColor: "#cbbea8",
    vanityWallRoughness: 0.48,
    wetWallArchetype: "honed_limestone",
    wetWallBaseColor: "#c2b4a0",
    wetWallRoughness: 0.35,
    perimeterWallBaseColor: "#d5c9b6",
    perimeterWallRoughness: 0.70,
    ductJoineryColor: "#2c241e", // Smoked walnut architectural joinery
    ductShadowLineColor: "#17120e",
    nicheBackColor: "#b39154", // Warm brushed bronze / champagne interior
    nicheGlowColor: "#ffd28a",
    nicheGlowIntensity: 2.0,
    flushPlateFinish: "brushed_brass",
    vanityFlutingArchetype: "dark_walnut",
    vanityBodyColor: "#3c3127",
    vanitySlatShadowColor: "#17120e",
    countertopArchetype: "calacatta_gold",
    countertopBaseColor: "#f4ede0",
    countertopRoughness: 0.20,
    countertopMetalness: 0.06,
    underVanityGlowColor: "#ffd7a0",
    underVanityGlowIntensity: 1.4,
    mirrorLightingStyle: "halo_glow",
    mirrorLightColor: "#ffecd0",
    mirrorLightIntensity: 1.8,
    ambientLightColor: "#fbf4ea",
    ambientIntensity: 0.52,
    hemiSkyColor: "#fff5e8",
    hemiGroundColor: "#3a2d21",
    sunLightColor: "#fff0da",
    sunIntensity: 1.40,
  },

  // 3. Minimal Zen (Lookbook pages 26, 30)
  "minimal-zen": {
    id: "minimal-zen",
    name: "Minimal Zen • Monolithic Basalt & Raked Plaster",
    floorArchetype: "dark_basalt",
    floorBaseColor: "#2a2826",
    floorRoughness: 0.55,
    floorMetalness: 0.02,
    skirtingColor: "#181716",
    vanityWallArchetype: "raked_cement",
    vanityWallBaseColor: "#a8a29a",
    vanityWallRoughness: 0.65,
    wetWallArchetype: "dark_basalt",
    wetWallBaseColor: "#32302e",
    wetWallRoughness: 0.50,
    perimeterWallBaseColor: "#b2aba2",
    perimeterWallRoughness: 0.80,
    ductJoineryColor: "#252422", // Matte volcanic charcoal
    ductShadowLineColor: "#121110",
    nicheBackColor: "#1c1b1a",
    nicheGlowColor: "#ffe4c4",
    nicheGlowIntensity: 1.4,
    flushPlateFinish: "matte_black",
    vanityFlutingArchetype: "charred_cedar",
    vanityBodyColor: "#2b2826",
    vanitySlatShadowColor: "#141312",
    countertopArchetype: "black_granite",
    countertopBaseColor: "#22201e",
    countertopRoughness: 0.40,
    countertopMetalness: 0.04,
    underVanityGlowColor: "#ffeedd",
    underVanityGlowIntensity: 1.1,
    mirrorLightingStyle: "top_bar",
    mirrorLightColor: "#fff8f0",
    mirrorLightIntensity: 1.4,
    ambientLightColor: "#f4f0eb",
    ambientIntensity: 0.48,
    hemiSkyColor: "#eae6e0",
    hemiGroundColor: "#22201e",
    sunLightColor: "#fff6ec",
    sunIntensity: 1.20,
  },

  // 4. Contemporary Ensuite (Lookbook page 18)
  "contemporary-ensuite": {
    id: "contemporary-ensuite",
    name: "Contemporary Ensuite • Greige Stucco & Smoked Ash",
    floorArchetype: "porcelain_tile",
    floorBaseColor: "#b4ada4",
    floorRoughness: 0.35,
    floorMetalness: 0.03,
    skirtingColor: "#302b26",
    vanityWallArchetype: "greige_stucco",
    vanityWallBaseColor: "#c4bcb2",
    vanityWallRoughness: 0.50,
    wetWallArchetype: "graphite_porcelain",
    wetWallBaseColor: "#7e8284",
    wetWallRoughness: 0.38,
    perimeterWallBaseColor: "#cec7be",
    perimeterWallRoughness: 0.75,
    ductJoineryColor: "#ded8ce", // Cashmere grey matte lacquer
    ductShadowLineColor: "#2a2520",
    nicheBackColor: "#6e645a",
    nicheGlowColor: "#fff0db",
    nicheGlowIntensity: 1.6,
    flushPlateFinish: "brushed_nickel",
    vanityFlutingArchetype: "smoked_ash",
    vanityBodyColor: "#584e44",
    vanitySlatShadowColor: "#28221b",
    countertopArchetype: "pure_quartz",
    countertopBaseColor: "#f7f6f2",
    countertopRoughness: 0.18,
    countertopMetalness: 0.05,
    underVanityGlowColor: "#fff2e0",
    underVanityGlowIntensity: 1.2,
    mirrorLightingStyle: "dual_sidelights",
    mirrorLightColor: "#fffcf7",
    mirrorLightIntensity: 1.5,
    ambientLightColor: "#f8f4ed",
    ambientIntensity: 0.54,
    hemiSkyColor: "#fff8f0",
    hemiGroundColor: "#383129",
    sunLightColor: "#fff8ec",
    sunIntensity: 1.30,
  },

  // 5. Grand Master (Lookbook page 32)
  "grand-master": {
    id: "grand-master",
    name: "Grand Master • Calacatta Gold & Smoked Oak",
    floorArchetype: "calacatta_marble",
    floorBaseColor: "#ebe7de",
    floorRoughness: 0.24,
    floorMetalness: 0.08,
    skirtingColor: "#3b3026",
    vanityWallArchetype: "calacatta_marble",
    vanityWallBaseColor: "#ede8df",
    vanityWallRoughness: 0.28,
    wetWallArchetype: "calacatta_marble",
    wetWallBaseColor: "#ede8df",
    wetWallRoughness: 0.28,
    perimeterWallBaseColor: "#ded7cc",
    perimeterWallRoughness: 0.68,
    ductJoineryColor: "#342a22", // Stately fluted smoked eucalyptus
    ductShadowLineColor: "#17120d",
    nicheBackColor: "#aa864e", // Champagne gold leaf interior
    nicheGlowColor: "#ffdd9e",
    nicheGlowIntensity: 2.2,
    flushPlateFinish: "brushed_brass",
    vanityFlutingArchetype: "fluted_oak",
    vanityBodyColor: "#423428",
    vanitySlatShadowColor: "#1a140f",
    countertopArchetype: "calacatta_gold",
    countertopBaseColor: "#f6f1e6",
    countertopRoughness: 0.16,
    countertopMetalness: 0.08,
    underVanityGlowColor: "#ffdba2",
    underVanityGlowIntensity: 1.5,
    mirrorLightingStyle: "halo_glow",
    mirrorLightColor: "#ffeed6",
    mirrorLightIntensity: 1.8,
    ambientLightColor: "#fcf6ec",
    ambientIntensity: 0.56,
    hemiSkyColor: "#fff8ed",
    hemiGroundColor: "#3c2e22",
    sunLightColor: "#fff4e2",
    sunIntensity: 1.45,
  },
};

export function resolveTemplateAesthetic(
  templateId?: string,
  style?: string,
): TemplateAesthetic {
  if (templateId && TEMPLATE_AESTHETICS[templateId]) {
    return TEMPLATE_AESTHETICS[templateId];
  }

  // Fallback matching by style string
  const normalizedStyle = (style ?? "").toLowerCase();
  if (normalizedStyle.includes("spa")) return TEMPLATE_AESTHETICS["luxury-spa"];
  if (normalizedStyle.includes("zen")) return TEMPLATE_AESTHETICS["minimal-zen"];
  if (normalizedStyle.includes("ensuite")) return TEMPLATE_AESTHETICS["contemporary-ensuite"];
  if (normalizedStyle.includes("grand") || normalizedStyle.includes("master")) {
    return TEMPLATE_AESTHETICS["grand-master"];
  }

  // Default to Compact Modern (the signature Lookbook render)
  return TEMPLATE_AESTHETICS["compact-modern"];
}

function pseudoRandom(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Generates an authentic Venetian Terrazzo texture using HTML5 Canvas.
 * Generates multi-scale organic mineral inclusions (terracotta, calcite cream, slate, amber)
 * on a honed limestone/cement matrix.
 */
export function generateTerrazzoCanvas(
  baseColor: string,
  palette: "warm" | "grey",
  width = 1024,
  height = 1024,
): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Base matrix
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, width, height);

  // Subtle architectural micro-tonal variation (restrained, low-frequency, no harsh blotches)
  let seed = palette === "warm" ? 42 : 108;
  for (let i = 0; i < 1500; i += 1) {
    const x = pseudoRandom(seed++) * width;
    const y = pseudoRandom(seed++) * height;
    const rad = 4 + pseudoRandom(seed++) * 16;
    const alpha = 0.015 + pseudoRandom(seed++) * 0.025;
    ctx.fillStyle = palette === "warm" ? `rgba(140, 128, 115, ${alpha})` : `rgba(130, 138, 145, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // Soft, tonal architectural aggregate (subtle, pale, non-contrasting)
  const warmFleckColors = [
    "rgba(255, 252, 248, 0.4)",  // Calcite cream
    "rgba(235, 226, 215, 0.35)", // Light sandstone
    "rgba(195, 180, 165, 0.25)", // Warm greige pebble
    "rgba(180, 160, 145, 0.20)", // Soft limestone
  ];

  const greyFleckColors = [
    "rgba(255, 255, 255, 0.4)",  // Clean white quartz
    "rgba(225, 230, 235, 0.35)", // Light architectural grey
    "rgba(180, 188, 195, 0.25)", // Soft honed basalt
    "rgba(165, 172, 180, 0.20)", // Neutral slate
  ];

  const fleckColors = palette === "warm" ? warmFleckColors : greyFleckColors;

  for (let i = 0; i < 800; i += 1) {
    const x = pseudoRandom(seed++) * width;
    const y = pseudoRandom(seed++) * height;
    const colorIndex = Math.floor(pseudoRandom(seed++) * fleckColors.length);
    const size = 1.5 + pseudoRandom(seed++) * 3.5;

    ctx.fillStyle = fleckColors[colorIndex];
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Refined architectural tile joint lines (1.2m x 0.6m repeat)
  ctx.strokeStyle = palette === "warm" ? "rgba(130, 120, 110, 0.20)" : "rgba(120, 125, 130, 0.20)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(width / 2, 0);
  ctx.lineTo(width / 2, height);
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();

  return canvas;
}

/**
 * Generates a clean, restrained architectural honed porcelain / microcement texture.
 * Low frequency, soft reflectance, perfectly neutral for luxury bathroom presentation.
 */
export function generateHonedPorcelainCanvas(
  baseColor: string,
  width = 1024,
  height = 1024,
): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, width, height);

  // Soft low-frequency microcement / honed stone gradation
  let seed = 777;
  for (let i = 0; i < 1200; i += 1) {
    const x = pseudoRandom(seed++) * width;
    const y = pseudoRandom(seed++) * height;
    const rad = 10 + pseudoRandom(seed++) * 40;
    const alpha = 0.012 + pseudoRandom(seed++) * 0.022;
    ctx.fillStyle = `rgba(245, 240, 232, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 800; i += 1) {
    const x = pseudoRandom(seed++) * width;
    const y = pseudoRandom(seed++) * height;
    const rad = 6 + pseudoRandom(seed++) * 24;
    const alpha = 0.010 + pseudoRandom(seed++) * 0.018;
    ctx.fillStyle = `rgba(140, 130, 120, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // Soft refined tile seams (1.2m x 0.6m layout)
  ctx.strokeStyle = "rgba(150, 142, 132, 0.22)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(width / 2, 0);
  ctx.lineTo(width / 2, height);
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();

  return canvas;
}

/**
 * Generates an authentic Calacatta Gold marble texture.
 */
export function generateCalacattaMarbleCanvas(
  baseColor: string,
  width = 1024,
  height = 1024,
): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, width, height);

  // Soft crystalline clouds
  let seed = 999;
  for (let i = 0; i < 2000; i += 1) {
    const x = pseudoRandom(seed++) * width;
    const y = pseudoRandom(seed++) * height;
    const rad = 20 + pseudoRandom(seed++) * 60;
    ctx.fillStyle = `rgba(230, 224, 214, ${0.05 + pseudoRandom(seed++) * 0.05})`;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // Branching diagonal Calacatta Gold and grey-slate veins
  const drawVein = (
    startX: number,
    startY: number,
    color: string,
    widthRange: [number, number],
    roughness: number,
  ) => {
    let currX = startX;
    let currY = startY;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(currX, currY);

    for (let step = 0; step < 180; step += 1) {
      currX += (pseudoRandom(seed++) - 0.35) * roughness;
      currY += 4 + pseudoRandom(seed++) * 6;
      ctx.lineWidth = widthRange[0] + pseudoRandom(seed++) * (widthRange[1] - widthRange[0]);
      ctx.lineTo(currX, currY);
    }
    ctx.stroke();
  };

  // Grey-slate veins
  drawVein(width * 0.3, 0, "rgba(120, 115, 110, 0.25)", [2, 6], 12);
  drawVein(width * 0.7, 0, "rgba(130, 125, 120, 0.22)", [1.5, 4.5], 10);
  // Gold-amber accent veins
  drawVein(width * 0.35, 0, "rgba(196, 154, 88, 0.22)", [1.2, 3.5], 14);
  drawVein(width * 0.65, 0, "rgba(205, 165, 95, 0.20)", [1.0, 3.0], 12);

  return canvas;
}

/**
 * Generates an authentic Fluted Reeded Slat texture for wall-hung vanities.
 */
export function generateFlutedSlatCanvas(
  bodyColor: string,
  shadowColor: string,
  slatWidth = 14,
  width = 512,
  height = 512,
): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = bodyColor;
  ctx.fillRect(0, 0, width, height);

  for (let x = 0; x < width; x += slatWidth) {
    // Slat body
    ctx.fillStyle = bodyColor;
    ctx.fillRect(x, 0, slatWidth - 2, height);

    // Left highlight edge (beveled light catch)
    ctx.fillStyle = "rgba(255, 250, 240, 0.18)";
    ctx.fillRect(x, 0, 1.5, height);

    // Right deep shadow reveal line (fluting groove)
    ctx.fillStyle = shadowColor;
    ctx.fillRect(x + slatWidth - 2.5, 0, 2.5, height);
  }

  return canvas;
}

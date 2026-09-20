import type { DesignState } from "./types";

export interface CameraPreset {
  id: string;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export interface DesignPresentation {
  id: string;
  title: string;
  subtitle: string;
  designState: DesignState;
  heroCamera: CameraPreset;
  alternateCameras: CameraPreset[];
  metadata: {
    style: string;
    budget: number;
    totalCost: number;
    remainingBudget: number;
    budgetUtilizationPercent: number;
    roomDimensionsM: { widthM: number; depthM: number; heightM: number };
    roomDimensionsFt: { widthFt: number; depthFt: number; heightFt: number };
    spatialValid: boolean;
    fixtureCount: number;
  };
}

export const DEFAULT_CAMERA_PRESETS: CameraPreset[] = [
  {
    id: "hero",
    label: "Lookbook Hero View",
    position: [0.0, 0.65, 1.32],
    target: [0.0, -0.60, 1.08],
    fov: 68,
  },
  {
    id: "vanity",
    label: "Vanity & Backlit Mirror",
    position: [-0.20, 0.35, 1.22],
    target: [-0.65, -0.65, 0.95],
    fov: 62,
  },
  {
    id: "toilet",
    label: "Innate Smart Toilet",
    position: [0.25, 0.35, 1.05],
    target: [0.65, -0.65, 0.45],
    fov: 62,
  },
  {
    id: "aerial",
    label: "Architectural Plan",
    position: [0.0, 0.05, 3.2],
    target: [0.0, 0.0, 0.0],
    fov: 60,
  },
];

const METRES_TO_FEET = 3.28084;

export function buildDynamicCameraPresets(state: DesignState): CameraPreset[] {
  const presets: CameraPreset[] = [];
  const depthM = state.room.depthM;

  // 1. Lookbook Hero View: Dynamically framed inside the room volume
  const heroY = Math.min(depthM * 0.38, depthM / 2 - 0.22);
  const targetY = -depthM * 0.35;
  presets.push({
    id: "hero",
    label: "Lookbook Hero View",
    position: [0.0, heroY, 1.32],
    target: [0.0, targetY, 1.08],
    fov: 68,
  });

  // 2. Vanity / Basin fixture camera
  const vanityPlacement = state.placements.find(
    (p) => p.role.includes("basin") || p.role.includes("vanity"),
  );
  if (vanityPlacement) {
    const px = vanityPlacement.position.x;
    const py = vanityPlacement.position.y;
    const pz = vanityPlacement.position.z;
    presets.push({
      id: "vanity",
      label: "Vanity & Backlit Mirror",
      position: [px > 0 ? 0.2 : -0.2, py + 1.0, pz + 0.35],
      target: [px, py, pz + 0.15],
      fov: 62,
    });
  } else {
    presets.push(DEFAULT_CAMERA_PRESETS[1]);
  }

  // 3. Toilet fixture camera
  const toiletPlacement = state.placements.find((p) => p.role.includes("toilet"));
  if (toiletPlacement) {
    const px = toiletPlacement.position.x;
    const py = toiletPlacement.position.y;
    const pz = toiletPlacement.position.z;
    presets.push({
      id: "toilet",
      label: "Innate Smart Toilet",
      position: [px > 0 ? 0.25 : -0.25, py + 1.0, pz + 0.6],
      target: [px, py, pz + 0.2],
      fov: 62,
    });
  } else {
    presets.push(DEFAULT_CAMERA_PRESETS[2]);
  }

  // 4. Shower / Rainhead camera (if placed)
  const showerPlacement = state.placements.find(
    (p) => p.role.includes("rainhead") || p.role.includes("shower"),
  );
  if (showerPlacement) {
    const px = showerPlacement.position.x;
    const py = showerPlacement.position.y;
    const pz = showerPlacement.position.z;
    presets.push({
      id: "shower",
      label: "Rainhead Shower Suite",
      position: [px * 0.4, py + 1.0, pz - 0.4],
      target: [px, py, pz - 0.8],
      fov: 65,
    });
  }

  // 5. Bath camera (if placed)
  const bathPlacement = state.placements.find((p) => p.role.includes("bath"));
  if (bathPlacement) {
    const px = bathPlacement.position.x;
    const py = bathPlacement.position.y;
    const pz = bathPlacement.position.z;
    presets.push({
      id: "bath",
      label: "Freestanding Bath",
      position: [px * 0.4, py + 1.2, pz + 0.7],
      target: [px, py, pz + 0.2],
      fov: 62,
    });
  }

  // 6. Architectural Plan
  const planHeight = Math.max(3.2, (state.room?.heightM ?? 2.74) + 0.6);
  presets.push({
    id: "aerial",
    label: "Architectural Plan",
    position: [0.0, 0.05, planHeight],
    target: [0.0, 0.0, 0.0],
    fov: 60,
  });

  return presets;
}

export function createDesignPresentation(
  state: DesignState,
  options?: {
    id?: string;
    title?: string;
    subtitle?: string;
    styleName?: string;
  },
): DesignPresentation {
  const budget = state.budget ?? 500000;
  const totalCost = state.totalProductCost;
  const remainingBudget = Math.max(0, budget - totalCost);
  const budgetUtilizationPercent = budget > 0 ? (totalCost / budget) * 100 : 0;

  const roomM = state.room;
  const roomFt = {
    widthFt: Number((roomM.widthM * METRES_TO_FEET).toFixed(1)),
    depthFt: Number((roomM.depthM * METRES_TO_FEET).toFixed(1)),
    heightFt: Number((roomM.heightM * METRES_TO_FEET).toFixed(1)),
  };

  const dynamicPresets = buildDynamicCameraPresets(state);
  const heroCamera = dynamicPresets[0] || DEFAULT_CAMERA_PRESETS[0];
  const alternateCameras = dynamicPresets.slice(1);

  return {
    id: options?.id ?? "design-alpha",
    title: options?.title ?? "Luxury Modern Suite",
    subtitle: options?.subtitle ?? "Bespoke spatial design with real KOHLER fixtures",
    designState: state,
    heroCamera,
    alternateCameras,
    metadata: {
      style: options?.styleName ?? state.style ?? "Luxury Modern",
      budget,
      totalCost,
      remainingBudget,
      budgetUtilizationPercent: Number(budgetUtilizationPercent.toFixed(1)),
      roomDimensionsM: {
        widthM: Number(roomM.widthM.toFixed(3)),
        depthM: Number(roomM.depthM.toFixed(3)),
        heightM: Number(roomM.heightM.toFixed(3)),
      },
      roomDimensionsFt: roomFt,
      spatialValid: state.validation.valid,
      fixtureCount: state.selectedProducts.length,
    },
  };
}

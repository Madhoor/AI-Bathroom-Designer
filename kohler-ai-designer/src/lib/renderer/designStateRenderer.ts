 import type { DesignPlacement, DesignState } from "../design";

export interface NormalizedAssetManifestEntry {
  productCode: string;
  outputGlbPath: string;
  conversionStatus: string;
  validationStatus: string;
  scaleFactor: number;
  rotationApplied: string;
  normalizedBoundsM: [number, number, number];
}

export interface ResolvedDesignAsset {
  productCode: string;
  url: string;
  scaleFactor: number;
  rotationApplied: string;
  normalizedBoundsM: [number, number, number];
}

export interface RenderablePlacement {
  placement: DesignPlacement;
  asset: ResolvedDesignAsset;
}

export interface DesignRenderPlan {
  renderablePlacements: RenderablePlacement[];
  missingProductCodes: string[];
}

export function resolveDesignAsset(
  productCode: string,
  manifest: readonly NormalizedAssetManifestEntry[],
): ResolvedDesignAsset | null {
  const entry = manifest.find(
    (candidate) =>
      candidate.productCode === productCode &&
      candidate.conversionStatus === "success" &&
      candidate.validationStatus === "valid",
  );
  if (!entry) return null;

  return {
    productCode,
    url: `/api/3d-assets/${encodeURIComponent(productCode)}`,
    scaleFactor: entry.scaleFactor,
    rotationApplied: entry.rotationApplied,
    normalizedBoundsM: entry.normalizedBoundsM,
  };
}

import {
  resolveProductOrientation,
  detectMountingWall,
  type WallOrientation,
} from "./productOrientationAdapter";

export interface AssetLocalTransform {
  /** Production GLBs are X=width, Y=height, Z=depth after the validated -90° X conversion. */
  position: [number, number, number];
  rotation: [number, number, number];
}

export function getAssetLocalTransform(
  asset: ResolvedDesignAsset,
  product?: { productCode?: string; role?: string; category?: string; subcategory?: string },
): AssetLocalTransform {
  const resolved = resolveProductOrientation(
    product ?? { productCode: asset.productCode },
    asset,
    { isPreview: true },
  );
  return {
    position: resolved.localPosition,
    rotation: resolved.localRotation,
  };
}

export function createDesignRenderPlan(
  state: DesignState,
  manifest: readonly NormalizedAssetManifestEntry[],
): DesignRenderPlan {
  const renderablePlacements: RenderablePlacement[] = [];
  const missingProductCodes: string[] = [];

  state.placements.forEach((placement) => {
    const asset = resolveDesignAsset(placement.productCode, manifest);
    if (asset) {
      renderablePlacements.push({ placement, asset });
    } else if (!missingProductCodes.includes(placement.productCode)) {
      missingProductCodes.push(placement.productCode);
    }
  });

  return {
    renderablePlacements,
    missingProductCodes,
  };
}

export type MountingWall = WallOrientation;
export type CardinalDirection = "north" | "south" | "east" | "west";

export interface ArchitecturalPlacement {
  worldPosition: [number, number, number];
  worldRotation: [number, number, number];
  mountingWall: MountingWall;
  frontDirection: CardinalDirection;
  backDirection: CardinalDirection;
  isGrounded: boolean;
  clearanceM: { wall: number; side: number };
}

export { detectMountingWall };

export function getArchitecturalPlacement(
  placement: DesignPlacement,
  asset: ResolvedDesignAsset,
  room: DesignState["room"],
): ArchitecturalPlacement {
  const [assetWidth, , assetDepth] = asset.normalizedBoundsM;
  const resolved = resolveProductOrientation(placement, asset, { room, placement });
  const mountingWall = detectMountingWall(placement.position, room);

  let frontDir: CardinalDirection = "north";
  let backDir: CardinalDirection = "south";

  if (mountingWall === "south") {
    frontDir = "north";
    backDir = "south";
  } else if (mountingWall === "north") {
    frontDir = "south";
    backDir = "north";
  } else if (mountingWall === "west") {
    frontDir = "east";
    backDir = "west";
  } else if (mountingWall === "east") {
    frontDir = "west";
    backDir = "east";
  }

  const [worldX, worldY, worldZ] = resolved.worldPosition;

  const wallClearance =
    mountingWall === "south"
      ? worldY - assetDepth / 2 - (-room.depthM / 2)
      : mountingWall === "north"
      ? room.depthM / 2 - (worldY + assetDepth / 2)
      : mountingWall === "west"
      ? worldX - assetDepth / 2 - (-room.widthM / 2)
      : room.widthM / 2 - (worldX + assetDepth / 2);

  return {
    worldPosition: resolved.worldPosition,
    worldRotation: resolved.worldRotation,
    mountingWall,
    frontDirection: frontDir,
    backDirection: backDir,
    isGrounded: worldZ === 0,
    clearanceM: {
      wall: Math.max(0, wallClearance),
      side: Math.max(0, room.widthM / 2 - Math.abs(worldX) - assetWidth / 2),
    },
  };
}

export function getUniqueAssetUrls(plan: DesignRenderPlan): string[] {
  return [...new Set(plan.renderablePlacements.map(({ asset }) => asset.url))].sort();
}

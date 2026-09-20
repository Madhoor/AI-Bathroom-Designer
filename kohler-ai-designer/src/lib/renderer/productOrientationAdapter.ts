import {
  resolveProductSemantics,
  type ProductInputLike,
  type ProductSemanticRole,
} from "../catalogue/productSemantics";
import {
  getProductOrientationProfile,
  type ProductOrientationProfile,
} from "./orientationProfiles";
import type { BathroomRoom } from "../constraints";
import type { DesignPlacement } from "../design/types";

export interface ResolvedProductTransform {
  /** Local offset in metres to center and ground the GLB */
  localPosition: [number, number, number];
  /** Local base Euler rotation to align normalized GLB to canonical fixture space */
  localRotation: [number, number, number];
  /** World position in the bathroom or preview scene [X, Y, Z] */
  worldPosition: [number, number, number];
  /** World rotation in the bathroom or preview scene [roll, pitch, yaw] */
  worldRotation: [number, number, number];
  /** Physical bounding box in oriented canonical space [widthM, depthM, heightM] */
  orientedBoundsM: [number, number, number];
  /** Authoritative semantic role */
  role: ProductSemanticRole;
  /** Applied orientation profile */
  profile: ProductOrientationProfile;
  /** Any diagnostic warnings encountered */
  warnings: string[];
}

export type WallOrientation = "south" | "north" | "west" | "east" | "none";

/**
 * Detects the nearest mounting wall for a given world position within a room.
 */
export function detectMountingWall(
  position: { x: number; y: number; z: number },
  room?: { widthM: number; depthM: number; heightM: number },
): WallOrientation {
  if (!room) return "none";
  const distSouth = position.y - -room.depthM / 2;
  const distNorth = room.depthM / 2 - position.y;
  const distWest = position.x - -room.widthM / 2;
  const distEast = room.widthM / 2 - position.x;

  const minDist = Math.min(distSouth, distNorth, distWest, distEast);
  if (minDist === distSouth) return "south";
  if (minDist === distNorth) return "north";
  if (minDist === distWest) return "west";
  if (minDist === distEast) return "east";
  return "none";
}

export interface OrientationContext {
  room?: BathroomRoom;
  placement?: DesignPlacement;
  isPreview?: boolean;
  overrideWall?: WallOrientation;
}

/**
 * Centralized, shared orientation resolution adapter.
 *
 * Consumed by both:
 * 1. Catalogue 3D Preview (/catalogue)
 * 2. Bathroom 3D Renderer (/designer)
 * 3. Manual Layout Editor
 */
export function resolveProductOrientation(
  product: ProductInputLike,
  asset: { normalizedBoundsM: [number, number, number] },
  context: OrientationContext = {},
): ResolvedProductTransform {
  const warnings: string[] = [];
  const productCode = product.productCode ?? "unknown";

  // 1. Authoritative Factual Role
  const semantics = resolveProductSemantics(product);
  const role = semantics.role;

  // 2. Profile Resolution
  const profile = getProductOrientationProfile(role, productCode);
  if (profile.confidence === "needs_review") {
    warnings.push(
      `Product [${productCode}] orientation profile requires review: ${profile.notes ?? "Unverified orientation archetype"}`,
    );
  }

  // 3. Normalized GLB Dimensions
  const [assetWidth, assetHeight, assetDepth] = asset.normalizedBoundsM;

  // In canonical oriented space (Three.js world):
  // X = Width (assetWidth)
  // Y = Depth (assetDepth)
  // Z = Height (assetHeight)
  const orientedBoundsM: [number, number, number] = [assetWidth, assetDepth, assetHeight];

  // 4. Local Transform inside canonical fixture group
  const localPosition: [number, number, number] = [0, assetHeight / 2, -assetDepth / 2];
  const localRotation: [number, number, number] = [...profile.defaultRotation];

  // 5. Preview Mode (Catalogue Viewer)
  if (context.isPreview || !context.room) {
    return {
      localPosition,
      localRotation,
      worldPosition: [0, 0, 0],
      worldRotation: [0, 0, 0],
      orientedBoundsM,
      role,
      profile,
      warnings,
    };
  }

  // 6. Bathroom Scene Placement Mode
  const room = context.room;
  const placement = context.placement;
  let worldX = placement?.position.x ?? 0;
  let worldY = placement?.position.y ?? 0;
  let worldZ = placement?.position.z ?? 0;
  let rotationZDeg = placement?.rotation.z ?? 0;

  const mountingWall =
    context.overrideWall ?? detectMountingWall({ x: worldX, y: worldY, z: worldZ }, room);

  // Apply Category Architectural Positioning & Orientation Rules
  switch (role) {
    case "toilet": {
      // Grounded on floor
      worldZ = 0;
      // Functional bowl projects into room, back aligns with wall
      if (mountingWall === "south") {
        rotationZDeg = 180;
        const targetBackY = -room.depthM / 2 + 0.04;
        worldY = targetBackY + assetDepth / 2;
        const maxAllowedX = room.widthM / 2 - 0.05 - assetWidth / 2;
        const minAllowedX = -room.widthM / 2 + 0.05 + assetWidth / 2;
        worldX = Math.max(minAllowedX, Math.min(maxAllowedX, worldX));
      } else if (mountingWall === "north") {
        rotationZDeg = 0;
        const targetBackY = room.depthM / 2 - 0.04;
        worldY = targetBackY - assetDepth / 2;
      } else if (mountingWall === "west") {
        rotationZDeg = 90;
        const targetBackX = -room.widthM / 2 + 0.04;
        worldX = targetBackX + assetDepth / 2;
      } else if (mountingWall === "east") {
        rotationZDeg = 270;
        const targetBackX = room.widthM / 2 - 0.04;
        worldX = targetBackX - assetDepth / 2;
      }
      break;
    }

    case "basin": {
      // Unhosted vessel basin elevated to standard vanity countertop presentation height (Z = 0.72m)
      if (worldZ === 0) {
        worldZ = 0.72;
        if (mountingWall === "south") {
          const vanityFrontY = -room.depthM / 2 + 0.52;
          worldY = (-room.depthM / 2 + vanityFrontY) / 2;
          rotationZDeg = 0;
        }
      }
      break;
    }

    case "bath": {
      // Floor-grounded, horizontal long dimension
      worldZ = 0;
      break;
    }

    case "rainhead": {
      // Ceiling-mounted, flush with ceiling plane
      worldZ = room.heightM;
      break;
    }

    case "faucet": {
      // If counter/deck mounted at Z=0 without explicit height, align to vanity countertop deck
      if (
        worldZ === 0 &&
        (placement?.placementSurface === "counter" ||
          (placement?.placementSurface as string) === "deck" ||
          !placement?.placementSurface)
      ) {
        worldZ = 0.72;
      }
      break;
    }

    default:
      break;
  }

  // If manual placement specified an explicit yaw rotation and it's not wall-locked
  if (placement && typeof placement.rotation?.z === "number" && mountingWall === "none") {
    rotationZDeg = placement.rotation.z;
  }

  const worldRotation: [number, number, number] = [0, 0, (rotationZDeg * Math.PI) / 180];

  return {
    localPosition,
    localRotation,
    worldPosition: [worldX, worldY, worldZ],
    worldRotation,
    orientedBoundsM,
    role,
    profile,
    warnings,
  };
}

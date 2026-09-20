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
import { getShowerZoneAnchor } from "../design/showerZone";

/**
 * ============================================================================
 * COORDINATE SYSTEM CONTRACTS:
 * ============================================================================
 * 1. NORMALIZED GLB SPACE:
 *    Raw normalized asset coordinate frame as exported from 3D normalization.
 *    X = width, Y = height, Z = depth (with metadata: rotationApplied = "-90deg_X").
 *
 * 2. CANONICAL WORLD SPACE (Bathroom Renderer & Constraint Engine):
 *    Standard architectural world space:
 *    - X = lateral width (room.widthM, left = -X, right = +X)
 *    - Y = room depth (room.depthM, front/south = -Y, back/north = +Y)
 *    - Z = vertical elevation (floor = 0, ceiling = room.heightM, Up = +Z)
 *    Fixtures: Local +Y points towards mounting wall behind fixture, Local -Y points into room.
 *
 * 3. CATALOGUE PREVIEW SPACE (Studio Product Viewer):
 *    Three.js Studio scene with standard camera looking at origin (Up = +Y, Right = +X, Front = +Z).
 *    To visually align models with the expected architectural orientation in the preview studio:
 *    CATALOGUE PREVIEW SPACE = NORMALIZED GLB SPACE × PREVIEW AXIS CORRECTION (Z = -90°)
 * ============================================================================
 */
export const CATALOGUE_PREVIEW_AXIS_CORRECTION: [number, number, number] = [0, 0, -Math.PI / 2];

export interface ResolvedProductTransform {
  /** Local offset in metres to center and ground the GLB */
  localPosition: [number, number, number];
  /** Local base Euler rotation to align normalized GLB to canonical fixture space */
  localRotation: [number, number, number];
  /** Catalogue Studio Preview Euler rotation: Canonical Fixture Space × Preview Axis Correction (Z = -90°) */
  previewRotation: [number, number, number];
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
  hostPlacement?: DesignPlacement;
  allPlacements?: DesignPlacement[];
  isPreview?: boolean;
  overrideWall?: WallOrientation;
}

/**
 * Centralized, shared orientation resolution adapter.
 *
 * Consumed by:
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

  // 4. Canonical Local Transform
  const localPosition: [number, number, number] = [0, assetHeight / 2, -assetDepth / 2];
  const localRotation: [number, number, number] = [...profile.defaultRotation];

  // 5. Catalogue Preview Space Transform (Z = -90° correction for studio camera)
  const previewRotation: [number, number, number] = [
    profile.defaultRotation[0],
    profile.defaultRotation[1],
    profile.defaultRotation[2] + CATALOGUE_PREVIEW_AXIS_CORRECTION[2],
  ];

  // Preview Mode (Catalogue Viewer fallback / unplaced)
  if (context.isPreview || !context.room) {
    return {
      localPosition,
      localRotation,
      previewRotation,
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
      // Ceiling-mounted, flush with ceiling plane:
      // Mounting face contacts ceiling plane at Z = room.heightM
      // Base anchor is at room.heightM - assetHeight so spray face hangs below ceiling
      worldZ = Math.max(0, room.heightM - assetHeight);
      if (worldX === 0 && worldY === 0) {
        const showerAnchor = getShowerZoneAnchor(room);
        worldX = showerAnchor.x;
        worldY = showerAnchor.y;
      }
      break;
    }

    case "faucet": {
      // Generic Basin-Host Faucet Attachment Rule:
      // Faucet sits on the deck/counter surface at Z=0.72m behind the basin bowl,
      // pointing forward into the basin bowl.
      const hostBasin =
        context.hostPlacement ??
        context.allPlacements?.find(
          (p) =>
            p.productCode === placement?.hostProductCode ||
            p.role === "basin" ||
            p.role.includes("basin"),
        );

      if (hostBasin) {
        // If faucet doesn't have an explicit custom offset, position it relative to host basin
        if (placement && placement.position.x === 0 && placement.position.y === 0) {
          worldX = hostBasin.position.x;
          // Offset behind the basin toward the wall
          const basinDepth = hostBasin.footprint?.depthM ?? 0.45;
          const basinRotRad = ((hostBasin.rotation?.z ?? 0) * Math.PI) / 180;
          // Offset 35% of basin depth backward (+Y in local basin space)
          const localOffsetY = basinDepth * 0.35;
          worldX = hostBasin.position.x - Math.sin(basinRotRad) * localOffsetY;
          worldY = hostBasin.position.y + Math.cos(basinRotRad) * localOffsetY;
        }
        worldZ = 0.72;
        rotationZDeg = hostBasin.rotation?.z ?? rotationZDeg;
      } else if (
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
    previewRotation,
    worldPosition: [worldX, worldY, worldZ],
    worldRotation,
    orientedBoundsM,
    role,
    profile,
    warnings,
  };
}

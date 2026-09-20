import {
  validateBathroomLayout,
  type BathroomRoom,
  type ConstraintEngineOptions,
  type LayoutValidationResult,
  type PlacedProduct,
} from "../constraints";
import type { DesignPlacement, DesignState, PlacementSurface } from "./types";

/**
 * Converts DesignPlacement items into PlacedProduct items required by the deterministic constraint engine.
 */
export function placementToPlacedProduct(
  placement: DesignPlacement,
  room: BathroomRoom,
  state?: DesignState,
): PlacedProduct {
  const matchingRecProduct = state?.selectedProducts.find(
    (p) => p.productCode === placement.productCode,
  );

  return {
    productCode: placement.productCode,
    xM: placement.position.x,
    yM: placement.position.y,
    zM: placement.position.z,
    rotationZDeg: placement.rotation.z,
    widthM: placement.footprint.widthM,
    depthM: placement.footprint.depthM,
    heightM: placement.footprint.heightM,
    role: placement.role,
    bathroomZone: placement.zone,
    requiresHostProduct: matchingRecProduct?.metadata?.requiresHostProduct,
    hostRoles: matchingRecProduct?.metadata?.hostRoles,
  };
}

/**
 * Validates a tentative modified placement against the rest of the bathroom layout and room envelope.
 */
export function validateTentativePlacement(
  tentativePlacement: DesignPlacement,
  state: DesignState,
  constraintOptions?: ConstraintEngineOptions,
): LayoutValidationResult {
  const updatedPlacements = state.placements.map((p) =>
    p.productCode === tentativePlacement.productCode ? tentativePlacement : p,
  );

  const placedProducts = updatedPlacements.map((p) =>
    placementToPlacedProduct(p, state.room, state),
  );

  return validateBathroomLayout(state.room, placedProducts, constraintOptions);
}

/**
 * Formats validation violations into human-readable messages for the UI toolbar.
 */
export function getPlacementDiagnosticMessages(
  productCode: string,
  validation: LayoutValidationResult,
): { valid: boolean; errors: string[]; warnings: string[] } {
  const productErrors = validation.errors
    .filter((e) => e.productCodes.includes(productCode))
    .map((e) => e.message);

  const productWarnings = validation.warnings
    .filter((w) => w.productCodes.includes(productCode))
    .map((w) => w.message);

  return {
    valid: productErrors.length === 0,
    errors: productErrors,
    warnings: productWarnings,
  };
}

export type WallOrientation = "south" | "north" | "west" | "east";

/**
 * Identifies the nearest room wall for a given position.
 */
export function findNearestWall(
  position: { x: number; y: number },
  room: BathroomRoom,
): WallOrientation {
  const distSouth = position.y - -room.depthM / 2;
  const distNorth = room.depthM / 2 - position.y;
  const distWest = position.x - -room.widthM / 2;
  const distEast = room.widthM / 2 - position.x;

  const min = Math.min(distSouth, distNorth, distWest, distEast);
  if (min === distSouth) return "south";
  if (min === distNorth) return "north";
  if (min === distWest) return "west";
  return "east";
}

/**
 * Constrains tentative translation coordinates based on fixture mount surface.
 * Ensures the product remains in physical world space (metres) respecting surface rules.
 */
export function constrainPositionToSurface(
  tentativePos: { x: number; y: number; z: number },
  surface: PlacementSurface,
  footprint: { widthM: number; depthM: number; heightM: number },
  room: BathroomRoom,
  hostPlacement?: DesignPlacement,
): { x: number; y: number; z: number; rotationZDeg?: number } {
  const margin = 0.04; // 4cm wall offset
  const halfW = footprint.widthM / 2;
  const halfD = footprint.depthM / 2;

  // 1. Floor-mounted fixtures (toilets, bathtubs, vanities)
  if (surface === "floor" || surface === "freestanding") {
    const minX = -room.widthM / 2 + margin + halfW;
    const maxX = room.widthM / 2 - margin - halfW;
    const minY = -room.depthM / 2 + margin + halfD;
    const maxY = room.depthM / 2 - margin - halfD;

    return {
      x: Math.max(minX, Math.min(maxX, tentativePos.x)),
      y: Math.max(minY, Math.min(maxY, tentativePos.y)),
      z: 0, // Grounded on floor
    };
  }

  // 2. Ceiling-mounted fixtures (rainheads, recessed downlights)
  if (surface === "ceiling") {
    const minX = -room.widthM / 2 + margin + halfW;
    const maxX = room.widthM / 2 - margin - halfW;
    const minY = -room.depthM / 2 + margin + halfD;
    const maxY = room.depthM / 2 - margin - halfD;

    return {
      x: Math.max(minX, Math.min(maxX, tentativePos.x)),
      y: Math.max(minY, Math.min(maxY, tentativePos.y)),
      z: room.heightM, // Ceiling plane
    };
  }

  // 3. Wall-mounted fixtures (wall hung toilets, mirrors, hand showers)
  if (surface === "wall" || surface === "shower_wall") {
    const wall = findNearestWall(tentativePos, room);
    const minZ = 0.1;
    const maxZ = room.heightM - footprint.heightM - margin;
    const z = Math.max(minZ, Math.min(maxZ, tentativePos.z));

    if (wall === "south") {
      const minX = -room.widthM / 2 + margin + halfW;
      const maxX = room.widthM / 2 - margin - halfW;
      return {
        x: Math.max(minX, Math.min(maxX, tentativePos.x)),
        y: -room.depthM / 2 + margin + halfD,
        z,
        rotationZDeg: 180,
      };
    } else if (wall === "north") {
      const minX = -room.widthM / 2 + margin + halfW;
      const maxX = room.widthM / 2 - margin - halfW;
      return {
        x: Math.max(minX, Math.min(maxX, tentativePos.x)),
        y: room.depthM / 2 - margin - halfD,
        z,
        rotationZDeg: 0,
      };
    } else if (wall === "west") {
      const minY = -room.depthM / 2 + margin + halfD;
      const maxY = room.depthM / 2 - margin - halfD;
      return {
        x: -room.widthM / 2 + margin + halfD,
        y: Math.max(minY, Math.min(maxY, tentativePos.y)),
        z,
        rotationZDeg: 90,
      };
    } else {
      // East wall
      const minY = -room.depthM / 2 + margin + halfD;
      const maxY = room.depthM / 2 - margin - halfD;
      return {
        x: room.widthM / 2 - margin - halfD,
        y: Math.max(minY, Math.min(maxY, tentativePos.y)),
        z,
        rotationZDeg: 270,
      };
    }
  }

  // 4. Counter-mounted or host-dependent (faucets, vessel basins)
  if (hostPlacement) {
    const hostHalfW = hostPlacement.footprint.widthM / 2;
    const hostHalfD = hostPlacement.footprint.depthM / 2;
    const clampedX = Math.max(
      hostPlacement.position.x - hostHalfW + halfW,
      Math.min(hostPlacement.position.x + hostHalfW - halfW, tentativePos.x),
    );
    const clampedY = Math.max(
      hostPlacement.position.y - hostHalfD + halfD,
      Math.min(hostPlacement.position.y + hostHalfD - halfD, tentativePos.y),
    );

    return {
      x: clampedX,
      y: clampedY,
      z: hostPlacement.position.z + hostPlacement.footprint.heightM,
    };
  }

  // Default fallback: preserve within room bounds
  return {
    x: Math.max(-room.widthM / 2 + halfW, Math.min(room.widthM / 2 - halfW, tentativePos.x)),
    y: Math.max(-room.depthM / 2 + halfD, Math.min(room.depthM / 2 - halfD, tentativePos.y)),
    z: Math.max(0, Math.min(room.heightM - footprint.heightM, tentativePos.z)),
  };
}

/**
 * Snaps a rotation angle in degrees to standard architectural increments (15°, 45°, 90°).
 */
export function snapRotation(angleDeg: number, snapStepDeg: number = 45): number {
  const normalized = ((angleDeg % 360) + 360) % 360;
  return Math.round(normalized / snapStepDeg) * snapStepDeg % 360;
}

/**
 * Finds the baseline placement of a product from the original generated state.
 */
export function findBaselinePlacement(
  productCode: string,
  baselineState: DesignState,
): DesignPlacement | null {
  return baselineState.placements.find((p) => p.productCode === productCode) ?? null;
}

/**
 * Applies edited placements into a new DesignState, recalculating overall layout validation.
 */
export function commitManualEditsToState(
  originalState: DesignState,
  updatedPlacements: DesignPlacement[],
  constraintOptions?: ConstraintEngineOptions,
): DesignState {
  const placedProducts = updatedPlacements.map((p) =>
    placementToPlacedProduct(p, originalState.room, originalState),
  );

  const validation = validateBathroomLayout(originalState.room, placedProducts, constraintOptions);

  return {
    ...originalState,
    placements: updatedPlacements,
    validation,
    warnings: validation.valid
      ? (originalState.warnings ?? []).filter((w) => !w.includes("hard spatial constraints"))
      : [...(originalState.warnings ?? []), "Manual edit introduced layout constraint violations."],
  };
}

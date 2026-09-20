import {
  validateBathroomLayout,
  type BathroomRoom,
  type ConstraintEngineOptions,
  type LayoutValidationResult,
  type PlacedProduct,
} from "../constraints";
import type { DesignPlacement, DesignState, PlacementSurface } from "./types";
import { getShowerZoneDefinition } from "./showerZone";

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
  fixtureContext?: { role?: string; zone?: string },
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
    // Ceiling elevation: mounting face flush with room.heightM -> z = room.heightM - footprint.heightM
    const ceilingZ = Math.max(0, room.heightM - footprint.heightM);

    const isShowerFixture =
      fixtureContext?.role?.includes("rainhead") ||
      fixtureContext?.role?.includes("shower") ||
      fixtureContext?.zone === "shower";

    if (isShowerFixture) {
      const { bounds } = getShowerZoneDefinition(room);
      const minX = bounds.minX + margin + halfW;
      const maxX = bounds.maxX - margin - halfW;
      const minY = bounds.minY + margin + halfD;
      const maxY = bounds.maxY - margin - halfD;

      const x = minX > maxX ? (bounds.minX + bounds.maxX) / 2 : Math.max(minX, Math.min(maxX, tentativePos.x));
      const y = minY > maxY ? (bounds.minY + bounds.maxY) / 2 : Math.max(minY, Math.min(maxY, tentativePos.y));

      return {
        x,
        y,
        z: ceilingZ,
      };
    }

    const minX = -room.widthM / 2 + margin + halfW;
    const maxX = room.widthM / 2 - margin - halfW;
    const minY = -room.depthM / 2 + margin + halfD;
    const maxY = room.depthM / 2 - margin - halfD;

    return {
      x: Math.max(minX, Math.min(maxX, tentativePos.x)),
      y: Math.max(minY, Math.min(maxY, tentativePos.y)),
      z: ceilingZ,
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
 * Propagates host transformations (translation and rotation) to hosted dependent fixtures
 * (e.g., faucet follows basin when moved or rotated).
 */
export function syncHostedPlacements(
  originalPlacements: DesignPlacement[],
  updatedPlacements: DesignPlacement[],
): DesignPlacement[] {
  const result = [...updatedPlacements];

  for (const updated of updatedPlacements) {
    const original = originalPlacements.find((p) => p.productCode === updated.productCode);
    if (!original) continue;

    const deltaX = updated.position.x - original.position.x;
    const deltaY = updated.position.y - original.position.y;
    const deltaRot = updated.rotation.z - original.rotation.z;

    if (deltaX !== 0 || deltaY !== 0 || deltaRot !== 0) {
      for (let i = 0; i < result.length; i++) {
        const dependent = result[i];
        const isDependent =
          dependent.productCode !== updated.productCode &&
          (dependent.hostProductCode === updated.productCode ||
            (updated.role.includes("basin") && dependent.role.includes("faucet")));

        if (isDependent) {
          let newX = dependent.position.x + deltaX;
          let newY = dependent.position.y + deltaY;

          if (deltaRot !== 0) {
            const rad = (deltaRot * Math.PI) / 180;
            const relX = dependent.position.x - original.position.x;
            const relY = dependent.position.y - original.position.y;
            const rotRelX = relX * Math.cos(rad) - relY * Math.sin(rad);
            const rotRelY = relX * Math.sin(rad) + relY * Math.cos(rad);
            newX = updated.position.x + rotRelX;
            newY = updated.position.y + rotRelY;
          }

          result[i] = {
            ...dependent,
            position: {
              ...dependent.position,
              x: newX,
              y: newY,
            },
            rotation: {
              ...dependent.rotation,
              z: (dependent.rotation.z + deltaRot + 360) % 360,
            },
          };
        }
      }
    }
  }

  return result;
}

/**
 * Applies edited placements into a new DesignState, recalculating overall layout validation.
 * Automatically synchronizes hosted dependents (such as faucets following basins).
 */
export function commitManualEditsToState(
  originalState: DesignState,
  updatedPlacements: DesignPlacement[],
  constraintOptions?: ConstraintEngineOptions,
): DesignState {
  const syncedPlacements = syncHostedPlacements(originalState.placements, updatedPlacements);

  const placedProducts = syncedPlacements.map((p) =>
    placementToPlacedProduct(p, originalState.room, originalState),
  );

  const validation = validateBathroomLayout(originalState.room, placedProducts, constraintOptions);

  return {
    ...originalState,
    placements: syncedPlacements,
    validation,
    warnings: validation.valid
      ? (originalState.warnings ?? []).filter((w) => !w.includes("hard spatial constraints"))
      : [...(originalState.warnings ?? []), "Manual edit introduced layout constraint violations."],
  };
}

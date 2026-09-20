import type { BathroomRoom } from "../constraints";
import type { ProductInputLike } from "../catalogue/productSemantics";
import { resolveProductSemantics } from "../catalogue/productSemantics";

export interface ShowerZoneBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface ShowerZoneDefinition {
  glassX: number;
  glassWidth: number;
  glassHeight: number;
  glassThickness: number;
  bounds: ShowerZoneBounds;
  anchor: {
    x: number;
    y: number;
  };
}

/**
 * Derives the architectural shower cabin definition and bounds based on room envelope.
 * Consistent across 3D canvas (GlassShowerScreen), 2D floor plan, and placement engine.
 */
export function getShowerZoneDefinition(room: BathroomRoom): ShowerZoneDefinition {
  // Standard safety glass screen dimensions (Lookbook pages 14, 16, 26, 28)
  const defaultGlassX = 0.28;
  const defaultGlassWidth = 0.96;
  const glassHeight = 2.20;
  const glassThickness = 0.01;

  // Ensure minimum shower cabin width of 0.70m and reasonable walk-in space
  const maxX = room.widthM / 2;
  const glassX = Math.min(defaultGlassX, maxX - 0.70);

  // Shower screen extends from South back wall (+Y into room)
  const minY = -room.depthM / 2;
  const maxAllowedDepth = room.depthM - 0.60; // Leave 60cm walkway clearance
  const glassWidth = Math.min(defaultGlassWidth, Math.max(0.70, maxAllowedDepth));
  const maxY = minY + glassWidth;

  const bounds: ShowerZoneBounds = {
    minX: glassX,
    maxX,
    minY,
    maxY,
  };

  const anchor = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };

  return {
    glassX,
    glassWidth,
    glassHeight,
    glassThickness,
    bounds,
    anchor,
  };
}

/**
 * Returns the canonical showerhead anchor point (X, Y) inside the shower enclosure.
 */
export function getShowerZoneAnchor(
  room: BathroomRoom,
  _presentation?: unknown,
  _designState?: unknown,
): { x: number; y: number } {
  return getShowerZoneDefinition(room).anchor;
}

/**
 * Tests whether an (X, Y) coordinate falls within the shower cabin region.
 */
export function isInsideShowerZone(
  pos: { x: number; y: number },
  room: BathroomRoom,
  margin = 0.0,
): boolean {
  const { bounds } = getShowerZoneDefinition(room);
  return (
    pos.x >= bounds.minX + margin &&
    pos.x <= bounds.maxX - margin &&
    pos.y >= bounds.minY + margin &&
    pos.y <= bounds.maxY - margin
  );
}

export interface CeilingMountedPlacement {
  worldPosition: [number, number, number];
  worldRotation: [number, number, number];
  orientedBoundsM: [number, number, number];
  sprayDirection: [number, number, number];
  mountsAtCeiling: boolean;
}

/**
 * Generic ceiling-mounted placement resolver for any ceiling fixture (rainheads, recessed lighting).
 *
 * Invariants guaranteed:
 * 1. Mounting surface contacts ceiling plane exactly at Z = room.heightM.
 * 2. worldZ = room.heightM - assetHeightM so the fixture hangs inside the room.
 * 3. Spray face points downward towards floor (-Z).
 * 4. Shower fixtures are anchored inside the architectural shower enclosure.
 */
export function resolveCeilingMountedPlacement(
  product: ProductInputLike,
  assetBounds: [number, number, number],
  room: BathroomRoom,
  zone?: string,
): CeilingMountedPlacement {
  const semantics = resolveProductSemantics(product);
  const [assetWidth, assetHeight, assetDepth] = assetBounds;

  // In Three.js canonical oriented space: [Width, Depth, Height]
  const orientedBoundsM: [number, number, number] = [assetWidth, assetDepth, assetHeight];

  // 1. Vertical: Mounting face contacts ceiling at Z = room.heightM
  // Base anchor position is room.heightM - assetHeight
  const worldZ = Math.max(0, room.heightM - assetHeight);

  // 2. Horizontal: If shower fixture, anchor in shower zone; otherwise center
  const isShowerFixture =
    semantics.role === "rainhead" ||
    semantics.role === "showerhead" ||
    zone === "shower" ||
    semantics.primaryZone === "shower";

  let worldX = 0;
  let worldY = 0;

  if (isShowerFixture) {
    const anchor = getShowerZoneAnchor(room);
    worldX = anchor.x;
    worldY = anchor.y;
  }

  return {
    worldPosition: [worldX, worldY, worldZ],
    worldRotation: [0, 0, 0],
    orientedBoundsM,
    sprayDirection: [0, 0, -1],
    mountsAtCeiling: true,
  };
}

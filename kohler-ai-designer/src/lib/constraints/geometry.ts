import type { BathroomRoom, PlacedProduct, RoomWall } from "./types";

export interface Point2D {
  x: number;
  y: number;
}

export interface AxisAlignedBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface Footprint {
  corners: Point2D[];
}

const EPSILON = 1e-9;

export function getRotatedFootprint(product: PlacedProduct): Footprint {
  const angle = (product.rotationZDeg * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const halfWidth = product.widthM / 2;
  const halfDepth = product.depthM / 2;
  const localCorners = [
    [-halfWidth, -halfDepth],
    [halfWidth, -halfDepth],
    [halfWidth, halfDepth],
    [-halfWidth, halfDepth],
  ];

  return {
    corners: localCorners.map(([x, y]) => ({
      x: product.xM + x * cos - y * sin,
      y: product.yM + x * sin + y * cos,
    })),
  };
}

export function getAxisAlignedBounds(footprint: Footprint): AxisAlignedBounds {
  const xs = footprint.corners.map((point) => point.x);
  const ys = footprint.corners.map((point) => point.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

function project(corners: Point2D[], axis: Point2D): [number, number] {
  const values = corners.map((point) => point.x * axis.x + point.y * axis.y);
  return [Math.min(...values), Math.max(...values)];
}

function axesFor(footprint: Footprint): Point2D[] {
  return footprint.corners.map((point, index) => {
    const next = footprint.corners[(index + 1) % footprint.corners.length];
    const edge = { x: next.x - point.x, y: next.y - point.y };
    const length = Math.hypot(edge.x, edge.y);
    return { x: -edge.y / length, y: edge.x / length };
  });
}

export function footprintsIntersect(first: Footprint, second: Footprint): boolean {
  return [...axesFor(first), ...axesFor(second)].every((axis) => {
    const [firstMin, firstMax] = project(first.corners, axis);
    const [secondMin, secondMax] = project(second.corners, axis);
    return firstMax - EPSILON > secondMin && secondMax - EPSILON > firstMin;
  });
}

function pointToSegmentDistance(point: Point2D, start: Point2D, end: Point2D): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

export function distanceBetweenFootprints(first: Footprint, second: Footprint): number {
  if (footprintsIntersect(first, second)) return 0;
  let distance = Number.POSITIVE_INFINITY;
  for (const firstPoint of first.corners) {
    for (let index = 0; index < second.corners.length; index += 1) {
      distance = Math.min(distance, pointToSegmentDistance(firstPoint, second.corners[index], second.corners[(index + 1) % second.corners.length]));
    }
  }
  for (const secondPoint of second.corners) {
    for (let index = 0; index < first.corners.length; index += 1) {
      distance = Math.min(distance, pointToSegmentDistance(secondPoint, first.corners[index], first.corners[(index + 1) % first.corners.length]));
    }
  }
  return distance;
}

export function footprintInsideRoom(footprint: Footprint, room: BathroomRoom): boolean {
  return footprint.corners.every(
    (point) => point.x >= -room.widthM / 2 - EPSILON && point.x <= room.widthM / 2 + EPSILON
      && point.y >= -room.depthM / 2 - EPSILON && point.y <= room.depthM / 2 + EPSILON,
  );
}

export function getDoorOpeningBounds(door: { wall: RoomWall; offsetM: number; widthM: number }, room: BathroomRoom): AxisAlignedBounds {
  if (door.wall === "north" || door.wall === "south") {
    return {
      minX: -room.widthM / 2 + door.offsetM,
      maxX: -room.widthM / 2 + door.offsetM + door.widthM,
      minY: door.wall === "north" ? room.depthM / 2 - 0.01 : -room.depthM / 2,
      maxY: door.wall === "north" ? room.depthM / 2 : -room.depthM / 2 + 0.01,
    };
  }
  return {
    minX: door.wall === "east" ? room.widthM / 2 - 0.01 : -room.widthM / 2,
    maxX: door.wall === "east" ? room.widthM / 2 : -room.widthM / 2 + 0.01,
    minY: -room.depthM / 2 + door.offsetM,
    maxY: -room.depthM / 2 + door.offsetM + door.widthM,
  };
}

export function getDoorSwingBounds(
  door: { wall: RoomWall; offsetM: number; widthM: number; swing?: "inward" | "outward" | "none" },
  room: BathroomRoom,
): AxisAlignedBounds | null {
  if (door.swing !== "inward") return null;
  const swingDepth = Math.min(0.8, door.wall === "north" || door.wall === "south" ? room.depthM : room.widthM);
  const minX = -room.widthM / 2 + door.offsetM;
  const maxX = minX + door.widthM;
  const minY = -room.depthM / 2 + door.offsetM;
  const maxY = minY + door.widthM;
  if (door.wall === "south") return { minX, maxX, minY: -room.depthM / 2, maxY: -room.depthM / 2 + swingDepth };
  if (door.wall === "north") return { minX, maxX, minY: room.depthM / 2 - swingDepth, maxY: room.depthM / 2 };
  if (door.wall === "west") return { minX: -room.widthM / 2, maxX: -room.widthM / 2 + swingDepth, minY, maxY };
  return { minX: room.widthM / 2 - swingDepth, maxX: room.widthM / 2, minY, maxY };
}

export function boundsIntersect(first: AxisAlignedBounds, second: AxisAlignedBounds): boolean {
  return first.maxX > second.minX && second.maxX > first.minX && first.maxY > second.minY && second.maxY > first.minY;
}

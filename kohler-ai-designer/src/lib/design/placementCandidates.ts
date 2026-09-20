import type { BathroomRoom, PlacedProduct } from "../constraints";
import type { RecommendationProduct } from "../recommendation";
import type { DesignPlacement, PlacementSource, PlacementSurface } from "./types";

interface PlacementCandidate {
  placed: PlacedProduct;
  placement: DesignPlacement;
}

function dimensions(product: RecommendationProduct): { widthM: number; depthM: number; heightM: number } | undefined {
  if ([product.widthMm, product.depthMm, product.heightMm].some((value) => value === undefined || value <= 0)) return undefined;
  return { widthM: (product.widthMm ?? 0) / 1000, depthM: (product.depthMm ?? 0) / 1000, heightM: (product.heightMm ?? 0) / 1000 };
}

function surface(product: RecommendationProduct): PlacementSurface {
  const surfaces = product.metadata?.mountSurface ?? [];
  const preferred = ["floor", "freestanding", "wall", "shower_wall", "ceiling", "counter", "basin", "vanity"];
  return (preferred.find((item) => surfaces.includes(item)) ?? "unknown") as PlacementSurface;
}

function sourceFor(surfaceName: PlacementSurface): PlacementSource {
  return surfaceName === "unknown" ? "generic_zone_heuristic" : "factual_surface";
}

function candidatesForSurface(room: BathroomRoom, dims: { widthM: number; depthM: number; heightM: number }, surfaceName: PlacementSurface): Array<{ x: number; y: number; z: number }> {
  const margin = 0.05;
  const floorZ = 0;
  const wallZ = Math.max(0, room.heightM - dims.heightM - margin);
  const center = { x: 0, y: 0 };
  if (surfaceName === "wall" || surfaceName === "shower_wall") {
    return [
      { x: 0, y: room.depthM / 2 - margin - dims.depthM / 2, z: wallZ },
      { x: 0, y: -room.depthM / 2 + margin + dims.depthM / 2, z: wallZ },
      { x: -room.widthM / 2 + margin + dims.widthM / 2, y: 0, z: wallZ },
      { x: room.widthM / 2 - margin - dims.widthM / 2, y: 0, z: wallZ },
    ];
  }
  if (surfaceName === "ceiling") return [{ x: center.x, y: center.y, z: Math.max(0, room.heightM - dims.heightM) }];
  return [
    { x: -room.widthM / 2 + margin + dims.widthM / 2, y: -room.depthM / 2 + margin + dims.depthM / 2, z: floorZ },
    { x: room.widthM / 2 - margin - dims.widthM / 2, y: -room.depthM / 2 + margin + dims.depthM / 2, z: floorZ },
    { x: center.x, y: center.y, z: floorZ },
    { x: -room.widthM / 2 + margin + dims.widthM / 2, y: room.depthM / 2 - margin - dims.depthM / 2, z: floorZ },
    { x: room.widthM / 2 - margin - dims.widthM / 2, y: room.depthM / 2 - margin - dims.depthM / 2, z: floorZ },
  ];
}

export function generatePlacementCandidates(product: RecommendationProduct, room: BathroomRoom, hostProductCode?: string): PlacementCandidate[] {
  const dims = dimensions(product);
  if (!dims) return [];
  const placementSurface = surface(product);
  const role = product.metadata?.role[0] ?? product.category ?? "general";
  const zone = product.metadata?.bathroomZones[0] ?? "general";
  const source: PlacementSource = hostProductCode ? "generic_host_heuristic" : sourceFor(placementSurface);
  const candidates: PlacementCandidate[] = [];
  [0, 90].forEach((rotationZ) => {
    const rotated = rotationZ === 90 ? { widthM: dims.depthM, depthM: dims.widthM, heightM: dims.heightM } : dims;
    candidatesForSurface(room, rotated, placementSurface).forEach((position) => {
      const placed: PlacedProduct = {
        productCode: product.productCode,
        xM: position.x,
        yM: position.y,
        zM: position.z,
        rotationZDeg: rotationZ,
        widthM: dims.widthM,
        depthM: dims.depthM,
        heightM: dims.heightM,
        role,
        bathroomZone: zone,
        requiresHostProduct: product.metadata?.requiresHostProduct,
        hostRoles: product.metadata?.hostRoles,
      };
      candidates.push({
        placed,
        placement: {
          productCode: product.productCode,
          role,
          zone,
          position: { x: position.x, y: position.y, z: position.z },
          rotation: { x: 0, y: 0, z: rotationZ },
          footprint: dims,
          hostProductCode,
          placementSurface,
          source,
          validationStatus: "rejected",
        },
      });
    });
  });
  return candidates;
}

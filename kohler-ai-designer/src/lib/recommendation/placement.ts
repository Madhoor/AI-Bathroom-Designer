import type { BathroomRoom, PlacedProduct } from "../constraints";
import type { RecommendationProduct } from "./types";

export function placementForProduct(product: RecommendationProduct, room: BathroomRoom, index: number): PlacedProduct | undefined {
  if ([product.widthMm, product.depthMm, product.heightMm].some((value) => value === undefined || value <= 0)) return undefined;
  const widthM = (product.widthMm ?? 0) / 1000;
  const depthM = (product.depthMm ?? 0) / 1000;
  const heightM = (product.heightMm ?? 0) / 1000;
  const role = product.metadata?.role[0] ?? product.category ?? "general";
  const zone = product.metadata?.bathroomZones[0] ?? "general";
  const margin = 0.05;
  const x = Math.min(room.widthM / 2 - widthM / 2 - margin, -room.widthM / 2 + margin + widthM / 2 + (index % 3) * Math.max(widthM + margin, 0.6));
  const y = Math.min(room.depthM / 2 - depthM / 2 - margin, -room.depthM / 2 + margin + depthM / 2 + Math.floor(index / 3) * Math.max(depthM + margin, 0.6));
  if (x < -room.widthM / 2 + widthM / 2 || y < -room.depthM / 2 + depthM / 2) return undefined;
  return { productCode: product.productCode, xM: x, yM: y, zM: 0, rotationZDeg: 0, widthM, depthM, heightM, role, bathroomZone: zone, requiresHostProduct: product.metadata?.requiresHostProduct, hostRoles: product.metadata?.hostRoles };
}

export function generatePlacements(products: RecommendationProduct[], room: BathroomRoom): PlacedProduct[] | undefined {
  const placements = products.map((product, index) => placementForProduct(product, room, index));
  return placements.some((placement) => placement === undefined) ? undefined : placements as PlacedProduct[];
}

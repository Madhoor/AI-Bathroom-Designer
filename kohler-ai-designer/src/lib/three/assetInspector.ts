import * as THREE from "three";

export interface ModelMeasurements {
  rawExtents: THREE.Vector3;
  center: THREE.Vector3;
  vertexCount: number;
  faceCount: number;
  triangleCount: number;
  geometryCount: number;
  materialsDetected: number;
}

export interface DimensionPermutation {
  axes: [number, number, number];
  dimensions: [number, number, number];
  error: number;
  errors: [number, number, number];
}

export interface CatalogueComparison {
  best: DimensionPermutation | null;
  permutations: DimensionPermutation[];
}

export interface AssetCalibration {
  productCode: string;
  metersPerNativeUnit: number;
  rotationEulerDeg: [number, number, number];
  positionOffset: [number, number, number];
  orientationStatus: "default-ko-hler" | "verified" | "manual";
}

export const KOHLER_INCH_METERS = 0.0254;
export const KOHLER_DEFAULT_ROTATION_DEG: [number, number, number] = [-90, 0, 0];

export function measureObject(object: THREE.Object3D): ModelMeasurements {
  object.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(object);
  const rawExtents = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  let vertexCount = 0;
  let faceCount = 0;
  let triangleCount = 0;
  let geometryCount = 0;
  let materialsDetected = 0;

  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const geometry = child.geometry as THREE.BufferGeometry;
    const position = geometry.getAttribute("position");
    if (position) vertexCount += position.count;
    const index = geometry.getIndex();
    const indexedFaces = index ? index.count / 3 : (position?.count ?? 0) / 3;
    faceCount += indexedFaces;
    triangleCount += indexedFaces;
    geometryCount += 1;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materialsDetected += materials.filter(Boolean).length;
  });

  return {
    rawExtents,
    center,
    vertexCount,
    faceCount,
    triangleCount,
    geometryCount,
    materialsDetected,
  };
}

export function centerObject(object: THREE.Object3D): THREE.Vector3 {
  const measurements = measureObject(object);
  const offset = measurements.center.clone().multiplyScalar(-1);
  object.position.add(offset);
  return offset;
}

export function applyUniformScale(object: THREE.Object3D, scale: number): void {
  object.scale.setScalar(scale);
}

export function formatMillimeters(value: number): string {
  return `${Math.round(value).toLocaleString()} mm`;
}

export function formatNativeExtents(extents: THREE.Vector3, unit = "native units"): string {
  return `${extents.x.toFixed(2)} × ${extents.y.toFixed(2)} × ${extents.z.toFixed(2)} ${unit}`;
}

export function formatMeters(extents: THREE.Vector3): string {
  return `${extents.x.toFixed(3)} × ${extents.y.toFixed(3)} × ${extents.z.toFixed(3)} m`;
}

export function formatExtents(extents: THREE.Vector3): string {
  return `${formatMillimeters(extents.x)} × ${formatMillimeters(extents.y)} × ${formatMillimeters(extents.z)}`;
}

export function nativeToMeters(value: number, metersPerNativeUnit: number): number {
  return value * metersPerNativeUnit;
}

export function compareCatalogueDimensions(
  modelExtents: THREE.Vector3,
  catalogue: [number | undefined, number | undefined, number | undefined],
): CatalogueComparison {
  const source = [modelExtents.x, modelExtents.y, modelExtents.z];
  const permutations: DimensionPermutation[] = [];
  const indexes: [number, number, number][] = [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0],
  ];

  indexes.forEach((axes) => {
    const dimensions = axes.map((axis) => source[axis]) as [number, number, number];
    const errors = dimensions.map((value, index) => {
      const expected = catalogue[index];
      return expected ? Math.abs(value - expected) / expected : 0;
    }) as [number, number, number];
    const comparableErrors = errors.filter((_, index) => catalogue[index] !== undefined);
    permutations.push({
      axes,
      dimensions,
      errors,
      error: comparableErrors.length ? Math.max(...comparableErrors) : Number.POSITIVE_INFINITY,
    });
  });

  return {
    best: permutations.sort((a, b) => a.error - b.error)[0] ?? null,
    permutations,
  };
}

export function calculateScaleConfidence(
  modelExtents: THREE.Vector3,
  catalogue: [number | undefined, number | undefined, number | undefined],
  scale: number,
): number {
  const comparison = compareCatalogueDimensions(modelExtents.clone().multiplyScalar(scale), catalogue);
  return comparison.best && Number.isFinite(comparison.best.error)
    ? Math.max(0, 1 - comparison.best.error)
    : 0;
}

export function getWorldBounds(object: THREE.Object3D): THREE.Box3 {
  object.updateWorldMatrix(true, true);
  return new THREE.Box3().setFromObject(object);
}

export function getCameraFit(
  bounds: THREE.Box3,
  fovDegrees: number,
  padding = 1.7,
): { center: THREE.Vector3; position: THREE.Vector3; near: number; far: number } {
  const center = bounds.getCenter(new THREE.Vector3());
  const sphere = bounds.getBoundingSphere(new THREE.Sphere());
  const fovRadians = THREE.MathUtils.degToRad(fovDegrees);
  const distance = Math.max((sphere.radius * padding) / Math.tan(fovRadians / 2), 0.75);
  const direction = new THREE.Vector3(1, 0.75, 1).normalize();
  const position = center.clone().add(direction.multiplyScalar(distance));

  return {
    center,
    position,
    near: Math.max(distance / 100, 0.001),
    far: Math.max(distance * 8, 20),
  };
}

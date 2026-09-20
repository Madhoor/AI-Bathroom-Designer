export interface SampleCatalogueDimensions {
  widthMm: number;
  depthMm: number;
  heightMm?: number;
}

export interface ThreeSampleAsset {
  code: string;
  name: string;
  category: string;
  subcategory: string;
  objPath: string;
  glbPath: string;
  rawExtents?: [number, number, number];
  catalogueDimensions?: SampleCatalogueDimensions;
  inferredUnit: "inch" | "cm" | "mm" | "unknown";
  scaleConfidence?: number;
  scaleMmPerNative?: number;
  vertexCount: number;
  faceCount: number;
  triangleCount: number;
  geometryCount: number;
  materialsDetected: number;
}

export const threeSampleAssets: ThreeSampleAsset[] = [
  {
    code: "10385IN-CP",
    name: "Complementary™ Wall-mount bath spout",
    category: "Basin Area",
    subcategory: "Bathtub Faucets",
    objPath: "/models/dev-sample/10385IN.obj",
    glbPath: "/models/dev-sample/10385IN-CP.glb",
    rawExtents: [2.7514, 6.277, 1.7716],
    inferredUnit: "inch",
    vertexCount: 7950,
    faceCount: 15302,
    triangleCount: 15302,
    geometryCount: 1,
    materialsDetected: 0,
  },
  {
    code: "11160T-1-0",
    name: "Odeon™ semi-recessed basin, 56 cm",
    category: "Basin Area",
    subcategory: "Semi Recessed Basin",
    objPath: "/models/dev-sample/11160T-1.obj",
    glbPath: "/models/dev-sample/11160T-1-0.glb",
    rawExtents: [22.0948, 17.7113, 8.2417],
    inferredUnit: "inch",
    vertexCount: 7234,
    faceCount: 14400,
    triangleCount: 14400,
    geometryCount: 1,
    materialsDetected: 0,
  },
  {
    code: "11195T-0",
    name: "Cleo™ 175 cm x 80 cm freestanding bath",
    category: "Wellness",
    subcategory: "Freestanding Bathtubs",
    objPath: "/models/dev-sample/11195T.obj",
    glbPath: "/models/dev-sample/11195T-0.glb",
    rawExtents: [68.7686, 31.3667, 26.0985],
    catalogueDimensions: { widthMm: 1750, depthMm: 800 },
    inferredUnit: "inch",
    scaleConfidence: 0.9988794562925908,
    scaleMmPerNative: 25.476207874190514,
    vertexCount: 27790,
    faceCount: 55003,
    triangleCount: 55003,
    geometryCount: 1,
    materialsDetected: 0,
  },
  {
    code: "11479IN-VC1-0",
    name: "Forefront™ 58.1 cm rectangular semi-recessed bathroom sink",
    category: "Basin Area",
    subcategory: "Semi Recessed Basin",
    objPath: "/models/dev-sample/11479IN-VC1.obj",
    glbPath: "/models/dev-sample/11479IN-VC1-0.glb",
    rawExtents: [22.981, 18.2613, 7.6272],
    inferredUnit: "inch",
    vertexCount: 6033,
    faceCount: 12010,
    triangleCount: 12010,
    geometryCount: 1,
    materialsDetected: 0,
  },
  {
    code: "1188IN-C1-0",
    name: "sok™ 190.5 cm x 104 cm drop-in whirlpool bath",
    category: "Wellness",
    subcategory: "Drop-in Bathtubs",
    objPath: "/models/dev-sample/1188IN-C1.obj",
    glbPath: "/models/dev-sample/1188IN-C1-0.glb",
    rawExtents: [75, 41, 25.0087],
    catalogueDimensions: { widthMm: 1905, depthMm: 1040 },
    inferredUnit: "inch",
    scaleConfidence: 0.9993273755004358,
    scaleMmPerNative: 25.382926829268293,
    vertexCount: 22509,
    faceCount: 44148,
    triangleCount: 44148,
    geometryCount: 1,
    materialsDetected: 0,
  },
  {
    code: "13491T-4-RGD",
    name: 'Kelston Dual Handle 8" Lavatory Faucet',
    category: "Basin Area",
    subcategory: "Widespread Faucets",
    objPath: "/models/dev-sample/13491T-4.obj",
    glbPath: "/models/dev-sample/13491T-4-RGD.glb",
    rawExtents: [13.5877, 6.1399, 5.9922],
    inferredUnit: "inch",
    vertexCount: 20081,
    faceCount: 39438,
    triangleCount: 39438,
    geometryCount: 1,
    materialsDetected: 0,
  },
  {
    code: "1360IN-H2-0",
    name: "Riverbath™ 190.5 cm x 114.3 cm drop-in heated whirlpool bath",
    category: "Wellness",
    subcategory: "Drop-in Bathtubs",
    objPath: "/models/dev-sample/1360IN-H2.obj",
    glbPath: "/models/dev-sample/1360IN-H2-0.glb",
    rawExtents: [74.9998, 45, 27.9743],
    catalogueDimensions: { widthMm: 1905, depthMm: 1143 },
    inferredUnit: "inch",
    scaleConfidence: 0.9999986666648888,
    scaleMmPerNative: 25.400033866756978,
    vertexCount: 32784,
    faceCount: 63611,
    triangleCount: 63611,
    geometryCount: 1,
    materialsDetected: 0,
  },
  {
    code: "13693-CP",
    name: 'Traditional 10" single-function rainhead, 2.5 gpm',
    category: "Showering Area",
    subcategory: "Rainheads",
    objPath: "/models/dev-sample/13693.obj",
    glbPath: "/models/dev-sample/13693-CP.glb",
    rawExtents: [10.4256, 10.4256, 3.7039],
    inferredUnit: "inch",
    vertexCount: 15028,
    faceCount: 27290,
    triangleCount: 27290,
    geometryCount: 1,
    materialsDetected: 0,
  },
  {
    code: "1381T-S-0",
    name: "Veil™ One-piece elongated toilet with skirted trapway",
    category: "Toilet Area",
    subcategory: "One Piece",
    objPath: "/models/dev-sample/1381T-S.obj",
    glbPath: "/models/dev-sample/1381T-S-0.glb",
    rawExtents: [15.4426, 28.2606, 26.8547],
    inferredUnit: "inch",
    vertexCount: 14231,
    faceCount: 27643,
    triangleCount: 27643,
    geometryCount: 1,
    materialsDetected: 0,
  },
  {
    code: "1394IN-H2-0",
    name: "Riverbath™ 167.8 cm drop-in heated whirlpool bath",
    category: "Wellness",
    subcategory: "Drop-in Bathtubs",
    objPath: "/models/dev-sample/1394IN-H2.obj",
    glbPath: "/models/dev-sample/1394IN-H2-0.glb",
    rawExtents: [66.0603, 66.2358, 28.0285],
    inferredUnit: "inch",
    vertexCount: 30436,
    faceCount: 59100,
    triangleCount: 59100,
    geometryCount: 1,
    materialsDetected: 0,
  },
];

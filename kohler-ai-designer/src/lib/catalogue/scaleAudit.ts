import type { CatalogueProduct } from "./types";
import { resolveProductSemantics } from "./productSemantics";

export interface ScaleAuditResult {
  productCode: string;
  productName?: string;
  role: string;
  hasFactualDimensions: boolean;
  hasAssetBounds: boolean;
  factualBoundsM?: [number, number, number]; // [width, height, depth]
  assetBoundsM?: [number, number, number];   // [width, height, depth]
  scaleRatio?: number;
  discrepancyPercent?: number;
  status: "pass" | "discrepancy" | "missing_data";
  notes: string[];
}

export interface ScaleAuditSummary {
  totalAudited: number;
  passed: number;
  discrepancies: number;
  missingData: number;
  results: ScaleAuditResult[];
}

/**
 * Audits a single product's 3D asset bounding box against its factual catalogue dimensions.
 * Ensures 1 GLB unit represents 1 real-world metre.
 */
export function auditProductScale(
  product: CatalogueProduct,
  assetBounds?: [number, number, number] | null,
): ScaleAuditResult {
  const role = resolveProductSemantics(product).role;
  const bounds = assetBounds ?? product.normalizedBoundsM ?? null;
  const notes: string[] = [];

  const hasFactual =
    Boolean(product.widthMm && product.widthMm > 0) &&
    Boolean(product.heightMm && product.heightMm > 0);

  const factualW = (product.widthMm ?? 0) / 1000;
  const factualH = (product.heightMm ?? 0) / 1000;
  const factualD = (product.depthMm ?? 0) / 1000;

  if (!bounds) {
    return {
      productCode: product.productCode,
      productName: product.productName,
      role,
      hasFactualDimensions: hasFactual,
      hasAssetBounds: false,
      status: "missing_data",
      notes: ["No 3D normalized asset bounds available for this product"],
    };
  }

  if (!hasFactual) {
    return {
      productCode: product.productCode,
      productName: product.productName,
      role,
      hasFactualDimensions: false,
      hasAssetBounds: true,
      assetBoundsM: bounds,
      status: "missing_data",
      notes: ["No factual catalogue dimensions (width/height mm) in database"],
    };
  }

  const factualBoundsM: [number, number, number] = [factualW, factualH, factualD];
  const [assetW, assetH, assetD] = bounds;

  // Compare max dimension to evaluate general metric scale (independent of coordinate swizzles)
  const maxFactual = Math.max(factualW, factualH, factualD);
  const maxAsset = Math.max(assetW, assetH, assetD);

  if (maxFactual <= 0 || maxAsset <= 0) {
    return {
      productCode: product.productCode,
      productName: product.productName,
      role,
      hasFactualDimensions: true,
      hasAssetBounds: true,
      factualBoundsM,
      assetBoundsM: bounds,
      status: "missing_data",
      notes: ["Invalid zero or negative dimension encountered"],
    };
  }

  const scaleRatio = maxAsset / maxFactual;
  const discrepancyPercent = Math.abs(scaleRatio - 1) * 100;

  let status: "pass" | "discrepancy" = "pass";

  // Check threshold: > 25% discrepancy flags for review
  if (discrepancyPercent > 25) {
    status = "discrepancy";
    notes.push(
      `Discrepancy of ${discrepancyPercent.toFixed(1)}%: 3D max bound is ${(maxAsset * 1000).toFixed(0)}mm vs factual ${(maxFactual * 1000).toFixed(0)}mm`,
    );
  } else {
    notes.push(
      `Scale consistent within ${discrepancyPercent.toFixed(1)}%: 3D max ${(maxAsset * 1000).toFixed(0)}mm matches factual ${(maxFactual * 1000).toFixed(0)}mm`,
    );
  }

  // Sanity check role dimensions
  if (role === "faucet" && maxAsset > 0.8) {
    status = "discrepancy";
    notes.push("Sanity failure: faucet asset exceeds 800mm in maximum dimension");
  }
  if (role === "bath" && maxAsset < 1.0) {
    status = "discrepancy";
    notes.push("Sanity failure: bath asset is less than 1.0m in length");
  }

  return {
    productCode: product.productCode,
    productName: product.productName,
    role,
    hasFactualDimensions: true,
    hasAssetBounds: true,
    factualBoundsM,
    assetBoundsM: bounds,
    scaleRatio,
    discrepancyPercent,
    status,
    notes,
  };
}

/**
 * Audits a collection of catalogue products.
 */
export function auditCatalogueScale(
  products: readonly CatalogueProduct[],
  assetMap?: Map<string, [number, number, number]>,
): ScaleAuditSummary {
  let passed = 0;
  let discrepancies = 0;
  let missingData = 0;

  const results = products.map((product) => {
    const assetBounds = assetMap ? assetMap.get(product.productCode) : undefined;
    const result = auditProductScale(product, assetBounds);
    if (result.status === "pass") passed++;
    else if (result.status === "discrepancy") discrepancies++;
    else missingData++;
    return result;
  });

  return {
    totalAudited: products.length,
    passed,
    discrepancies,
    missingData,
    results,
  };
}

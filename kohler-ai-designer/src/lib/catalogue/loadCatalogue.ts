import fs from "node:fs";
import path from "node:path";
import type { CatalogueMetadata, CatalogueProduct } from "./types";

interface ManifestRow {
  product_code: string;
  output_glb_path: string;
  conversion_status: string;
  validation_status: string;
  scale_factor?: number;
  normalized_bounds_m?: string;
}

interface CachedCatalogueData {
  products: CatalogueProduct[];
  metadata: CatalogueMetadata;
}

let cachedCatalogue: CachedCatalogueData | null = null;

function parseCsv(content: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    const next = content[index + 1];

    if (character === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((value) => value.length > 0)) rows.push(row);
  }

  const headers = rows.shift() ?? [];
  return rows.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
  );
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function parseBounds(value: string | undefined): [number, number, number] | undefined {
  if (!value?.trim()) return undefined;
  const parts = value.split(" x ").map(Number);
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
    return parts as [number, number, number];
  }
  return undefined;
}

function parseImageUrls(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(";")
    .map((url) => url.trim())
    .filter((url) => url.startsWith("http://") || url.startsWith("https://"));
}

export function loadCatalogueData(baseDir = process.cwd()): CachedCatalogueData {
  if (cachedCatalogue) {
    return cachedCatalogue;
  }

  const csvPath = path.join(baseDir, "data", "master", "kohler_products_normalized.csv");
  const manifestPath = path.join(baseDir, "data", "3d_catalogue", "manifest.json");

  if (!fs.existsSync(csvPath)) {
    throw new Error(`Master catalogue CSV not found at: ${csvPath}`);
  }

  // Load 3D Asset Manifest
  const manifestByCode = new Map<string, ManifestRow>();
  if (fs.existsSync(manifestPath)) {
    try {
      const manifestRows = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as ManifestRow[];
      manifestRows.forEach((row) => {
        if (row.conversion_status === "success" && row.validation_status === "valid") {
          manifestByCode.set(row.product_code, row);
        }
      });
    } catch (err) {
      console.warn("Could not read 3D asset manifest:", err);
    }
  }

  // Load and Parse Products CSV
  const csvContent = fs.readFileSync(csvPath, "utf8").replace(/^\uFEFF/, "");
  const rows = parseCsv(csvContent);

  const seenCodes = new Set<string>();
  const products: CatalogueProduct[] = [];

  const categorySet = new Set<string>();
  const subcategoryMap: Record<string, Set<string>> = {};
  const finishSet = new Set<string>();
  let minPrice = Number.POSITIVE_INFINITY;
  let maxPrice = Number.NEGATIVE_INFINITY;
  let count3d = 0;

  for (const row of rows) {
    const code = row.product_code?.trim();
    if (!code || seenCodes.has(code)) continue;
    seenCodes.add(code);

    const asset = manifestByCode.get(code);
    const has3d = Boolean(asset);
    if (has3d) count3d += 1;

    const currentPrice = parseNumber(row.current_price);
    const listPrice = parseNumber(row.list_price);
    const priceForBounds = currentPrice ?? listPrice;
    if (priceForBounds !== undefined && priceForBounds > 0) {
      if (priceForBounds < minPrice) minPrice = priceForBounds;
      if (priceForBounds > maxPrice) maxPrice = priceForBounds;
    }

    const category = row.category?.trim() || "General";
    categorySet.add(category);

    const subcategory = row.subcategory?.trim();
    if (subcategory) {
      if (!subcategoryMap[category]) {
        subcategoryMap[category] = new Set();
      }
      subcategoryMap[category].add(subcategory);
    }

    const finish = row.finish?.trim();
    if (finish && finish.toLowerCase() !== "none") {
      finishSet.add(finish);
    }

    const product: CatalogueProduct = {
      productCode: code,
      productName: row.product_name?.trim() || code,
      collection: row.collection?.trim() || undefined,
      model: row.model?.trim() || undefined,
      category,
      subcategory: subcategory || undefined,
      currentPrice,
      listPrice,
      currency: row.currency?.trim() || "INR",
      dimensionsText: row.dimensions?.trim() || undefined,
      widthMm: parseNumber(row.width_mm),
      depthMm: parseNumber(row.depth_mm),
      heightMm: parseNumber(row.height_mm),
      finish: finish || undefined,
      finishCode: row.finish_code?.trim() || undefined,
      material: row.material?.trim() || undefined,
      installationType: row.installation_type?.trim() || undefined,
      roughIn: row.rough_in?.trim() || undefined,
      specifications: row.specifications?.trim() || undefined,
      features: row.features?.trim() || undefined,
      requiredComponents: row.required_components?.trim() || undefined,
      compatibleProducts: row.compatible_products?.trim() || undefined,
      imageUrls: parseImageUrls(row.image_urls),
      productUrl: row.product_url?.trim() || undefined,
      specSheetUrl: row.spec_sheet_url?.trim() || undefined,
      has3d,
      normalizedBoundsM: parseBounds(asset?.normalized_bounds_m),
      scaleFactor: asset?.scale_factor,
    };

    products.push(product);
  }

  const subcategoriesByCategory: Record<string, string[]> = {};
  for (const [cat, subSet] of Object.entries(subcategoryMap)) {
    subcategoriesByCategory[cat] = Array.from(subSet).sort();
  }

  const metadata: CatalogueMetadata = {
    categories: Array.from(categorySet).sort(),
    subcategoriesByCategory,
    finishes: Array.from(finishSet).sort(),
    priceBounds: {
      min: Number.isFinite(minPrice) ? minPrice : 0,
      max: Number.isFinite(maxPrice) ? maxPrice : 1000000,
    },
    totalProducts: products.length,
    total3dProducts: count3d,
  };

  cachedCatalogue = {
    products,
    metadata,
  };

  return cachedCatalogue;
}

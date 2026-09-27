import fs from "node:fs";
import path from "node:path";
import type { SpatialMetadataRecord } from "../constraints";
import { assemblyFromCsvRows, productFromCsvRow, relationFromCsvRow } from "./adapters";
import { resolveProductSemantics } from "../catalogue/productSemantics";
import type { RecommendationCatalog, RecommendationProduct } from "./types";

let cachedCatalog: { catalog: RecommendationCatalog; assetRows: Record<string, string>[] } | null = null;

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
    rows.push(row);
  }
  const headers = rows.shift() ?? [];
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function readCsv(masterDir: string, name: string): Record<string, string>[] {
  const filePath = path.join(masterDir, name);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Master CSV not found: ${filePath}`);
  }
  return parseCsv(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function metadataFromRows(rows: Record<string, string>[]): SpatialMetadataRecord[] {
  const split = (value: string) => value.split(";").map((item) => item.trim()).filter(Boolean);
  return rows.map((row) => ({
    productCode: row.product_code,
    role: split(row.roles),
    bathroomZones: split(row.bathroom_zones),
    mountSurface: split(row.mount_surfaces),
    requiresHostProduct: row.requires_host_product === "true",
    hostRoles: split(row.host_roles),
  }));
}

export function loadMasterCatalog(baseDir = process.cwd()): {
  catalog: RecommendationCatalog;
  assetRows: Record<string, string>[];
} {
  if (cachedCatalog) {
    return cachedCatalog;
  }

  const masterDir = path.join(baseDir, "data", "master");
  const productRows = readCsv(masterDir, "kohler_products_normalized.csv");
  const spatialRows = readCsv(masterDir, "kohler_product_spatial_metadata.csv");
  const spatialByCode = new Map(metadataFromRows(spatialRows).map((record) => [record.productCode, record]));
  
  const products = productRows.map((row) => {
    const product = productFromCsvRow(row);
    const rawMetadata = spatialByCode.get(product.productCode);

    // Single Authoritative Semantic Classification Path for the entire system
    const semantics = resolveProductSemantics({
      productCode: product.productCode,
      productName: product.productName,
      category: product.category,
      subcategory: product.subcategory,
      installationType: product.installationType,
      role: product.role,
      metadata: rawMetadata ? {
        role: rawMetadata.role,
        bathroomZones: rawMetadata.bathroomZones,
        mountSurface: rawMetadata.mountSurface,
      } : undefined,
    });

    const metadata: SpatialMetadataRecord = {
      productCode: product.productCode,
      role: [semantics.role],
      bathroomZones: [semantics.primaryZone],
      mountSurface: semantics.mountSurface ? [semantics.mountSurface] : (rawMetadata?.mountSurface ?? []),
      requiresHostProduct: rawMetadata?.requiresHostProduct ?? false,
      hostRoles: rawMetadata?.hostRoles ?? [],
    };

    return {
      ...product,
      role: semantics.role,
      metadata,
    };
  });

  const relations = readCsv(masterDir, "kohler_product_relations_resolved.csv").map(relationFromCsvRow);
  const assemblies = assemblyFromCsvRows(readCsv(masterDir, "kohler_assemblies_resolved.csv"));
  const assetRows = readCsv(masterDir, "kohler_assets_normalized.csv");

  const constraintOptions = {
    spatialMetadata: products.map((p) => p.metadata),
    attachmentRules: readCsv(masterDir, "kohler_attachment_rules.csv").map((row) => ({
      productCode: row.product_code,
      attachesToRole: row.attaches_to_role,
      attachesToSurface: row.attaches_to_surface,
      relation: row.relation,
    })),
  };

  cachedCatalog = {
    catalog: { products, relations, assemblies, constraintOptions },
    assetRows,
  };

  return cachedCatalog;
}

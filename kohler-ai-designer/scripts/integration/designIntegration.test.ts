import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildDesignState } from "../../src/lib/design";
import { recommendDesigns } from "../../src/lib/recommendation";
import { assemblyFromCsvRows, productFromCsvRow, relationFromCsvRow } from "../../src/lib/recommendation/adapters";
import type { RecommendationCatalog } from "../../src/lib/recommendation/types";
import type { SpatialMetadataRecord } from "../../src/lib/constraints";

const ROOT = path.resolve(__dirname, "../..");
const MASTER = path.join(ROOT, "data", "master");
const REPORT_DIR = path.join(ROOT, "data", "integration");
const REPORT_PATH = path.join(REPORT_DIR, "bathroom_design_integration.md");
const STATE_PATH = path.join(REPORT_DIR, "bathroom_design_state.json");
const ASSET_OUTPUT_DIR = path.join(ROOT, "data", "3d_catalogue_sample", "normalized_glb");

const ROOM = {
  widthM: 8 * 0.3048,
  depthM: 6 * 0.3048,
  heightM: 9 * 0.3048,
  doors: [],
  windows: [],
};

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

function readCsv(name: string): Record<string, string>[] {
  return parseCsv(fs.readFileSync(path.join(MASTER, name), "utf8").replace(/^\uFEFF/, ""));
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

function buildCatalog(): { catalog: RecommendationCatalog; assetRows: Record<string, string>[] } {
  const productRows = readCsv("kohler_products_normalized.csv");
  const spatialRows = readCsv("kohler_product_spatial_metadata.csv");
  const spatialByCode = new Map(metadataFromRows(spatialRows).map((record) => [record.productCode, record]));
  const products = productRows.map((row) => {
    const product = productFromCsvRow(row);
    const metadata = spatialByCode.get(product.productCode);
    return metadata ? { ...product, metadata } : product;
  });
  const relations = readCsv("kohler_product_relations_resolved.csv").map(relationFromCsvRow);
  const assemblies = assemblyFromCsvRows(readCsv("kohler_assemblies_resolved.csv"));
  const assetRows = readCsv("kohler_assets_normalized.csv");
  const constraintOptions = {
    spatialMetadata: metadataFromRows(spatialRows),
    attachmentRules: readCsv("kohler_attachment_rules.csv").map((row) => ({
      productCode: row.product_code,
      attachesToRole: row.attaches_to_role,
      attachesToSurface: row.attaches_to_surface,
      relation: row.relation,
    })),
  };
  return { catalog: { products, relations, assemblies, constraintOptions }, assetRows };
}

function assetFor(productCode: string, assetRows: Record<string, string>[]): { url?: string; path?: string } {
  const obj = assetRows.find((row) => row.product_code === productCode && row.file_format_normalized.toUpperCase() === "OBJ");
  const glb = path.join(ASSET_OUTPUT_DIR, `${productCode.replace(/[^A-Za-z0-9._-]+/g, "_")}.glb`);
  return { url: obj?.asset_url, path: fs.existsSync(glb) ? path.relative(ROOT, glb).replace(/\\/g, "/") : undefined };
}

function reportMarkdown(
  recommendation: ReturnType<typeof recommendDesigns>,
  state: ReturnType<typeof buildDesignState>["state"],
  assetRows: Record<string, string>[],
  proofSucceeded: boolean,
): string {
  const products = state.selectedProducts.map((product) => {
    const asset = assetFor(product.productCode, assetRows);
    const placement = state.placements.find((item) => item.productCode === product.productCode);
    return [
      `### ${product.productCode} — ${product.productName ?? "Unnamed product"}`,
      `- Price: ${product.currentPrice ?? product.listPrice ?? "not available"} ${product.currency ?? ""}`,
      `- 3D asset: ${asset.path ? `yes (${asset.path})` : `no normalized GLB in integration output`}`,
      `- Source OBJ URL: ${asset.url ?? "not available"}`,
      `- Placement: ${placement ? `(${placement.position.x.toFixed(3)}, ${placement.position.y.toFixed(3)}, ${placement.position.z.toFixed(3)}) m; rotation (${placement.rotation.x}, ${placement.rotation.y}, ${placement.rotation.z})°; surface ${placement.placementSurface}; host ${placement.hostProductCode ?? "none"}` : "not placed"}`,
    ].join("\n");
  });
  return [
    "# KOHLER deterministic bathroom integration proof",
    "",
    `## Result: ${proofSucceeded ? "SUCCESS" : "NOT SATISFIED BY CURRENT DATA"}`,
    proofSucceeded
      ? "The deterministic engines produced a budget-compliant, spatially valid design from real catalogue records."
      : "The proof did not produce a recommendation because the current real catalogue data lacks complete dimensions for the required roles. No products, prices, dimensions, compatibility, or assets were fabricated.",
    "",
    "## Brief",
    `- Room: ${ROOM.widthM.toFixed(4)} m × ${ROOM.depthM.toFixed(4)} m × ${ROOM.heightM.toFixed(4)} m (8 ft × 6 ft × 9 ft)`,
    "- Budget: INR 500000",
    "- Style: Luxury Modern",
    "- Required zones: toilet, basin/vanity, shower",
    "",
    "## Recommendation",
    `- Recommendation generated: ${recommendation.best ? "yes" : "no"}`,
    `- Selected product codes: ${state.selectedProducts.map((product) => product.productCode).join(", ") || "none"}`,
    `- Product total: ${state.totalProductCost}`,
    `- Remaining budget: ${state.budget === undefined ? "not specified" : state.budget - state.totalProductCost}`,
    `- Score: ${recommendation.best?.score ?? "n/a"}`,
    `- Considered valid designs: ${recommendation.consideredCandidates}`,
    `- Rejections: ${recommendation.rejectedCandidates.slice(-10).map((item) => item.reason).join(" | ") || "none"}`,
    "",
    "## Products and placements",
    products.join("\n\n") || "No products selected.",
    "",
    "## Constraint validation",
    `- Valid: ${state.validation.valid}`,
    `- Errors: ${state.validation.errors.map((item) => item.message).join(" | ") || "none"}`,
    `- Warnings: ${[...state.warnings, ...state.validation.warnings.map((item) => item.message)].join(" | ") || "none"}`,
    "",
    "## Integration limitations",
    "- The shower requirement is represented by the factual `rainhead` role because the current controlled role vocabulary has shower-zone roles but no generic `shower` product role.",
    "- The normalized 3D output directory is checked as-is; missing GLBs are reported and never fabricated.",
    "- No compatibility is inferred from names or proximity. Unresolved required relations remain warnings and do not become product selections.",
  ].join("\n");
}

export function runBathroomIntegrationProof() {
  const { catalog, assetRows } = buildCatalog();
  const requirements = {
    room: ROOM,
    budget: 500000,
    currency: "INR",
    desiredStyle: "Luxury Modern",
    requiredRoles: ["toilet", "basin", "rainhead"],
    optionalRoles: ["vanity"],
  };
  const recommendation = recommendDesigns(requirements, catalog, 3);
  const selected = recommendation.best;
  const recommendationInput = {
    selectedProducts: selected?.selectedProducts ?? [],
    selectedAssemblies: selected?.selectedAssemblies ?? [],
    estimatedProductTotal: selected?.estimatedProductTotal ?? 0,
    budget: requirements.budget,
    style: requirements.desiredStyle,
    warnings: selected?.warnings ?? [],
  };
  const built = buildDesignState(recommendationInput, { room: ROOM, generatedAt: "2026-09-15T00:00:00.000Z", constraintOptions: catalog.constraintOptions });
  if (!selected) {
    built.state.warnings.push(
      "Integration proof did not produce a recommendation because required real catalogue candidates lack complete dimensions.",
    );
  }
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(built.state, null, 2));
  fs.writeFileSync(REPORT_PATH, reportMarkdown(recommendation, built.state, assetRows, Boolean(selected)));
  return { recommendation, ...built, succeeded: Boolean(selected) && built.state.validation.valid, reportPath: REPORT_PATH, statePath: STATE_PATH };
}

describe("real catalogue bathroom integration proof", () => {
  it("builds and validates one realistic bathroom design from normalized data", () => {
    const result = runBathroomIntegrationProof();
    expect(result.succeeded).toBe(true);
    expect(result.state.selectedProducts.length).toBeGreaterThanOrEqual(3);
    expect(result.state.validation.valid).toBe(true);
    expect(result.state.totalProductCost).toBeLessThanOrEqual(500000);
    expect(result.state.selectedProducts.some((product) => product.productCode === "2211IN-0")).toBe(false);
    expect(result.state.selectedProducts.some((product) => product.metadata?.role.includes("basin"))).toBe(true);
    expect(result.state.warnings.some((warning) => warning.includes("vanity assembly is currently unavailable"))).toBe(true);
    expect(result.reportPath).toContain("bathroom_design_integration.md");
  });
});

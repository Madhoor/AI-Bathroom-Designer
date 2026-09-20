import type { RecommendationAssembly, RecommendationProduct, RecommendationRelation } from "./types";

function numberOrUndefined(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function split(value: string | undefined): string[] {
  return (value ?? "").split(";").map((item) => item.trim()).filter(Boolean);
}

export function productFromCsvRow(row: Record<string, string>): RecommendationProduct {
  return {
    productCode: row.product_code,
    productName: row.product_name || undefined,
    category: row.category || undefined,
    subcategory: row.subcategory || undefined,
    currentPrice: numberOrUndefined(row.current_price),
    listPrice: numberOrUndefined(row.list_price),
    currency: row.currency || undefined,
    widthMm: numberOrUndefined(row.width_mm),
    depthMm: numberOrUndefined(row.depth_mm),
    heightMm: numberOrUndefined(row.height_mm),
    finish: row.finish || undefined,
    styles: split(row.styles),
    metadata: {
      role: split(row.roles),
      bathroomZones: split(row.bathroom_zones),
      mountSurface: split(row.mount_surfaces),
      requiresHostProduct: row.requires_host_product === "true",
      hostRoles: split(row.host_roles),
    },
  };
}

export function relationFromCsvRow(row: Record<string, string>): RecommendationRelation {
  return {
    sourceProductCode: row.source_product_code,
    targetProductCode: row.target_product_code || undefined,
    targetReference: row.target_reference || undefined,
    relationType: row.relation_type,
    resolutionStatus: row.resolution_status as RecommendationRelation["resolutionStatus"],
    confidence: Number(row.confidence) || 0,
  };
}

export function assemblyFromCsvRows(rows: Record<string, string>[]): RecommendationAssembly[] {
  const grouped = new Map<string, RecommendationAssembly>();
  rows.forEach((row) => {
    const assemblyId = row.assembly_id;
    const current = grouped.get(assemblyId) ?? {
      assemblyId,
      productCode: row.product_code,
      installationSurface: row.installation_surface || undefined,
      components: [],
    };
    current.components.push({
      productCode: row.product_code || undefined,
      targetReference: row.target_reference || undefined,
      required: row.required === "true",
      referenceResolved: row.reference_resolved === "true",
    });
    grouped.set(assemblyId, current);
  });
  return [...grouped.values()].sort((a, b) => a.assemblyId.localeCompare(b.assemblyId));
}

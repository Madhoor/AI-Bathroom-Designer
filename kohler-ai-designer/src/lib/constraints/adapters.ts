import type { AttachmentRuleRecord, SpatialMetadataRecord } from "./types";

function split(value: string | undefined): string[] {
  return (value ?? "")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function spatialMetadataFromCsvRow(row: Record<string, string>): SpatialMetadataRecord {
  return {
    productCode: row.product_code,
    role: split(row.roles),
    bathroomZones: split(row.bathroom_zones),
    mountSurface: split(row.mount_surfaces),
    requiresHostProduct: row.requires_host_product === "true",
    hostRoles: split(row.host_roles),
  };
}

export function attachmentRuleFromCsvRow(row: Record<string, string>): AttachmentRuleRecord {
  return {
    productCode: row.product_code,
    attachesToRole: row.attaches_to_role,
    attachesToSurface: row.attaches_to_surface,
    relation: row.relation,
  };
}

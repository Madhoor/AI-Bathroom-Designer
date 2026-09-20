import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import type { NormalizedAssetManifestEntry } from "@/lib/renderer/designStateRenderer";

interface ManifestRow extends NormalizedAssetManifestEntry {
  product_code: string;
  output_glb_path: string;
  conversion_status: string;
  validation_status: string;
  scale_factor: number;
  rotation_applied: string;
  normalized_bounds_m: string;
}

function parseTriplet(value: string): [number, number, number] {
  const values = value.split(" x ").map(Number);
  if (values.length !== 3 || values.some((item) => !Number.isFinite(item))) {
    throw new Error(`Invalid normalized bounds: ${value}`);
  }
  return values as [number, number, number];
}

export async function GET() {
  const filePath = path.join(process.cwd(), "data", "3d_catalogue", "manifest.json");
  const rows = JSON.parse(await readFile(filePath, "utf8")) as ManifestRow[];
  const manifest: NormalizedAssetManifestEntry[] = rows
    .filter((row) => row.conversion_status === "success" && row.validation_status === "valid")
    .map((row) => ({
    productCode: row.product_code,
    outputGlbPath: row.output_glb_path,
    conversionStatus: row.conversion_status,
    validationStatus: row.validation_status,
    scaleFactor: row.scale_factor,
    rotationApplied: row.rotation_applied,
    normalizedBoundsM: parseTriplet(row.normalized_bounds_m),
    }));
  return NextResponse.json(manifest);
}

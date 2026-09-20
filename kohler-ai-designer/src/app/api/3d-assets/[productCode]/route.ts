import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

interface ManifestRow {
  product_code: string;
  output_glb_path: string;
  conversion_status: string;
  validation_status: string;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ productCode: string }> },
) {
  const { productCode } = await context.params;
  const manifestPath = path.join(process.cwd(), "data", "3d_catalogue", "manifest.json");
  const rows = JSON.parse(await readFile(manifestPath, "utf8")) as ManifestRow[];
  const row = rows.find(
    (candidate) =>
      candidate.product_code === productCode &&
      candidate.conversion_status === "success" &&
      candidate.validation_status === "valid",
  );
  if (!row) return new NextResponse("Normalized GLB not found.", { status: 404 });

  const catalogueRoot = path.resolve(process.cwd(), "data", "3d_catalogue", "normalized_glb");
  const fileName = path.basename(row.output_glb_path);
  if (fileName !== `${productCode}.glb`) {
    return new NextResponse("Invalid asset path.", { status: 400 });
  }
  const filePath = path.join(catalogueRoot, fileName);

  const file = await readFile(filePath);
  return new NextResponse(file, {
    headers: {
      "Content-Type": "model/gltf-binary",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

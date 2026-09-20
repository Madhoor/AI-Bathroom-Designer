"""Build the production KOHLER OBJ -> physically normalized GLB catalogue.

The source OBJ files are always kept separate from transformed GLBs. The
normalization is deliberately limited to the verified KOHLER convention:
inches -> metres, X=-90 degrees, centering in X/Y, and grounding at Z=0.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
import sys
import time
from collections import defaultdict
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import requests


ROOT = Path(__file__).resolve().parents[1]
ASSETS_CSV = ROOT / "data" / "master" / "kohler_assets_normalized.csv"
PRODUCTS_CSV = ROOT / "data" / "master" / "kohler_products_normalized.csv"
DEFAULT_OUTPUT = ROOT / "data" / "3d_catalogue"
SOURCE_DIRNAME = "source"
GLB_DIRNAME = "normalized_glb"
MANIFEST_NAME = "manifest.csv"
MANIFEST_JSON_NAME = "manifest.json"
REPORT_NAME = "validation_report.csv"
INCHES_TO_METRES = 0.0254
DEFAULT_ROTATION = (-90.0, 0.0, 0.0)
SUPPORTED_FORMAT = "OBJ"
SUSPICIOUS_MAX_METRES = 10.0
SUSPICIOUS_MIN_METRES = 0.0001

HEADERS = {
    "User-Agent": "KOHLER-AI-Designer/3D-catalogue-normalizer",
    "Accept": "*/*",
}

MANIFEST_FIELDS = [
    "product_code",
    "source_asset_url",
    "source_path",
    "output_glb_path",
    "conversion_status",
    "validation_status",
    "vertex_count",
    "face_count",
    "native_bounds",
    "normalized_bounds_m",
    "scale_factor",
    "rotation_applied",
    "grounding_applied",
    "center_offset",
    "file_size",
    "error",
]


def safe_name(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "_", value.strip()) or "unknown"


def relative_path(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT)).replace("\\", "/")
    except ValueError:
        return str(path)


def format_triplet(values: Any, decimals: int = 6) -> str:
    return " x ".join(f"{float(value):.{decimals}f}" for value in values)


def product_output_path(output_dir: Path, product_code: str) -> Path:
    return output_dir / GLB_DIRNAME / f"{safe_name(product_code)}.glb"


def product_source_path(output_dir: Path, product_code: str, source_url: str) -> Path:
    filename = Path(urlparse(source_url).path).name or f"{safe_name(product_code)}.obj"
    if not filename.lower().endswith(".obj"):
        filename = f"{filename}.obj"
    return output_dir / SOURCE_DIRNAME / safe_name(product_code) / safe_name(filename)


def load_rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def choose_obj_assets(asset_rows: list[dict[str, str]]) -> dict[str, dict[str, str]]:
    candidates: defaultdict[str, list[dict[str, str]]] = defaultdict(list)
    for row in asset_rows:
        code = row.get("product_code", "").strip()
        url = row.get("asset_url", "").strip()
        file_format = (row.get("file_format_normalized") or row.get("file_format") or "").strip().upper()
        if code and url and file_format == SUPPORTED_FORMAT:
            candidates[code].append(row)
    return {
        code: sorted(
            rows,
            key=lambda row: (row.get("asset_url", "").strip(), row.get("asset_id", "").strip()),
        )[0]
        for code, rows in candidates.items()
    }


def download_source(url: str, destination: Path, dry_run: bool = False) -> tuple[bool, str]:
    if destination.exists() and destination.stat().st_size > 0:
        return True, "cached"
    if dry_run:
        return True, "dry-run"
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(destination.suffix + ".part")
    try:
        response = requests.get(url, headers=HEADERS, timeout=90, stream=True)
        if not response.ok:
            response.close()
            return False, f"HTTP {response.status_code}"
        with temporary.open("wb") as handle:
            for chunk in response.iter_content(chunk_size=1024 * 256):
                if chunk:
                    handle.write(chunk)
        response.close()
        if not temporary.exists() or temporary.stat().st_size == 0:
            temporary.unlink(missing_ok=True)
            return False, "Empty response"
        temporary.replace(destination)
        return True, f"downloaded {destination.stat().st_size} bytes"
    except requests.RequestException as exc:
        temporary.unlink(missing_ok=True)
        return False, f"{type(exc).__name__}: {exc}"


def scene_summary(scene: Any) -> tuple[int, int, tuple[float, float, float], tuple[float, float, float]]:
    vertices = 0
    faces = 0
    for geometry in scene.geometry.values():
        vertices += len(getattr(geometry, "vertices", []))
        faces += len(getattr(geometry, "faces", []))
    bounds = scene.bounds
    extents = scene.extents
    return (
        int(vertices),
        int(faces),
        tuple(float(value) for value in extents),
        tuple(float(value) for value in bounds[0]),
    )


def normalize_scene(scene: Any, numpy_module: Any) -> tuple[Any, tuple[float, float, float], tuple[float, float, float]]:
    scale_matrix = numpy_module.eye(4)
    scale_matrix[0, 0] = INCHES_TO_METRES
    scale_matrix[1, 1] = INCHES_TO_METRES
    scale_matrix[2, 2] = INCHES_TO_METRES
    scene.apply_transform(scale_matrix)

    rotation = numpy_module.eye(4)
    angle = math.radians(DEFAULT_ROTATION[0])
    rotation[1, 1] = math.cos(angle)
    rotation[1, 2] = -math.sin(angle)
    rotation[2, 1] = math.sin(angle)
    rotation[2, 2] = math.cos(angle)
    scene.apply_transform(rotation)

    pre_center = scene.bounds
    center = scene.centroid
    center_offset = (-float(center[0]), -float(center[1]), 0.0)
    ground_offset = -float(pre_center[0][2])
    translation = numpy_module.eye(4)
    translation[0, 3] = center_offset[0]
    translation[1, 3] = center_offset[1]
    translation[2, 3] = ground_offset
    scene.apply_transform(translation)

    normalized_bounds = tuple(float(value) for value in scene.extents)
    return scene, normalized_bounds, center_offset


def validation_status(extents_m: tuple[float, float, float]) -> str:
    if any(not math.isfinite(value) or value <= 0 for value in extents_m):
        return "suspicious_geometry"
    if any(value < SUSPICIOUS_MIN_METRES or value > SUSPICIOUS_MAX_METRES for value in extents_m):
        return "suspicious_geometry"
    return "valid"


def empty_row(product_code: str, source_url: str = "") -> dict[str, Any]:
    return {
        "product_code": product_code,
        "source_asset_url": source_url,
        "source_path": "",
        "output_glb_path": "",
        "conversion_status": "not_attempted",
        "validation_status": "not_attempted",
        "vertex_count": "",
        "face_count": "",
        "native_bounds": "",
        "normalized_bounds_m": "",
        "scale_factor": INCHES_TO_METRES,
        "rotation_applied": "",
        "grounding_applied": "false",
        "center_offset": "",
        "file_size": "",
        "error": "",
    }


def process_product(
    product_code: str,
    asset: dict[str, str] | None,
    output_dir: Path,
    trimesh_module: Any,
    numpy_module: Any,
    dry_run: bool,
    has_non_obj_assets: bool = False,
) -> dict[str, Any]:
    source_url = asset.get("asset_url", "").strip() if asset else ""
    row = empty_row(product_code, source_url)
    if not asset:
        row["conversion_status"] = "non_obj_assets" if has_non_obj_assets else "missing_asset"
        row["validation_status"] = "non_obj_assets" if has_non_obj_assets else "missing_obj"
        row["error"] = (
            "Product has linked assets, but none are OBJ files."
            if has_non_obj_assets
            else "No product-linked asset in normalized asset catalogue."
        )
        return row

    source_path = product_source_path(output_dir, product_code, source_url)
    output_path = product_output_path(output_dir, product_code)
    row["source_path"] = relative_path(source_path)
    row["output_glb_path"] = relative_path(output_path)

    downloaded, download_message = download_source(source_url, source_path, dry_run)
    if not downloaded:
        row["conversion_status"] = "download_failure"
        row["validation_status"] = "download_failure"
        row["error"] = download_message
        return row
    if dry_run:
        row["conversion_status"] = "dry_run"
        row["validation_status"] = "not_attempted"
        row["error"] = download_message
        return row

    try:
        scene = trimesh_module.load(source_path, file_type="obj", force="scene", process=False)
    except Exception as exc:
        row["conversion_status"] = "parse_failure"
        row["validation_status"] = "parse_failure"
        row["error"] = f"{type(exc).__name__}: {exc}"
        return row

    try:
        vertices, faces, native_extents, _ = scene_summary(scene)
        row["vertex_count"] = vertices
        row["face_count"] = faces
        row["native_bounds"] = format_triplet(native_extents)
        normalized_scene, normalized_extents, center_offset = normalize_scene(scene, numpy_module)
        row["normalized_bounds_m"] = format_triplet(normalized_extents)
        row["center_offset"] = format_triplet(center_offset)
        row["rotation_applied"] = "X=-90;Y=0;Z=0 degrees"
        row["grounding_applied"] = "true"
        row["validation_status"] = validation_status(normalized_extents)
        if row["validation_status"] == "suspicious_geometry":
            row["conversion_status"] = "suspicious_geometry"
            row["error"] = "Normalized bounds fall outside the conservative production envelope."
            return row
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(normalized_scene.export(file_type="glb"))
        row["conversion_status"] = "success"
        row["file_size"] = output_path.stat().st_size
        return row
    except Exception as exc:
        row["conversion_status"] = "conversion_failure"
        row["validation_status"] = "conversion_failure"
        row["error"] = f"{type(exc).__name__}: {exc}"
        return row


def write_outputs(output_dir: Path, rows: list[dict[str, Any]]) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    with (output_dir / MANIFEST_NAME).open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=MANIFEST_FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    (output_dir / MANIFEST_JSON_NAME).write_text(json.dumps(rows, indent=2, ensure_ascii=False), encoding="utf-8")

    counts = defaultdict(int)
    for row in rows:
        counts[row["conversion_status"]] += 1
    report_rows = [
        {"status": status, "count": count, "notes": ""}
        for status, count in sorted(counts.items())
    ]
    with (output_dir / REPORT_NAME).open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["status", "count", "notes"])
        writer.writeheader()
        writer.writerows(report_rows)


def load_trimesh() -> tuple[Any, Any]:
    try:
        import numpy  # type: ignore
        import trimesh  # type: ignore
    except ImportError as exc:
        raise SystemExit("Install production 3D dependencies with: pip install trimesh pygltflib") from exc
    return trimesh, numpy


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the normalized KOHLER 3D asset catalogue.")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    parser.add_argument("--sample", action="store_true", help="Process only the first deterministic 10 products with OBJ assets.")
    parser.add_argument("--limit", type=int, default=None, help="Process at most N products.")
    parser.add_argument("--dry-run", action="store_true", help="Write manifest without downloading or converting.")
    parser.add_argument("--delay", type=float, default=0.0, help="Delay between downloads in seconds.")
    args = parser.parse_args()

    output_dir = Path(args.output)
    products = load_rows(PRODUCTS_CSV)
    asset_rows = load_rows(ASSETS_CSV)
    assets = choose_obj_assets(asset_rows)
    asset_codes = {row.get("product_code", "").strip() for row in asset_rows if row.get("product_code", "").strip()}
    non_obj_codes = asset_codes - set(assets)
    products.sort(key=lambda row: row.get("product_code", "").strip())
    if args.sample:
        products = [row for row in products if row.get("product_code", "").strip() in sorted(assets)[:10]]
    if args.limit is not None:
        products = products[: max(0, args.limit)]

    trimesh_module = numpy_module = None
    if not args.dry_run:
        trimesh_module, numpy_module = load_trimesh()

    rows = []
    for index, product in enumerate(products, start=1):
        code = product.get("product_code", "").strip()
        print(f"[{index}/{len(products)}] {code}")
        row = process_product(
            code,
            assets.get(code),
            output_dir,
            trimesh_module,
            numpy_module,
            args.dry_run,
            has_non_obj_assets=code in non_obj_codes,
        )
        rows.append(row)
        if args.delay:
            time.sleep(args.delay)

    write_outputs(output_dir, rows)
    successful = sum(row["conversion_status"] == "success" for row in rows)
    failures = sum(row["conversion_status"] in {"download_failure", "parse_failure", "conversion_failure", "suspicious_geometry"} for row in rows)
    missing = sum(row["conversion_status"] in {"missing_asset", "non_obj_assets"} for row in rows)
    print("\n=== Production 3D catalogue complete ===")
    print(f"Products processed: {len(rows)}")
    print(f"OBJ assets found: {len(rows) - missing}")
    print(f"Successfully converted: {successful}")
    print(f"Failed: {failures}")
    print(f"No OBJ asset: {missing}")
    print(f"Output: {output_dir}")
    print(f"Manifest: {output_dir / MANIFEST_NAME}")
    print(f"Report: {output_dir / REPORT_NAME}")


if __name__ == "__main__":
    main()

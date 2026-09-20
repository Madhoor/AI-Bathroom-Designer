"""
Validate KOHLER OBJ samples and convert them to GLB.

Run from project root:
    python scripts/validate_and_convert_3d.py

Optional:
    python scripts/validate_and_convert_3d.py --input data/3d_sample/source
    python scripts/validate_and_convert_3d.py --no-convert

Requires:
    pip install trimesh pygltflib

Outputs:
    data/3d_sample/glb/<product_code>.glb
    data/3d_sample/validation.csv
    data/3d_sample/validation.json

The script is intentionally conservative:
- It never changes the downloaded OBJ files.
- It reports mesh bounds in the OBJ's native units. It does not guess units.
- It generates a heuristic scale hint only from plausible bathroom-product dimensions.
  The hint is NOT applied automatically.
- Conversion preserves the source mesh as faithfully as trimesh permits.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = ROOT / "data" / "3d_sample" / "source"
DEFAULT_OUT = ROOT / "data" / "3d_sample"

SUPPORTED_EXTENSIONS = {".obj"}


def safe_name(value: str) -> str:
    value = re.sub(r"[^A-Za-z0-9._-]+", "_", value.strip())
    return value or "unknown"


def fmt(value: Any, decimals: int = 2) -> str:
    if value is None:
        return ""
    try:
        return f"{float(value):.{decimals}f}"
    except Exception:
        return str(value)


def plausible_product_bbox(extents):
    """
    Heuristic only.

    We don't know the source units. We test common interpretations:
      - native units are mm
      - native units are cm
      - native units are inches

    A scale interpretation is called 'plausible' if all three extents after
    conversion land in a broad bathroom-product range.

    This is NOT a correctness check. It only helps us inspect suspicious models.
    """
    if extents is None or len(extents) != 3:
        return []

    results = []
    for unit, factor in [("mm", 1.0), ("cm", 10.0), ("in", 25.4)]:
        mm = [abs(float(x)) * factor for x in extents]
        if any(x <= 0 for x in mm):
            continue

        mn, mx = min(mm), max(mm)

        # Broad envelope for KOHLER bathroom products.
        if 20 <= mn <= 3000 and 100 <= mx <= 4000:
            results.append(unit)
    return results


def load_trimesh():
    try:
        import trimesh  # type: ignore
        return trimesh
    except ImportError:
        print("ERROR: trimesh is not installed.")
        print("Run:")
        print("  pip install trimesh pygltflib")
        sys.exit(1)


def load_mesh(trimesh, obj_path: Path):
    """
    Load OBJ and normalize the result into a Trimesh or Scene.

    OBJ files may include multiple objects/materials, so a Scene is valid.
    """
    loaded = trimesh.load(
        obj_path,
        file_type="obj",
        force="scene",
        process=False,
    )

    return loaded


def scene_summary(scene):
    geometry_count = len(scene.geometry)

    total_vertices = 0
    total_faces = 0
    used_materials = 0

    for geom in scene.geometry.values():
        vertices = getattr(geom, "vertices", None)
        faces = getattr(geom, "faces", None)

        if vertices is not None:
            total_vertices += len(vertices)
        if faces is not None:
            total_faces += len(faces)

        visual = getattr(geom, "visual", None)
        if visual is not None and getattr(visual, "material", None) is not None:
            used_materials += 1

    bounds = scene.bounds
    extents = scene.extents

    return {
        "geometry_count": geometry_count,
        "vertices": int(total_vertices),
        "faces": int(total_faces),
        "triangles_estimate": int(total_faces),
        "min_x": float(bounds[0][0]),
        "min_y": float(bounds[0][1]),
        "min_z": float(bounds[0][2]),
        "max_x": float(bounds[1][0]),
        "max_y": float(bounds[1][1]),
        "max_z": float(bounds[1][2]),
        "extent_x": float(extents[0]),
        "extent_y": float(extents[1]),
        "extent_z": float(extents[2]),
        "materials_detected": int(used_materials),
        "plausible_units": plausible_product_bbox(extents),
    }


def convert_to_glb(scene, out_path: Path):
    out_path.parent.mkdir(parents=True, exist_ok=True)
    glb = scene.export(file_type="glb")
    out_path.write_bytes(glb)
    return len(glb)


def main():
    parser = argparse.ArgumentParser(
        description="Validate KOHLER OBJ samples and convert them to GLB."
    )
    parser.add_argument(
        "--input",
        default=str(DEFAULT_INPUT),
        help=f"OBJ source directory (default: {DEFAULT_INPUT})",
    )
    parser.add_argument(
        "--output",
        default=str(DEFAULT_OUT),
        help=f"Output directory (default: {DEFAULT_OUT})",
    )
    parser.add_argument(
        "--no-convert",
        action="store_true",
        help="Only validate OBJ files; do not create GLBs.",
    )
    args = parser.parse_args()

    trimesh = load_trimesh()

    input_dir = Path(args.input)
    output_dir = Path(args.output)
    glb_dir = output_dir / "glb"
    glb_dir.mkdir(parents=True, exist_ok=True)

    obj_files = sorted(
        p for p in input_dir.rglob("*")
        if p.is_file() and p.suffix.lower() in SUPPORTED_EXTENSIONS
    )

    if not obj_files:
        raise SystemExit(f"No OBJ files found under: {input_dir}")

    print(f"Found {len(obj_files)} OBJ files.")
    print(f"Output GLBs: {glb_dir}\n")

    results = []

    for index, obj_path in enumerate(obj_files, start=1):
        product_dir_name = obj_path.parent.name
        product_code = product_dir_name if product_dir_name != "source" else obj_path.stem
        glb_path = glb_dir / f"{safe_name(product_code)}.glb"

        print(f"[{index}/{len(obj_files)}] {product_code}")
        print(f"    OBJ: {obj_path}")

        row = {
            "product_code": product_code,
            "obj_path": str(obj_path.relative_to(ROOT)) if obj_path.is_relative_to(ROOT) else str(obj_path),
            "obj_size_bytes": obj_path.stat().st_size,
            "load_ok": False,
            "conversion_ok": False,
            "vertices": "",
            "faces": "",
            "triangles_estimate": "",
            "geometry_count": "",
            "materials_detected": "",
            "extent_x": "",
            "extent_y": "",
            "extent_z": "",
            "plausible_units": "",
            "glb_path": "",
            "glb_size_bytes": "",
            "error": "",
        }

        try:
            scene = load_mesh(trimesh, obj_path)
            summary = scene_summary(scene)

            row["load_ok"] = True
            for key in [
                "vertices",
                "faces",
                "triangles_estimate",
                "geometry_count",
                "materials_detected",
                "extent_x",
                "extent_y",
                "extent_z",
            ]:
                row[key] = summary[key]
            row["plausible_units"] = ",".join(summary["plausible_units"])

            print(f"    Vertices: {summary['vertices']:,}")
            print(f"    Faces:    {summary['faces']:,}")
            print(
                "    Bounds:   "
                f"{summary['extent_x']:.3f} × "
                f"{summary['extent_y']:.3f} × "
                f"{summary['extent_z']:.3f} native units"
            )
            print(f"    Geometry: {summary['geometry_count']}")
            print(f"    Materials detected: {summary['materials_detected']}")

            if summary["plausible_units"]:
                print(
                    "    Plausible unit interpretations: "
                    + ", ".join(summary["plausible_units"])
                    + " (heuristic only)"
                )
            else:
                print("    Plausible unit interpretations: none obvious")

            if not args.no_convert:
                size = convert_to_glb(scene, glb_path)
                row["conversion_ok"] = True
                row["glb_path"] = str(glb_path.relative_to(ROOT)) if glb_path.is_relative_to(ROOT) else str(glb_path)
                row["glb_size_bytes"] = size
                print(f"    GLB:      ✅ {size:,} bytes")
            else:
                print("    GLB:      skipped (--no-convert)")

        except Exception as exc:
            row["error"] = f"{type(exc).__name__}: {exc}"
            print(f"    ❌ {row['error']}")

        results.append(row)
        print()

    csv_path = output_dir / "validation.csv"
    json_path = output_dir / "validation.json"

    fieldnames = list(results[0].keys())
    with csv_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)

    json_path.write_text(
        json.dumps(results, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    loaded = sum(1 for r in results if r["load_ok"])
    converted = sum(1 for r in results if r["conversion_ok"])

    print("=== 3D validation complete ===")
    print(f"OBJ files:        {len(results)}")
    print(f"OBJ load success: {loaded}/{len(results)}")
    if not args.no_convert:
        print(f"GLB conversion:   {converted}/{len(results)}")
    print(f"Validation CSV:   {csv_path}")
    print(f"Validation JSON:  {json_path}")

    if converted and converted == len(results):
        print("\nAll sample models converted successfully.")
        print("Next step: visually inspect the GLBs in the Three.js app before batch processing.")


if __name__ == "__main__":
    main()

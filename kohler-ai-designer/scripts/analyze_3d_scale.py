"""
KOHLER 3D scale/orientation analysis + cautious normalization.

Run from project root:
    python scripts/analyze_3d_scale.py

Optional:
    python scripts/analyze_3d_scale.py --no-normalize
    python scripts/analyze_3d_scale.py --min-confidence 0.92

Inputs:
    data/master/kohler_products_normalized.csv
    data/3d_sample/validation.csv
    data/3d_sample/source/**/*.obj
    data/3d_sample/glb/*.glb

Outputs:
    data/3d_sample/scale_analysis.csv
    data/3d_sample/scale_analysis.json
    data/3d_sample/normalized_glb/*.glb

Design:
- Never changes source OBJ or source GLB files.
- Uses KOHLER catalogue dimensions when available.
- Tests axis permutations instead of assuming OBJ X/Y/Z = W/D/H.
- Finds a uniform scale that best maps model extents to catalogue dimensions.
- Only normalizes a model when the best match is sufficiently coherent.
- Does not guess dimensions when the catalogue has no reliable dimensions.
- Height may be absent; in that case the analysis can still use the known axes.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
import sys
from itertools import permutations
from pathlib import Path
from typing import Any

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
PRODUCTS_CSV = ROOT / "data" / "master" / "kohler_products_normalized.csv"
VALIDATION_CSV = ROOT / "data" / "3d_sample" / "validation.csv"
SOURCE_DIR = ROOT / "data" / "3d_sample" / "source"
GLB_DIR = ROOT / "data" / "3d_sample" / "glb"
OUTPUT_DIR = ROOT / "data" / "3d_sample"
NORMALIZED_DIR = OUTPUT_DIR / "normalized_glb"


def safe_name(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "_", str(value).strip()) or "unknown"


def to_float(value: Any) -> float | None:
    try:
        if value is None or (isinstance(value, float) and math.isnan(value)):
            return None
        x = float(str(value).strip())
        return x if math.isfinite(x) and x > 0 else None
    except Exception:
        return None


def parse_triplet_from_text(text: Any) -> tuple[float, float, float | None] | None:
    if text is None or (isinstance(text, float) and math.isnan(text)):
        return None
    s = str(text)
    m = re.search(
        r"(\d+(?:\.\d+)?)\s*(mm|cm|in|inch|inches)\s*[x×]\s*"
        r"(\d+(?:\.\d+)?)\s*(mm|cm|in|inch|inches)"
        r"(?:\s*[x×]\s*(\d+(?:\.\d+)?)\s*(mm|cm|in|inch|inches))?",
        s,
        re.I,
    )
    if not m:
        return None

    factors = {"mm": 1.0, "cm": 10.0, "in": 25.4, "inch": 25.4, "inches": 25.4}
    a = float(m.group(1)) * factors[m.group(2).lower()]
    b = float(m.group(3)) * factors[m.group(4).lower()]
    c = None
    if m.group(5):
        c = float(m.group(5)) * factors[m.group(6).lower()]
    return a, b, c


def get_expected_dimensions(row: pd.Series) -> tuple[float, float, float | None, str] | None:
    # Preferred normalized dimensions.
    w = to_float(row.get("width_mm"))
    d = to_float(row.get("depth_mm"))
    h = to_float(row.get("height_mm"))

    if w and d:
        return w, d, h, "normalized_columns"

    # Fallback to an explicit grouped dimensions text.
    parsed = parse_triplet_from_text(row.get("dimensions"))
    if parsed:
        a, b, c = parsed
        return a, b, c, "raw_dimensions_text"

    # Fallback to any other text fields we already crawled.
    for field in ("specifications", "features"):
        parsed = parse_triplet_from_text(row.get(field))
        if parsed:
            a, b, c = parsed
            return a, b, c, field

    return None


def load_dependencies():
    try:
        import trimesh  # type: ignore
    except ImportError:
        print("ERROR: trimesh is required.")
        print("Run: pip install trimesh pygltflib")
        sys.exit(1)

    return trimesh


def load_scene(trimesh, path: Path):
    return trimesh.load(path, force="scene", process=False)


def scene_extents(scene) -> tuple[float, float, float]:
    ext = scene.extents
    return float(ext[0]), float(ext[1]), float(ext[2])


def best_uniform_scale(model_extents, expected_mm):
    """
    expected_mm = (W, D, H_or_None)

    We sort actual and expected dimensions when all 3 are known, while also
    testing every axis permutation. This handles arbitrary CAD axis orientation.

    Candidate scale is expected/model per corresponding axis.
    We use the median as the robust common scale and score by normalized error.
    """
    mx = list(model_extents)
    known = [x for x in expected_mm if x is not None]

    if len(known) < 2:
        return None

    candidates = []

    if len(known) == 3:
        target = [float(x) for x in known]
        for perm in permutations(range(3)):
            mapped = [mx[i] for i in perm]
            ratios = [target[i] / mapped[i] for i in range(3) if mapped[i] > 0]
            scale = sorted(ratios)[1]
            errors = [abs((mapped[i] * scale) - target[i]) / target[i] for i in range(3)]
            score = 1.0 - sum(errors) / len(errors)
            candidates.append({
                "scale_mm_per_native": scale,
                "score": score,
                "max_relative_error": max(errors),
                "mean_relative_error": sum(errors) / len(errors),
                "axis_map": perm,
                "known_dimensions": 3,
            })
    else:
        # Two known dimensions. Test every pair of model axes.
        target = [float(x) for x in known[:2]]
        for axes in permutations(range(3), 2):
            ratios = [
                target[i] / mx[axes[i]]
                for i in range(2)
                if mx[axes[i]] > 0
            ]
            if len(ratios) != 2:
                continue
            scale = sum(ratios) / 2.0
            errors = [
                abs((mx[axes[i]] * scale) - target[i]) / target[i]
                for i in range(2)
            ]
            score = 1.0 - sum(errors) / len(errors)
            candidates.append({
                "scale_mm_per_native": scale,
                "score": score,
                "max_relative_error": max(errors),
                "mean_relative_error": sum(errors) / len(errors),
                "axis_map": axes,
                "known_dimensions": 2,
            })

    if not candidates:
        return None

    candidates.sort(
        key=lambda x: (x["score"], -x["max_relative_error"]),
        reverse=True,
    )
    return candidates[0]


def apply_transform(scene, scale: float, axis_map: tuple[int, ...]):
    """
    Apply scale only by default.

    We intentionally do not rotate the model automatically because an axis
    correspondence is evidence for orientation but not enough evidence to know
    the desired world-up convention. We record the axis mapping for later.
    """
    import numpy as np

    matrix = np.eye(4)
    matrix[0, 0] = scale
    matrix[1, 1] = scale
    matrix[2, 2] = scale
    scene.apply_transform(matrix)
    return scene


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--no-normalize",
        action="store_true",
        help="Only analyze; don't write normalized GLBs.",
    )
    parser.add_argument(
        "--min-confidence",
        type=float,
        default=0.92,
        help="Minimum score required to normalize automatically (default: 0.92).",
    )
    args = parser.parse_args()

    for required in (PRODUCTS_CSV, VALIDATION_CSV, SOURCE_DIR):
        if not required.exists():
            raise FileNotFoundError(f"Missing required input: {required}")

    trimesh = load_dependencies()

    products = pd.read_csv(PRODUCTS_CSV)
    validation = pd.read_csv(VALIDATION_CSV)

    products["product_code"] = products["product_code"].astype(str).str.strip()
    validation["product_code"] = validation["product_code"].astype(str).str.strip()

    product_map = {
        row["product_code"]: row
        for _, row in products.iterrows()
    }

    results = []

    for _, val in validation.iterrows():
        code = str(val["product_code"]).strip()
        row = product_map.get(code)

        obj_path = ROOT / str(val.get("obj_path", ""))
        if not obj_path.exists():
            # Fall back to sample folder naming.
            matches = list(SOURCE_DIR.glob(f"{safe_name(code)}/*.obj"))
            obj_path = matches[0] if matches else Path("")

        result = {
            "product_code": code,
            "product_name": row.get("product_name") if row is not None else "",
            "category": row.get("category") if row is not None else "",
            "subcategory": row.get("subcategory") if row is not None else "",
            "obj_path": str(obj_path.relative_to(ROOT)) if obj_path.exists() else "",
            "catalogue_dimension_source": "",
            "catalogue_width_mm": "",
            "catalogue_depth_mm": "",
            "catalogue_height_mm": "",
            "model_extent_x": "",
            "model_extent_y": "",
            "model_extent_z": "",
            "scale_mm_per_native": "",
            "axis_map": "",
            "confidence": "",
            "max_relative_error": "",
            "recommended_unit": "",
            "normalization_status": "not_attempted",
            "normalized_glb_path": "",
            "error": "",
        }

        try:
            if row is None:
                result["normalization_status"] = "no_product_record"
                results.append(result)
                continue

            dims = get_expected_dimensions(row)
            if not dims:
                result["normalization_status"] = "missing_reliable_catalogue_dimensions"
                results.append(result)
                continue

            ew, ed, eh, source = dims
            result["catalogue_dimension_source"] = source
            result["catalogue_width_mm"] = ew
            result["catalogue_depth_mm"] = ed
            result["catalogue_height_mm"] = eh if eh else ""

            if not obj_path.exists():
                result["normalization_status"] = "missing_obj"
                results.append(result)
                continue

            scene = load_scene(trimesh, obj_path)
            ext = scene_extents(scene)

            result["model_extent_x"] = ext[0]
            result["model_extent_y"] = ext[1]
            result["model_extent_z"] = ext[2]

            best = best_uniform_scale(ext, (ew, ed, eh))
            if not best:
                result["normalization_status"] = "insufficient_dimension_data"
                results.append(result)
                continue

            result["scale_mm_per_native"] = best["scale_mm_per_native"]
            result["axis_map"] = "x,y,z -> " + ",".join(
                "xyz"[i] for i in best["axis_map"]
            )
            result["confidence"] = best["score"]
            result["max_relative_error"] = best["max_relative_error"]

            scale = best["scale_mm_per_native"]

            if abs(scale - 25.4) / 25.4 < 0.15:
                result["recommended_unit"] = "inch"
            elif abs(scale - 10.0) / 10.0 < 0.15:
                result["recommended_unit"] = "cm"
            elif abs(scale - 1.0) < 0.15:
                result["recommended_unit"] = "mm"
            else:
                result["recommended_unit"] = "custom"

            if args.no_normalize:
                result["normalization_status"] = (
                    "analyzed_only_high_confidence"
                    if best["score"] >= args.min_confidence
                    else "analyzed_only_low_confidence"
                )
            elif best["score"] >= args.min_confidence:
                normalized = apply_transform(scene, scale, best["axis_map"])
                NORMALIZED_DIR.mkdir(parents=True, exist_ok=True)
                out_path = NORMALIZED_DIR / f"{safe_name(code)}.glb"
                out_path.write_bytes(normalized.export(file_type="glb"))

                result["normalized_glb_path"] = str(out_path.relative_to(ROOT))
                result["normalization_status"] = "normalized_high_confidence"
            else:
                result["normalization_status"] = "low_confidence_not_normalized"

        except Exception as exc:
            result["normalization_status"] = "error"
            result["error"] = f"{type(exc).__name__}: {exc}"

        results.append(result)

    csv_path = OUTPUT_DIR / "scale_analysis.csv"
    json_path = OUTPUT_DIR / "scale_analysis.json"

    with csv_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=results[0].keys())
        writer.writeheader()
        writer.writerows(results)

    json_path.write_text(
        json.dumps(results, indent=2, ensure_ascii=False, default=str),
        encoding="utf-8",
    )

    print("=== KOHLER 3D scale analysis complete ===")
    print(f"Models analyzed: {len(results)}")

    for status in sorted(set(r["normalization_status"] for r in results)):
        count = sum(r["normalization_status"] == status for r in results)
        print(f"{status}: {count}")

    print(f"\nCSV:  {csv_path}")
    print(f"JSON: {json_path}")

    high = [
        r for r in results
        if r["normalization_status"] == "normalized_high_confidence"
    ]

    if high:
        print(f"\nHigh-confidence normalized models: {len(high)}")
        for r in high:
            print(
                f"  {r['product_code']}: "
                f"scale={float(r['scale_mm_per_native']):.4f} mm/unit, "
                f"confidence={float(r['confidence']):.3f}, "
                f"unit≈{r['recommended_unit']}"
            )

    print("\nNo source OBJ/GLB files were overwritten.")


if __name__ == "__main__":
    main()

"""
Normalize and validate the KOHLER catalogue exported by crawl_kohler_api.py.

Inputs:
  data/kohler_products.csv
  data/kohler_variants.csv
  data/kohler_assets.csv
  data/kohler_categories.csv

Outputs:
  data/master/kohler_products_normalized.csv
  data/master/kohler_variants_normalized.csv
  data/master/kohler_assets_normalized.csv
  data/master/kohler_asset_links.csv
  data/master/kohler_categories_normalized.csv
  data/master/kohler_validation_report.csv
  data/master/kohler_catalogue.json

Important:
- Raw crawler CSVs are NEVER overwritten.
- Dedupe is conservative:
    * products: product_code
    * variants: parent_product_code + sku
    * assets: canonical asset URL, while preserving product relationships in asset_links
- Dimensions are normalized only when an explicit grouped dimension pattern can be
  parsed. No guessed dimensions are created.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
MASTER_DIR = DATA_DIR / "master"
MASTER_DIR.mkdir(parents=True, exist_ok=True)

PRODUCTS_IN = DATA_DIR / "kohler_products.csv"
VARIANTS_IN = DATA_DIR / "kohler_variants.csv"
ASSETS_IN = DATA_DIR / "kohler_assets.csv"
CATEGORIES_IN = DATA_DIR / "kohler_categories.csv"


def clean_text(value: Any) -> str | None:
    if pd.isna(value):
        return None
    s = str(value).strip()
    s = re.sub(r"\s+", " ", s)
    return s or None


def canonical_url(value: Any) -> str | None:
    s = clean_text(value)
    if not s:
        return None
    # Safe canonicalization only: normalize scheme and trailing whitespace.
    s = re.sub(r"^http://", "https://", s, flags=re.I)
    return s


def slugify(value: Any) -> str | None:
    s = clean_text(value)
    if not s:
        return None
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or None


UNIT_TO_MM = {
    "mm": 1.0,
    "cm": 10.0,
    "in": 25.4,
    "inch": 25.4,
    "inches": 25.4,
}

# Grouped dimensions only. We intentionally do NOT turn "25.4 cm rainhead"
# into width/depth/height because it is a diameter, not a full bounding box.
DIM_RE = re.compile(
    r"""
    (?P<a>\d+(?:\.\d+)?)\s*(?P<u1>mm|cm|in|inch|inches)
    \s*[x×]\s*
    (?P<b>\d+(?:\.\d+)?)\s*(?P<u2>mm|cm|in|inch|inches)
    (?:\s*[x×]\s*
    (?P<c>\d+(?:\.\d+)?)\s*(?P<u3>mm|cm|in|inch|inches))?
    """,
    re.I | re.X,
)


def parse_grouped_dimensions(text: Any) -> tuple[float | None, float | None, float | None, str | None]:
    """
    Return width/depth/height in mm only for explicit grouped dimensions:
      150 cm x 70 cm
      150 cm x 70 cm x 46 cm
      72" x 42"
    For 2D patterns, height remains None.
    """
    s = clean_text(text)
    if not s:
        return None, None, None, None

    m = DIM_RE.search(s)
    if not m:
        return None, None, None, None

    a = float(m.group("a")) * UNIT_TO_MM[m.group("u1").lower()]
    b = float(m.group("b")) * UNIT_TO_MM[m.group("u2").lower()]
    c_raw = m.group("c")
    c = float(c_raw) * UNIT_TO_MM[m.group("u3").lower()] if c_raw else None

    return a, b, c, m.group(0)


def extract_dimensions(row: pd.Series) -> dict[str, Any]:
    # Highest preference: explicit dimensions field.
    candidates = [
        ("dimensions", row.get("dimensions")),
        ("product_name", row.get("product_name")),
        ("specifications", row.get("specifications")),
        ("features", row.get("features")),
    ]

    for source, text in candidates:
        w, d, h, matched = parse_grouped_dimensions(text)
        if matched:
            return {
                "width_mm": round(w, 2) if w is not None else None,
                "depth_mm": round(d, 2) if d is not None else None,
                "height_mm": round(h, 2) if h is not None else None,
                "dimension_source": source,
                "dimension_text": matched,
                "dimension_parse_status": "parsed_explicit_group",
            }

    return {
        "width_mm": None,
        "depth_mm": None,
        "height_mm": None,
        "dimension_source": None,
        "dimension_text": None,
        "dimension_parse_status": "not_parsed",
    }


def normalize_products(df: pd.DataFrame) -> tuple[pd.DataFrame, dict[str, Any]]:
    df = df.copy()

    for col in ["product_code", "product_name", "collection", "model", "category",
                "subcategory", "dimensions", "finish", "finish_code", "material",
                "installation_type", "rough_in", "specifications", "features",
                "required_components", "compatible_products", "spec_sheet_url",
                "source_url", "review_notes", "product_url", "image_urls"]:
        if col in df.columns:
            df[col] = df[col].map(clean_text)

    for col in ["product_url", "source_url", "spec_sheet_url"]:
        if col in df.columns:
            df[col] = df[col].map(canonical_url)

    for col in ["current_price", "list_price", "discount"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    for col in ["has_cad_assets", "needs_manual_review"]:
        if col in df.columns:
            df[col] = df[col].fillna(False).astype(bool)

    # Conservative product identity. Product code is the primary key from KOHLER.
    before = len(df)
    df = df.drop_duplicates(subset=["product_code"], keep="first").copy()
    product_code_dupes_removed = before - len(df)

    dims = df.apply(extract_dimensions, axis=1, result_type="expand")
    df = pd.concat([df.reset_index(drop=True), dims.reset_index(drop=True)], axis=1)

    df["category_key"] = df["category"].map(slugify)
    df["subcategory_key"] = df["subcategory"].map(slugify)
    df["currency"] = df["currency"].fillna("INR")
    df["data_status"] = "catalogue_record"

    # Helpful flags for the downstream recommendation engine.
    df["has_dimensions"] = df["width_mm"].notna() & df["depth_mm"].notna()
    df["has_full_3d_dimensions"] = (
        df["width_mm"].notna() & df["depth_mm"].notna() & df["height_mm"].notna()
    )
    df["has_price"] = df["current_price"].notna()
    df["has_required_components"] = df["required_components"].notna()
    df["has_spec_sheet"] = df["spec_sheet_url"].notna()

    return df, {
        "raw_rows": len(df) + product_code_dupes_removed,
        "unique_rows": len(df),
        "product_code_duplicates_removed": product_code_dupes_removed,
    }


def normalize_variants(df: pd.DataFrame, product_codes: set[str]) -> tuple[pd.DataFrame, dict[str, Any]]:
    df = df.copy()

    for col in ["parent_product_code", "sku", "finish", "finish_code", "color", "product_url"]:
        if col in df.columns:
            df[col] = df[col].map(clean_text)

    df["product_url"] = df["product_url"].map(canonical_url)

    for col in ["current_price", "list_price"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    before = len(df)
    df = df.drop_duplicates(subset=["parent_product_code", "sku"], keep="first").copy()
    removed = before - len(df)

    df["parent_exists"] = df["parent_product_code"].isin(product_codes)
    df["finish_normalized"] = df["finish"].map(clean_text)
    df["color_normalized"] = df["color"].map(clean_text)

    return df, {
        "raw_rows": before,
        "unique_rows": len(df),
        "variant_duplicates_removed": removed,
        "orphan_variant_rows": int((~df["parent_exists"]).sum()),
    }


def normalize_assets(df: pd.DataFrame, product_codes: set[str]) -> tuple[pd.DataFrame, pd.DataFrame, dict[str, Any]]:
    df = df.copy()

    for col in ["product_code", "asset_type", "file_format", "asset_url", "product_url"]:
        if col in df.columns:
            df[col] = df[col].map(clean_text)

    df["asset_url"] = df["asset_url"].map(canonical_url)
    df["product_url"] = df["product_url"].map(canonical_url)
    df["file_format_normalized"] = df["file_format"].str.upper()
    df["asset_type_normalized"] = df["asset_type"].map(clean_text).str.lower()

    before = len(df)

    # First create a product-asset relationship table.
    links = (
        df[["product_code", "asset_url", "asset_type_normalized", "file_format_normalized", "product_url"]]
        .dropna(subset=["product_code", "asset_url"])
        .drop_duplicates()
        .copy()
    )
    links["product_exists"] = links["product_code"].isin(product_codes)

    # Unique asset master by URL. A single technical file can legitimately be
    # shared by several SKUs, so we preserve all such relationships in links.
    assets = (
        df.dropna(subset=["asset_url"])
        .sort_values(["asset_url", "product_code"])
        .drop_duplicates(subset=["asset_url"], keep="first")
        .copy()
        .reset_index(drop=True)
    )

    assets["asset_id"] = [
        f"asset_{i:06d}" for i in range(1, len(assets) + 1)
    ]

    url_to_id = dict(zip(assets["asset_url"], assets["asset_id"]))
    links["asset_id"] = links["asset_url"].map(url_to_id)

    # Asset classification flags.
    assets["is_3d"] = assets["asset_type_normalized"].eq("3d model")
    assets["is_obj"] = assets["file_format_normalized"].eq("OBJ")
    assets["is_skp"] = assets["file_format_normalized"].eq("SKP")
    assets["is_3ds"] = assets["file_format_normalized"].eq("3DS")
    assets["is_rfa"] = assets["file_format_normalized"].eq("RFA")
    assets["is_dwg"] = assets["file_format_normalized"].eq("DWG")
    assets["is_dxf"] = assets["file_format_normalized"].eq("DXF")
    assets["is_pdf"] = assets["file_format_normalized"].eq("PDF")
    assets["source_domain"] = assets["asset_url"].str.extract(r"https?://([^/]+)", expand=False)

    return assets, links, {
        "raw_rows": before,
        "unique_asset_urls": len(assets),
        "exact_duplicate_asset_rows": int(df.duplicated().sum()),
        "asset_relationship_rows": len(links),
        "orphan_asset_relationships": int((~links["product_exists"]).sum()),
    }


def normalize_categories(df: pd.DataFrame, actual_product_counts: pd.Series) -> pd.DataFrame:
    df = df.copy()
    for col in ["category", "subcategory", "slug", "url", "kind"]:
        if col in df.columns:
            df[col] = df[col].map(clean_text)
    df["url"] = df["url"].map(canonical_url)
    df["category_key"] = df["category"].map(slugify)
    df["subcategory_key"] = df["subcategory"].map(slugify)
    df["enabled"] = df["enabled"].fillna(False).astype(bool)
    df["scraped_product_count_recorded"] = pd.to_numeric(
        df["scraped_product_count"], errors="coerce"
    ).fillna(0).astype(int)
    df["scraped_product_count_actual"] = [
        int(actual_product_counts.get(s, 0)) for s in df["subcategory"]
    ]
    df["count_matches"] = (
        df["scraped_product_count_recorded"] == df["scraped_product_count_actual"]
    )
    return df


def build_validation_report(products, variants, assets, links, categories) -> pd.DataFrame:
    rows: list[dict[str, Any]] = []

    def add(check: str, value: Any, severity: str = "INFO", notes: str = ""):
        rows.append({
            "check": check,
            "value": value,
            "severity": severity,
            "notes": notes,
        })

    add("product_count", len(products))
    add("unique_product_codes", products["product_code"].nunique())
    add("duplicate_product_codes_remaining", products["product_code"].duplicated().sum(), "ERROR")

    add("variant_count", len(variants))
    add("unique_variant_skus", variants["sku"].nunique())
    add("duplicate_variant_parent_sku_remaining",
        variants.duplicated(["parent_product_code", "sku"]).sum(), "ERROR")
    add("orphan_variants", int((~variants["parent_exists"]).sum()),
        "WARN" if (~variants["parent_exists"]).any() else "INFO")

    add("asset_master_count", len(assets))
    add("asset_relationship_count", len(links))
    add("duplicate_asset_urls_in_master", assets["asset_url"].duplicated().sum(), "ERROR")
    add("orphan_asset_relationships", int((~links["product_exists"]).sum()),
        "WARN" if (~links["product_exists"]).any() else "INFO")

    add("products_with_current_price", int(products["current_price"].notna().sum()))
    add("products_missing_current_price", int(products["current_price"].isna().sum()),
        "WARN" if products["current_price"].isna().any() else "INFO")

    add("products_with_dimensions", int(products["has_dimensions"].sum()))
    add("products_with_full_3d_dimensions", int(products["has_full_3d_dimensions"].sum()),
        "INFO",
        "These are explicit grouped dimensions only; no dimensions are guessed.")

    add("products_with_required_components", int(products["has_required_components"].sum()))
    add("products_with_spec_sheet", int(products["has_spec_sheet"].sum()))
    add("products_with_3d_flag", int(products["has_cad_assets"].sum()))

    add("3d_obj_asset_count", int(assets["is_obj"].sum()))
    add("3d_skp_asset_count", int(assets["is_skp"].sum()))
    add("3d_3ds_asset_count", int(assets["is_3ds"].sum()))
    add("3d_rfa_asset_count", int(assets["is_rfa"].sum()))

    category_mismatches = int((~categories["count_matches"]).sum())
    add("category_count_mismatches", category_mismatches,
        "WARN" if category_mismatches else "INFO")

    return pd.DataFrame(rows)


def main() -> None:
    for path in [PRODUCTS_IN, VARIANTS_IN, ASSETS_IN, CATEGORIES_IN]:
        if not path.exists():
            raise FileNotFoundError(f"Missing input file: {path}")

    products_raw = pd.read_csv(PRODUCTS_IN)
    variants_raw = pd.read_csv(VARIANTS_IN)
    assets_raw = pd.read_csv(ASSETS_IN)
    categories_raw = pd.read_csv(CATEGORIES_IN)

    products, product_stats = normalize_products(products_raw)
    product_codes = set(products["product_code"].dropna())

    variants, variant_stats = normalize_variants(variants_raw, product_codes)
    assets, links, asset_stats = normalize_assets(assets_raw, product_codes)

    actual_counts = products.groupby("subcategory").size()
    categories = normalize_categories(categories_raw, actual_counts)

    report = build_validation_report(products, variants, assets, links, categories)

    products_path = MASTER_DIR / "kohler_products_normalized.csv"
    variants_path = MASTER_DIR / "kohler_variants_normalized.csv"
    assets_path = MASTER_DIR / "kohler_assets_normalized.csv"
    links_path = MASTER_DIR / "kohler_asset_links.csv"
    categories_path = MASTER_DIR / "kohler_categories_normalized.csv"
    report_path = MASTER_DIR / "kohler_validation_report.csv"
    json_path = MASTER_DIR / "kohler_catalogue.json"

    products.to_csv(products_path, index=False)
    variants.to_csv(variants_path, index=False)
    assets.to_csv(assets_path, index=False)
    links.to_csv(links_path, index=False)
    categories.to_csv(categories_path, index=False)
    report.to_csv(report_path, index=False)

    catalogue = {
        "metadata": {
            "product_count": int(len(products)),
            "variant_count": int(len(variants)),
            "asset_master_count": int(len(assets)),
            "asset_relationship_count": int(len(links)),
            "source": "KOHLER India crawler output",
            "raw_files_preserved": True,
        },
        "products": products.replace({pd.NA: None, np.nan: None}).to_dict(orient="records"),
        "variants": variants.replace({pd.NA: None, np.nan: None}).to_dict(orient="records"),
        "assets": assets.replace({pd.NA: None, np.nan: None}).to_dict(orient="records"),
        "asset_links": links.replace({pd.NA: None, np.nan: None}).to_dict(orient="records"),
    }

    json_path.write_text(json.dumps(catalogue, indent=2, ensure_ascii=False), encoding="utf-8")

    print("=== KOHLER catalogue normalization complete ===")
    print(f"Products:        {len(products)}")
    print(f"Variants:        {len(variants)}")
    print(f"Unique assets:   {len(assets)}")
    print(f"Asset relations: {len(links)}")
    print()
    print("Product stats:", product_stats)
    print("Variant stats:", variant_stats)
    print("Asset stats:", asset_stats)
    print()
    print("Outputs:")
    for path in [
        products_path,
        variants_path,
        assets_path,
        links_path,
        categories_path,
        report_path,
        json_path,
    ]:
        print(f"  {path}")


if __name__ == "__main__":
    main()

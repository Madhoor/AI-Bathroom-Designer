#!/usr/bin/env python3
"""
crawl_kohler.py
----------------
Crawl KOHLER India category pages and build a structured catalogue.

USAGE
    # Phase 1 - the one category this has been checked against:
    python scripts/crawl_kohler.py --category freestanding-bathtubs --headed

    # Once you've calibrated a category and trust it, drop --headed:
    python scripts/crawl_kohler.py --category freestanding-bathtubs

    # Crawl every category currently marked enabled=True in kohler_common.py:
    python scripts/crawl_kohler.py --all

    # List known category slugs:
    python scripts/crawl_kohler.py --list

Each run:
  1. Loads the category's listing page(s) with Playwright.
  2. Parses visible text into product/bundle records (kohler_common.parse_listing_text).
  3. Resolves each record's product_url from on-page <a> tags.
  4. (unless --no-enrich) visits each product_url and extracts images,
     spec-sheet/CAD links, and "Must order" component relationships.
  5. Writes data/raw/<slug>_products.csv (+ _bundles.csv / _assets.csv).
  6. Merges every data/raw/*.csv into the final data/kohler_*.csv files.

Re-running a category overwrites just that category's raw file and
re-merges -- safe to re-run individual categories as you calibrate them.
"""

from __future__ import annotations

import argparse
import csv
import sys
import time
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))
from kohler_common import (  # noqa: E402
    CATEGORY_REGISTRY, CategoryEntry, get_category,
    ProductRecord, BundleRecord, AssetRecord,
    parse_listing_text, find_must_order_codes, classify_asset_link,
    guess_finish_code,
)

ROOT = Path(__file__).parent.parent
DATA_DIR = ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
DEBUG_DIR = DATA_DIR / "_debug"

REQUEST_DELAY_SEC = 1.5     # be polite; raise this if you see any blocking
NAV_TIMEOUT_MS = 30_000


# --------------------------------------------------------------------------
# Playwright helpers
# --------------------------------------------------------------------------

def make_page(playwright, headless: bool):
    browser = playwright.chromium.launch(headless=headless)
    context = browser.new_context(
        user_agent=(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
        ),
        viewport={"width": 1440, "height": 1000},
    )
    page = context.new_page()
    page.set_default_navigation_timeout(NAV_TIMEOUT_MS)
    return browser, context, page


def load_page(page, url: str, debug_tag: str | None = None):
    """Navigate, wait for hydration, optionally dump captured JSON responses."""
    captured_json = []

    def on_response(resp):
        try:
            ctype = resp.headers.get("content-type", "")
            if "json" in ctype and any(
                k in resp.url.lower() for k in ("api", "search", "algolia", "graphql", "product", "catalog")
            ):
                captured_json.append({"url": resp.url, "status": resp.status})
        except Exception:
            pass

    page.on("response", on_response)
    page.goto(url, wait_until="domcontentloaded")
    try:
        page.wait_for_load_state("networkidle", timeout=15_000)
    except Exception:
        pass  # some pages keep long-polling; proceed with what's rendered
    # Grace period for client-side hydration of the product grid.
    page.wait_for_timeout(2500)

    if debug_tag and captured_json:
        DEBUG_DIR.mkdir(parents=True, exist_ok=True)
        import json
        (DEBUG_DIR / f"{debug_tag}_network.json").write_text(json.dumps(captured_json, indent=2))
        print(f"    [debug] {len(captured_json)} candidate JSON responses logged to "
              f"data/_debug/{debug_tag}_network.json -- inspect these; if one of them "
              f"is the real product API, extracting from it directly will be far more "
              f"reliable than text parsing.")

    return page.inner_text("body")


def resolve_product_urls(page, records: list[dict]) -> None:
    """Best-effort match of each parsed record to an on-page product link."""
    anchors = page.eval_on_selector_all(
        "a[href*='/p/']",
        "els => els.map(e => ({href: e.href, text: e.innerText}))",
    )
    for rec in records:
        if rec.get("needs_manual_review"):
            continue
        code = rec.get("product_code", "")
        name = rec.get("product_name", "")
        match = None
        for a in anchors:
            if code and code.lower() in a["href"].lower():
                match = a["href"]
                break
        if not match:
            for a in anchors:
                if name and name.lower() in (a.get("text") or "").lower():
                    match = a["href"]
                    break
        rec["product_url"] = match  # None if unresolved -- left empty, not guessed


def enrich_from_pdp(page, product_url: str) -> dict:
    """Visit a product page and pull whatever is confidently extractable."""
    out = {"image_urls": [], "spec_sheet_url": None, "assets": [], "must_order": [],
           "page_text": ""}
    try:
        page.goto(product_url, wait_until="domcontentloaded")
        page.wait_for_timeout(1500)
    except Exception as e:
        out["error"] = str(e)
        return out

    out["page_text"] = page.inner_text("body")

    # Images: filter out obvious chrome (logos/icons) by requiring the
    # image to sit under a reasonably large rendered size.
    imgs = page.eval_on_selector_all(
        "img",
        """els => els
            .filter(e => e.naturalWidth > 200 && e.naturalHeight > 200)
            .map(e => e.src)""",
    )
    out["image_urls"] = list(dict.fromkeys(imgs))  # de-dupe, keep order

    anchors = page.eval_on_selector_all("a[href]", "els => els.map(e => e.href)")
    for href in anchors:
        classified = classify_asset_link(href)
        if not classified:
            continue
        asset_type, fmt = classified
        if asset_type == "Spec Sheet":
            out["spec_sheet_url"] = href
        else:
            out["assets"].append((asset_type, fmt, href))

    out["must_order"] = find_must_order_codes(out["page_text"])
    return out


# --------------------------------------------------------------------------
# Category crawlers
# --------------------------------------------------------------------------

def crawl_product_category(page, cat: CategoryEntry, enrich: bool, limit: int | None):
    print(f"[*] Loading listing: {cat.url}")
    text = load_page(page, cat.url, debug_tag=cat.slug)
    parsed = parse_listing_text(text, cat.url)
    print(f"    Parsed {len(parsed)} candidate product blocks "
          f"({sum(1 for p in parsed if p.get('needs_manual_review'))} need manual review)")

    resolve_product_urls(page, parsed)

    if limit:
        parsed = parsed[:limit]

    products: list[ProductRecord] = []
    assets: list[AssetRecord] = []

    for i, p in enumerate(parsed):
        if p.get("needs_manual_review"):
            products.append(ProductRecord(
                product_code=f"UNRESOLVED-{cat.slug}-{i}",
                product_name=p.get("product_name", ""),
                category=cat.category, subcategory=cat.subcategory,
                source_url=cat.url,
                needs_manual_review=True,
                review_notes=p.get("review_notes"),
            ))
            continue

        rec = ProductRecord(
            product_code=p["product_code"],
            product_name=p["product_name"],
            category=cat.category,
            subcategory=cat.subcategory,
            product_url=p.get("product_url"),
            current_price=p.get("current_price"),
            list_price=p.get("list_price"),
            discount=p.get("discount"),
            currency=p.get("currency", "INR"),
            dimensions=p.get("dimensions"),
            specifications=p.get("specifications"),
            finish_code=guess_finish_code(p["product_code"]),
            source_url=cat.url,
        )

        if enrich and rec.product_url:
            print(f"    [{i+1}/{len(parsed)}] enriching {rec.product_code} -> {rec.product_url}")
            time.sleep(REQUEST_DELAY_SEC)
            pdp = enrich_from_pdp(page, rec.product_url)
            rec.image_urls = "; ".join(pdp["image_urls"]) or None
            rec.spec_sheet_url = pdp["spec_sheet_url"]
            rec.has_cad_assets = bool(pdp["assets"])
            if pdp["must_order"]:
                rec.required_components = "; ".join(f"{c}: {d}" for c, d in pdp["must_order"])
            for asset_type, fmt, href in pdp["assets"]:
                assets.append(AssetRecord(
                    product_code=rec.product_code, asset_type=asset_type,
                    file_format=fmt, asset_url=href, product_url=rec.product_url,
                ))
            # go back to the listing so the anchor list stays valid for the next iteration
            page.goto(cat.url, wait_until="domcontentloaded")
            page.wait_for_timeout(1000)

        products.append(rec)

    return products, assets


def crawl_combo_category(page, cat: CategoryEntry, limit: int | None):
    print(f"[*] Loading combo listing: {cat.url}")
    text = load_page(page, cat.url, debug_tag=cat.slug)
    parsed = parse_listing_text(text, cat.url)
    print(f"    Parsed {len(parsed)} candidate bundle blocks")
    resolve_product_urls(page, parsed)

    if limit:
        parsed = parsed[:limit]

    bundles: list[BundleRecord] = []
    for i, p in enumerate(parsed):
        if p.get("needs_manual_review"):
            bundles.append(BundleRecord(
                bundle_code=f"UNRESOLVED-{cat.slug}-{i}",
                bundle_name=p.get("product_name", ""),
                category=cat.subcategory,
                needs_manual_review=True,
            ))
            continue

        bundle = BundleRecord(
            bundle_code=p["product_code"],
            bundle_name=p["product_name"],
            bundle_url=p.get("product_url"),
            category=cat.subcategory,
            price=p.get("current_price"),
            description=p.get("specifications"),
        )

        # Only capture components if the PDP explicitly lists them
        # (e.g. bullet list under "What's included" / "Must order").
        # We do NOT infer components from co-occurrence.
        if bundle.bundle_url:
            time.sleep(REQUEST_DELAY_SEC)
            pdp = enrich_from_pdp(page, bundle.bundle_url)
            if pdp["must_order"]:
                bundle.component_product_codes = "; ".join(c for c, _ in pdp["must_order"])
                bundle.components = "; ".join(d for _, d in pdp["must_order"])
            page.goto(cat.url, wait_until="domcontentloaded")
            page.wait_for_timeout(1000)

        bundles.append(bundle)

    return bundles


# --------------------------------------------------------------------------
# CSV I/O + merge
# --------------------------------------------------------------------------

def write_raw(slug: str, name: str, records: list) -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    path = RAW_DIR / f"{slug}_{name}.csv"
    if not records:
        if path.exists():
            path.unlink()
        return
    df = pd.DataFrame([r.__dict__ for r in records])
    df.to_csv(path, index=False)
    print(f"    wrote {path} ({len(df)} rows)")


def merge_outputs() -> None:
    """Concatenate every data/raw/*_<kind>.csv into the final data/kohler_<kind>.csv."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    kinds = {
        "products": "kohler_products.csv",
        "bundles": "kohler_bundles.csv",
        "assets": "kohler_assets.csv",
        "variants": "kohler_variants.csv",
    }
    for kind, outfile in kinds.items():
        files = sorted(RAW_DIR.glob(f"*_{kind}.csv")) if RAW_DIR.exists() else []
        if not files:
            continue
        frames = [pd.read_csv(f) for f in files]
        merged = pd.concat(frames, ignore_index=True)
        if kind == "products" and "product_code" in merged.columns:
            merged = merged.drop_duplicates(subset="product_code", keep="last")
        merged.to_csv(DATA_DIR / outfile, index=False)
        print(f"[merge] {outfile}: {len(merged)} rows from {len(files)} categor(y/ies)")

    # categories.csv is regenerated fresh from the registry every run,
    # with actual scraped product counts where we have them.
    prod_path = DATA_DIR / "kohler_products.csv"
    counts = {}
    if prod_path.exists():
        pdf = pd.read_csv(prod_path)
        counts = pdf.groupby("subcategory").size().to_dict()
    rows = []
    for c in CATEGORY_REGISTRY:
        rows.append({
            "category": c.category, "subcategory": c.subcategory, "slug": c.slug,
            "url": c.url, "kind": c.kind, "enabled": c.enabled,
            "scraped_product_count": counts.get(c.subcategory, 0),
        })
    pd.DataFrame(rows).to_csv(DATA_DIR / "kohler_categories.csv", index=False)
    print(f"[merge] kohler_categories.csv: {len(rows)} rows")


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description="Crawl KOHLER India categories.")
    ap.add_argument("--category", help="Category slug to crawl (see --list)")
    ap.add_argument("--all", action="store_true", help="Crawl every enabled category")
    ap.add_argument("--list", action="store_true", help="List known category slugs and exit")
    ap.add_argument("--headed", action="store_true", help="Show the browser window (recommended for first runs)")
    ap.add_argument("--no-enrich", action="store_true", help="Skip visiting individual product pages")
    ap.add_argument("--limit", type=int, default=None, help="Cap number of products per category (debugging)")
    args = ap.parse_args()

    if args.list:
        for c in CATEGORY_REGISTRY:
            flag = "✓ enabled " if c.enabled else "  disabled"
            print(f"  [{flag}] {c.slug:28s} ({c.kind:7s}) {c.url}")
        return

    if not args.category and not args.all:
        ap.error("pass --category <slug>, --all, or --list")

    targets = (
        [c for c in CATEGORY_REGISTRY if c.enabled] if args.all
        else [get_category(args.category)]
    )
    if not targets:
        print("No enabled categories found. Use --category <slug> explicitly, "
              "or flip enabled=True for more entries in kohler_common.py once calibrated.")
        return

    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser, context, page = make_page(pw, headless=not args.headed)
        try:
            for cat in targets:
                print(f"\n=== {cat.category} / {cat.subcategory} ===")
                if cat.kind == "combo":
                    bundles = crawl_combo_category(page, cat, args.limit)
                    write_raw(cat.slug, "bundles", bundles)
                else:
                    products, assets = crawl_product_category(page, cat, not args.no_enrich, args.limit)
                    write_raw(cat.slug, "products", products)
                    write_raw(cat.slug, "assets", assets)
        finally:
            browser.close()

    merge_outputs()
    print("\nDone. See data/kohler_*.csv, and re-run scripts/validate_kohler.py next.")


if __name__ == "__main__":
    main()
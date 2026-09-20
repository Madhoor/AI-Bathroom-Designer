"""Query unresolved KOHLER India inRiver IDs through the existing browser session.

This is an optional live resolver. It uses the same India storefront browser
session and in-page fetch mechanism as crawl_kohler_api.py. Results are cached
locally and are intentionally evidence-only; the normal resolver consumes the
cache and still marks collisions ambiguous.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / "data" / "master"
DEBUG = ROOT / "data" / "_debug"
RELATIONS = MASTER / "kohler_product_relations.csv"
ID_MAP = MASTER / "kohler_product_id_map.csv"
CACHE = MASTER / "kohler_product_id_resolution_cache.json"

sys.path.insert(0, str(Path(__file__).parent))
from crawl_kohler_api import browser_fetch_json, make_page  # noqa: E402

SEED_URL = "https://www.kohler.co.in/p/bathtubs/shop-freestanding-bathtubs"
SEED_API = (
    "https://www.kohler.co.in/apirequest/search/plp?"
    "fq=%7B!tag%3D%22ProductInstallationType_ss%22%7D"
    "ProductInstallationType_ss%3A(%22Freestanding%22)&rows=1&start=0&"
    "fl=masterSKU_s,sourceId_s,productName_s,productInRiverId_s,"
    "CustomerFacingSKU_s,sku_s,masterSKU_s,ProductProductNo_s,variantList.sku_ss&"
    "persona=GST&profilename=profile_kohler-india_PLP_Bathtub&"
    "collections=kohler-india&q=*:*"
)


def read_unresolved_ids() -> list[str]:
    with RELATIONS.open(newline="", encoding="utf-8-sig") as handle:
        import csv

        relation_ids = {
            row["target_product_code"].strip()
            for row in csv.DictReader(handle)
            if row["target_product_code"].strip().lower().startswith("inriver_")
        }
    resolved_ids: set[str] = set()
    if ID_MAP.exists():
        with ID_MAP.open(newline="", encoding="utf-8-sig") as handle:
            resolved_ids = {
                row["internal_id"].strip()
                for row in csv.DictReader(handle)
                if row.get("status") == "resolved"
            }
    return sorted(
            {
                internal_id for internal_id in relation_ids if internal_id not in resolved_ids
            }
        )


def query_url(internal_id: str) -> str:
    parts = urlsplit(SEED_API)
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    query.pop("fq", None)
    query["q"] = f"productInRiverId_s:{internal_id}"
    query["rows"] = "20"
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--headed", action="store_true", help="Show the Chromium browser.")
    parser.add_argument("--delay", type=float, default=1.0)
    parser.add_argument("--force", action="store_true", help="Query IDs already cached.")
    args = parser.parse_args()

    try:
        from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
        from playwright.sync_api import sync_playwright
    except ModuleNotFoundError as exc:
        raise SystemExit(
            "Playwright is required for live API resolution. "
            "Install the project's browser dependencies before running this optional resolver."
        ) from exc

    cache: dict[str, list[dict]] = {}
    if CACHE.exists():
        cache = json.loads(CACHE.read_text(encoding="utf-8"))
    ids = read_unresolved_ids()
    pending = ids if args.force else [internal_id for internal_id in ids if internal_id not in cache]
    if not pending:
        print("No uncached unresolved IDs to query.")
        return

    with sync_playwright() as playwright:
        browser, context, page = make_page(playwright, args.headed)
        try:
            page.goto(SEED_URL, wait_until="domcontentloaded")
            try:
                page.wait_for_load_state("networkidle", timeout=15_000)
            except PlaywrightTimeoutError:
                pass
            page.wait_for_timeout(2500)
            for index, internal_id in enumerate(pending, start=1):
                try:
                    payload, _ = browser_fetch_json(page, query_url(internal_id))
                    docs = payload.get("response", {}).get("docs", [])
                    cache[internal_id] = [
                        {
                            key: doc.get(key)
                            for key in (
                                "productInRiverId_s",
                                "sourceId_s",
                                "masterSKU_s",
                                "sku_s",
                                "CustomerFacingSKU_s",
                                "ProductProductNo_s",
                                "productName_s",
                                "variantList.sku_ss",
                            )
                            if doc.get(key) not in (None, "", [])
                        }
                        for doc in docs
                    ]
                    print(f"{index}/{len(pending)} {internal_id}: {len(docs)} exact API docs")
                except (RuntimeError, ValueError) as exc:
                    cache[internal_id] = []
                    print(f"{index}/{len(pending)} {internal_id}: query failed: {exc}")
                CACHE.write_text(json.dumps(cache, indent=2, ensure_ascii=False), encoding="utf-8")
                time.sleep(args.delay)
        finally:
            context.close()
            browser.close()


if __name__ == "__main__":
    main()

"""
Download a representative sample of KOHLER OBJ assets from the normalized catalogue.

Run from project root:
    python scripts/download_3d_sample.py

Outputs:
    data/3d_sample/source/<product_code>/<filename>
    data/3d_sample/sample_manifest.csv
    data/3d_sample/sample_manifest.json
"""

from __future__ import annotations

import csv
import json
import re
import time
from pathlib import Path
from urllib.parse import urlparse

import requests


ROOT = Path(__file__).resolve().parents[1]
ASSETS_CSV = ROOT / "data" / "master" / "kohler_assets_normalized.csv"
OUT_DIR = ROOT / "data" / "3d_sample"
SOURCE_DIR = OUT_DIR / "source"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/140.0 Safari/537.36"
    ),
    "Accept": "*/*",
}


def safe_name(value: str) -> str:
    value = re.sub(r"[^A-Za-z0-9._-]+", "_", value.strip())
    return value or "unknown"


def load_rows():
    if not ASSETS_CSV.exists():
        raise FileNotFoundError(f"Missing: {ASSETS_CSV}")

    with ASSETS_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def choose_sample(rows, max_products=10):
    # Prefer unique products with OBJ assets and spread across categories.
    candidates = [
        r for r in rows
        if (r.get("file_format_normalized") or "").upper() == "OBJ"
        and (r.get("asset_url") or "").strip()
        and (r.get("product_code") or "").strip()
    ]

    # Sort by category then product code for deterministic selection.
    candidates.sort(
        key=lambda r: (
            r.get("subcategory", "") or "",
            r.get("category", "") or "",
            r.get("product_code", "") or "",
        )
    )

    chosen = []
    seen = set()

    # First pass: one product per subcategory.
    for row in candidates:
        code = row["product_code"].strip()
        subcat = (row.get("subcategory") or "").strip().lower()

        key = (subcat, code)
        if code in seen:
            continue

        if not any(
            (x.get("subcategory") or "").strip().lower() == subcat
            for x in chosen
        ):
            chosen.append(row)
            seen.add(code)

        if len(chosen) >= max_products:
            return chosen

    # Second pass: fill remaining slots.
    for row in candidates:
        code = row["product_code"].strip()
        if code in seen:
            continue
        chosen.append(row)
        seen.add(code)
        if len(chosen) >= max_products:
            break

    return chosen


def download(url: str, destination: Path) -> tuple[bool, int, str]:
    try:
        response = requests.get(
            url,
            headers=HEADERS,
            timeout=90,
            stream=True,
            allow_redirects=True,
        )
        status = response.status_code

        if not response.ok:
            response.close()
            return False, status, f"HTTP {status}"

        destination.parent.mkdir(parents=True, exist_ok=True)

        size = 0
        with destination.open("wb") as f:
            for chunk in response.iter_content(chunk_size=1024 * 256):
                if chunk:
                    f.write(chunk)
                    size += len(chunk)

        response.close()

        if size == 0:
            try:
                destination.unlink()
            except FileNotFoundError:
                pass
            return False, status, "Empty response"

        return True, status, f"{size} bytes"

    except requests.RequestException as exc:
        return False, -1, str(exc)


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)

    rows = load_rows()
    sample = choose_sample(rows, max_products=10)

    if not sample:
        raise RuntimeError("No OBJ assets found in the normalized asset catalogue.")

    print(f"Found {len(rows)} asset rows.")
    print(f"Selected {len(sample)} representative OBJ products.\n")

    manifest = []

    for idx, row in enumerate(sample, start=1):
        code = row["product_code"].strip()
        url = row["asset_url"].strip()

        parsed = urlparse(url)
        filename = Path(parsed.path).name or f"{safe_name(code)}.obj"
        filename = safe_name(filename)

        destination = SOURCE_DIR / safe_name(code) / filename

        print(f"[{idx}/{len(sample)}] {code}")
        print(f"    URL: {url}")
        print(f"    Save: {destination}")

        ok, status, message = download(url, destination)

        entry = {
            "product_code": code,
            "product_name": row.get("product_name"),
            "category": row.get("category"),
            "subcategory": row.get("subcategory"),
            "asset_type": row.get("asset_type"),
            "file_format": row.get("file_format"),
            "asset_url": url,
            "local_path": str(destination.relative_to(ROOT)) if ok else "",
            "http_status": status,
            "download_ok": ok,
            "result": message,
        }
        manifest.append(entry)

        if ok:
            print(f"    ✅ {message}")
        else:
            print(f"    ❌ {message}")

        time.sleep(1)

    csv_path = OUT_DIR / "sample_manifest.csv"
    json_path = OUT_DIR / "sample_manifest.json"

    with csv_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=manifest[0].keys())
        writer.writeheader()
        writer.writerows(manifest)

    json_path.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    success = sum(1 for x in manifest if x["download_ok"])

    print("\n=== 3D sample download complete ===")
    print(f"Successful: {success}/{len(manifest)}")
    print(f"Manifest:   {csv_path}")
    print(f"JSON:       {json_path}")
    print(f"Models:     {SOURCE_DIR}")


if __name__ == "__main__":
    main()

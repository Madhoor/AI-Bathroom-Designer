#!/usr/bin/env python3
"""
crawl_kohler_api.py
-------------------
KOHLER India catalogue crawler using the site's own PLP/PDP JSON APIs.

This replaces the old visible-text/DOM parsing approach.

Pipeline:
    PLP page
      -> capture real /apirequest/search/plp request
      -> paginate that API (rows/start)
      -> PDP /apirequest/search/pdp/{slug}
      -> extract product data + ProductResource.* asset URLs
      -> CSV output

No Design Files UI clicking is required. The PDP API already exposes direct
CAD/resource URLs such as:
    ProductResource.3DOBJ.resourceFullWebURL_ss
    ProductResource.3DSketchup.resourceFullWebURL_ss
    ProductResource.3D3DS.resourceFullWebURL_ss
    ProductResource.3DRevit.resourceFullWebURL_ss

USAGE
    python scripts/crawl_kohler_api.py --category freestanding-bathtubs --headed --limit 5
    python scripts/crawl_kohler_api.py --category freestanding-bathtubs --headed
    python scripts/crawl_kohler_api.py --all --headed
    python scripts/crawl_kohler_api.py --list

The first live test should use --limit 5. Once the CSV looks correct,
remove --limit.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))
from kohler_common import (  # noqa: E402
    CATEGORY_REGISTRY,
    CategoryEntry,
    ProductRecord,
    VariantRecord,
    BundleRecord,
    AssetRecord,
    get_category,
    guess_finish_code,
    find_must_order_codes,
)

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
DEBUG_DIR = DATA_DIR / "_debug"

REQUEST_DELAY_SEC = 1.0
NAV_TIMEOUT_MS = 30_000
DEFAULT_ROWS = 30

# Fields proven by the captured KOHLER PDP request to contain the useful
# catalogue/resource information.
PDP_FIELDS = [
    "CustomerFacingSKU_s",
    "ProductServices_ss",
    "ProductPriceSpiderIncluded_s",
    "SKUIsProjectPack_s",
    "Color.SKU.Details_ss",
    "ProductOverallLengthInches_s",
    "ProductOverallWidthInches_s",
    "ProductOverallHeightInches_s",
    "ProductWebFeatures_ss",
    "ProductFreightPolicyType_s",
    "priceList.*.finalPrice_d",
    "priceList.*.saleOffer_s",
    "ProductWebTechnology_ss",
    "ProductNarrativeDescription_s",
    "ProductWebMaterial_ss",
    "ProductWebInstallation_ss",
    "ProductWebHydrotherapy_ss",
    "ProductWebRebates_ss",
    "SKUDiscontinuedDate_dt",
    "ctProductType_s",
    "isCollapsedPDP_b",
    "productInRiverId_s",
    "sku_s",
    "SKUCountryofOrigin_s",
    "ProductOverallLengthCm_d",
    "ProductOverallWidthCm_d",
    "ProductOverallHeightCm_d",
    "ProductPackageContents_s",
    "InstallationCost_s",
    "RequiredAccessoryGroupName_ss",
    "RequiredAccessoryGroupProduct_ss",
    "Recommended_Accessories_ss",
    "RegionSoldOnline_b",
    "productDiscontinued_b",
    "ProductIsExclusive_s",
    "masterSKU_s",
    "sourceId_s",
    "preferenceSku_s",
    "SKUColorSwatchFilename_ss",
    "ProductDescriptionProductShort_s",
    "ProductBrandName_s",
    "metaTitle_s",
    "productName_s",
    "id",
    "productImages.url_ss",
    "slug_s",
    "Product_Category",
    "displayPriceStartingAt_s",
    "priceList.GST.price_d",
    "priceList.GST.finalPrice_d",
    "priceList.GST.discountedPrice_d",
    "priceList.GST.saleOffer_s",
    "priceStartingAt.GST_d",
    "discountedPriceStartingAt.GST_d",
    "variantList.sku_ss",
    "SKUColorFinishName_ss",
    "Color.SKU.Details_ss",
    "Color.GST.Details_ss",
    "ProductExclusive_s",
    "RegionReleaseforShipment_dt",
    "productImages.labelWithUrl_ss",
    "productImageVariantImages.labelWithUrl_ss",
    "ProductBrandNameDisplay_s",
    "ctId_s",
    "ProductProductNo_s",
    "ProductServices_s",
    "InstallationAvailable_s",
    "priceList.ANY.price_d",
    "RegionSupplyChain_ss",
    "BundleList_ss",
    "bundleNameSlugDetails_ss",
    "title_s",
    "ProductResource.SpecPDFFileName.resourceFullWebURL_ss",
    "ProductResource.SpecPDFFileName.resourceTitle_ss",
    "ProductResource.EnvironProdDecl.resourceFullWebURL_ss",
    "ProductResource.EnvironProdDecl.resourceTitle_ss",
    "ProductResource.HomeownersGuide.resourceFullWebURL_ss",
    "ProductResource.HomeownersGuide.resourceTitle_ss",
    "ProductResource.InstallationWithoutSPPDF.resourceFullWebURL_ss",
    "ProductResource.PartsPDFFileName.resourceFullWebURL_ss",
    "ProductResource.InstallationWithoutSPPDF.resourceTitle_ss",
    "ProductResource.DXFPlanView.resourceFullWebURL_ss",
    "ProductResource.DWGPlanView.resourceFullWebURL_ss",
    "ProductResource.DXFFrontView.resourceFullWebURL_ss",
    "ProductResource.DWGFrontView.resourceFullWebURL_ss",
    "ProductResource.DXFSideView.resourceFullWebURL_ss",
    "ProductResource.DWGSideView.resourceFullWebURL_ss",
    "ProductResource.3DDXFSymbol.resourceFullWebURL_ss",
    "ProductResource.3DDWGSymbol.resourceFullWebURL_ss",
    "ProductResource.3DRevit.resourceFullWebURL_ss",
    "ProductResource.3D3DS.resourceFullWebURL_ss",
    "ProductResource.3DSketchup.resourceFullWebURL_ss",
    "ProductResource.CutOutDXF.resourceFullWebURL_ss",
    "ProductResource.3DOBJ.resourceFullWebURL_ss",
    "productVideos.labelWithUrl_ss",
    "relatedProduct_s",
    "relatedProduct.Details_ss",
    "productRegionAllVariantDiscontinued_b",
    "relatedProductLink_s",
    "relatedProductCategory_s",
    "relatedProductSlug_s",
]

# These are the asset fields exposed by the PDP response. Keep this explicit
# so random links in the page are never mistaken for CAD files.
ASSET_FIELD_MAP = {
    "ProductResource.3DOBJ.resourceFullWebURL_ss": ("3D Model", "OBJ"),
    "ProductResource.3DSketchup.resourceFullWebURL_ss": ("3D Model", "SKP"),
    "ProductResource.3D3DS.resourceFullWebURL_ss": ("3D Model", "3DS"),
    "ProductResource.3DRevit.resourceFullWebURL_ss": ("3D Model", "RFA"),
    "ProductResource.DXFPlanView.resourceFullWebURL_ss": ("CAD Drawing", "DXF"),
    "ProductResource.DWGPlanView.resourceFullWebURL_ss": ("CAD Drawing", "DWG"),
    "ProductResource.DXFFrontView.resourceFullWebURL_ss": ("CAD Drawing", "DXF"),
    "ProductResource.DWGFrontView.resourceFullWebURL_ss": ("CAD Drawing", "DWG"),
    "ProductResource.DXFSideView.resourceFullWebURL_ss": ("CAD Drawing", "DXF"),
    "ProductResource.DWGSideView.resourceFullWebURL_ss": ("CAD Drawing", "DWG"),
    "ProductResource.3DDXFSymbol.resourceFullWebURL_ss": ("CAD Drawing", "DXF"),
    "ProductResource.3DDWGSymbol.resourceFullWebURL_ss": ("CAD Drawing", "DWG"),
    "ProductResource.CutOutDXF.resourceFullWebURL_ss": ("CAD Drawing", "DXF"),
    "ProductResource.SpecPDFFileName.resourceFullWebURL_ss": ("Spec Sheet", "PDF"),
    "ProductResource.EnvironProdDecl.resourceFullWebURL_ss": ("Environmental Document", "PDF"),
    "ProductResource.HomeownersGuide.resourceFullWebURL_ss": ("Homeowners Guide", "PDF"),
    "ProductResource.InstallationWithoutSPPDF.resourceFullWebURL_ss": ("Installation", "PDF"),
    "ProductResource.PartsPDFFileName.resourceFullWebURL_ss": ("Parts", "PDF"),
}


def make_page(playwright, headless: bool):
    browser = playwright.chromium.launch(headless=headless)
    context = browser.new_context(
        user_agent=(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/151.0.0.0 Safari/537.36"
        ),
        viewport={"width": 1440, "height": 1000},
        accept_downloads=True,
    )
    page = context.new_page()
    page.set_default_navigation_timeout(NAV_TIMEOUT_MS)
    return browser, context, page


def capture_plp_api_request(page, category_url: str) -> tuple[str, dict]:
    """Load a real PLP and capture the site's own JSON API response."""
    captured = []

    def on_response(resp):
        try:
            u = resp.url
            ctype = resp.headers.get("content-type", "")
            if "/apirequest/search/plp" in u and "json" in ctype.lower():
                captured.append((u, resp.status))
        except Exception:
            pass

    page.on("response", on_response)
    page.goto(category_url, wait_until="domcontentloaded")
    try:
        page.wait_for_load_state("networkidle", timeout=15_000)
    except Exception:
        pass
    page.wait_for_timeout(2500)

    # Prefer the request with rows > 0. The page can make auxiliary rows=0
    # calls as well.
    candidates = [(u, s) for u, s in captured if _query_int(u, "rows", 0) > 0]
    if not candidates:
        candidates = captured
    if not candidates:
        raise RuntimeError(
            "Could not capture KOHLER /apirequest/search/plp response. "
            "The page may have changed or the request was blocked."
        )

    api_url = candidates[0][0]
    print(f"    captured PLP API: {api_url}")

    # IMPORTANT: use fetch() inside the loaded KOHLER page instead of
    # page.request.get().  KOHLER's PLP API requires the browser session
    # (cookies/auth context) that was established while loading the page.
    payload, status = browser_fetch_json(page, api_url)
    if status != 200:
        raise RuntimeError(f"PLP API returned HTTP {status}: {api_url}")

    DEBUG_DIR.mkdir(parents=True, exist_ok=True)
    (DEBUG_DIR / f"{_slug_from_url(category_url)}_plp_sample.json").write_text(
        json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    return api_url, payload


def browser_fetch_json(page, url: str) -> tuple[dict, int]:
    """Fetch JSON from inside the live KOHLER browser session.

    The KOHLER API can return HTTP 401 when called through Playwright's
    standalone APIRequestContext, even though the same URL succeeds from the
    website itself. Running fetch() in the page preserves the page's cookies
    and other browser session state.
    """
    result = page.evaluate(
        """async (url) => {
            try {
                const response = await fetch(url, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Accept': 'application/json, text/plain, */*'
                    }
                });
                return {
                    ok: response.ok,
                    status: response.status,
                    text: await response.text()
                };
            } catch (error) {
                return {
                    ok: false,
                    status: 0,
                    text: '',
                    error: String(error)
                };
            }
        }""",
        url,
    )

    status = int(result.get("status", 0))
    text = result.get("text", "")
    if status != 200:
        error = result.get("error")
        detail = f" ({error})" if error else ""
        raise RuntimeError(f"Browser fetch returned HTTP {status}{detail}: {url}")

    try:
        return json.loads(text), status
    except json.JSONDecodeError as exc:
        preview = text[:500].replace("\n", " ")
        raise RuntimeError(
            f"KOHLER API returned non-JSON content for {url}: {preview!r}"
        ) from exc


def _query_int(url: str, key: str, default: int) -> int:
    try:
        value = parse_qsl(urlsplit(url).query).copy()
        d = dict(value)
        return int(d.get(key, default))
    except Exception:
        return default


def _replace_query(url: str, **changes) -> str:
    parts = urlsplit(url)
    pairs = parse_qsl(parts.query, keep_blank_values=True)
    d = dict(pairs)
    for k, v in changes.items():
        d[k] = str(v)
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(d), parts.fragment))


def _slug_from_url(url: str) -> str:
    return urlsplit(url).path.rstrip("/").split("/")[-1] or "category"


def _docs(payload: dict) -> list[dict]:
    return (
        payload.get("response", {}).get("docs", [])
        if isinstance(payload, dict)
        else []
    )


def fetch_all_plp_docs(page, first_api_url: str, limit: int | None) -> list[dict]:
    """Paginate the captured PLP API directly using start/rows."""
    rows = _query_int(first_api_url, "rows", DEFAULT_ROWS)
    if rows <= 0:
        rows = DEFAULT_ROWS

    # Re-fetch through the browser session so the API request carries the
    # same authentication/cookies as the page that produced first_api_url.
    payload, _ = browser_fetch_json(page, first_api_url)
    docs = _docs(payload)
    total = int(payload.get("response", {}).get("numFound", len(docs)))

    print(f"    PLP reports {total} products; page size={rows}")

    if limit is not None:
        target = min(limit, total)
    else:
        target = total

    all_docs = docs[:target]
    start = len(all_docs)

    while start < target:
        api_url = _replace_query(first_api_url, start=start, rows=rows)
        time.sleep(REQUEST_DELAY_SEC)
        try:
            payload, status = browser_fetch_json(page, api_url)
        except RuntimeError as exc:
            print(f"    [warn] PLP page start={start} failed: {exc}; stopping pagination")
            break
        if status != 200:
            print(f"    [warn] PLP page start={start} returned HTTP {status}; stopping pagination")
            break
        page_docs = _docs(payload)
        if not page_docs:
            break
        needed = target - len(all_docs)
        all_docs.extend(page_docs[:needed])
        start = len(all_docs)
        print(f"    fetched {start}/{target}")

    # Deduplicate by SKU/sourceId because the site's index can expose variants.
    unique = []
    seen = set()
    for doc in all_docs:
        key = doc.get("sku_s") or doc.get("masterSKU_s") or doc.get("sourceId_s") or doc.get("id")
        if key and key in seen:
            continue
        if key:
            seen.add(key)
        unique.append(doc)
    return unique


def _redact_headers(headers: dict) -> dict:
    """Keep request-header names/values useful for debugging without dumping secrets."""
    redacted = {}
    for key, value in headers.items():
        lk = key.lower()
        if lk in {"authorization", "cookie", "proxy-authorization", "x-api-key"}:
            if value:
                redacted[key] = f"<present, length={len(str(value))}>"
            else:
                redacted[key] = "<empty>"
        else:
            redacted[key] = value
    return redacted


def capture_real_pdp_request(page, doc: dict) -> dict | None:
    """Open the actual KOHLER India PDP and capture the site's own PDP response.

    This is intentionally different from calling /apirequest/search/pdp ourselves.
    If KOHLER's frontend adds a JWT or another request header, the browser's real
    request will contain it and we can use the response directly.
    """
    slug = doc.get("slug_s")
    if not slug:
        return None

    code = doc.get("sku_s") or doc.get("masterSKU_s") or ""
    product_url = f"https://www.kohler.co.in/p/{slug}"
    if code:
        product_url += f"?skuId={code}"

    captured = []

    def on_response(resp):
        try:
            if "/apirequest/search/pdp/" not in resp.url:
                return
            ctype = resp.headers.get("content-type", "")
            if "json" not in ctype.lower():
                return
            request_headers = resp.request.all_headers()
            captured.append({
                "url": resp.url,
                "status": resp.status,
                "request_method": resp.request.method,
                "request_headers": _redact_headers(request_headers),
                "response_headers": dict(resp.headers),
                "response": resp.json(),
            })
        except Exception as exc:
            print(f"        [debug] could not capture PDP response: {exc}")

    page.on("response", on_response)
    try:
        page.goto(product_url, wait_until="domcontentloaded")
        try:
            page.wait_for_load_state("networkidle", timeout=12_000)
        except Exception:
            pass
        page.wait_for_timeout(2500)
    finally:
        try:
            page.remove_listener("response", on_response)
        except Exception:
            pass

    if not captured:
        print(f"        [debug] no real PDP API response captured for {slug}")
        return None

    # Prefer successful responses and the request matching this product slug.
    captured.sort(key=lambda x: (x["status"] == 200, x["url"].rstrip("/").endswith(slug)), reverse=True)
    hit = captured[0]

    DEBUG_DIR.mkdir(parents=True, exist_ok=True)
    debug_path = DEBUG_DIR / f"pdp_{_slug_from_url(product_url)}_request.json"
    debug_path.write_text(
        json.dumps({
            "product_url": product_url,
            "captured_count": len(captured),
            "selected": hit,
        }, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print(f"        real PDP API: HTTP {hit['status']}")
    print(f"        PDP request headers captured: {', '.join(sorted(hit['request_headers'].keys()))}")
    if "Authorization" in hit["request_headers"] or "authorization" in hit["request_headers"]:
        print("        PDP Authorization header: PRESENT (redacted in debug file)")
    else:
        print("        PDP Authorization header: not present")

    if hit["status"] != 200:
        return None
    return hit["response"]


def fetch_pdp(page, doc: dict) -> dict | None:
    """Get PDP data, preferring the site's real browser request.

    The previous implementation manually called the PDP endpoint and received
    HTTP 401. The real website request is now captured instead, which preserves
    whatever KOHLER India authentication/session mechanism the frontend uses.
    """
    time.sleep(REQUEST_DELAY_SEC)

    payload = capture_real_pdp_request(page, doc)
    if payload is not None:
        docs = _docs(payload)
        if docs:
            return docs[0]

    # Fallback: try our existing browser-session fetch once. This keeps the
    # crawler useful if the PDP page happens not to expose its API call in a
    # particular release.
    slug = doc.get("slug_s")
    if not slug:
        return None

    url = f"https://www.kohler.co.in/apirequest/search/pdp/{slug}"
    params = {
        "q": "*:*",
        "fl": ",".join(PDP_FIELDS),
        "collections": "kohler-india",
        "profilename": "profile_kohler-india_PDP",
        "search_type": "product_detail",
    }
    api_url = url + "?" + urlencode(params)
    try:
        payload, status = browser_fetch_json(page, api_url)
    except RuntimeError as exc:
        print(f"        [warn] direct PDP fallback failed: {exc}")
        return None

    if status != 200:
        return None
    docs = _docs(payload)
    return docs[0] if docs else None

def first_value(doc: dict, *keys):
    for key in keys:
        value = doc.get(key)
        if value is None or value == "" or value == []:
            continue
        if isinstance(value, list):
            return value[0] if value else None
        return value
    return None


def join_value(value) -> str | None:
    if value is None:
        return None
    if isinstance(value, list):
        vals = [str(x).strip() for x in value if str(x).strip()]
        return "; ".join(dict.fromkeys(vals)) or None
    return str(value)


def parse_float(value):
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        m = re.search(r"[\d,.]+", str(value))
        if not m:
            return None
        try:
            return float(m.group(0).replace(",", ""))
        except ValueError:
            return None


def parse_color_details(doc: dict) -> tuple[str | None, str | None]:
    details = doc.get("Color.SKU.Details_ss") or []
    if not isinstance(details, list):
        details = [details]
    # Format observed in the captured PDP:
    # White|swatch_0|18343T-0|false|false|K-18343T-0
    if details:
        parts = str(details[0]).split("|")
        finish = parts[0].strip() if parts else None
        return finish, None
    finish = first_value(doc, "SKUColorFinishName_ss")
    return str(finish) if finish else None, None


def parse_dimensions(doc: dict) -> str | None:
    def parse_dimension(value):
        if value is None or value == "":
            return None
        if isinstance(value, (int, float)):
            return float(value)
        text = str(value).strip().replace("\u2013", "-").replace("\u2014", "-")
        fraction = re.fullmatch(r"(\d+)\s*-\s*(\d+)\s*/\s*(\d+)", text.rstrip('"'))
        if fraction:
            whole, numerator, denominator = map(int, fraction.groups())
            return whole + numerator / denominator
        return parse_float(text)

    w = parse_dimension(doc.get("ProductOverallWidthCm_d"))
    d = parse_dimension(doc.get("ProductOverallLengthCm_d"))
    h = parse_dimension(doc.get("ProductOverallHeightCm_d"))
    if w is not None and d is not None and h is not None:
        return f"{d:g} cm x {w:g} cm x {h:g} cm"

    inch_w = parse_dimension(doc.get("ProductOverallWidthInches_s"))
    inch_d = parse_dimension(doc.get("ProductOverallLengthInches_s"))
    inch_h = parse_dimension(doc.get("ProductOverallHeightInches_s"))
    if inch_w is not None and inch_d is not None and inch_h is not None:
        return f"{inch_d * 2.54:g} cm x {inch_w * 2.54:g} cm x {inch_h * 2.54:g} cm"

    # Preserve the site's human-readable dimension title if structured fields
    # are incomplete.
    return first_value(doc, "title_s", "ProductDescriptionProductShort_s")


def extract_assets(product_code: str, product_url: str, doc: dict) -> list[AssetRecord]:
    assets = []
    for field, (asset_type, fmt) in ASSET_FIELD_MAP.items():
        values = doc.get(field)
        if values is None:
            continue
        if not isinstance(values, list):
            values = [values]
        for url in values:
            if not isinstance(url, str) or not url.startswith(("http://", "https://")):
                continue
            assets.append(
                AssetRecord(
                    product_code=product_code,
                    asset_type=asset_type,
                    file_format=fmt,
                    asset_url=url,
                    product_url=product_url,
                )
            )
    # Deduplicate exact URLs.
    unique = []
    seen = set()
    for a in assets:
        if a.asset_url in seen:
            continue
        seen.add(a.asset_url)
        unique.append(a)
    return unique


def extract_variants(doc: dict, product_url: str) -> list[VariantRecord]:
    parent = first_value(doc, "masterSKU_s", "sourceId_s", "sku_s")
    if not parent:
        return []

    skus = doc.get("variantList.sku_ss") or []
    if not isinstance(skus, list):
        skus = [skus]

    colors = doc.get("Color.SKU.Details_ss") or []
    if not isinstance(colors, list):
        colors = [colors]

    finish_names = doc.get("SKUColorFinishName_ss") or []
    if not isinstance(finish_names, list):
        finish_names = [finish_names]

    variants = []
    for idx, sku in enumerate(skus):
        color = None
        if idx < len(colors):
            parts = str(colors[idx]).split("|")
            color = parts[0].strip() if parts else None
        finish = str(finish_names[idx]) if idx < len(finish_names) else color
        variants.append(
            VariantRecord(
                parent_product_code=str(parent),
                sku=str(sku),
                finish=finish,
                finish_code=guess_finish_code(str(sku)),
                color=color,
                current_price=None,
                list_price=None,
                product_url=product_url,
            )
        )
    return variants


def product_from_doc(doc: dict, cat: CategoryEntry, source_url: str) -> ProductRecord:
    sku = first_value(doc, "sku_s", "masterSKU_s", "sourceId_s")
    name = first_value(doc, "productName_s", "title_s", "ProductDescriptionProductShort_s")
    finish, _ = parse_color_details(doc)

    product_url = None
    slug = doc.get("slug_s")
    if slug:
        product_url = f"https://www.kohler.co.in/p/{slug}?skuId={sku}" if sku else f"https://www.kohler.co.in/p/{slug}"

    price = first_value(doc, "priceList.GST.finalPrice_d", "discountedPriceStarting.GST_d")
    list_price = first_value(doc, "priceList.GST.price_d", "priceStartingAt.GST_d")
    discount = first_value(doc, "priceList.GST.saleOffer_s")

    features = join_value(doc.get("ProductWebFeatures_ss"))
    image_urls = join_value(doc.get("productImages.url_ss"))
    specs = join_value([
        doc.get("ProductPackageContents_s"),
        doc.get("ProductWebTechnology_s"),
        doc.get("ProductWebHydrotherapy_ss"),
        doc.get("ProductFreightPolicyType_s"),
    ])

    return ProductRecord(
        product_code=str(sku),
        product_name=str(name or ""),
        collection=join_value(doc.get("ProductBrandNameDisplay_s")),
        model=join_value(doc.get("ProductProductNo_s")),
        category=cat.category,
        subcategory=cat.subcategory,
        product_url=product_url,
        current_price=parse_float(price),
        list_price=parse_float(list_price),
        discount=str(discount) if discount is not None else None,
        currency="INR",
        dimensions=parse_dimensions(doc),
        finish=finish,
        finish_code=guess_finish_code(str(sku)),
        material=join_value(doc.get("ProductWebMaterial_ss")),
        installation_type=join_value(doc.get("ProductWebInstallation_ss")),
        rough_in=None,
        specifications=specs,
        features=features,
        required_components=join_value(doc.get("RequiredAccessoryGroupProduct_ss")),
        compatible_products=join_value(doc.get("relatedProduct_s")),
        image_urls=image_urls,
        spec_sheet_url=first_value(doc, "ProductResource.SpecPDFFileName.resourceFullWebURL_ss"),
        has_cad_assets=any(
            doc.get(k) for k in ASSET_FIELD_MAP
            if k.startswith("ProductResource.") and not "PDF" in k
        ),
        source_url=source_url,
    )


def crawl_product_category(page, cat: CategoryEntry, limit: int | None):
    print(f"[*] Loading PLP: {cat.url}")
    first_api_url, _ = capture_plp_api_request(page, cat.url)
    plp_docs = fetch_all_plp_docs(page, first_api_url, limit)
    print(f"    received {len(plp_docs)} PLP product docs")

    products = []
    assets = []
    variants = []

    for i, plp_doc in enumerate(plp_docs, 1):
        code = plp_doc.get("sku_s") or plp_doc.get("masterSKU_s") or "UNKNOWN"
        slug = plp_doc.get("slug_s")
        print(f"    [{i}/{len(plp_docs)}] PDP {code}")

        pdp = fetch_pdp(page, plp_doc)
        if not pdp:
            print("        [warn] no PDP document; keeping PLP data only")
            # Build a minimal product from PLP data instead of dropping it.
            pdp = dict(plp_doc)

        product = product_from_doc(pdp, cat, cat.url)
        # If PDP omitted a useful PLP URL/SKU, preserve it.
        if not product.product_url and slug:
            product.product_url = (
                f"https://www.kohler.co.in/p/{slug}"
                + (f"?skuId={code}" if code else "")
            )

        product_assets = extract_assets(product.product_code, product.product_url or "", pdp)
        product_variants = extract_variants(pdp, product.product_url or "")

        assets.extend(product_assets)
        variants.extend(product_variants)
        products.append(product)

    return products, assets, variants


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


def _has_complete_dimensions(value) -> bool:
    if value is None or pd.isna(value):
        return False
    return bool(re.fullmatch(
        r"\s*\d+(?:\.\d+)?\s+cm\s+x\s+\d+(?:\.\d+)?\s+cm\s+x\s+\d+(?:\.\d+)?\s+cm\s*",
        str(value),
        flags=re.IGNORECASE,
    ))


def merge_product_frames(frames: list[pd.DataFrame]) -> pd.DataFrame:
    merged = pd.concat(frames, ignore_index=True)
    if "product_code" not in merged.columns:
        return merged

    merged["_dimension_quality"] = merged["dimensions"].map(_has_complete_dimensions)
    merged = (
        merged.sort_values("_dimension_quality", ascending=False, kind="stable")
        .drop_duplicates(subset="product_code", keep="first")
        .drop(columns="_dimension_quality")
    )
    return merged


def merge_outputs() -> None:
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
        frames = []
        existing = DATA_DIR / outfile
        if kind == "products" and existing.exists():
            frames.append(pd.read_csv(existing))
        frames.extend(pd.read_csv(f) for f in files)

        if kind == "products":
            merged = merge_product_frames(frames)
        else:
            merged = pd.concat(frames, ignore_index=True)
        if kind == "assets" and {"product_code", "asset_url"}.issubset(merged.columns):
            merged = merged.drop_duplicates(subset=["product_code", "asset_url"], keep="last")
        if kind == "variants" and {"parent_product_code", "sku"}.issubset(merged.columns):
            merged = merged.drop_duplicates(subset=["parent_product_code", "sku"], keep="last")

        merged.to_csv(DATA_DIR / outfile, index=False)
        print(f"[merge] {outfile}: {len(merged)} rows from {len(files)} categor(y/ies)")

    prod_path = DATA_DIR / "kohler_products.csv"
    counts = {}
    if prod_path.exists():
        pdf = pd.read_csv(prod_path)
        if "subcategory" in pdf.columns:
            counts = pdf.groupby("subcategory").size().to_dict()

    rows = []
    for c in CATEGORY_REGISTRY:
        rows.append({
            "category": c.category,
            "subcategory": c.subcategory,
            "slug": c.slug,
            "url": c.url,
            "kind": c.kind,
            "enabled": c.enabled,
            "scraped_product_count": counts.get(c.subcategory, 0),
        })
    pd.DataFrame(rows).to_csv(DATA_DIR / "kohler_categories.csv", index=False)
    print(f"[merge] kohler_categories.csv: {len(rows)} rows")


def main():
    ap = argparse.ArgumentParser(description="Crawl KOHLER India using PLP/PDP APIs.")
    ap.add_argument("--category", help="Category slug (see --list)")
    ap.add_argument("--all", action="store_true", help="Crawl every enabled category")
    ap.add_argument("--list", action="store_true", help="List category registry")
    ap.add_argument("--headed", action="store_true", help="Show browser window")
    ap.add_argument("--limit", type=int, default=None, help="Limit products for a test run")
    args = ap.parse_args()

    if args.list:
        for c in CATEGORY_REGISTRY:
            print(f"  [{'enabled' if c.enabled else 'disabled':8s}] {c.slug:28s} {c.url}")
        return

    if not args.category and not args.all:
        ap.error("pass --category <slug>, --all, or --list")

    targets = (
        [c for c in CATEGORY_REGISTRY if c.enabled]
        if args.all
        else [get_category(args.category)]
    )

    if not targets:
        raise RuntimeError("No enabled categories.")

    from playwright.sync_api import sync_playwright

    with sync_playwright() as pw:
        browser, context, page = make_page(pw, headless=not args.headed)
        try:
            for cat in targets:
                print(f"\n=== {cat.category} / {cat.subcategory} ===")
                if cat.kind == "combo":
                    print("    [skip] Combo API support is not implemented in this pass.")
                    print("    First finish product catalogue/API calibration, then add combo extraction.")
                    continue

                products, assets, variants = crawl_product_category(
                    page, cat, args.limit
                )
                write_raw(cat.slug, "products", products)
                write_raw(cat.slug, "assets", assets)
                write_raw(cat.slug, "variants", variants)
        finally:
            context.close()
            browser.close()

    merge_outputs()
    print("\nDone.")
    print("Next: inspect data/kohler_products.csv and data/kohler_assets.csv.")
    print("Only after the test looks correct should we add the 3D downloader/GLB conversion stage.")


if __name__ == "__main__":
    main()
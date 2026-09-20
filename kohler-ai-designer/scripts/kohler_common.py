"""
kohler_common.py
-----------------
Shared models, the category registry, and text-parsing helpers for the
KOHLER India catalogue crawler.

Design notes (read this before touching selectors):

kohler.co.in is a Next.js / React storefront. The product grid on listing
pages (PLPs) and most of the spec content on product pages (PDPs) is
rendered client-side, and the CSS class names are build-hashed (they
change between deploys), so hard-coding CSS selectors like
`.ProductCard_price__a8f3d` is fragile and will break silently.

Instead, this crawler extracts the *rendered, visible text* of the page
(page.inner_text("body")) and parses it with regexes built against a real
captured export of https://www.kohler.co.in/p/bathtubs/shop-freestanding-bathtubs
(the file supplied by the user). This is more robust to markup churn,
because KOHLER's copywriting pattern (Name(TM) / dimensions+description /
SKU / price / "List ... % OFF" / "Inclusive of all taxes") is the one
thing that has stayed stable.

Where the DOM *is* still needed (product URLs, image src attributes,
downloadable file links), we use very loose, attribute-based selectors
(e.g. "any <a> whose href contains '/p/'") rather than class names, for
the same reason.

THIS WAS NOT TESTED AGAINST THE LIVE SITE. This sandbox's network egress
is restricted to a fixed allow-list of package registries and does not
include kohler.co.in, so the listing-text parser below was validated
against the real extracted text of your uploaded PDF (5/5 products
parsed correctly, prices/dimensions/discounts all matched), but the
Playwright navigation/selector code has not been run against a live
page. Run scripts/crawl_kohler.py --headed --category freestanding-bathtubs
first and watch it work (or fail) before trusting a bigger run. See the
README block at the bottom of crawl_kohler.py for the calibration
checklist.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field, asdict
from typing import Optional


# --------------------------------------------------------------------------
# Category registry
# --------------------------------------------------------------------------
# Built from the KOHLER India nav/sitemap reconnaissance. `enabled=True`
# means "safe to crawl with this phase's code" -- start with just the
# bathtub category (per the task), confirm it works, then flip others on.
# `kind="combo"` categories get routed through the bundle extractor
# instead of the plain product extractor.

@dataclass
class CategoryEntry:
    category: str          # top-level area, e.g. "Wellness"
    subcategory: str        # leaf category, e.g. "Freestanding Bathtubs"
    slug: str               # short key used on the CLI (--category <slug>)
    url: str                # PLP URL
    kind: str = "product"   # "product" or "combo"
    enabled: bool = False


CATEGORY_REGISTRY: list[CategoryEntry] = [
    # --- Phase 1: proven test category -------------------------------
    CategoryEntry("Wellness", "Freestanding Bathtubs", "freestanding-bathtubs",
                   "https://www.kohler.co.in/p/bathtubs/shop-freestanding-bathtubs",
                   "product", enabled=True),

    # --- Phase 2 candidates (disabled until calibrated on real site) --
    CategoryEntry("Wellness", "Drop-in Bathtubs", "dropin-bathtubs",
                   "https://www.kohler.co.in/p/bathtubs/shop-drop-in-bathtubs", "product"),
    CategoryEntry("Wellness", "Alcove Bathtubs", "alcove-bathtubs",
                   "https://www.kohler.co.in/p/bathtubs/shop-alcove-bathtubs", "product"),
    CategoryEntry("Basin Area", "Vessel Basin", "vessel-basin",
                   "https://www.kohler.co.in/p/washbasins/shop-vessel-basin", "product"),
    CategoryEntry("Basin Area", "Undercounter Basin", "undercounter-basin",
                   "https://www.kohler.co.in/p/washbasins/shop-undercounter-basin", "product"),
    CategoryEntry("Basin Area", "Wall Mount Basin", "wallmount-basin",
                   "https://www.kohler.co.in/p/washbasins/shop-wall-mount-basin", "product"),
    CategoryEntry("Basin Area", "Semi Recessed Basin", "semirecessed-basin",
                   "https://www.kohler.co.in/p/washbasins/shop-semi-recessed-basin", "product"),
    CategoryEntry("Basin Area", "Vanity Top Basin", "vanitytop-basin",
                   "https://www.kohler.co.in/p/washbasins/shop-vanity-top-basin", "product"),
    CategoryEntry("Basin Area", "Single Control Faucets", "faucets-single-control",
                   "https://www.kohler.co.in/p/faucets/shop-single-control-faucets", "product"),
    CategoryEntry("Basin Area", "Tall Faucets", "faucets-tall",
                   "https://www.kohler.co.in/p/faucets/shop-tall-faucets", "product"),
    CategoryEntry("Basin Area", "Wall-Mount Faucets", "faucets-wallmount",
                   "https://www.kohler.co.in/p/faucets/shop-wall-mount-faucets", "product"),
    CategoryEntry("Basin Area", "Widespread Faucets", "faucets-widespread",
                   "https://www.kohler.co.in/p/faucets/shop-widespread-faucets", "product"),
    CategoryEntry("Basin Area", "Bathtub Faucets", "faucets-bathtub",
                   "https://www.kohler.co.in/p/faucets/shop-bathtub-faucets", "product"),
    CategoryEntry("Showering Area", "Rainpanels", "rainpanels",
                   "https://www.kohler.co.in/p/showers/shop-rainpanels", "product"),
    CategoryEntry("Showering Area", "Rainheads", "rainheads",
                   "https://www.kohler.co.in/p/showers/shop-rainheads", "product"),
    CategoryEntry("Showering Area", "Showerheads", "showerheads",
                   "https://www.kohler.co.in/p/showers/shop-showerheads", "product"),
    CategoryEntry("Showering Area", "Hand Showers", "hand-showers",
                   "https://www.kohler.co.in/p/showers/shop-hand-showers", "product"),
    CategoryEntry("Showering Area", "Pivot Shower Doors", "shower-doors-pivot",
                   "https://www.kohler.co.in/p/shower-doors/shop-pivot-shower-doors", "product"),
    CategoryEntry("Showering Area", "Sliding Shower Doors", "shower-doors-sliding",
                   "https://www.kohler.co.in/p/shower-doors/shop-sliding-shower-doors", "product"),
    CategoryEntry("Toilet Area", "Smart Toilet", "smart-toilet",
                   "https://www.kohler.co.in/p/toilets/shop-smart-toilet", "product"),
    CategoryEntry("Toilet Area", "Wall Hung Toilets", "wallhung-toilets",
                   "https://www.kohler.co.in/p/toilets/shop-wall-hung-toilets", "product"),
    CategoryEntry("Toilet Area", "One Piece", "toilets-onepiece",
                   "https://www.kohler.co.in/p/toilets/shop-one-piece", "product"),
    CategoryEntry("Toilet Area", "Two Piece", "toilets-twopiece",
                   "https://www.kohler.co.in/p/toilets/shop-two-piece", "product"),
    CategoryEntry("Basin Area", "Bathroom Vanity", "bathroom-vanity",
                   "https://www.kohler.co.in/p/bathroom-vanity/shop-bathroom-vanities", "product"),

    # --- Combos (routed through the bundle extractor) -----------------
    CategoryEntry("Combos", "Bathroom Combos", "combos-bathroom",
                   "https://www.kohler.co.in/p/shop-bathroom-combos", "combo"),
    CategoryEntry("Combos", "Showering Area Combos", "combos-showering",
                   "https://www.kohler.co.in/p/shop-showering-area-combos", "combo"),
    CategoryEntry("Combos", "Toilet Area Combos", "combos-toilet",
                   "https://www.kohler.co.in/p/shop-toilet-area-combos", "combo"),
    CategoryEntry("Combos", "Grooming Area Combos", "combos-grooming",
                   "https://www.kohler.co.in/p/shop-grooming-area-combos", "combo"),
]


def get_category(slug: str) -> CategoryEntry:
    for c in CATEGORY_REGISTRY:
        if c.slug == slug:
            return c
    raise KeyError(
        f"Unknown category slug '{slug}'. Known slugs: "
        + ", ".join(c.slug for c in CATEGORY_REGISTRY)
    )


# --------------------------------------------------------------------------
# Records
# --------------------------------------------------------------------------

@dataclass
class ProductRecord:
    product_code: str
    product_name: str
    collection: Optional[str] = None
    model: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    product_url: Optional[str] = None
    current_price: Optional[float] = None
    list_price: Optional[float] = None
    discount: Optional[str] = None
    currency: str = "INR"
    dimensions: Optional[str] = None          # freeform, e.g. "167.5cm x 76.2cm"
    finish: Optional[str] = None
    finish_code: Optional[str] = None
    material: Optional[str] = None
    installation_type: Optional[str] = None
    rough_in: Optional[str] = None
    specifications: Optional[str] = None       # freeform notes / spec-tab text
    features: Optional[str] = None             # "; "-joined bullet list
    required_components: Optional[str] = None  # "; "-joined "code: role"
    compatible_products: Optional[str] = None  # "; "-joined product codes
    image_urls: Optional[str] = None           # "; "-joined URLs
    spec_sheet_url: Optional[str] = None
    has_cad_assets: bool = False
    source_url: Optional[str] = None           # PLP the record was found on
    needs_manual_review: bool = False
    review_notes: Optional[str] = None


@dataclass
class VariantRecord:
    parent_product_code: str
    sku: str
    finish: Optional[str] = None
    finish_code: Optional[str] = None
    color: Optional[str] = None
    current_price: Optional[float] = None
    list_price: Optional[float] = None
    product_url: Optional[str] = None


@dataclass
class BundleRecord:
    bundle_code: str
    bundle_name: str
    bundle_url: Optional[str] = None
    category: Optional[str] = None
    components: Optional[str] = None            # "; "-joined human descriptions
    component_product_codes: Optional[str] = None  # "; "-joined codes, only ones explicitly listed
    price: Optional[float] = None
    description: Optional[str] = None
    needs_manual_review: bool = False


@dataclass
class AssetRecord:
    product_code: str
    asset_type: str      # e.g. "3D Model", "Spec Sheet"
    file_format: str     # e.g. "OBJ", "SKP", "DWG", "PDF"
    asset_url: str
    product_url: Optional[str] = None


# --------------------------------------------------------------------------
# Text parsing helpers
# --------------------------------------------------------------------------

_BOILERPLATE_PATTERNS = [
    r"^Read more$",
    r"kohler\.co\.in",
    r"^\d+ of \d+$",
    r"\d{1,2}-[A-Za-z]{3}-\d{2},\s*\d{1,2}:\d{2}\s*[AP]M$",
    r"^Kohler Concierge$",
    r"^View all$",
    r"^Filter\s*&?\s*Sort$",
    r"^Sort By",
]


def _clean_lines(raw_text: str) -> list[str]:
    lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
    return [l for l in lines if not any(re.search(p, l) for p in _BOILERPLATE_PATTERNS)]


def parse_listing_text(raw_text: str, category_url: str) -> list[dict]:
    """
    Parse the plain rendered text of a KOHLER India PLP into product dicts.

    Validated against a real capture of the Freestanding Bathtubs PLP
    (5/5 products parsed correctly: name, SKU, dimensions, current price,
    list price, discount %). Products whose block doesn't match the
    expected shape are returned with needs_manual_review=True and the raw
    text preserved in review_notes -- they are NOT dropped silently and
    NOT filled in with guessed values.
    """
    lines = _clean_lines(raw_text)

    # A new product block starts at a line ending in (TM) or (R).
    start_idxs = [i for i, l in enumerate(lines) if re.search(r"(™|®)\s*$", l)]

    out = []
    for n, start in enumerate(start_idxs):
        end = start_idxs[n + 1] if n + 1 < len(start_idxs) else len(lines)
        block = lines[start:end]
        name = re.sub(r"[™®]\s*$", "", block[0]).strip()

        sku_idx = None
        for i, l in enumerate(block[1:], start=1):
            if re.match(r"^[A-Za-z0-9]+-[A-Za-z0-9\-]+$", l) and "₹" not in l:
                sku_idx = i
                break

        if sku_idx is None:
            out.append({
                "product_name": name,
                "needs_manual_review": True,
                "review_notes": "Could not locate a SKU line in block: " + " | ".join(block),
            })
            continue

        sku = block[sku_idx]
        description = re.sub(r"\s+", " ", " ".join(block[1:sku_idx])).strip()
        # Fix a recurring PDF/DOM text artifact: stray space before a decimal point.
        description = re.sub(r"(\d)\s+\.(\d)", r"\1.\2", description)

        rest = " ".join(block[sku_idx + 1:])

        price_m = re.search(r"₹\s*([\d,]+\.\d{2})", rest)
        current_price = float(price_m.group(1).replace(",", "")) if price_m else None

        list_m = re.search(r"List\s*₹?\s*([\d,]+\.\d{2})\D{0,5}?(\d+)%\s*OFF", rest)
        list_price = float(list_m.group(1).replace(",", "")) if list_m else None
        discount = f"{list_m.group(2)}%" if list_m else None

        if list_price is None:
            all_prices = re.findall(r"₹\s*([\d,]+\.\d{2})", rest)
            if len(all_prices) >= 2:
                list_price = float(all_prices[1].replace(",", ""))

        dim_m = re.search(r"([\d.]+)\s*cm\s*x\s*([\d.]+)\s*cm", description, re.IGNORECASE)
        dimensions = f"{dim_m.group(1)}cm x {dim_m.group(2)}cm" if dim_m else None

        out.append({
            "product_code": sku,
            "product_name": name,
            "specifications": description or None,
            "dimensions": dimensions,
            "current_price": current_price,
            "list_price": list_price,
            "discount": discount,
            "currency": "INR",
            "source_url": category_url,
            "needs_manual_review": False,
        })

    return out


FINISH_CODE_MAP = {
    # Best-effort map of KOHLER's common finish-code suffixes.
    # Only used to *label* a code already present in the SKU -- never
    # used to invent a finish that wasn't in the source data.
    "0": "White",
    "7": "Black",
    "CP": "Polished Chrome",
    "BL": "Matte Black",
    "AF": "French Gold",
    "BV": "Brushed Bronze",
    "BGD": "Brushed Rose Gold",
    "RGD": "Rose Gold",
    "NA": "Not Applicable / Unfinished",
}


def guess_finish_code(sku: str) -> Optional[str]:
    """Return the trailing finish-code token of a SKU, e.g. 'K-1800T-CP' -> 'CP'."""
    m = re.search(r"-([A-Z]{1,4}|\d)$", sku)
    return m.group(1) if m else None


def find_must_order_codes(text: str) -> list[tuple[str, str]]:
    """
    Find explicit 'Must order: <description> (<CODE>)' relationships, the
    same pattern used throughout the KOHLER price book and product pages.
    Returns (code, description) pairs. Does NOT infer relationships that
    aren't stated this explicitly.
    """
    results = []
    for m in re.finditer(r"Must order:\s*([^(\n]+?)\s*\(?(K-[\w\-]+|[\w]+-[\w\-]+)\)?", text):
        desc, code = m.group(1).strip(" :"), m.group(2).strip()
        results.append((code, desc))
    return results


CAD_EXTENSIONS = (".obj", ".skp", ".3ds", ".dwg", ".dxf", ".rfa")


def classify_asset_link(href: str) -> Optional[tuple[str, str]]:
    """Return (asset_type, file_format) if href looks like a spec/CAD asset, else None."""
    href_l = href.lower()
    for ext in CAD_EXTENSIONS:
        if href_l.endswith(ext):
            return ("3D/CAD Model", ext.strip(".").upper())
    if "revit" in href_l or "bim" in href_l:
        return ("3D/CAD Model", "Revit/BIM")
    if href_l.endswith(".pdf") and any(k in href_l for k in ("spec", "datasheet", "data-sheet")):
        return ("Spec Sheet", "PDF")
    return None
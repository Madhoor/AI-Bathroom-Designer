# Vanity-Top / Countertop Crawl Report

## Crawl scope

- Official PLP: <https://www.kohler.co.in/p/washbasins/shop-vanity-top-basin>
- Registry slug: `vanitytop-basin`
- Crawler: `scripts/crawl_kohler_api.py`
- Scope: only `vanitytop-basin`
- PDP enrichment: enabled
- PLP result: 2 products
- PDP API result: 2/2 HTTP 200

This is the official KOHLER India PLP currently registered for the vanity-top
category. It is a washbasin PLP filtered by `ProductInstallationType_ss:
("Vanity Top")`; the returned products include both a countertop vanity top
and a vessel lavatory classified by the site in this category.

## Products

| Product code | Product name | Price (INR) | Dimensions | Finish | Material | Installation |
|---|---|---:|---|---|---|---|
| `14031-BU-96` | Marrakesh Vanity-top with single faucet hole | 410,000 | 55.4038 x 78.74 x 7.62 cm | Biscuit | Vitreous china | Vanity top |
| `2749T-1-0` | Forefront 90 cm rectangular vessel bathroom sink with glazed underside | 42,799 | 52.07 x 90.0113 x 19.5263 cm | White | Vitreous china | Vessel |

Dimension completeness is **2/2**. Both values came from complete structured
`ProductOverall*Inches_s` PDP fields and were converted by the existing
dimension parser; no dimensions were inferred from names or appearance.

## Captured resources

Both products have all requested 3D source formats:

- `14031-BU-96`: OBJ, SKP, 3DS, RFA.
- `2749T-1-0`: OBJ, SKP, 3DS, RFA.

Both have CAD drawings (DXF and DWG plan/front/side/symbol resources).

Documents:

- `14031-BU-96`: 3 spec PDFs and 1 installation PDF.
- `2749T-1-0`: 1 spec PDF and 1 installation PDF.

The raw asset rows are preserved in
`data/raw/vanitytop-basin_assets.csv`.

## Variants

Two variants were captured, one for each product:

- `14031-BU-96` → `14031-BU-96`, Biscuit.
- `2749T-1-0` → `2749T-1-0`, White.

No variant-level cabinet, basin, faucet, or top relationship was present.

## Explicit relationship evidence

### `14031-BU-96`

The captured PDP feature text states:

- fits industry-standard 30 inch (76.2 cm) vanities;
- pairs with `K-14046-BU` Marrakesh on-Camber sink or `K-2349` Camber sink,
  sold separately.

The PDP also exposes `Recommended_Accessories_ss` internal references:
`inRiver_236561`, `inRiver_236789`, and `inRiver_236754`. These are retained
in the captured PDP evidence, but the current product-ID map does not resolve
them to product codes. No cabinet code is named.

The package contents are a Marrakesh vitreous countertop with one hole,
installation instructions, homeowner guides, and an insert. The package does
not name any of the four recovered cabinets.

### `2749T-1-0`

The captured PDP describes a Forefront vessel lavatory with integrated rear
faucet deck, single faucet hole, center drain, overflow, and glazed underside.
It says it coordinates with Forefront products, but exposes no explicit
vanity-cabinet SKU, internal cabinet ID, or basin/top relationship.

Its package contents are one lavatory, one accessory pack, and installation
instructions. No cabinet code is named.

## Cabinet relationship assessment

The four recovered cabinets remain present in the merged and normalized
catalogue:

- `30460IN-MWF`
- `31601IN-E64`
- `30459IN-MWF`
- `30457IN-MWF`

No vanity-top PDP names any of these cabinet product codes. No captured
internal relationship reference resolves to one of these cabinets. Therefore:

1. No top-to-cabinet chain is fully resolvable from the captured evidence.
2. `2749T-1-0` is a factual Forefront vessel product, but collection wording
   does not prove pairing with `31601IN-E64`.
3. `14031-BU-96` explicitly names two basin products, but neither is one of
   the recovered vanity cabinets and the referenced internal IDs are unresolved
   in the current map.
4. `2211IN-0` remains unsuitable for this vanity path: it is an undercounter
   Caxton lavatory, while the cabinet PDP evidence calls for a vanity top and,
   for three cabinets, a vessel-sink category. No SKU-level link exists.
5. No faucet relationship to a recovered cabinet is established. A faucet hole
   or integrated faucet deck describes the top/basin product, not cabinet
   compatibility.

No relationships were created or added during this crawl.

## Unresolved references and data gaps

- `14031-BU-96` recommended-accessory internal IDs
  `inRiver_236561`, `inRiver_236789`, and `inRiver_236754` are not currently
  resolved to product codes.
- The `K-14046-BU` and `K-2349` references in the 14031 feature text are
  explicit product references, but the corresponding product records are not
  both present as resolved catalogue products under those exact codes.
- No top-to-cabinet references were returned for either crawled product.
- The current PLP does not expose a dedicated countertop/cabinet pairing
  category beyond these two products.

## Regeneration and preservation

The existing merge and normalization pipeline was rerun after the category-only
crawl. Its dimension-preserving duplicate selection remains active; stale
description-only rows did not overwrite structured dimensions.

Final catalogue totals remain:

- 292 products;
- 535 variants;
- 3,238 unique assets;
- 3,275 asset relationships.

The two vanity-top products remain present, and the four vanity cabinets remain
present with their complete dimensions. The category summary now records 2
products for `vanitytop-basin`.

## Recommended next acquisition

First resolve the explicit `14031-BU-96` accessory references by crawling or
looking up the exact KOHLER products represented by `K-14046-BU`, `K-2349`, and
the three `inRiver_*` IDs. In parallel, crawl any KOHLER vanity/countertop
category or cabinet PDPs that expose explicit top/cabinet SKU references.
Do not create a cabinet pairing from the Forefront collection wording or
nominal dimensions alone.


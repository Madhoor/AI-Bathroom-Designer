# Bathroom Vanity Crawl Report

## Crawl configuration

- Category: `bathroom-vanity`
- PLP: <https://www.kohler.co.in/p/bathroom-vanity/shop-bathroom-vanities>
- Crawler: `scripts/crawl_kohler_api.py`
- Scope: only `bathroom-vanity`
- PDP enrichment: enabled
- PLP result: 4 products
- PDP API result: 4/4 HTTP 200

The previous landing-page URL was not used. The category registry and merged
category summary now point to the vanity PLP above.

## Products

All four products have complete structured product dimensions. The values below
are the crawler's explicit dimensional fields normalized to centimetres; no
shipping or package dimensions were used.

| Product code | Product name | Price (INR) | Dimensions | Installation |
|---|---|---:|---|---|
| `30460IN-MWF` | Luxe 90 cm wall-hung bathroom vanity cabinet | 115,849 | 57.9438 x 90.0113 x 43.0213 cm | Wall-hung; installation hardware included |
| `31601IN-E64` | Forefront 90 cm wall-hung bathroom vanity cabinet | 102,739 | 52.07 x 90.0113 x 52.07 cm | Wall-hung |
| `30459IN-MWF` | Luxe 75 cm wall-hung bathroom vanity cabinet | 105,399 | 57.9438 x 74.93 x 43.0213 cm | Wall-hung; installation hardware included |
| `30457IN-MWF` | Prologue 75 cm wall-hung bathroom vanity cabinet | 111,099 | 57.9438 x 73.9775 x 43.0213 cm | Wall-hung; installation hardware included |

All four records include material and collection fields:

- `30460IN-MWF`: Wood composite cabinet; Luxe; Natural Oak.
- `31601IN-E64`: Plywood and HDMDR; Forefront; Dark Walnut.
- `30459IN-MWF`: Wood composite cabinet; Luxe; Natural Oak.
- `30457IN-MWF`: Wood composite cabinet; Prologue; Natural Oak.

## Assets and documents

The category crawl captured 55 asset rows across all four products:

- 4 OBJ source assets (one per product).
- 4 SKP assets.
- 4 3DS assets.
- 4 RFA assets.
- 16 DXF CAD drawings.
- 16 DWG CAD drawings.
- 4 spec-sheet PDFs.
- 3 installation PDFs.

Therefore all four products have an OBJ source asset. All four also have
specification documents. Installation documents were present for three
products; the captured record for `30459IN-MWF` did not include a separate
installation PDF.

The raw asset list is in
`data/raw/bathroom-vanity_assets.csv`; source URLs were preserved from the PDP
API and were not fabricated.

## Variants

Seven variants were captured:

- `30460IN-MWF`: `30460IN-MWF`, `30460IN-N21`
- `31601IN-E64`: `31601IN-E64`
- `30459IN-MWF`: `30459IN-MWF`, `30459IN-N21`
- `30457IN-MWF`: `30457IN-MWF`, `30457IN-PSH`

Variant prices were not populated by the captured variant records, so no
variant price was invented.

## Components and relationships

The PDP records expose package/component text such as wall-mount cabinets,
hardware kits, drawer mats/trays, baskets, installation guides, and warranty
cards. These are retained in `required_components` as source package-content
text.

No explicit basin/vanity compatibility relationship was created. The Luxe and
Prologue feature text says a vanity top and KOHLER vessel bathroom sink are
sold separately; this is not treated as a resolved compatibility relation.
The Forefront text says it coordinates with Forefront sinks, but no structured
compatibility record was emitted, so it is also not treated as a relationship.
No recommendation or placement data was changed.

## Unresolved or review items

- `30459IN-MWF` has no separate installation PDF in the captured asset rows.
- `31601IN-E64` has no explicit finish code in the variant/product record
  despite having the finish name `Dark Walnut`.
- Variant prices are blank in the source variant records.
- The category contains vanity cabinets, not basin products. They must not be
  assumed to host undercounter basins without an explicit factual relationship.
- Product names/features contain KOHLER trademark characters in the source;
  the raw and normalized CSVs retain the crawler's decoded text representation.

## Regeneration results

The normalizer was run after the category-only crawl:

- normalized products: 292 total, including 4 bathroom vanity products;
- normalized variants: 535 total, including 7 bathroom vanity variants;
- normalized unique assets: 3,238 total;
- normalized asset relationship rows: 3,275 total.

The updated source and normalized outputs are:

- `data/raw/bathroom-vanity_products.csv`
- `data/raw/bathroom-vanity_assets.csv`
- `data/raw/bathroom-vanity_variants.csv`
- `data/kohler_products.csv`
- `data/kohler_assets.csv`
- `data/kohler_variants.csv`
- `data/kohler_categories.csv`
- `data/master/kohler_products_normalized.csv`
- `data/master/kohler_catalogue.json`


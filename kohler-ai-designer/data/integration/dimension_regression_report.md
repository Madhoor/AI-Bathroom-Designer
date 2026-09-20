# Dimension Regression Investigation

## Finding

The structured dimensions were not lost from the KOHLER source responses or
from `parse_dimensions()`. They were replaced during `merge_outputs()`.

Before the vanity crawl, the merged `data/kohler_products.csv` contained
records recovered from structured `ProductOverall*Inches_s` fields. The vanity
crawl then called `merge_outputs()`, which rebuilt the merged product file from
all `data/raw/*_products.csv` files. Several older per-category files were
created before the inch extraction fix and still contain only product title
text in `dimensions`. The merge concatenated those rows and used:

```python
merged.drop_duplicates(subset="product_code", keep="last")
```

Because the stale category rows were selected as the final duplicate, the
better structured dimensions were discarded. Normalization then correctly
preserved those description-only values and reported `not_parsed`; it was not
the source of the regression.

## Source verification

The captured PDP/API responses under `data/_debug/` still contain complete
structured inch fields. The current `parse_dimensions()` returns complete
centimetre values from those fields:

| Product code | Captured structured source | `parse_dimensions()` result |
|---|---|---|
| `2211IN-0` | `ProductOverallLengthInches_s=21-1/8"`, `Width=17-1/4"`, `Height=7-7/16"` | `53.6575 cm x 43.815 cm x 18.8912 cm` |
| `29777IN-0` | `Length=16-3/16"`, `Width=16-7/8"`, `Height=24-3/8"` | `41.1163 cm x 42.8625 cm x 61.9125 cm` |
| `9301IN-ZX-RGD` | `Length=15-1/8"`, `Width=2-3/8"`, `Height=15-1/8"` | `38.4175 cm x 6.0325 cm x 38.4175 cm` |
| `28529IN-0` | `Length=26-3/4"`, `Width=14-1/2"`, `Height=19-5/16"` | `67.945 cm x 36.83 cm x 49.0538 cm` |
| `3983IN-S-0` | `Length=28-1/2"`, `Width=14-3/8"`, `Height=28-7/16"` | `72.39 cm x 36.5125 cm x 72.2313 cm` |

The structured fields are present in:

- `data/_debug/pdp_caxton-big-undercounter-lavatory-2211in_request.json`
- `data/_debug/pdp_innate-one-piece-elongated-smart-toilet-dual-flush-29777in_request.json`
- `data/_debug/pdp_katalyst-air-square-384-mm-single-function-rainhead-22-2-lpm-9301in-zx_request.json`
- `data/_debug/pdp_leap-one-piece-round-front-smart-toilet-dual-flush-28529in_request.json`
- `data/_debug/pdp_reach-one-piece-round-front-toilet-with-skirted-trapway-dual-flush-3983in-s_request.json`

## Before/after trace

“Previous normalized dimensions” are the complete values recovered from the
captured structured fields before the vanity-only merge. “Current normalized
dimensions” are the values produced after the regression, before repair.

| Product | Previous dimension source | Current dimension source | Previous normalized dimensions | Current normalized dimensions | Loss/replacement stage |
|---|---|---|---|---|---|
| `2211IN-0` | Structured PDP inch fields | Product description/title only | `53.6575 x 43.815 x 18.8912 cm` | none; `54 cm undercounter lavatory` is not a grouped dimension | `merge_outputs()` duplicate replacement |
| `29777IN-0` | Structured PDP inch fields | Product description/title only | `41.1163 x 42.8625 x 61.9125 cm` | none; `One-piece elongated smart toilet, dual-flush` | `merge_outputs()` duplicate replacement |
| `9301IN-ZX-RGD` | Structured PDP inch fields | Product description/title only | `38.4175 x 6.0325 x 38.4175 cm` | none; `Square 38.4 cm single-function rainhead, 22.2 lpm` | `merge_outputs()` duplicate replacement |
| `28529IN-0` | Structured PDP inch fields | Product description/title only | `67.945 x 36.83 x 49.0538 cm` | none; `One-piece round-front smart toilet, dual-flush` | `merge_outputs()` duplicate replacement |
| `3983IN-S-0` | Structured PDP inch fields | Product description/title only | `72.39 x 36.5125 x 72.2313 cm` | none; `One-piece round-front toilet...` | `merge_outputs()` duplicate replacement |

## Normalization assessment

`normalize_kohler_catalogue.py` did not overwrite structured dimensions. It
correctly parsed an explicit grouped `dimensions` value when present and
reported `not_parsed` for the description-only replacement values. The
extraction fix in `crawl_kohler_api.py` is still active and verified directly
against the captured PDP records.

## Fix required

Product merges must prefer a duplicate row with complete explicit dimensions
over a duplicate row with incomplete or description-only dimensions. The merge
must remain factual: it must not parse product names, infer missing values, or
use package/shipping dimensions. Existing captured records will be used to
restore the current merged rows, and the vanity rows will remain in the merged
catalogue.


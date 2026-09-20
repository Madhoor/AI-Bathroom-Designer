# KOHLER dimension investigation

## Scope

This investigation traces dimensions for representative real products in the
three roles that blocked the integration proof:

- toilet
- basin / lavatory
- shower / rainhead

No production code or catalogue input was changed. The investigation compares
the normalized catalogue, the original crawler CSV, the crawler extraction
logic, and captured KOHLER India PDP/API responses in `data/_debug/`.

## Executive conclusion

The missing dimensions are a combination of **source coverage** and a
**normalization loss**:

1. Several PDP responses contain complete dimensions in the structured
   `ProductOverall*Inches_s` fields, but the crawler's `parse_dimensions()`
   reads only the `ProductOverall*Cm_d` fields. The inch values are therefore
   discarded before `data/kohler_products.csv` is written.
2. The normalizer only parses grouped `x`/`×` dimension text. It does not
   recover dimensions from the discarded PDP fields, shipping fields, or
   malformed/non-grouped text.
3. Some products genuinely lack a complete product bounding box in the
   captured source. For example, the Odeon basin has no `ProductOverall*`
   fields or inch equivalents in its captured PDP; its feature text contains
   `Dimensions: 560*45.4 cm`, which is malformed and incomplete for a
   width/depth/height record.
4. Shipping dimensions are present for some products, but they describe
   packaging, not the installed product. They are not valid substitutes.

This confirms the integration failure is not caused by the recommendation
engine. The existing complete-dimension requirement correctly prevents spatial
validation from using incomplete or ambiguous facts.

## Pipeline trace

### Crawler/API extraction

[`scripts/crawl_kohler_api.py`](../../scripts/crawl_kohler_api.py) requests all
of the following PDP fields:

- `ProductOverallLengthCm_d`
- `ProductOverallWidthCm_d`
- `ProductOverallHeightCm_d`
- `ProductOverallLengthInches_s`
- `ProductOverallWidthInches_s`
- `ProductOverallHeightInches_s`

However, its `parse_dimensions()` function currently does:

```text
w = parse_float(doc.get("ProductOverallWidthCm_d"))
d = parse_float(doc.get("ProductOverallLengthCm_d"))
h = parse_float(doc.get("ProductOverallHeightCm_d"))
```

It emits a grouped centimetre string only when all three centimetre fields
exist. It does not read the corresponding inch fields. If the centimetre
fields are incomplete, it falls back to `title_s` or
`ProductDescriptionProductShort_s`.

### Normalization

[`scripts/normalize_kohler_catalogue.py`](../../scripts/normalize_kohler_catalogue.py)
parses only grouped text patterns such as:

- `150 cm x 70 cm`
- `150 cm x 70 cm x 46 cm`
- `72" x 42"`

The parser intentionally leaves height empty for two-dimensional text and does
not interpret arbitrary separators such as `*`. It only examines the raw
`dimensions`, `product_name`, `specifications`, and `features` columns after
the crawler has already written its reduced product record.

## Representative evidence

All normalized values below are from
[`data/master/kohler_products_normalized.csv`](../master/kohler_products_normalized.csv).
Raw/API evidence is from the named captured PDP request file.

### Toilet: `3983IN-S-0`

- Product: Reach One-piece round-front toilet with skirted trapway, dual-flush
- Source capture:
  [`pdp_reach-one-piece-round-front-toilet-with-skirted-trapway-dual-flush-3983in-s_request.json`](../_debug/pdp_reach-one-piece-round-front-toilet-with-skirted-trapway-dual-flush-3983in-s_request.json)
- Structured source fields:
  - `ProductOverallLengthInches_s`: `28-1/2"`
  - `ProductOverallWidthInches_s`: `14-3/8"`
  - `ProductOverallHeightInches_s`: `28-7/16"`
- Structured centimetre fields: absent
- Other source evidence:
  - feature text includes rim-to-floor height `15.39 inches (39.1 cm)`;
  - this is a component/feature height, not the complete product height.
- Original `data/kohler_products.csv` dimensions: product description only
  (`One-piece round-front toilet with skirted trapway, dual-flush`)
- Normalized dimensions:
  - `width_mm`: empty
  - `depth_mm`: empty
  - `height_mm`: empty
  - `dimension_source`: empty
  - `dimension_parse_status`: `not_parsed`
- Completeness: complete product dimensions **present in captured PDP inch
  fields**, absent from crawler output and normalized output.
- Unit conversion: required; inches to millimetres (`25.4 mm/in`).
- Classification: **present in source but lost during crawler extraction**.

### Toilet: `28529IN-0`

- Product: Leap One-piece round-front smart toilet, dual-flush
- Source capture:
  [`pdp_leap-one-piece-round-front-smart-toilet-dual-flush-28529in_request.json`](../_debug/pdp_leap-one-piece-round-front-smart-toilet-dual-flush-28529in_request.json)
- Structured source fields:
  - `ProductOverallLengthInches_s`: `26-3/4"`
  - `ProductOverallWidthInches_s`: `14-1/2"`
  - `ProductOverallHeightInches_s`: `19-5/16"`
- Structured centimetre fields: absent
- Other source evidence:
  - feature text includes rim-to-floor height `15.7 inch (40 cm)`;
  - this is not a complete product bounding box.
- Original and normalized dimensions: all normalized dimension fields empty;
  `dimension_parse_status`: `not_parsed`.
- Completeness: complete product dimensions **present in captured PDP inch
  fields**, lost before normalization.
- Unit conversion: required; inches to millimetres.
- Classification: **present in source but lost during crawler extraction**.

### Basin / lavatory: `2211IN-0`

- Product: Caxton 54 cm undercounter lavatory
- Source capture:
  [`pdp_caxton-big-undercounter-lavatory-2211in_request.json`](../_debug/pdp_caxton-big-undercounter-lavatory-2211in_request.json)
- Structured source fields:
  - `ProductOverallLengthInches_s`: `21-1/8"`
  - `ProductOverallWidthInches_s`: `17-1/4"`
  - `ProductOverallHeightInches_s`: `7-7/16"`
- Structured centimetre fields: absent
- Original `data/kohler_products.csv` dimensions: `54 cm undercounter
  lavatory`
- Normalized dimensions:
  - all three dimension fields empty;
  - `dimension_parse_status`: `not_parsed`.
- Completeness: complete product dimensions **present in captured PDP inch
  fields**, but not present in normalized output.
- Unit conversion: required; inches to millimetres.
- Classification: **present in source but lost during crawler extraction**.

### Basin / lavatory: `11160T-1-0`

- Product: Odeon semi-recessed basin, 56 cm
- Source capture:
  [`pdp_odeon-odeon-semi-recessed-basin-560mm-11160t-1_request.json`](../_debug/pdp_odeon-odeon-semi-recessed-basin-560mm-11160t-1_request.json)
- Structured source fields:
  - `ProductOverallLengthCm_d`: absent
  - `ProductOverallWidthCm_d`: absent
  - `ProductOverallHeightCm_d`: absent
  - all three `ProductOverall*Inches_s`: absent
- Other source evidence:
  - `ProductDescriptionProductShort_s`: `Odeon semi-recessed basin, 56 cm`
  - feature text: `Dimensions: 560*45.4 cm`
  - this supplies two values with a non-supported `*` separator and no clear
    third overall dimension.
- Original and normalized dimensions: all normalized dimension fields empty;
  `dimension_parse_status`: `not_parsed`.
- Completeness: no complete, unambiguous installed-product bounding box was
  found in the captured source.
- Unit conversion: cannot be safely applied until the source meaning and
  separator are clarified.
- Classification: **present in an ambiguous/unusable format**, not proven
  normalization loss.

### Shower / rainhead: `9301IN-CL-CP`

- Product: ModernLife Edge Square 38.4 cm single-function rainhead
- Source capture:
  [`pdp_modernlife-edge-square-381mm-single-function-rainhead-9301in-cl_request.json`](../_debug/pdp_modernlife-edge-square-381mm-single-function-rainhead-9301in-cl_request.json)
- Structured source fields:
  - `ProductOverallLengthInches_s`: `15-1/8"`
  - `ProductOverallWidthInches_s`: `2-3/8"`
  - `ProductOverallHeightInches_s`: `15-1/8"`
- Structured centimetre fields: absent
- Product title/short description: square rainhead approximately `38.4 cm`;
  this is consistent with the two large plan dimensions but does not resolve
  the semantic meaning of every API axis field.
- Original and normalized dimensions: all normalized dimension fields empty;
  `dimension_parse_status`: `not_parsed`.
- Completeness: three structured inch values are present in the PDP capture,
  but their axis semantics should be confirmed against the product
  specification before being treated as a physical bounding box.
- Unit conversion: required; inches to millimetres.
- Classification: **present in source but lost during crawler extraction,
  with an API-axis semantics review still required**.

### Shower / rainhead: `73037IN-CL-CP`

- Product: Rainduet Edge Round 20.3 cm single-function rainhead
- Source capture:
  [`pdp_round-duet-edge-square-203-mm-single-function-rainhead-73037in-cl_request.json`](../_debug/pdp_round-duet-edge-square-203-mm-single-function-rainhead-73037in-cl_request.json)
- Structured source fields:
  - `ProductOverallLengthInches_s`: `8"`
  - `ProductOverallWidthInches_s`: `8"`
  - `ProductOverallHeightInches_s`: `2-5/16"`
- Structured centimetre fields: absent
- Product title/short description: round rainhead `20.3 cm`.
- Original and normalized dimensions: all normalized dimension fields empty;
  `dimension_parse_status`: `not_parsed`.
- Completeness: three structured inch values are present in the captured PDP,
  with the same axis-semantics caveat as the other rainhead.
- Unit conversion: required; inches to millimetres.
- Classification: **present in source but lost during crawler extraction,
  pending axis-semantics confirmation**.

## Classification summary

### 1. Dimensions genuinely absent from source

`11160T-1-0` is the clearest representative. Its captured PDP contains no
complete `ProductOverall*Cm_d` or `ProductOverall*Inches_s` triplet. Its
`560*45.4 cm` feature text is not a safe complete bounding box.

The absence of a structured field does not prove no dimension exists in the
linked PDF specification, but no PDF extraction was performed in this
investigation. The current normalized catalogue does not contain a parsed
complete value.

### 2. Dimensions present in source but missing from normalized catalogue

The captured PDP responses for `3983IN-S-0`, `28529IN-0`, `2211IN-0`,
`9301IN-CL-CP`, and `73037IN-CL-CP` contain complete-looking
`ProductOverall*Inches_s` values. These values do not reach either
`data/kohler_products.csv` or the normalized catalogue because
`parse_dimensions()` ignores the inch fields.

This is the primary confirmed data-loss point.

### 3. Dimensions present but incorrectly parsed

No representative record was found where a complete, valid grouped dimension
was parsed into the wrong millimetre value. The more specific failure is that
the crawler discards structured inch fields before the normalizer sees them.

The normalizer's conservative grouped parser also intentionally leaves
two-dimensional text without height incomplete.

### 4. Dimensions present in ambiguous/unusable format

- `11160T-1-0`: `560*45.4 cm` uses an unsupported separator and has only two
  values.
- Rainhead API fields provide three inch values, but the product titles
  describe a square/round face diameter or side length. The field-axis
  semantics should be checked against the specification before treating the
  values as width/depth/height.
- `SKUShippingLength_s`, `SKUShippingWidth_s`, and
  `SKUShippingHeight_s` exist for several PDP records, but they are packaging
  dimensions and must not be used as installed-product dimensions.

## Final finding

The integration proof exposed a real upstream data issue, not a recommendation
or placement defect. At least five representative required-role products have
structured inch dimensions in captured PDP/API records that were lost by the
crawler's centimetre-only `parse_dimensions()` implementation. At least one
representative basin has no complete structured dimension triplet in the
captured response and remains genuinely unresolved without consulting its
specification document.

No fix is applied in this task. A future repair should preserve the raw
structured fields, convert verified inch values explicitly, retain provenance,
and keep ambiguous basin/rainhead values out of spatial validation until their
semantics are confirmed.
